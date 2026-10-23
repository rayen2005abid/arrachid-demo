import { useState } from 'react'
import { messageUtilisateur } from '../api/erreurs'
import { useLecture } from '../api/useLecture'
import { AfficheErreur } from '../composants/AfficheErreur'
import { initiales } from '../composants/IconesAcces'
import { PaveNumerique } from '../composants/PaveNumerique'
import { useSession } from '../contextes/session'
import { libelles } from '../libelles'
import type { UtilisateurListe } from '../types'

/** Connexion : boutons de noms puis pavé du PIN. Après un verrouillage, l'utilisateur est présélectionné. */
export function PageConnexion() {
  const { utilisateurVerrouille, connecter, changerUtilisateur } = useSession()
  const { donnees: utilisateurs, erreur: erreurListe, chargement } = useLecture<UtilisateurListe[]>('/api/session/utilisateurs')
  const [choisi, definirChoisi] = useState<UtilisateurListe | null>(utilisateurVerrouille)
  const [pin, definirPin] = useState('')
  const [erreur, definirErreur] = useState<string | null>(null)
  const [enCours, definirEnCours] = useState(false)
  const verrou = utilisateurVerrouille !== null

  const valider = async () => {
    if (choisi === null || enCours) return
    definirEnCours(true)
    definirErreur(null)
    try {
      await connecter(choisi.id, pin)
    } catch (e) {
      definirErreur(messageUtilisateur(e))
      definirPin('')
      definirEnCours(false)
    }
  }

  const autreUtilisateur = () => {
    definirPin('')
    definirErreur(null)
    if (verrou) changerUtilisateur()
    else definirChoisi(null)
  }

  const c = libelles.connexion
  return (
    <section className="page-connexion ecran-acces">
      <h1>{verrou ? c.verrouTitre : c.titre}</h1>
      {choisi === null ? (
        <>
          <p className="aide">{c.choisirNom}</p>
          <AfficheErreur erreur={erreurListe} />
          {chargement && <p>{libelles.commun.chargement}</p>}
          {utilisateurs !== null && utilisateurs.length === 0 && <p>{c.aucunUtilisateur}</p>}
          <div className="grille-noms">
            {utilisateurs?.map((u) => (
              <button key={u.id} type="button" className="bouton-nom" onClick={() => definirChoisi(u)}>
                <span className={`acces-pastille acces-${u.role}`} aria-hidden="true">{initiales(u.nom)}</span>
                <span className="acces-texte">
                  <strong>{u.nom}</strong>
                  <span>{libelles.roles[u.role]}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <span className={`acces-avatar acces-${choisi.role}`} aria-hidden="true">{initiales(choisi.nom)}</span>
          <p className="nom-choisi">{choisi.nom}</p>
          <p className="aide">{verrou ? c.verrouAide : c.saisirCode}</p>
          <AfficheErreur erreur={erreur} />
          <PaveNumerique
            valeur={pin}
            surChangement={definirPin}
            surValidation={() => void valider()}
            etiquetteValider={verrou ? c.deverrouiller : c.seConnecter}
            desactive={enCours}
          />
          <button type="button" className="bouton-lien" onClick={autreUtilisateur}>{c.autreUtilisateur}</button>
        </>
      )}
    </section>
  )
}
