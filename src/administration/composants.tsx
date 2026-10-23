import type { ReactNode } from 'react'
import { useLecture } from '../api/useLecture'
import { AfficheErreur } from '../composants/AfficheErreur'
import { Champ as ChampCommun, ChampChoix } from '../composants/Champ'
import { Pastille } from '../composants/Pastille'
import { Icone } from '../composants/Icone'
import type { NomIcone } from '../composants/icones'
import { Tiroir } from '../composants/Tiroir'
import { libelles } from '../libelles'
import { actionsVisibles, dateHeure, texteValeur } from './logique'
import type { Element, VueHistorique } from './types'
import '../styles/administration.css'

const a = libelles.administration
const ICONES_ACTIONS: Record<string, NomIcone> = {
  modifier: 'pencil', reinitialiser_pin: 'key-round', configurer_adresse: 'plug',
  reactiver: 'check', revoquer: 'x', retirer: 'x',
}

interface PropsChamp {
  id: string
  libelle: string
  valeur: string
  surChangement: (valeur: string) => void
  erreur?: string
  type?: 'text' | 'password'
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel'
  aide?: string
  autoFocus?: boolean
  maxLength?: number
  decimales?: number
}

/** Champ texte libellé, avec son message d'erreur sous la saisie. */
export function Champ({ id, libelle, valeur, surChangement, erreur, type = 'text', inputMode = 'text', aide, autoFocus, maxLength, decimales }: PropsChamp) {
  return <ChampCommun id={id} libelle={libelle} valeur={valeur} surChangement={surChangement} erreur={erreur}
    type={type} inputMode={inputMode} aide={aide} autoFocus={autoFocus} maxLength={maxLength} decimales={decimales} />
}

interface PropsChoix {
  id: string
  libelle: string
  valeur: string
  options: readonly { valeur: string; libelle: string }[]
  surChangement: (valeur: string) => void
  erreur?: string
}

export function Choix({ id, libelle, valeur, options, surChangement, erreur }: PropsChoix) {
  return <ChampChoix id={id} libelle={libelle} valeur={valeur} options={options} surChangement={surChangement}
    erreur={erreur} choixVide="—" />
}

interface PropsPanneau {
  titre: string
  /** Phrase qui dit la conséquence de l'action (affichée avant le bouton). */
  consequence?: string
  etiquette: string
  enCours: boolean
  erreur: string | null
  surValider: () => void
  surAnnuler: () => void
  /** Bouton principal désactivé (ex. PIN frais pas encore saisi). */
  bloque?: boolean
  /** Conservé pour les appels existants ; le tiroir porte son action principale. */
  principal?: boolean
  children?: ReactNode
}

/** Formulaire ou confirmation dans le tiroir commun (focus, Échap, Entrée et F8). */
export function Panneau({ titre, consequence, etiquette, enCours, erreur, surValider, surAnnuler, bloque = false, children }: PropsPanneau) {
  return <Tiroir titre={titre} etiquette={etiquette} enCours={enCours} erreur={erreur} bloque={bloque}
    consequence={consequence} surValider={surValider} surFermer={surAnnuler}>{children}</Tiroir>
}

/** Champ « raison » demandé quand la fiche est en usage. */
export function ChampMotif({ valeur, surChangement, requis }: { valeur: string; surChangement: (v: string) => void; requis: boolean }) {
  if (!requis) return null
  return <Champ id="motif" libelle={a.motif} aide={a.motifAide} valeur={valeur} surChangement={surChangement} />
}

/** Boutons secondaires des actions permises par le serveur pour cette ligne. */
export function BoutonsActions({ element, permises, surAction }: { element: Element; permises?: readonly string[]; surAction: (action: string) => void }) {
  return (
    <div className="actions-ligne admin-boutons">
      {actionsVisibles(element, permises).map((action) => (
        <button key={action} type="button" className="bouton-secondaire" onClick={() => surAction(action)}>
          {ICONES_ACTIONS[action] && <Icone nom={ICONES_ACTIONS[action]} />}
          {a.actionsLibelles[action as keyof typeof a.actionsLibelles] ?? action}
        </button>
      ))}
    </div>
  )
}

export function EtatActif({ actif }: { actif: unknown }) {
  return actif ? <Pastille ton="ok">{a.actif}</Pastille> : <Pastille>{a.inactif}</Pastille>
}

/** Case « afficher aussi les fiches désactivées ». */
export function CaseInactifs({ coche, surChangement }: { coche: boolean; surChangement: (v: boolean) => void }) {
  return (
    <label className="mes-case">
      <input type="checkbox" checked={coche} onChange={(e) => surChangement(e.target.checked)} />
      {a.afficherInactifs}
    </label>
  )
}

/** Chronologie d'une fiche : avant → après, qui, quand, pourquoi (plus récent d'abord). */
export function Chronologie({ table, ligneId, surFermer }: { table: string; ligneId: number; surFermer?: () => void }) {
  const { donnees, erreur } = useLecture<VueHistorique>(`/api/historique/${table}/${ligneId}`)
  const h = a.historiqueVue
  return (
    <section className="chronologie" aria-label={a.historique}>
      <AfficheErreur erreur={erreur} />
      {donnees !== null && (
        <>
          <h3>{h.ficheActuelle}</h3>
          <dl className="fiche">
            {Object.entries(donnees.ligne).map(([cle, valeur]) => (
              <div key={cle}><dt>{cle}</dt><dd>{texteValeur(valeur)}</dd></div>
            ))}
          </dl>
          {donnees.historique.length === 0 && <p className="aide">{h.aucunChangement}</p>}
          <ol className="evenements">
            {donnees.historique.map((entree) => (
              <li key={entree.id}>
                <p>
                  <strong>{dateHeure(entree.modifie_le)}</strong> {h.par} {entree.modifie_par_nom} — {entree.motif ?? h.sansMotif}
                </p>
                <table>
                  <thead><tr><th>{h.champ}</th><th>{h.avant}</th><th>{h.apres}</th></tr></thead>
                  <tbody>
                    {entree.changements.map((c) => (
                      <tr key={c.champ}><td>{c.champ}</td><td>{texteValeur(c.avant)}</td><td>{texteValeur(c.apres)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </li>
            ))}
          </ol>
        </>
      )}
      {surFermer !== undefined && <button type="button" className="bouton-lien" onClick={surFermer}>{a.fermer}</button>}
    </section>
  )
}
