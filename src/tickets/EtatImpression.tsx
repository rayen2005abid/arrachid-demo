import { useSoumission } from '../api/useSoumission'
import { Icone } from '../composants/Icone'
import { Note } from '../composants/Note'
import { libelles } from '../libelles'
import { cheminImpression, peutReessayer, texteEtat, tonResultat, type EtatImpression } from './logique'

interface Props {
  etat: EtatImpression
  /** Nouvel état après « Réessayer » (réponse du serveur). */
  surNouvelEtat: (etat: EtatImpression) => void
}

/**
 * Résultat d'impression d'un ticket et bouton « Réessayer » (CONTEXTE §45, PROMPT §6.20.4).
 * Chaque « Réessayer » est une nouvelle commande ; un nouvel essai réseau garde le même
 * identifiant (pas de double impression).
 */
export function AfficheEtatImpression({ etat, surNouvelEtat }: Props) {
  const s = useSoumission()
  const reessayer = async () => {
    const reponse = await s.soumettre<{ impression: EtatImpression }>(cheminImpression(etat.piece_id), {})
    if (reponse !== null) surNouvelEtat(reponse.impression)
  }
  return (
    <Note ton={tonResultat(etat.statut)} vivante>
      <p>{texteEtat(etat)}</p>
      {peutReessayer(etat) && (
        <div>
          <button type="button" className="bouton-secondaire bouton-reessayer" disabled={s.enCours} onClick={() => void reessayer()}>
            <Icone nom="printer" />
            {libelles.commun.reessayer}
          </button>
        </div>
      )}
      {s.erreur !== null && <p className="mes-champ-erreur" role="alert">{s.erreur}</p>}
    </Note>
  )
}
