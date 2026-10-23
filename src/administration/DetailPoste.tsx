import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { AfficheErreur } from '../composants/AfficheErreur'
import { libelles } from '../libelles'
import { Icone } from '../composants/Icone'
import { BoutonsActions, Choix, Chronologie, EtatActif, Panneau } from './composants'
import { RepereEquipement } from './reperes'
import { dateHeure } from './logique'
import type { Appairage, Equipement, Lien } from './types'

const a = libelles.administration
const p = a.postes
const types = a.equipements.types

type Confirmation = { type: 'revoquer'; appairage: Appairage } | { type: 'retirer'; lien: Lien } | null

/** Un poste : ses navigateurs appairés (révocation) et ses équipements liés (E-03). */
export function DetailPoste({ posteId, surChangement }: { posteId: number; surChangement: () => void }) {
  const appairages = useLecture<Appairage[]>(`/api/postes/${posteId}/appairages`)
  const liens = useLecture<Lien[]>(`/api/postes/${posteId}/equipements`)
  const equipements = useLecture<Equipement[]>('/api/equipements/reseau')
  const s = useSoumission()
  const [confirmation, definirConfirmation] = useState<Confirmation>(null)
  const [choisi, definirChoisi] = useState('')
  const [historique, definirHistorique] = useState(false)

  const lies = new Set(liens.donnees?.filter((l) => l.actif).map((l) => l.equipement_id))
  const proposables = equipements.donnees?.filter((e) => e.actif && !lies.has(e.id)) ?? []

  const apres = async (reponse: unknown) => {
    if (reponse === null) return
    definirConfirmation(null)
    definirChoisi('')
    await Promise.all([appairages.recharger(), liens.recharger()])
    surChangement()
  }

  const confirmer = async () => {
    if (confirmation === null) return
    const chemin =
      confirmation.type === 'revoquer'
        ? `/api/postes/${posteId}/appairages/${confirmation.appairage.id}/revocation`
        : `/api/postes/${posteId}/equipements/${confirmation.lien.equipement_id}/retrait`
    await apres(await s.soumettre(chemin, {}))
  }

  const lier = async () => {
    if (choisi === '') return
    await apres(await s.soumettre(`/api/postes/${posteId}/equipements`, { equipement_id: Number(choisi) }))
  }

  const ouvrir = (suivante: Confirmation) => {
    s.reinitialiser()
    definirConfirmation(suivante)
  }

  return (
    <section className="sous-section" aria-label={p.detail}>
      <AfficheErreur erreur={appairages.erreur ?? liens.erreur ?? equipements.erreur} />
      {confirmation !== null && (
        <Panneau
          titre={a.actionsLibelles[confirmation.type]}
          consequence={confirmation.type === 'revoquer' ? p.consequenceRevocation : p.consequenceRetrait}
          etiquette={a.confirmer}
          principal={false}
          enCours={s.enCours}
          erreur={s.erreur}
          surValider={() => void confirmer()}
          surAnnuler={() => ouvrir(null)}
        />
      )}

      <h2 className="admin-detail-titre"><Icone nom="monitor" />{p.appairages}</h2>
      {appairages.donnees?.length === 0 && <p className="aide">{p.aucunAppairage}</p>}
      <div className="mes-tableau"><table className="tableau-admin">
        <thead><tr><th>{p.appairePar}</th><th>{p.appaireLe}</th><th>{p.revoqueLe}</th><th>{a.actions}</th></tr></thead>
        <tbody>
          {appairages.donnees?.map((appairage) => (
            <tr key={appairage.id} className={appairage.revoque_le === null ? undefined : 'ligne-inactive'}>
              <td>{appairage.appaire_par_nom}</td>
              <td>{dateHeure(appairage.appaire_le)}</td>
              <td>{dateHeure(appairage.revoque_le)}</td>
              <td><BoutonsActions element={appairage} surAction={() => ouvrir({ type: 'revoquer', appairage })} /></td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <h2 className="admin-detail-titre"><Icone nom="printer" />{p.equipements}</h2>
      {liens.donnees?.length === 0 && <p className="aide">{p.aucunLien}</p>}
      <ul className="admin-liens">
        {liens.donnees?.map((lien) => (
          <li key={lien.id} className={lien.actif ? undefined : 'ligne-inactive'}>
            <RepereEquipement type={lien.type} />
            <span className="admin-lien-texte"><strong>{lien.libelle}</strong><span className="aide">{lien.code} · {types[lien.type]}</span></span>
            <EtatActif actif={lien.actif} />
            <BoutonsActions element={lien} surAction={() => ouvrir({ type: 'retirer', lien })} />
          </li>
        ))}
      </ul>
      {proposables.length > 0 && (
        <div className="actions-ligne">
          <Choix
            id="equipement_a_lier"
            libelle={p.choisirEquipement}
            valeur={choisi}
            surChangement={(v) => { s.reinitialiser(); definirChoisi(v) }}
            options={proposables.map((e) => ({ valeur: String(e.id), libelle: `${e.code} — ${types[e.type]} — ${e.libelle}` }))}
          />
          <button type="button" className="bouton-secondaire" disabled={choisi === '' || s.enCours} onClick={() => void lier()}>{p.lier}</button>
        </div>
      )}
      {confirmation === null && <AfficheErreur erreur={s.erreur} />}

      <button type="button" className="bouton-lien" aria-pressed={historique} onClick={() => definirHistorique(!historique)}>{a.historique}</button>
      {historique && <Chronologie table="poste" ligneId={posteId} surFermer={() => definirHistorique(false)} />}
    </section>
  )
}
