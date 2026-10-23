import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { AfficheErreur } from '../composants/AfficheErreur'
import { libelles } from '../libelles'
import { BoutonsActions, CaseInactifs, Champ, ChampMotif, Choix, Chronologie, EtatActif, Panneau } from './composants'
import {
  REFERENTIELS,
  avecMotif,
  construireCorps,
  motifRequis,
  resumeEtat,
  saisiesDepuis,
  valeurAffichee,
  type DefinitionReferentiel,
  type Erreurs,
  type Saisies,
} from './logique'
import type { FicheReferentiel } from './types'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { Panneau as PanneauCommun } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { Icone } from '../composants/Icone'
import type { NomIcone } from '../composants/icones'

const a = libelles.administration
const r = a.referentiels
const QUALITES = Object.entries(r.qualites).map(([valeur, libelle]) => ({ valeur, libelle }))
const ICONES_REFERENTIELS: Record<DefinitionReferentiel['onglet'], NomIcone> = {
  bacs: 'grid-3x3', tampons: 'droplets', cuves: 'cylinder', varietes: 'flask-conical', lignes: 'factory',
}

type Mode = { type: 'creation' } | { type: 'modifier' | 'desactiver' | 'reactiver'; fiche: FicheReferentiel } | null

/** Bacs, tampons, cuves, variétés et lignes : un onglet par référentiel (gerer_referentiel). */
export function PageReferentiels() {
  const [onglet, definirOnglet] = useState(0)
  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.referentiels} />
      <div className="mes-page admin-referentiels">
      <div className="onglets" role="tablist">
        {REFERENTIELS.map((definition, i) => (
          <button key={definition.onglet} type="button" role="tab" className="onglet" aria-selected={i === onglet} onClick={() => definirOnglet(i)}>
            <Icone nom={ICONES_REFERENTIELS[definition.onglet]} />
            {r.onglets[definition.onglet]}
          </button>
        ))}
      </div>
      <OngletReferentiel key={onglet} definition={REFERENTIELS[onglet]} />
    </div>
    </section>
  )
}

