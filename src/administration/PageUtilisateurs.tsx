import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { AfficheErreur } from '../composants/AfficheErreur'
import { ValidationPin } from '../composants/ValidationPin'
import { libelles } from '../libelles'
import type { Role, Validation } from '../types'
import { BoutonsActions, Champ, Choix, EtatActif, Panneau } from './composants'
import { dateHeure, validerPins, validerUtilisateur, type Erreurs } from './logique'
import type { Utilisateur } from './types'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { Panneau as PanneauCommun } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { Initiales } from './reperes'

const a = libelles.administration
const u = a.utilisateurs
const ROLES: readonly Role[] = ['operateur', 'responsable', 'proprietaire', 'administrateur']

type Mode = { type: 'creation' } | { type: 'reinitialiser_pin'; compte: Utilisateur } | { type: 'desactiver'; compte: Utilisateur } | null

/** Comptes (propriétaire) : chaque commande demande son PIN frais (PROMPT §6.10, T-11). */
export function PageUtilisateurs() {
  const { donnees, erreur, recharger } = useLecture<Utilisateur[]>('/api/utilisateurs')
  const s = useSoumission()
  const [mode, definirMode] = useState<Mode>(null)
  const [nom, definirNom] = useState('')
  const [role, definirRole] = useState('')
  const [pin, definirPin] = useState('')
  const [confirmation, definirConfirmation] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [erreurs, definirErreurs] = useState<Erreurs>({})

  const ouvrir = (suivant: Mode) => {
    s.reinitialiser()
    definirNom('')
    definirRole('')
    definirPin('')
    definirConfirmation('')
    definirValidation(null)
    definirErreurs({})
    definirMode(suivant)
  }

  const terminer = async (reponse: unknown) => {
    if (reponse === null) return
    ouvrir(null)
    await recharger()
  }

  const valider = async () => {
    if (mode === null || validation === null) return
    if (mode.type === 'creation') {
      const r = validerUtilisateur({ nom, role, pin, confirmation })
      definirErreurs(r.erreurs ?? {})
      if (r.corps !== null) await terminer(await s.soumettre('/api/utilisateurs', { ...r.corps, validation }))
    } else if (mode.type === 'reinitialiser_pin') {
      const e = validerPins(pin, confirmation)
      definirErreurs(e)
      if (Object.keys(e).length === 0) {
        await terminer(await s.soumettre(`/api/utilisateurs/${mode.compte.id}/reinitialisation-pin`, { pin, validation }))
      }
    } else {
      await terminer(await s.soumettre(`/api/utilisateurs/${mode.compte.id}/desactivation`, { validation }))
    }
  }

  const champsPin = (
    <>
      <Champ id="pin" libelle={u.pin} type="password" inputMode="numeric" maxLength={4} valeur={pin} surChangement={definirPin} erreur={erreurs.pin} />
      <Champ id="confirmation" libelle={u.pinConfirmation} type="password" inputMode="numeric" maxLength={4} valeur={confirmation} surChangement={definirConfirmation} erreur={erreurs.confirmation} />
    </>
  )

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.utilisateurs} principal={mode === null ? { etiquette: u.nouveau, surClic: () => ouvrir({ type: 'creation' }) } : null} />
      <div className="mes-page">
      <AfficheErreur erreur={erreur} />

      {mode !== null && (
        <Panneau
          key={mode.type === 'creation' ? 'creation' : `${mode.type}-${mode.compte.id}`}
          titre={mode.type === 'creation' ? u.nouveau : `${a.actionsLibelles[mode.type]} — ${mode.compte.nom}`}
          consequence={mode.type === 'creation' ? u.consequenceCreation : mode.type === 'reinitialiser_pin' ? u.consequencePin : u.consequenceDesactivation}
          etiquette={mode.type === 'creation' ? u.creer : mode.type === 'reinitialiser_pin' ? u.definirPin : a.actionsLibelles.desactiver}
          enCours={s.enCours}
          erreur={s.erreur}
          bloque={validation === null}
          surValider={() => void valider()}
          surAnnuler={() => ouvrir(null)}
        >
          {mode.type === 'creation' && (
            <>
              <Champ id="nom" libelle={u.nom} valeur={nom} surChangement={definirNom} erreur={erreurs.nom} autoFocus />
              <Choix id="role" libelle={u.role} valeur={role} surChangement={definirRole} erreur={erreurs.role} options={ROLES.map((r) => ({ valeur: r, libelle: libelles.roles[r] }))} />
              {champsPin}
            </>
          )}
          {mode.type === 'reinitialiser_pin' && champsPin}
          <ValidationPin surValidation={definirValidation} />
        </Panneau>
      )}

      <PanneauCommun titre={u.liste} icone="users" compte={donnees?.filter((compte) => compte.actif).length} serre><div className="mes-tableau"><table className="tableau-admin">
        <thead>
          <tr><th>{u.nom}</th><th>{u.role}</th><th>{a.etat}</th><th>{u.creeLe}</th><th>{a.actions}</th></tr>
        </thead>
        <tbody>
          {donnees?.map((compte) => (
            <tr key={compte.id} className={compte.actif ? undefined : 'ligne-inactive'}>
              <td><span className="admin-identite"><Initiales nom={compte.nom} /><span>{compte.nom}</span></span></td>
              <td><Pastille ton={compte.role === 'proprietaire' ? 'violet' : compte.role === 'administrateur' ? 'sombre' : compte.role === 'responsable' ? 'action' : 'neutre'}>{libelles.roles[compte.role]}</Pastille></td>
              <td><EtatActif actif={compte.actif} /></td>
              <td>{dateHeure(compte.cree_le)}</td>
              <td>
                <BoutonsActions
                  element={compte}
                  surAction={(action) => ouvrir(action === 'desactiver' ? { type: 'desactiver', compte } : { type: 'reinitialiser_pin', compte })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table></div></PanneauCommun>
    </div>
    </section>
  )
}
