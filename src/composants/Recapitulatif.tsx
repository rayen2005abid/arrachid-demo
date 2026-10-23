// Récapitulatif avant de payer (EM-05, BH3) : qui, quoi, combien en chiffres et en lettres, par quel mode. Montré dans
// le tiroir juste avant le F8 qui engage l'argent ; Échap ou « Corriger » revient à la saisie.
import { montantEnLettres } from '../format/lettres'
import { afficherMillimes } from '../format/montants'
import { libelles } from '../libelles'
import { Chiffres } from './Chiffres'

export interface LigneRecapitulatif {
  etiquette: string
  valeur: string
}

interface Props {
  /** « Somme payée », « Somme encaissée »… */
  libelleMontant: string
  montantMillimes: number
  lignes: readonly LigneRecapitulatif[]
}

export function Recapitulatif({ libelleMontant, montantMillimes, lignes }: Props) {
  return (
    <section className="bureau-recapitulatif" aria-label={libelles.recapitulatif.titre}>
      <Chiffres valeurs={[{ etiquette: libelleMontant, valeur: `${afficherMillimes(montantMillimes)} DT`, ton: 'afficheur' }]} />
      <p className="bureau-lettres">{montantEnLettres(montantMillimes)}</p>
      <dl className="bureau-recapitulatif-lignes">
        {lignes.map((ligne) => (
          <div key={ligne.etiquette}>
            <dt>{ligne.etiquette}</dt>
            <dd>{ligne.valeur}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
