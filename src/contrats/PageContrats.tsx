import { useState } from 'react'
import { useDiffere } from '../api/useDiffere'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, Choix } from '../administration/composants'
import { grammesVersKg } from '../administration/unites'
import type { Client } from '../clients/logique'
import { Champ as ChampDate } from '../composants/Champ'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille, type TonPastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { Tiroir } from '../composants/Tiroir'
import type { ResumeQualite } from '../cuves/logique'
import { afficherMillimes } from '../format/montants'
import { libelles } from '../libelles'
import {
  corpsContrat, cuvesPossibles, QUALITES_VENDABLES, reservationActive, SAISIE_VIDE,
  type Contrat, type ListeContrats, type QualiteVendable, type SaisieContrat,
} from './logique'
import '../styles/bureau.css'

const t = libelles.contrats
const DELAI_FRAPPE_MS = 250
const TONS: Record<Contrat['statut'], TonPastille> = { actif: 'action', solde: 'ok', annule: 'neutre' }

type Action = { type: 'annuler' | 'cuve'; contrat: Contrat } | null

/** Contrats de vente en vrac (CONTEXTE §21.2–§21.3) : chaque contrat réserve son huile. */
export function PageContrats() {
  const liste = useLecture<ListeContrats>('/api/contrats')
  const soumission = useSoumission()
  const [saisie, definirSaisie] = useState<SaisieContrat | null>(null)
  const [recherche, definirRecherche] = useState('')
  const differee = useDiffere(recherche, DELAI_FRAPPE_MS)
  const clients = useLecture<Client[]>(saisie !== null && differee.trim().length >= 2 ? `/api/clients?q=${encodeURIComponent(differee.trim())}` : null)
  const [action, definirAction] = useState<Action>(null)
  const [motif, definirMotif] = useState('')
  const [cuveChoisie, definirCuveChoisie] = useState('')
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const donnees = liste.donnees

  const fermer = () => {
    soumission.reinitialiser()
    definirSaisie(null)
    definirAction(null)
    definirMotif('')
    definirCuveChoisie('')
    definirRecherche('')
    definirErreurLocale(null)
  }
  const changer = <K extends keyof SaisieContrat>(cle: K, valeur: SaisieContrat[K]) => {
    definirSaisie((avant) => (avant === null ? avant : { ...avant, [cle]: valeur }))
    definirErreurLocale(null)
  }

  const apres = async (texte: string) => {
    definirMessage({ texte, type: 'ok' })
    fermer()
    await liste.recharger()
  }

  const enregistrer = async () => {
    if (saisie !== null) {
      const r = corpsContrat(saisie)
      definirErreurLocale(r.erreur)
      if (r.corps === null) return
      const reponse = await soumission.soumettre<{ contrat: Contrat }>('/api/contrats', r.corps)
      if (reponse !== null) await apres(t.cree.replace('{numero}', String(reponse.contrat.numero)))
      return
    }
    if (action === null) return
    if (motif.trim() === '') { definirErreurLocale(t.erreurs.motif); return }
    if (action.type === 'annuler') {
      const reponse = await soumission.soumettre<{ contrat: Contrat }>(`/api/contrats/${action.contrat.id}/annulation`, { motif: motif.trim() })
      if (reponse !== null) await apres(t.annule.replace('{numero}', String(reponse.contrat.numero)))
      return
    }
    const reservation = reservationActive(action.contrat)
    if (reservation === null) return
    const reponse = await soumission.soumettre<{ contrat: Contrat }>(`/api/reservations-stock/${reservation.id}/affectation`, {
      cuve_id: cuveChoisie === '' ? null : Number(cuveChoisie), motif: motif.trim(),
    })
    if (reponse !== null) await apres(t.affecte.replace('{numero}', String(reponse.contrat.numero)))
  }

  const ouvert = saisie !== null || action !== null
  const optionsCuves = (qualite: string) => (donnees === null ? [] : cuvesPossibles(donnees.cuves, qualite)).map((c) => ({
    valeur: String(c.id), libelle: t.cuveOption.replace('{code}', c.code).replace('{kg}', grammesVersKg(c.stock_disponible_g)),
  }))
  const ouvrirAction = (type: 'annuler' | 'cuve', contrat: Contrat) => {
    fermer()
    const reservation = reservationActive(contrat)
    if (type === 'cuve') definirCuveChoisie(reservation?.cuve_id == null ? '' : String(reservation.cuve_id))
    definirAction({ type, contrat })
  }

  const colonnesStock: Colonne<ResumeQualite>[] = [
    { cle: 'qualite', titre: t.qualite, rendu: (q) => t.qualites[q.qualite as QualiteVendable] },
    { cle: 'stock', titre: t.stock, rendu: (q) => `${grammesVersKg(q.stock_calcule_g)} kg`, nombre: true },
    { cle: 'reserve', titre: t.reserve, rendu: (q) => `${grammesVersKg(q.stock_reserve_g)} kg`, nombre: true },
    { cle: 'disponible', titre: t.disponible, rendu: (q) => <strong>{grammesVersKg(q.stock_disponible_g)} kg</strong>, nombre: true },
  ]
  const colonnesContrats: Colonne<Contrat>[] = [
    { cle: 'numero', titre: t.numero, rendu: (c) => c.numero, nombre: true },
    { cle: 'client', titre: t.client, rendu: (c) => c.client },
    { cle: 'qualite', titre: t.qualite, rendu: (c) => t.qualites[c.qualite as QualiteVendable] ?? c.qualite },
    { cle: 'quantite', titre: t.quantite, rendu: (c) => `${grammesVersKg(c.quantite_prevue_g)} kg`, nombre: true },
    { cle: 'prix', titre: t.prix, rendu: (c) => afficherMillimes(c.prix_unitaire_millimes_kg), nombre: true },
    { cle: 'date', titre: t.datePrevue, rendu: (c) => <span className="chiffres">{c.date_prevue}</span> },
    { cle: 'reservation', titre: t.reservation, rendu: (c) => { const r = reservationActive(c); return r === null ? '—' : r.cuve_code ?? t.niveauQualite } },
    { cle: 'etat', titre: t.etat, rendu: (c) => <Pastille ton={TONS[c.statut]}>{t.etats[c.statut]}</Pastille> },
    {
      // Seules les actions que le serveur propose (`actions_possibles`) ont leur bouton.
      cle: 'actions', titre: libelles.administration.actions, rendu: (c) => !ouvert && c.actions_possibles.length > 0 && (
        <div className="actions-ligne">
          {c.actions_possibles.includes('affecter_cuve') && <button type="button" className="bouton-secondaire" onClick={() => ouvrirAction('cuve', c)}>{t.boutonCuve}</button>}
          {c.actions_possibles.includes('annuler') && <button type="button" className="bouton-secondaire" onClick={() => ouvrirAction('annuler', c)}>{t.boutonAnnuler}</button>}
        </div>
      ),
    },
  ]

  const titreTiroir = saisie !== null ? t.nouveau
    : action === null ? '' : (action.type === 'annuler' ? t.titreAnnulation : t.titreCuve).replace('{numero}', String(action.contrat.numero))

  return <section>
    <EnTeteEcran titre={libelles.ecrans.contrats} message={message}
      principal={ouvert ? null : { etiquette: t.nouveau, surClic: () => { fermer(); definirSaisie({ ...SAISIE_VIDE }) } }} />
    <div className="mes-page bureau-page">
      <Note>{t.aide}</Note>
      <Panneau titre={t.titreStock} icone="droplet" serre>
        <TableauDonnees
          legende={t.legendeStock}
          colonnes={colonnesStock}
          lignes={donnees === null ? null : donnees.qualites.filter((q) => q.qualite !== 'lampante')}
          cleLigne={(q) => q.qualite}
          vide={t.aucunStock}
          erreur={liste.erreur}
        />
      </Panneau>
      <Panneau titre={t.titreListe} icone="handshake" compte={donnees?.contrats.length} serre>
        <TableauDonnees
          legende={t.legendeListe}
          colonnes={colonnesContrats}
          lignes={donnees?.contrats ?? (liste.erreur === null ? null : [])}
          cleLigne={(c) => c.id}
          vide={t.aucun}
        />
      </Panneau>
    </div>

    {ouvert && donnees !== null && (
      <Tiroir
        titre={titreTiroir}
        icone="handshake"
        etiquette={saisie !== null ? t.creer : action?.type === 'annuler' ? t.annuler : t.affecter}
        surValider={() => void enregistrer()}
        surFermer={fermer}
        enCours={soumission.enCours}
        erreur={erreurLocale ?? soumission.erreur}
        consequence={saisie !== null ? t.consequenceCreation : action?.type === 'annuler' ? t.consequenceAnnulation : t.consequenceCuve}
      >
        {saisie !== null && <>
          <Champ id="recherche-client-contrat" libelle={t.client} aide={t.clientAide} valeur={recherche} surChangement={(v) => { definirRecherche(v); changer('clientId', null) }} />
          {saisie.clientId === null && (clients.donnees ?? []).length > 0 && <div className="bureau-actions">
            {(clients.donnees ?? []).map((c) => <button key={c.id} type="button" className="bouton-secondaire" onClick={() => { changer('clientId', c.id); definirRecherche(c.nom) }}>{c.nom}</button>)}
          </div>}
          <Choix id="qualite-contrat" libelle={t.qualite} valeur={saisie.qualite} surChangement={(v) => { changer('qualite', (v || 'extra_vierge') as QualiteVendable); changer('cuveId', '') }}
            options={QUALITES_VENDABLES.map((q) => ({ valeur: q, libelle: t.qualites[q] }))} />
          <Note>{t.lampante}</Note>
          <Champ id="quantite-contrat" libelle={t.quantite} valeur={saisie.quantite} surChangement={(v) => changer('quantite', v)} inputMode="decimal" />
          <Champ id="prix-contrat" libelle={t.prix} valeur={saisie.prix} surChangement={(v) => changer('prix', v)} inputMode="decimal" />
          <ChampDate id="date-contrat" type="date" libelle={t.datePrevue} valeur={saisie.datePrevue} surChangement={(v) => changer('datePrevue', v)} />
          <Choix id="cuve-contrat" libelle={t.cuve} valeur={saisie.cuveId} surChangement={(v) => changer('cuveId', v)} options={optionsCuves(saisie.qualite)} />
        </>}
        {action !== null && <>
          {action.type === 'cuve' && <Choix id="cuve-reservation" libelle={t.cuve} valeur={cuveChoisie} surChangement={definirCuveChoisie} options={optionsCuves(action.contrat.qualite)} />}
          <Champ id="motif-contrat" libelle={t.motif} valeur={motif} surChangement={definirMotif} />
        </>}
      </Tiroir>
    )}
  </section>
}