function OngletReferentiel({ definition }: { definition: DefinitionReferentiel }) {
  const [inactifs, definirInactifs] = useState(false)
  const { donnees, erreur, recharger } = useLecture<FicheReferentiel[]>(`${definition.chemin}?inclure_inactifs=${inactifs}`)
  const s = useSoumission()
  const [mode, definirMode] = useState<Mode>(null)
  const [saisies, definirSaisies] = useState<Saisies>({})
  const [motif, definirMotif] = useState('')
  const [erreurs, definirErreurs] = useState<Erreurs>({})
  const [historique, definirHistorique] = useState<number | null>(null)

  const ouvrir = (suivant: Mode) => {
    s.reinitialiser()
    definirErreurs({})
    definirMotif('')
    definirSaisies(saisiesDepuis(definition, suivant !== null && suivant.type !== 'creation' ? suivant.fiche : null))
    definirMode(suivant)
  }

  const fiche = mode !== null && mode.type !== 'creation' ? mode.fiche : null
  // La réactivation ne demande jamais de raison (T-23).
  const requis = mode?.type !== 'reactiver' && motifRequis(fiche)

  const valider = async () => {
    if (mode === null) return
    let corps: Record<string, unknown> = {}
    if (mode.type === 'creation' || mode.type === 'modifier') {
      const resultat = construireCorps(definition, saisies)
      if (resultat.erreurs !== null) {
        definirErreurs(resultat.erreurs)
        return
      }
      corps = resultat.corps
    }
    const complet = avecMotif(corps, motif, requis)
    if (complet === null) {
      definirErreurs({ motif: a.erreurs.obligatoire })
      return
    }
    definirErreurs({})
    const chemin =
      mode.type === 'creation'
        ? definition.chemin
        : `${definition.chemin}/${mode.fiche.id}/${mode.type === 'modifier' ? 'modification' : mode.type === 'desactiver' ? 'desactivation' : 'reactivation'}`
    if ((await s.soumettre(chemin, complet)) === null) return
    ouvrir(null)
    await recharger()
  }

  const formulaire = mode?.type === 'creation' || mode?.type === 'modifier'
  return (
    <>
      <div className="entete-page admin-barre-actions">
        <CaseInactifs coche={inactifs} surChangement={definirInactifs} />
        {mode === null && <button type="button" className="bouton-principal" onClick={() => ouvrir({ type: 'creation' })}>{r.nouveau}</button>}
      </div>
      <AfficheErreur erreur={erreur} />

      {mode !== null && (
        <Panneau
          titre={mode.type === 'creation' ? `${r.nouveau} — ${r.onglets[definition.onglet]}` : a.actionsLibelles[mode.type]}
          consequence={mode.type === 'desactiver' ? a.consequences.desactiver : mode.type === 'reactiver' ? a.consequences.reactiver : undefined}
          etiquette={formulaire ? a.enregistrer : a.confirmer}
          enCours={s.enCours}
          erreur={s.erreur}
          surValider={() => void valider()}
          surAnnuler={() => ouvrir(null)}
        >
          {formulaire &&
            definition.champs.map((champ, i) =>
              champ.genre === 'booleen' ? (
                <label key={champ.nom}><input type="checkbox" checked={saisies[champ.nom] === '1'} onChange={(e) => definirSaisies({ ...saisies, [champ.nom]: e.target.checked ? '1' : '0' })} /> {champ.libelle}</label>
              ) : champ.genre === 'qualite' ? (
                <Choix key={champ.nom} id={champ.nom} libelle={champ.libelle} valeur={saisies[champ.nom] ?? ''} options={QUALITES} erreur={erreurs[champ.nom]} surChangement={(v) => definirSaisies({ ...saisies, [champ.nom]: v })} />
              ) : (
                <Champ
                  key={champ.nom}
                  id={champ.nom}
                  libelle={champ.libelle}
                  valeur={saisies[champ.nom] ?? ''}
                  inputMode={champ.genre === 'kg' ? 'decimal' : champ.genre.startsWith('entier') ? 'numeric' : 'text'}
                  erreur={erreurs[champ.nom]}
                  autoFocus={i === 0}
                  surChangement={(v) => definirSaisies({ ...saisies, [champ.nom]: v })}
                />
              ),
            )}
          <ChampMotif requis={requis} valeur={motif} surChangement={definirMotif} />
          {erreurs.motif !== undefined && <p className="mes-champ-erreur">{erreurs.motif}</p>}
        </Panneau>
      )}

      <PanneauCommun titre={r.onglets[definition.onglet]} icone={ICONES_REFERENTIELS[definition.onglet]} serre><div className="mes-tableau"><table className="tableau-admin">
        <thead>
          <tr>
            {definition.champs.map((champ) => <th key={champ.nom}>{champ.libelle}</th>)}
            <th>{a.etat}</th>
            <th>{r.occupation}</th>
            <th>{a.actions}</th>
          </tr>
        </thead>
        <tbody>
          {donnees?.length === 0 && <tr><td colSpan={definition.champs.length + 3}>{a.aucun}</td></tr>}
          {donnees?.map((item) => (
            <tr key={item.id} className={item[definition.colonneActif] ? undefined : 'ligne-inactive'}>
              {definition.champs.map((champ) => (
                <td key={champ.nom} className={champ.genre === 'kg' || champ.genre.startsWith('entier') ? 'nombre' : undefined}>{valeurAffichee(champ, item)}</td>
              ))}
              <td><EtatActif actif={item[definition.colonneActif]} /></td>
              <td><Pastille ton={item.en_usage ? 'action' : 'neutre'}>{resumeEtat(definition.onglet, item)}</Pastille></td>
              <td>
                <div className="actions-ligne">
                  <BoutonsActions element={item} surAction={(action) => ouvrir({ type: action as 'modifier', fiche: item })} />
                  <button type="button" className="bouton-lien" onClick={() => definirHistorique(historique === item.id ? null : item.id)}>{a.historique}</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div></PanneauCommun>
      {historique !== null && <Chronologie key={historique} table={definition.table} ligneId={historique} surFermer={() => definirHistorique(null)} />}
    </>
  )
}
