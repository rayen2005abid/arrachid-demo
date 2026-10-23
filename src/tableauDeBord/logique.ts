// Logique pure du tableau de bord (propriétaire et responsable) : dates en « AAAA-MM-JJ » sans fuseau, grille du mois,
// semaine de l'agenda, rendez-vous et boutons épinglés gardés sur le poste, lignes de la situation du jour.
// Le serveur reste juge des chiffres : la situation ne fait que compter ou additionner les lignes qu'il renvoie.
import type { NomIcone } from '../composants/icones'
import { grammesVersKg } from '../administration/unites'
import { grouperMilliers } from '../format/saisie'
import { libelles } from '../libelles'

const t = libelles.tableauDeBord

// ── Dates ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const MS_JOUR = 86_400_000
const versUtc = (jour: string) => {
  const [annee, mois, numero] = jour.split('-').map(Number)
  return Date.UTC(annee, mois - 1, numero)
}
function depuisUtc(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export const ajouterJours = (jour: string, n: number) => depuisUtc(versUtc(jour) + n * MS_JOUR)
/** Lundi de la semaine du jour donné. */
export const lundiDe = (jour: string) => ajouterJours(jour, -((new Date(versUtc(jour)).getUTCDay() + 6) % 7))
export const premierDuMois = (jour: string) => `${jour.slice(0, 7)}-01`
export function decalerMois(jour: string, n: number): string {
  const d = new Date(versUtc(premierDuMois(jour)))
  return depuisUtc(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))
}
export const numeroDuJour = (jour: string) => Number(jour.slice(8, 10))
export const libelleMois = (jour: string) => `${t.mois[Number(jour.slice(5, 7)) - 1]} ${jour.slice(0, 4)}`
/** « 15/10/2026 ». */
export const dateCourte = (jour: string) => `${jour.slice(8, 10)}/${jour.slice(5, 7)}/${jour.slice(0, 4)}`
/** « Jeudi 15/10/2026 ». */
export const dateAvecJour = (jour: string) => `${t.jours[(new Date(versUtc(jour)).getUTCDay() + 6) % 7]} ${dateCourte(jour)}`

export interface CaseMois {
  jour: string
  horsMois: boolean
}
/** Semaines (lundi → dimanche) qui couvrent le mois du jour donné ; la dernière semaine s'arrête avec le mois. */
export function grilleMois(jour: string): CaseMois[][] {
  const mois = jour.slice(0, 7)
  const semaines: CaseMois[][] = []
  let courant = lundiDe(premierDuMois(jour))
  do {
    const semaine: CaseMois[] = []
    for (let i = 0; i < 7; i++) {
      semaine.push({ jour: courant, horsMois: courant.slice(0, 7) !== mois })
      courant = ajouterJours(courant, 1)
    }
    semaines.push(semaine)
  } while (courant.slice(0, 7) === mois)
  return semaines
}

/** « 08:30 » → minutes depuis minuit ; null si le texte n'est pas une heure. */
export function minutes(heure: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(heure)
  return m === null ? null : Number(m[1]) * 60 + Number(m[2])
}
const HEURE_TUNIS = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
/** Minutes depuis minuit à Tunis, pour la ligne « maintenant » de l'agenda. */
export function minutesTunis(instant: Date = new Date()): number {
  const p = Object.fromEntries(HEURE_TUNIS.formatToParts(instant).map((x) => [x.type, x.value]))
  return Number(p.hour) * 60 + Number(p.minute)
}
export const heureTexte = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// ── Agenda : aide-mémoire du poste (ne crée ni pesée, ni contrat, ni paiement) ───────────────────────────────────────

export const DEBUT_AGENDA = 6 * 60
export const PAS_AGENDA = 30
export const CASES_AGENDA = 32
export const FIN_AGENDA = DEBUT_AGENDA + CASES_AGENDA * PAS_AGENDA

export type CategorieRdv = 'olives' | 'ventes' | 'production' | 'administration'
export const CATEGORIES: readonly CategorieRdv[] = ['olives', 'ventes', 'production', 'administration']
export const DUREES_MIN = [30, 60, 90, 120, 180] as const

export interface RendezVous {
  id: string
  jour: string
  debut: string
  fin: string
  objet: string
  detail: string
  categorie: CategorieRdv
}

const CLE_AGENDA = 'arrachid.tableau.agenda'
const CLE_EPINGLES = 'arrachid.tableau.epingles'

function lireStockage(cle: string): unknown {
  try {
    const texte = localStorage.getItem(cle)
    return texte === null ? null : JSON.parse(texte)
  } catch {
    return null // stockage indisponible ou abîmé : l'écran fonctionne sans
  }
}
function ecrireStockage(cle: string, valeur: unknown): void {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur))
  } catch {
    // le choix reste valable jusqu'à la fermeture de la page
  }
}

