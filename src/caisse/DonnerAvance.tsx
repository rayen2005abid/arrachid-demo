import { useState } from 'react'
import { useSoumission } from '../api/useSoumission'
import { ChampApporteur } from '../apporteurs/ChampApporteur'
import type { Apporteur } from '../apporteurs/logique'
import { Champ } from '../composants/Champ'
import { ChampsReferences } from '../composants/ChampsReferences'
import { ChoixBoutons } from '../composants/ChoixBoutons'
import { Note } from '../composants/Note'
import { Recapitulatif } from '../composants/Recapitulatif'
import { Tiroir } from '../composants/Tiroir'
import { ValidationPin } from '../composants/ValidationPin'
import { uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { MODES, type Avance, type ModePaiement } from './avances'
import { corpsReferences, referencesCompletes, REFERENCES_VIDES, type References } from './references'

const t = libelles.caisse
const r = libelles.recapitulatif

interface Props {
  surVersement: (avance: Avance) => void
  surFermer: () => void
}

/**
 * Avance versée par le responsable ou le propriétaire avec son PIN (CONTEXTE §25.3), dans un tiroir ; un récapitulatif
 * en lettres précède le F8 qui verse (EM-05, BH3).
 */
export function DonnerAvance({ surVersement, surFermer }: Props) {
  const [apporteur, definirApporteur] = useState<Apporteur | null>(null)
  const [montant, definirMontant] = useState('')
  const [mode, definirMode] = useState<ModePaiement>('especes')
  const [references, definirReferences] = useState<References>(REFERENCES_VIDES)
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [invalide, definirInvalide] = useState(false)
  const [recapitulatif, definirRecapitulatif] = useState(false)
  const soumission = useSoumission()
  const millimes = uniteExacte(montant, 3)
  const montantFaux = millimes === null || millimes <= 0

  const changer = () => {
    definirInvalide(false)
    definirRecapitulatif(false)
    soumission.reinitialiser()
  }

  const verser = async () => {
    if (apporteur === null || montantFaux || validation === null || !referencesCompletes(mode, references) || soumission.enCours) {
      definirInvalide(true)
      return
    }
    if (!recapitulatif) {
      definirRecapitulatif(true)
      return
    }
    const resultat = await soumission.soumettre<{ avance: Avance }>('/api/avances', {
      apporteur_id: apporteur.id, montant_millimes: millimes, mode, validation, ...corpsReferences(mode, references),
    })
    if (resultat !== null) surVersement(resultat.avance)
    else definirRecapitulatif(false)
  }

  return (
    <Tiroir
      titre={t.donner}
      icone="hand-coins"
      etiquette={recapitulatif ? t.verser : libelles.commun.continuer}
      surValider={() => void verser()}
      surFermer={recapitulatif ? () => definirRecapitulatif(false) : surFermer}
      enCours={soumission.enCours}
      erreur={soumission.erreur}
      consequence={recapitulatif ? r.verifiez : t.consequenceAvance}
    >
      {recapitulatif && millimes !== null && apporteur !== null && (
        <Recapitulatif
          libelleMontant={r.sommePayee}
          montantMillimes={millimes}
          lignes={[
            { etiquette: r.apporteur, valeur: apporteur.nom },
            { etiquette: r.mode, valeur: t.modes[mode] },
            ...(mode !== 'especes' ? [{ etiquette: r.reference, valeur: `${references.reference.trim()} — ${references.banque.trim()}` }] : []),
          ]}
        />
      )}
      {/* La saisie reste montée sous le récapitulatif : revenir la retrouve telle quelle, PIN compris. */}
      <div className="bureau-saisie" hidden={recapitulatif}>
        <ChampApporteur id="avance-recherche" libelle={t.apporteurAvance} valeur={apporteur}
          surChoix={(a) => { definirApporteur(a); changer() }} />
        {invalide && apporteur === null && <p className="mes-champ-erreur">{t.choisirApporteur}</p>}
        <Champ
          id="avance-montant"
          libelle={t.montantAvance}
          valeur={montant}
          surChangement={(valeur) => { definirMontant(valeur); changer() }}
          erreur={invalide && montantFaux ? t.montantAvanceInvalide : undefined}
          inputMode="decimal"
          placeholder="0,000"
          chiffres
        />
        <ChoixBoutons
          libelle={t.mode}
          options={MODES.map((valeur) => ({ valeur, libelle: t.modes[valeur] }))}
          valeur={mode}
          surChoisir={(valeur) => { definirMode(valeur); changer() }}
        />
        <ChampsReferences id="avance" mode={mode} valeur={references} surChangement={(v) => { definirReferences(v); changer() }} verifier={invalide} />
        <ValidationPin surValidation={(v) => { definirValidation(v); changer() }} />
        {invalide && validation === null && <Note ton="erreur">{t.pinObligatoire}</Note>}
      </div>
    </Tiroir>
  )
}
