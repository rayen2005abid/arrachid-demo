// Pièces communes des fiches papier du Rattrapage (PAP-01 à PAP-07, refonte Session 7) : en-tête avec le retour à la
// page des liens, cadre du formulaire, parties de la fiche, lignes à recopier et fiches récentes.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Champ, Choix } from '../administration/composants'
import { Champ as ChampCommun } from '../composants/Champ'
import { EnTeteEcran, type ActionPrincipale, type MessageEcran } from '../composants/EnTeteEcran'
import { Icone } from '../composants/Icone'
import type { NomIcone } from '../composants/icones'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { useSessionOuverte } from '../contextes/session'
import { formaterHorodatage } from '../format/dates'
import { erreurSaisieNumerique } from '../format/validationNumerique'
import { libelles } from '../libelles'
import { entreesVisibles } from '../navigation'
import '../styles/rattrapage.css'
import { optionsAuteurs, type Auteur, type EnTeteFiche } from './logiqueProduction'

const t = libelles.saisieProduction
const CODE_RATTRAPAGE = 'PAP-00'

/** Lien « Toutes les fiches » vers la page Rattrapage, seulement si la session la voit. */
export function RetourFiches() {
  const { utilisateur, poste, permissions } = useSessionOuverte()
  const page = entreesVisibles(permissions, utilisateur.role, poste.type_poste).find((entree) => entree.code === CODE_RATTRAPAGE)
  if (page === undefined) return null
  return (
    <Link to={page.chemin} className="bouton-secondaire fiche-retour">
      <Icone nom="arrow-left" />
      {libelles.fichesPapier.toutes}
    </Link>
  )
}

interface PropsPage {
  titre: string
  message?: MessageEcran | null
  principal: ActionPrincipale
  /** Consigne de la fiche (comment la recopier). */
  aide: ReactNode
  /** Lecture de préparation en échec. */
  erreur?: string | null
  /** Fiches déjà enregistrées, à côté du formulaire. */
  recentes: ReactNode
  children: ReactNode
}

/** Page d'une fiche papier : la fiche à recopier à gauche, les fiches récentes à droite (dessous sous 1280 px). */
export function PageFichePapier({ titre, message, principal, aide, erreur, recentes, children }: PropsPage) {
  return (
    <section>
      <EnTeteEcran titre={titre} sousTitre={libelles.ecrans.rattrapage} message={message} principal={principal}>
        <RetourFiches />
      </EnTeteEcran>
      <div className="mes-page fiche-page">
        <div className="fiche-principale">
          <Note>{aide}</Note>
          {erreur != null && <Note ton="erreur">{erreur}</Note>}
          {children}
        </div>
        <div className="fiche-annexe">{recentes}</div>
      </div>
    </section>
  )
}

/**
 * Cadre du formulaire de la fiche : bandeau et corps d'un panneau, sans région nommée (les libellés des champs ne
 * doivent pas retrouver le titre du cadre).
 */
export function CadreFiche({ titre, icone, children }: { titre: string; icone?: NomIcone; children: ReactNode }) {
  return (
    <div className="mes-panneau fiche-cadre">
      <header className="mes-bandeau">
        <h2>{icone !== undefined && <Icone nom={icone} />}{titre}</h2>
      </header>
      <div className="mes-corps fiche-corps">{children}</div>
    </div>
  )
}

/** Partie d'une fiche (échantillon, analyse, paiement…) : un titre et ses champs en grille. */
export function PartieFiche({ titre, children }: { titre?: string; children: ReactNode }) {
  return (
    <div className="fiche-partie">
      {titre !== undefined && <h3 className="fiche-partie-titre">{titre}</h3>}
      <div className="fiche-champs">{children}</div>
    </div>
  )
}

export function Heure({ id, libelle, valeur, surChangement }: { id: string; libelle: string; valeur: string; surChangement: (v: string) => void }) {
  return <ChampCommun id={id} type="datetime-local" libelle={libelle} valeur={valeur} surChangement={surChangement} chiffres />
}

/** Case à cocher d'une partie de la fiche (« la fin de production est notée sur la fiche »). */
export function Case({ libelle, coche, surChangement }: { libelle: string; coche: boolean; surChangement: (v: boolean) => void }) {
  return <label className="mes-case fiche-case"><input type="checkbox" checked={coche} onChange={(e) => surChangement(e.target.checked)} />{libelle}</label>
}

