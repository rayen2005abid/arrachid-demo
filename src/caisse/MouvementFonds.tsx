import { useState } from 'react'
import { useSoumission } from '../api/useSoumission'
import { Champ } from '../composants/Champ'
import { Note } from '../composants/Note'
import { Recapitulatif } from '../composants/Recapitulatif'
import { Tiroir } from '../composants/Tiroir'
import { ValidationPin } from '../composants/ValidationPin'
import { uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'
import type { Validation } from '../types'

const t = libelles.caisse
const r = libelles.recapitulatif

export type SensFonds = 'apport' | 'sortie'

export interface MouvementEnregistre {
  id: number
  sens: SensFonds
  montant_millimes: number
}

interface Props {
  sens: SensFonds
  surEnregistrement: (mouvement: MouvementEnregistre) => void
  surFermer: () => void
}

/**
 * Espèces apportées au tiroir (banque, propriétaire) ou emportées (banque, propriétaire), E-27 : montant, raison et PIN
 * frais du responsable, puis un récapitulatif en lettres avant le F8 qui enregistre.
 */
export function MouvementFonds({ sens, surEnregistrement, surFermer }: Props) {
  const [montant, definirMontant] = useState('')
  const [raison, definirRaison] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [invalide, definirInvalide] = useState(false)
  const [recapitulatif, definirRecapitulatif] = useState(false)
  const soumission = useSoumission()
  const millimes = uniteExacte(montant, 3)
  const montantFaux = millimes === null || millimes <= 0
  const apport = sens === 'apport'

  const changer = () => {
    definirInvalide(false)
    definirRecapitulatif(false)
    soumission.reinitialiser()
  }

  const valider = async () => {
    if (montantFaux || raison.trim() === '' || validation === null || soumission.enCours) {
      definirInvalide(true)
      return
    }
    if (!recapitulatif) {
      definirRecapitulatif(true)
      return
    }
    const resultat = await soumission.soumettre<{ mouvement: MouvementEnregistre }>(`/api/caisse/${sens}`, {
      montant_millimes: millimes, motif: raison.trim(), validation,
    })
    if (resultat !== null) surEnregistrement(resultat.mouvement)
    else definirRecapitulatif(false)
  }

  return (
    <Tiroir
      titre={apport ? t.apport : t.sortie}
      icone="wallet"
      etiquette={recapitulatif ? (apport ? t.enregistrerApport : t.enregistrerSortie) : libelles.commun.continuer}
      surValider={() => void valider()}
      surFermer={recapitulatif ? () => definirRecapitulatif(false) : surFermer}
      enCours={soumission.enCours}
      erreur={soumission.erreur}
      consequence={recapitulatif ? r.verifiez : apport ? t.consequenceApport : t.consequenceSortie}
    >
      {recapitulatif && millimes !== null && (
        <Recapitulatif
          libelleMontant={apport ? t.sommeApportee : t.sommeEmportee}
          montantMillimes={millimes}
          lignes={[{ etiquette: r.raison, valeur: raison.trim() }, { etiquette: r.mode, valeur: t.modes.especes }]}
        />
      )}
      {/* La saisie reste montée sous le récapitulatif : revenir la retrouve telle quelle, PIN compris. */}
      <div className="bureau-saisie" hidden={recapitulatif}>
        <Champ
          id="fonds-montant"
          libelle={t.montantFonds}
          valeur={montant}
          surChangement={(valeur) => { definirMontant(valeur); changer() }}
          erreur={invalide && montantFaux ? t.montantAvanceInvalide : undefined}
          inputMode="decimal"
          placeholder="0,000"
          chiffres
          grand
        />
        <div className="mes-champ">
          <span className="mes-etiquette">{t.raisonsProposees}</span>
          <div className="bureau-raisons">
            {(apport ? t.raisonsApport : t.raisonsSortie).map((proposee) => (
              <button key={proposee} type="button" className="bouton-secondaire bouton-petit" aria-pressed={raison === proposee}
                onClick={() => { definirRaison(proposee); changer() }}>
                {proposee}
              </button>
            ))}
          </div>
        </div>
        <Champ
          id="fonds-raison"
          libelle={t.raison}
          valeur={raison}
          surChangement={(valeur) => { definirRaison(valeur); changer() }}
          erreur={invalide && raison.trim() === '' ? t.raisonObligatoire : undefined}
          maxLength={200}
          requis
        />
        <ValidationPin surValidation={(v) => { definirValidation(v); changer() }} />
        {invalide && validation === null && <Note ton="erreur">{t.pinObligatoire}</Note>}
      </div>
    </Tiroir>
  )
}
