// Numéro du chèque (ou référence du virement) et banque, sous le choix du mode (T-203). Rien pour des espèces.
import type { ModePaiement } from '../caisse/avances'
import { referencesRequises, type References } from '../caisse/references'
import { libelles } from '../libelles'
import { Champ } from './Champ'

interface Props {
  /** Préfixe des identifiants des deux saisies (plusieurs formulaires sur un écran). */
  id: string
  mode: ModePaiement
  valeur: References
  surChangement: (references: References) => void
  /** Montre les erreurs des saisies vides (après une validation refusée). */
  verifier?: boolean
  /** Fiche papier : les références ne sont pas obligatoires. */
  facultatif?: boolean
}

export function ChampsReferences({ id, mode, valeur, surChangement, verifier = false, facultatif = false }: Props) {
  if (!referencesRequises(mode)) return null
  const t = libelles.references
  const manque = (texte: string) => verifier && !facultatif && texte.trim() === ''
  return (
    <div className="bureau-references">
      <Champ
        id={`${id}-reference`}
        libelle={mode === 'cheque' ? t.numeroCheque : t.referenceVirement}
        valeur={valeur.reference}
        surChangement={(reference) => surChangement({ ...valeur, reference })}
        erreur={manque(valeur.reference) ? t.obligatoire : undefined}
        maxLength={60}
        autoComplete="off"
        chiffres
      />
      <Champ
        id={`${id}-banque`}
        libelle={t.banque}
        valeur={valeur.banque}
        surChangement={(banque) => surChangement({ ...valeur, banque })}
        erreur={manque(valeur.banque) ? t.obligatoire : undefined}
        maxLength={60}
        autoComplete="off"
      />
    </div>
  )
}
