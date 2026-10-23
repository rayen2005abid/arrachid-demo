import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { envoyer } from '../api/client'
import { messageUtilisateur } from '../api/erreurs'
import { useLecture } from '../api/useLecture'
import { AfficheErreur } from '../composants/AfficheErreur'
import { IconeCoche, IconePoste, initiales } from '../composants/IconesAcces'
import { PaveNumerique } from '../composants/PaveNumerique'
import { useSession } from '../contextes/session'
import { libelles } from '../libelles'
import type { Poste, UtilisateurListe } from '../types'

/** Appairage d'un poste par l'administrateur : poste, nom de l'administrateur, PIN (PROMPT §6.10). */
export function PageAppairage() {
  const { recharger } = useSession()
  const navigation = useNavigate()
  const { donnees: postes, erreur: erreurPostes } = useLecture<Poste[]>('/api/session/postes')
  const { donnees: admins, erreur: erreurAdmins } = useLecture<UtilisateurListe[]>('/api/session/administrateurs')
  const [poste, definirPoste] = useState<Poste | null>(null)
  const [admin, definirAdmin] = useState<UtilisateurListe | null>(null)
  const [pin, definirPin] = useState('')
  const [erreur, definirErreur] = useState<string | null>(null)
  const [enCours, definirEnCours] = useState(false)
  const a = libelles.appairage

  const valider = async () => {
    if (poste === null || admin === null || enCours) return
    definirEnCours(true)
    definirErreur(null)
    try {
      await envoyer('/api/session/appairage', { poste_id: poste.id, utilisateur_id: admin.id, pin })
      await recharger()
      navigation('/', { replace: true })
    } catch (e) {
      definirErreur(messageUtilisateur(e))
      definirPin('')
      definirEnCours(false)
    }
  }

  return (
    <section className="page-appairage ecran-acces">
      <h1>{a.titre}</h1>
      <AfficheErreur erreur={erreurPostes ?? erreurAdmins} />

      <h2>{a.poste}</h2>
      {postes !== null && postes.length === 0 && <p>{a.aucunPoste}</p>}
      <div className="grille-noms">
        {postes?.map((p) => (
          <button key={p.id} type="button" aria-pressed={poste?.id === p.id} className={poste?.id === p.id ? 'bouton-nom bouton-nom-choisi' : 'bouton-nom'} onClick={() => definirPoste(p)}>
            <span className={`acces-pastille acces-${p.type_poste}`}><IconePoste type={p.type_poste} /></span>
            <span className="acces-texte">
              <strong>{p.libelle}</strong>
              <span>{libelles.typesPoste[p.type_poste]}</span>
            </span>
            <span className="acces-coche"><IconeCoche /></span>
          </button>
        ))}
      </div>

      <h2>{a.administrateur}</h2>
      {admins !== null && admins.length === 0 && <p>{a.aucunAdministrateur}</p>}
      <div className="grille-noms">
        {admins?.map((u) => (
          <button key={u.id} type="button" aria-pressed={admin?.id === u.id} className={admin?.id === u.id ? 'bouton-nom bouton-nom-choisi' : 'bouton-nom'} onClick={() => definirAdmin(u)}>
            <span className="acces-pastille acces-administrateur" aria-hidden="true">{initiales(u.nom)}</span>
            <span className="acces-texte"><strong>{u.nom}</strong></span>
            <span className="acces-coche"><IconeCoche /></span>
          </button>
        ))}
      </div>

      {poste !== null && admin !== null && (
        <>
          <h2>{a.saisirCode}</h2>
          <AfficheErreur erreur={erreur} />
          <PaveNumerique valeur={pin} surChangement={definirPin} surValidation={() => void valider()} etiquetteValider={a.confirmer} desactive={enCours} />
        </>
      )}
    </section>
  )
}