function estRendezVous(x: unknown): x is RendezVous {
  if (typeof x !== 'object' || x === null) return false
  const r = x as Record<string, unknown>
  const debut = typeof r.debut === 'string' ? minutes(r.debut) : null
  const fin = typeof r.fin === 'string' ? minutes(r.fin) : null
  return (
    typeof r.id === 'string' && typeof r.jour === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.jour) &&
    typeof r.objet === 'string' && typeof r.detail === 'string' &&
    typeof r.categorie === 'string' && (CATEGORIES as readonly string[]).includes(r.categorie) &&
    debut !== null && fin !== null && fin > debut
  )
}
export function lireRendezVous(): RendezVous[] {
  const valeur = lireStockage(CLE_AGENDA)
  return Array.isArray(valeur) ? valeur.filter(estRendezVous) : []
}
export const ecrireRendezVous = (liste: readonly RendezVous[]) => ecrireStockage(CLE_AGENDA, liste)

export interface BrouillonRdv {
  jour: string
  debut: string
  dureeMin: number
  objet: string
  detail: string
  categorie: CategorieRdv
}

/** Rendez-vous prêt à ranger, ou la raison pour laquelle le brouillon n'est pas valable. */
export function creerRendezVous(b: BrouillonRdv, id: string): { rdv: RendezVous } | { erreur: string } {
  const debut = minutes(b.debut)
  if (b.objet.trim() === '') return { erreur: t.agenda.objetRequis }
  if (debut === null || debut < DEBUT_AGENDA || debut >= FIN_AGENDA) return { erreur: t.agenda.heureInvalide }
  const fin = Math.min(debut + b.dureeMin, FIN_AGENDA)
  return { rdv: { id, jour: b.jour, debut: b.debut, fin: heureTexte(fin), objet: b.objet.trim(), detail: b.detail.trim(), categorie: b.categorie } }
}

/** Position d'un rendez-vous dans la grille, en nombre de cases de 30 minutes depuis 06:00. */
export function placeRdv(r: Pick<RendezVous, 'debut' | 'fin'>): { debut: number; hauteur: number } {
  const debut = ((minutes(r.debut) ?? DEBUT_AGENDA) - DEBUT_AGENDA) / PAS_AGENDA
  const fin = ((minutes(r.fin) ?? DEBUT_AGENDA) - DEBUT_AGENDA) / PAS_AGENDA
  return { debut, hauteur: Math.max(fin - debut, 1) }
}

// ── Boutons épinglés de la barre d'accès ─────────────────────────────────────────────────────────────────────────

export interface BoutonAcces {
  /** Code de l'écran du menu (`navigation.ts`) : le bouton n'existe que si l'utilisateur voit cet écran. */
  code: string
  libelle: string
  icone: NomIcone
  /** Teinte de la tuile quand elle n'est pas celle de son groupe (Prix, jaune comme dans la maquette). */
  teinte?: 'prix'
}
export interface GroupeAcces {
  id: 'reception' | 'laboratoire' | 'production' | 'ventes' | 'argent' | 'suivi'
  libelle: string
  boutons: readonly BoutonAcces[]
}

const b = (code: string, libelle: string, icone: BoutonAcces['icone'], teinte?: BoutonAcces['teinte']): BoutonAcces => ({ code, libelle, icone, teinte })

export const GROUPES_ACCES: readonly GroupeAcces[] = [
  { id: 'reception', libelle: t.barre.reception, boutons: [b('REC-01', t.boutons.pont, 'scale'), b('BAC-01', t.boutons.bacs, 'grid-3x3'), b('APP-01', t.boutons.apporteurs, 'contact'), b('TIC-01', t.boutons.tickets, 'ticket')] },
  { id: 'laboratoire', libelle: t.barre.laboratoire, boutons: [b('LAB-01', t.boutons.analyses, 'flask-conical'), b('LAB-02', t.boutons.echantillons, 'test-tube'), b('PRX-01', t.boutons.prix, 'tag', 'prix')] },
  { id: 'production', libelle: t.barre.production, boutons: [b('PLN-01', t.boutons.planning, 'calendar-clock'), b('PRD-02', t.boutons.trituration, 'factory'), b('PRD-03', t.boutons.remise, 'droplets'), b('PRD-05', t.boutons.rendement, 'gauge'), b('CUV-01', t.boutons.cuves, 'cylinder')] },
  { id: 'ventes', libelle: t.barre.ventes, boutons: [b('DEC-01', t.boutons.decomptes, 'file-text'), b('CHG-01', t.boutons.chargements, 'truck'), b('VTE-01', t.boutons.vente, 'shopping-bag'), b('CLI-01', t.boutons.clients, 'users'), b('FAC-01', t.boutons.factures, 'receipt')] },
  { id: 'argent', libelle: t.barre.argent, boutons: [b('CAI-01', t.boutons.caisse, 'wallet')] },
  { id: 'suivi', libelle: t.barre.suivi, boutons: [b('SMS-01', t.boutons.sms, 'message-square'), b('DOC-01', t.boutons.documents, 'folder-open'), b('PAP-00', t.boutons.rattrapage, 'notebook-pen')] },
]

