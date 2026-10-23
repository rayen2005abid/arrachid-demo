import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { AfficheErreur } from '../composants/AfficheErreur'
import { libelles } from '../libelles'
import { BoutonsActions, Champ, Choix, Chronologie, EtatActif, Panneau } from './composants'
import { adresseValide, texteValeur, type Erreurs } from './logique'
import { TYPES_EQUIPEMENT, type Equipement } from './types'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { Panneau as PanneauCommun } from '../composants/Panneau'
import { RepereEquipement } from './reperes'

const a = libelles.administration
const q = a.equipements
const CHAMPS = ['code', 'libelle', 'marque', 'modele', 'numero_serie', 'emplacement'] as const
type NomChamp = (typeof CHAMPS)[number] | 'type'
const LIBELLES: Record<(typeof CHAMPS)[number], string> = {
  code: q.code,
  libelle: q.libelle,
  marque: q.marque,
  modele: q.modele,
  numero_serie: q.numeroSerie,
  emplacement: q.emplacement,
}

type Mode =
  | { type: 'creation' }
  | { type: 'modifier' | 'desactiver' | 'reactiver' | 'configurer_adresse'; equipement: Equipement }
  | null

/**
 * Registre des équipements (CONTEXTE §27). `metier` : fiche par le responsable ou le propriétaire ;
 * `reseau` : seule l'adresse, par l'administrateur.
 */