/** Cellule de saisie d'un tableau de lignes : libellé lu par la colonne et le rang de la ligne. */
export function Cellule({ libelle, rang, valeur, surChangement, type = 'text' }: { libelle: string; rang: number; valeur: string; surChangement: (v: string) => void; type?: 'text' | 'datetime-local' }) {
  const probleme = erreurSaisieNumerique(valeur, type === 'text' ? 'decimal' : undefined)
  return <td><input className="mes-saisie" aria-label={`${libelle} — ${rang + 1}`} aria-invalid={probleme !== undefined} title={probleme} type={type} inputMode={type === 'text' ? 'decimal' : undefined} value={valeur} autoComplete="off" onChange={(e) => surChangement(e.target.value)} />{probleme !== undefined && <span className="mes-champ-erreur">{probleme}</span>}</td>
}

export function CelluleChoix({ libelle, rang, valeur, options, surChangement }: { libelle: string; rang: number; valeur: string; options: readonly { valeur: string; libelle: string }[]; surChangement: (v: string) => void }) {
  return <td><select className="mes-saisie" aria-label={`${libelle} — ${rang + 1}`} value={valeur} onChange={(e) => surChangement(e.target.value)}><option value="">—</option>{options.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}</select></td>
}

/** Ce que toute fiche numérotée porte : numéro imprimé, heure, opérateur noté. */
export function EnTeteDeFiche<S extends EnTeteFiche>({ prefixe, libelleHeure, saisie, auteurs, changer }: { prefixe: string; libelleHeure: string; saisie: S; auteurs: readonly Auteur[]; changer: (cle: keyof EnTeteFiche, valeur: string) => void }) {
  return <>
    <Champ id={`numero-fiche-${prefixe}`} libelle={t.numero} valeur={saisie.numeroPapier} surChangement={(v) => changer('numeroPapier', v)} autoFocus />
    <Heure id={`heure-fiche-${prefixe}`} libelle={libelleHeure} valeur={saisie.heure} surChangement={(v) => changer('heure', v)} />
    <Choix id={`operateur-fiche-${prefixe}`} libelle={t.operateur} valeur={saisie.operateur} surChangement={(v) => changer('operateur', v)} options={optionsAuteurs(auteurs)} />
  </>
}

/** Lignes recopiées de la fiche (lots, pesées, contenants, articles) : une ligne par ligne du papier. */
export function TableauLignes({ titre, colonnes, surAjout, children }: { titre: string; colonnes: readonly string[]; surAjout: () => void; children: ReactNode }) {
  return (
    <div className="fiche-partie">
      <h3 className="fiche-partie-titre">{titre}</h3>
      <div className="mes-tableau fiche-lignes">
        <table>
          <thead><tr>{colonnes.map((colonne) => <th key={colonne} scope="col">{colonne}</th>)}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      <div className="bureau-actions"><button type="button" className="bouton-secondaire" onClick={surAjout}>{t.ajouterLigne}</button></div>
    </div>
  )
}

interface FicheEnregistree { id: number; numero_papier: string; horodatage_metier: string }

interface PropsRecentes<F extends FicheEnregistree> {
  fiches: F[] | null
  erreur: string | null
  /** Ce que la fiche a donné ; par défaut « reprise » ou « à reprendre » (champ `reprise` du serveur). */
  resultat?: (fiche: F) => ReactNode
  vide?: string
}

function resultatParDefaut(fiche: FicheEnregistree & { reprise?: boolean }): ReactNode {
  return fiche.reprise === true ? <Pastille ton="ok">{t.reprise}</Pastille> : <Pastille ton="alerte">{t.enAttente}</Pastille>
}

/** Fiches papier de ce type déjà enregistrées, les plus récentes d'abord (ordre du serveur). */
export function FichesRecentes<F extends FicheEnregistree>({ fiches, erreur, resultat = resultatParDefaut, vide = t.aucun }: PropsRecentes<F>) {
  const colonnes: Colonne<F>[] = [
    { cle: 'numero', titre: libelles.fichesPapier.numero, rendu: (fiche) => <span className="chiffres">{fiche.numero_papier}</span> },
    { cle: 'heure', titre: t.heureLigne, rendu: (fiche) => <span className="chiffres">{formaterHorodatage(fiche.horodatage_metier)}</span> },
    { cle: 'resultat', titre: t.resultat, rendu: resultat },
  ]
  return (
    <Panneau titre={libelles.fichesPapier.recentes} icone="history" compte={fiches?.length} serre>
      <TableauDonnees
        legende={libelles.fichesPapier.legendeRecentes}
        colonnes={colonnes}
        lignes={fiches ?? (erreur === null ? null : [])}
        cleLigne={(fiche) => fiche.id}
        vide={vide}
        erreur={erreur}
      />
    </Panneau>
  )
}