/** Épingles de départ : les gestes de chaque jour du moulin. */
export const EPINGLES_DEFAUT: readonly string[] = ['REC-01', 'TIC-01', 'LAB-01', 'PRX-01', 'PRD-02', 'CUV-01', 'DEC-01', 'VTE-01', 'CAI-01']

export function lireEpingles(): string[] {
  const valeur = lireStockage(CLE_EPINGLES)
  return Array.isArray(valeur) && valeur.every((x) => typeof x === 'string') ? (valeur as string[]) : [...EPINGLES_DEFAUT]
}
export const ecrireEpingles = (codes: readonly string[]) => ecrireStockage(CLE_EPINGLES, codes)
export const basculerEpingle = (codes: readonly string[], code: string) => (codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code])

// ── Situation du jour : comptes exacts des lectures du serveur ───────────────────────────────────────────────────────

export interface LigneSituation {
  id: string
  libelle: string
  valeur: string
  /** Écran du menu qui montre le détail. */
  code: string
  /** Valeur à regarder (en rouge) : quelque chose attend ou la caisse est fermée. */
  alerte: boolean
}

export interface ChiffresJour {
  ticketsDuJour: { net_kg: number | null }[] | null
  remorques: { statut: string }[] | null
  bacs: { etat: string }[] | null
  fileLabo: { etape: string }[] | null
  prixEnAttente: unknown[] | null
  cuves: { stock_calcule_g: number; stock_disponible_g: number }[] | null
  caisseOuverte: boolean | null
  smsEnEchec: number | null
}

const nombre = (n: number) => String(n)
const kg = (n: number) => `${grouperMilliers(n)} kg`

/** Lignes dont la donnée est connue ; une lecture absente (pas de réponse, pas de droit) ne laisse pas de ligne. */
export function lignesSituation(c: ChiffresJour): LigneSituation[] {
  const s = t.situation
  const l: LigneSituation[] = []
  if (c.ticketsDuJour !== null) {
    l.push({ id: 'olives', libelle: s.olivesRecues, valeur: kg(c.ticketsDuJour.reduce((somme, x) => somme + (x.net_kg ?? 0), 0)), code: 'TIC-01', alerte: false })
    l.push({ id: 'tickets', libelle: s.ticketsEmis, valeur: nombre(c.ticketsDuJour.length), code: 'TIC-01', alerte: false })
  }
  if (c.remorques !== null) {
    const aDecharger = c.remorques.filter((x) => x.statut === 'pesee_brut').length
    const aTarer = c.remorques.filter((x) => x.statut === 'versee').length
    l.push({ id: 'decharger', libelle: s.aDecharger, valeur: nombre(aDecharger), code: 'REC-01', alerte: aDecharger > 0 })
    l.push({ id: 'tarer', libelle: s.aTarer, valeur: nombre(aTarer), code: 'REC-01', alerte: aTarer > 0 })
  }
  if (c.bacs !== null) l.push({ id: 'bacs', libelle: s.bacsLibres, valeur: `${c.bacs.filter((x) => x.etat === 'libre').length} / ${c.bacs.length}`, code: 'BAC-01', alerte: false })
  if (c.fileLabo !== null) l.push({ id: 'labo', libelle: s.enAttenteLabo, valeur: nombre(c.fileLabo.length), code: 'LAB-01', alerte: false })
  if (c.prixEnAttente !== null) l.push({ id: 'prix', libelle: s.prixAFixer, valeur: nombre(c.prixEnAttente.length), code: 'PRX-01', alerte: c.prixEnAttente.length > 0 })
  if (c.cuves !== null) {
    l.push({ id: 'stock', libelle: s.huileEnCuves, valeur: `${grammesVersKg(c.cuves.reduce((somme, x) => somme + x.stock_calcule_g, 0))} kg`, code: 'CUV-01', alerte: false })
    l.push({ id: 'dispo', libelle: s.disponibleVente, valeur: `${grammesVersKg(c.cuves.reduce((somme, x) => somme + x.stock_disponible_g, 0))} kg`, code: 'CUV-01', alerte: false })
  }
  if (c.caisseOuverte !== null) l.push({ id: 'caisse', libelle: s.caisse, valeur: c.caisseOuverte ? s.ouverte : s.fermee, code: 'CAI-01', alerte: !c.caisseOuverte })
  if (c.smsEnEchec !== null) l.push({ id: 'sms', libelle: s.smsEchec, valeur: nombre(c.smsEnEchec), code: 'SMS-01', alerte: c.smsEnEchec > 0 })
  return l
}