export function PageEquipements({ vue }: { vue: 'metier' | 'reseau' }) {
  const { donnees, erreur, recharger } = useLecture<Equipement[]>(vue === 'metier' ? '/api/equipements' : '/api/equipements/reseau')
  const s = useSoumission()
  const [mode, definirMode] = useState<Mode>(null)
  const [saisies, definirSaisies] = useState<Record<NomChamp, string>>(vide())
  const [adresse, definirAdresse] = useState('')
  const [erreurs, definirErreurs] = useState<Erreurs>({})
  const [historique, definirHistorique] = useState<number | null>(null)

  const ouvrir = (suivant: Mode) => {
    s.reinitialiser()
    definirErreurs({})
    const e = suivant !== null && suivant.type !== 'creation' ? suivant.equipement : null
    definirSaisies(e === null ? vide() : { type: e.type, ...Object.fromEntries(CHAMPS.map((c) => [c, e[c] ?? ''])) } as Record<NomChamp, string>)
    definirAdresse(e?.adresse_reseau ?? '')
    definirMode(suivant)
  }

  const valider = async () => {
    if (mode === null) return
    let reponse: unknown
    if (mode.type === 'creation' || mode.type === 'modifier') {
      const manquants: Erreurs = {}
      for (const champ of ['code', 'libelle', 'type'] as const) if (saisies[champ].trim() === '') manquants[champ] = a.erreurs.obligatoire
      definirErreurs(manquants)
      if (Object.keys(manquants).length > 0) return
      const corps = Object.fromEntries(Object.entries(saisies).map(([c, v]) => [c, v.trim() === '' ? null : v.trim()]))
      reponse = await s.soumettre(mode.type === 'creation' ? '/api/equipements' : `/api/equipements/${mode.equipement.id}/modification`, corps)
    } else if (mode.type === 'configurer_adresse') {
      if (!adresseValide(adresse)) {
        definirErreurs({ adresse_reseau: q.adresseAide })
        return
      }
      reponse = await s.soumettre(`/api/equipements/${mode.equipement.id}/adresse-reseau`, { adresse_reseau: adresse.trim() === '' ? null : adresse.trim() })
    } else {
      reponse = await s.soumettre(`/api/equipements/${mode.equipement.id}/${mode.type === 'desactiver' ? 'desactivation' : 'reactivation'}`, {})
    }
    if (reponse === null) return
    ouvrir(null)
    await recharger()
  }

  const changer = (champ: NomChamp) => (valeur: string) => definirSaisies({ ...saisies, [champ]: valeur })
  const formulaire = mode !== null && (mode.type === 'creation' || mode.type === 'modifier')
  const titre = mode === null ? '' : mode.type === 'creation' ? q.nouveau : `${a.actionsLibelles[mode.type]} — ${mode.equipement.code}`
  const consequence =
    mode?.type === 'desactiver' ? q.consequenceDesactivation : mode?.type === 'reactiver' ? a.consequences.reactiver : undefined

  return (
    <section>
      <EnTeteEcran
        titre={vue === 'metier' ? libelles.ecrans.equipements : libelles.ecrans.adressesEquipements}
        principal={mode === null && vue === 'metier' ? { etiquette: q.nouveau, surClic: () => ouvrir({ type: 'creation' }) } : null}
      />
      <div className="mes-page">
      <AfficheErreur erreur={erreur} />

      {mode !== null && (
        <Panneau titre={titre} consequence={consequence} etiquette={mode.type === 'desactiver' || mode.type === 'reactiver' ? a.confirmer : a.enregistrer} enCours={s.enCours} erreur={s.erreur} surValider={() => void valider()} surAnnuler={() => ouvrir(null)}>
          {formulaire && (
            <>
              <Choix id="type" libelle={q.type} valeur={saisies.type} surChangement={changer('type')} erreur={erreurs.type} options={TYPES_EQUIPEMENT.map((t) => ({ valeur: t, libelle: q.types[t] }))} />
              {CHAMPS.map((champ, i) => (
                <Champ key={champ} id={champ} libelle={LIBELLES[champ]} valeur={saisies[champ]} surChangement={changer(champ)} erreur={erreurs[champ]} autoFocus={i === 0} />
              ))}
            </>
          )}
          {mode.type === 'configurer_adresse' && (
            <Champ id="adresse_reseau" libelle={q.adresse} aide={q.adresseAide} valeur={adresse} surChangement={definirAdresse} erreur={erreurs.adresse_reseau} autoFocus />
          )}
        </Panneau>
      )}

      <PanneauCommun titre={vue === 'metier' ? q.liste : q.adresses} icone={vue === 'metier' ? 'printer' : 'plug'} compte={donnees?.length} serre><div className="mes-tableau"><table className="tableau-admin">
        <thead>
          <tr><th>{q.code}</th><th>{q.type}</th><th>{q.libelle}</th><th>{q.emplacement}</th>{vue === 'reseau' && <th>{q.adresse}</th>}<th>{q.postes}</th><th>{a.etat}</th><th>{a.actions}</th></tr>
        </thead>
        <tbody>
          {donnees?.map((e) => (
            <tr key={e.id} className={e.actif ? undefined : 'ligne-inactive'}>
              <td><span className="admin-identite"><RepereEquipement type={e.type} /><span className="chiffres">{e.code}</span></span></td>
              <td>{q.types[e.type]}</td>
              <td>{e.libelle}</td>
              <td>{texteValeur(e.emplacement)}</td>
              {vue === 'reseau' && <td>{texteValeur(e.adresse_reseau)}</td>}
              <td>{e.postes.map((poste) => poste.code).join(', ') || texteValeur(null)}</td>
              <td><EtatActif actif={e.actif} /></td>
              <td>
                <div className="actions-ligne">
                  <BoutonsActions element={e} surAction={(action) => ouvrir({ type: action as 'modifier', equipement: e })} />
                  {vue === 'metier' && <button type="button" className="bouton-lien" onClick={() => definirHistorique(historique === e.id ? null : e.id)}>{a.historique}</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div></PanneauCommun>
      {/* L'historique d'équipement exige `gerer_equipement_metier` : vue métier seulement. */}
      {historique !== null && <Chronologie key={historique} table="equipement" ligneId={historique} surFermer={() => definirHistorique(null)} />}
    </div>
    </section>
  )
}

function vide(): Record<NomChamp, string> {
  return { type: '', code: '', libelle: '', marque: '', modele: '', numero_serie: '', emplacement: '' }
}
