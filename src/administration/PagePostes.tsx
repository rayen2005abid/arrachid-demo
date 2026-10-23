import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { AfficheErreur } from '../composants/AfficheErreur'
import { libelles } from '../libelles'
import type { TypePoste } from '../types'
import { BoutonsActions, Champ, Choix, EtatActif, Panneau } from './composants'
import { DetailPoste } from './DetailPoste'
import type { Erreurs } from './logique'
import type { PosteAdmin } from './types'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { Panneau as PanneauCommun } from '../composants/Panneau'
import { ListeDetail } from '../composants/ListeDetail'
import { EtatVide } from '../composants/EtatVide'

const a = libelles.administration
const p = a.postes
const TYPES: readonly TypePoste[] = ['reception', 'laboratoire', 'production', 'bureau']

type Mode =
  | { type: 'creation' }
  | { type: 'modifier' | 'desactiver' | 'reactiver'; poste: PosteAdmin }
  | null

/** Postes (administrateur) : fiches, puis par poste ses navigateurs appairés et ses équipements. */
export function PagePostes() {
  const { donnees, erreur, recharger } = useLecture<PosteAdmin[]>('/api/postes')
  const s = useSoumission()
  const [mode, definirMode] = useState<Mode>(null)
  const [detail, definirDetail] = useState<number | null>(null)
  const [code, definirCode] = useState('')
  const [libelle, definirLibelle] = useState('')
  const [typePoste, definirTypePoste] = useState('')
  const [erreurs, definirErreurs] = useState<Erreurs>({})

  const ouvrir = (suivant: Mode) => {
    s.reinitialiser()
    definirErreurs({})
    const poste = suivant !== null && suivant.type !== 'creation' ? suivant.poste : null
    definirCode(poste?.code ?? '')
    definirLibelle(poste?.libelle ?? '')
    definirTypePoste(poste?.type_poste ?? '')
    definirMode(suivant)
  }

  const valider = async () => {
    if (mode === null) return
    let reponse: unknown
    if (mode.type === 'creation' || mode.type === 'modifier') {
      const manquants: Erreurs = {}
      if (code.trim() === '') manquants.code = a.erreurs.obligatoire
      if (libelle.trim() === '') manquants.libelle = a.erreurs.obligatoire
      if (typePoste === '') manquants.type_poste = a.erreurs.obligatoire
      definirErreurs(manquants)
      if (Object.keys(manquants).length > 0) return
      const corps = { code: code.trim(), libelle: libelle.trim(), type_poste: typePoste }
      reponse = await s.soumettre(mode.type === 'creation' ? '/api/postes' : `/api/postes/${mode.poste.id}/modification`, corps)
    } else {
      const action = mode.type === 'desactiver' ? 'desactivation' : 'reactivation'
      reponse = await s.soumettre(`/api/postes/${mode.poste.id}/${action}`, {})
    }
    if (reponse === null) return
    ouvrir(null)
    await recharger()
  }

  const formulaire = mode !== null && (mode.type === 'creation' || mode.type === 'modifier')
  const titre = mode === null ? '' : mode.type === 'creation' ? p.nouveau : `${a.actionsLibelles[mode.type]} — ${mode.poste.libelle}`
  const posteChoisi = donnees?.find((poste) => poste.id === detail) ?? null

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.postes} principal={mode === null ? { etiquette: p.nouveau, surClic: () => ouvrir({ type: 'creation' }) } : null} />
      <div className="mes-page">
      <AfficheErreur erreur={erreur} />

      {mode !== null && (
        <Panneau
          titre={titre}
          consequence={mode.type === 'desactiver' ? p.consequenceDesactivation : mode.type === 'reactiver' ? a.consequences.reactiver : undefined}
          etiquette={formulaire ? a.enregistrer : a.confirmer}
          enCours={s.enCours}
          erreur={s.erreur}
          surValider={() => void valider()}
          surAnnuler={() => ouvrir(null)}
        >
          {formulaire && (
            <>
              <Champ id="code" libelle={p.code} valeur={code} surChangement={definirCode} erreur={erreurs.code} autoFocus />
              <Champ id="libelle" libelle={p.libelle} valeur={libelle} surChangement={definirLibelle} erreur={erreurs.libelle} />
              <Choix
                id="type_poste"
                libelle={p.type}
                valeur={typePoste}
                surChangement={definirTypePoste}
                erreur={erreurs.type_poste}
                options={TYPES.map((t) => ({ valeur: t, libelle: libelles.typesPoste[t] }))}
              />
            </>
          )}
        </Panneau>
      )}

      <ListeDetail liste={<PanneauCommun titre={p.liste} icone="monitor" compte={donnees?.length} className="admin-postes-liste" serre><div className="mes-tableau"><table className="tableau-admin">
        <thead>
          <tr><th>{p.code}</th><th>{p.libelle}</th><th>{p.type}</th><th>{p.appairagesActifs}</th><th>{a.etat}</th></tr>
        </thead>
        <tbody>
          {donnees?.map((poste) => (
            <tr key={poste.id} className={poste.actif ? undefined : 'ligne-inactive'} aria-selected={detail === poste.id}>
              <td><button type="button" className="admin-poste-choix chiffres" aria-pressed={detail === poste.id}
                onClick={() => definirDetail(detail === poste.id ? null : poste.id)}>{poste.code}</button></td>
              <td>{poste.libelle}</td>
              <td>{libelles.typesPoste[poste.type_poste]}</td>
              <td className="nombre">{poste.appairages_actifs}</td>
              <td><EtatActif actif={poste.actif} /></td>
            </tr>
          ))}
        </tbody>
      </table></div></PanneauCommun>} detail={posteChoisi !== null
        ? <PanneauCommun titre={`${posteChoisi.code} · ${posteChoisi.libelle}`} icone="monitor"
          actions={<BoutonsActions element={posteChoisi} surAction={(action) => ouvrir({ type: action as 'modifier' | 'desactiver' | 'reactiver', poste: posteChoisi })} />}>
          <DetailPoste key={detail} posteId={posteChoisi.id} surChangement={() => void recharger()} />
        </PanneauCommun>
        : <PanneauCommun titre={p.detail} icone="monitor"><EtatVide message={p.choisirPoste} /></PanneauCommun>} />
    </div>
    </section>
  )
}
