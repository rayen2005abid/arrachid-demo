import { useState } from 'react'
import { useSoumission } from '../api/useSoumission'
import { Champ, Choix, Panneau } from '../administration/composants'
import { corpsReferences, referencesCompletes, REFERENCES_VIDES, type References } from '../caisse/references'
import { ChampsReferences } from '../composants/ChampsReferences'
import { Note } from '../composants/Note'
import { Panneau as PanneauCommun } from '../composants/Panneau'
import { ValidationPin } from '../composants/ValidationPin'
import { afficherMillimes } from '../format/montants'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { corpsReglement, permise, type Erreurs, type ModeReglement, type VueCorrection } from './logique'

const t = libelles.corrections
const r = t.reglement
const MODES: ModeReglement[] = ['especes', 'cheque', 'virement']

/** État du règlement de la réception et sa correction par le propriétaire (T5.7, réponses 2A). */
export function CorrectionReglement({ vue, surCorrige }: { vue: VueCorrection; surCorrige: () => Promise<void> }) {
  const s = useSoumission()
  const [action, definirAction] = useState<'mode' | 'annuler' | null>(null)
  const [mode, definirMode] = useState<ModeReglement | ''>('')
  const [references, definirReferences] = useState<References>(REFERENCES_VIDES)
  const [motif, definirMotif] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [erreurs, definirErreurs] = useState<Erreurs>({})
  const reglement = vue.reglement

  const ouvrir = (suivante: 'mode' | 'annuler' | null) => {
    s.reinitialiser()
    definirMode('')
    definirReferences(REFERENCES_VIDES)
    definirMotif('')
    definirValidation(null)
    definirErreurs({})
    definirAction(suivante)
  }

  const valider = async () => {
    if (reglement === null || action === null || (action === 'mode' && mode === '')) return
    if (action === 'mode' && mode !== '' && !referencesCompletes(mode, references)) return
    const c = corpsReglement(action === 'mode' && mode !== '' ? mode : null, motif, validation)
    definirErreurs(c.erreurs)
    if (c.corps === null) return
    const corps = action === 'mode' && mode !== '' ? { ...c.corps, ...corpsReferences(mode, references) } : c.corps
    if ((await s.soumettre(`/api/corrections/reglements/${reglement.decompte_id}`, corps)) === null) return
    ouvrir(null)
    await surCorrige()
  }

  const net = reglement === null ? '' : afficherMillimes(reglement.net_millimes)
  const etat = reglement === null ? r.aucun
    : !reglement.regle ? r.nonRegle.replace('{numero}', String(reglement.decompte_numero)).replace('{net}', net)
      : reglement.recu_numero === null ? r.soldeNul.replace('{numero}', String(reglement.decompte_numero))
        : r.regle.replace('{numero}', String(reglement.decompte_numero)).replace('{net}', net)
          .replace('{recu}', String(reglement.recu_numero)).replace('{mode}', r.modes[reglement.mode ?? 'especes'])

  return (
    <>
      <PanneauCommun
        titre={r.titre}
        icone="wallet"
        actions={action === null && (permise(vue, 'changer_mode_reglement') || permise(vue, 'annuler_reglement')) ? (
          <>
            {permise(vue, 'changer_mode_reglement') && <button type="button" className="bouton-secondaire bouton-petit" onClick={() => ouvrir('mode')}>{r.changerMode}</button>}
            {permise(vue, 'annuler_reglement') && <button type="button" className="bouton-secondaire bouton-petit bouton-danger" onClick={() => ouvrir('annuler')}>{r.annuler}</button>}
          </>
        ) : undefined}
      >
        <p>{etat}</p>
        {reglement?.regle === true && reglement.recu_numero !== null && !permise(vue, 'annuler_reglement') && <p className="aide">{r.reserve}</p>}
      </PanneauCommun>
      {action !== null && reglement !== null && (
        <Panneau
          titre={action === 'mode' ? r.changerMode : r.annuler}
          consequence={action === 'mode' ? r.consequenceMode : r.consequenceAnnuler}
          etiquette={t.enregistrer}
          enCours={s.enCours}
          erreur={s.erreur}
          bloque={validation === null || (action === 'mode' && (mode === '' || !referencesCompletes(mode, references)))}
          principal={false}
          surValider={() => void valider()}
          surAnnuler={() => ouvrir(null)}
        >
          {action === 'mode' && (
            <Choix
              id="mode-reglement"
              libelle={r.nouveauMode}
              valeur={mode}
              surChangement={(v) => definirMode(MODES.find((m) => m === v) ?? '')}
              options={MODES.filter((m) => m !== reglement.mode).map((m) => ({ valeur: m, libelle: r.modes[m] }))}
            />
          )}
          {action === 'mode' && mode !== '' && (
            <ChampsReferences id="correction" mode={mode} valeur={references} surChangement={definirReferences} />
          )}
          {reglement.mode === 'especes' && <Note ton="alerte">{r.argentRendu}</Note>}
          <Champ id="motif-reglement" libelle={t.motif} valeur={motif} surChangement={definirMotif} erreur={erreurs.motif} />
          <ValidationPin surValidation={definirValidation} seulProprietaire />
        </Panneau>
      )}
    </>
  )
}
