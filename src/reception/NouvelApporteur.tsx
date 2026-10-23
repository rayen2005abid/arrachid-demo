// Création d'un apporteur sans quitter l'arrivée (PROMPT §6.20.4) : doublons pendant la frappe,
// téléphone obligatoire, numéro déjà utilisé seulement après confirmation explicite (CONTEXTE §6.1).
import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useDiffere } from '../api/useDiffere'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { ChampChoix } from '../composants/Champ'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { libelles } from '../libelles'
import { cheminDoublons, corpsCreation, FORMULAIRE_VIDE, texteRaisons, type Apporteur, type Erreurs, type Formulaire, type Suggestion } from '../apporteurs/logique'
import { surEntree } from './clavier'
import { ChampPont, type Principal } from './champs'
import type { ApporteurTrouve } from './logique'
import { useConfirmationDoublons } from '../apporteurs/useConfirmationDoublons'

const t = libelles.reception
const a = libelles.apporteurs
export const FORMULAIRE_APPORTEUR = 'formulaire-nouvel-apporteur'

interface Props {
  nomPropose: string
  surCree: (apporteur: ApporteurTrouve) => void
  surAnnuler: () => void
  surPrincipal: (principal: Principal) => void
}

export function NouvelApporteur({ nomPropose, surCree, surAnnuler, surPrincipal }: Props) {
  const [f, definirF] = useState<Formulaire>({ ...FORMULAIRE_VIDE, nom: /[0-9]/.test(nomPropose) ? '' : nomPropose.trim() })
  const [erreurs, definirErreurs] = useState<Erreurs>({})
  const [confirmer, definirConfirmer] = useState(false)
  const s = useSoumission()
  const confirmationDoublons = useConfirmationDoublons(f)
  const pourDoublons = useDiffere(f, 250)
  const chemin = cheminDoublons(pourDoublons)
  const doublons = useLecture<Suggestion[]>(chemin)
  const suggestions = confirmationDoublons.suggestions.length > 0 ? confirmationDoublons.suggestions : chemin !== null ? (doublons.donnees ?? []) : []

  useEffect(() => surPrincipal({ formulaire: FORMULAIRE_APPORTEUR, etiquette: t.creerApporteur, enCours: s.enCours || confirmationDoublons.enCours }), [s.enCours, confirmationDoublons.enCours, surPrincipal])

  const changer = (cle: keyof Formulaire) => (valeur: string) => {
    confirmationDoublons.reinitialiser()
    if (cle === 'telephone') definirConfirmer(false)
    definirF((avant) => ({ ...avant, [cle]: valeur }))
    s.reinitialiser()
  }

  const valider = async (e: FormEvent) => {
    e.preventDefault()
    if (s.enCours || confirmationDoublons.enCours) return
    const r = corpsCreation(f)
    definirErreurs(r.erreurs)
    if (r.corps === null) return
    if (!await confirmationDoublons.verifier()) return
    const reponse = await s.soumettre<{ apporteur: Apporteur }>('/api/apporteurs', { ...r.corps, confirmer_telephone: confirmer })
    if (reponse !== null) surCree(reponse.apporteur)
  }

  const echap = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      surAnnuler()
    }
  }

  return (
    <form id={FORMULAIRE_APPORTEUR} aria-label={t.titreNouvelApporteur} onSubmit={(e) => void valider(e)} onKeyDown={(e) => { echap(e); surEntree(e) }}>
      <Panneau titre={t.titreNouvelApporteur} icone="contact">
        <div className="pont-grille">
          <ChampPont id="nouvel-nom" libelle={a.nom} valeur={f.nom} surChangement={changer('nom')} erreur={erreurs.nom} autoFocus />
          <ChampChoix
            id="nouvel-type"
            libelle={a.type}
            data-champ
            valeur={f.type_apporteur}
            options={[{ valeur: 'personne', libelle: a.types.personne }, { valeur: 'societe', libelle: a.types.societe }]}
            surChangement={(v) => changer('type_apporteur')(v === 'societe' ? 'societe' : 'personne')}
          />
          {f.type_apporteur === 'societe'
            ? <ChampPont id="nouvel-mf" libelle={a.matricule} valeur={f.matricule_fiscal} surChangement={changer('matricule_fiscal')} erreur={erreurs.matricule_fiscal} chiffres />
            : <ChampPont id="nouvel-cin" libelle={a.cin} valeur={f.cin} surChangement={changer('cin')} erreur={erreurs.cin} inputMode="numeric" chiffres />}
          <ChampPont id="nouvel-telephone" libelle={a.telephone} aide={a.telephoneAide} valeur={f.telephone} surChangement={changer('telephone')} erreur={erreurs.telephone} inputMode="tel" chiffres />
          <ChampPont id="nouvel-localite" libelle={a.localite} valeur={f.localite} surChangement={changer('localite')} />
          {s.code === 'telephone_deja_utilise' && (
            <label className="mes-case pont-plein">
              <input type="checkbox" checked={confirmer} onChange={(e) => definirConfirmer(e.target.checked)} />
              {a.confirmerTelephone}
            </label>
          )}
        </div>
        {suggestions.length > 0 && (
          <Note ton="alerte" vivante>
            <p><strong>{t.doublons}</strong></p>
            <ul className="reception-suggestions">
              {suggestions.map((sug) => (
                <li key={sug.id}>
                  {sug.nom} — {sug.telephone} — {sug.cin_masquee ?? sug.matricule_fiscal} ({texteRaisons(sug)}){' '}
                  <button type="button" className="bouton-lien" onClick={() => surCree(sug)}>{t.choisirDoublon}</button>
                </li>
              ))}
            </ul>
          </Note>
        )}
        {confirmationDoublons.suggestions.length > 0 && (
          <label className="mes-case">
            <input type="checkbox" checked={confirmationDoublons.confirme} onChange={(e) => confirmationDoublons.confirmer(e.target.checked)} />
            {a.autreApporteur}
          </label>
        )}
        {(confirmationDoublons.erreur ?? s.erreur) !== null && <Note ton="erreur">{confirmationDoublons.erreur ?? s.erreur}</Note>}
        <div>
          <button type="button" className="bouton-secondaire" onClick={surAnnuler}>{libelles.commun.annuler}</button>
        </div>
      </Panneau>
    </form>
  )
}
