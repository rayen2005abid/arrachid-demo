// Logique pure de la reprise de la fiche papier de règlement (T5.8). Le montant tapé ne sert
// qu'à vérifier le net : le serveur recalcule le décompte et ne paie que son net.
import { entierPositif, uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'
import type { EnTeteFiche } from './logiqueProduction'
import { corpsReferencesPapier } from '../caisse/references'

export const CHEMIN_REG = '/api/saisie-differee/reglements'

export type SensPapier = '' | 'paye' | 'encaisse'
export type ModePapier = 'especes' | 'cheque' | 'virement'

export interface ReceptionARegler {
  reception_id: number
  reception_numero: number
  regime: string
  apporteur: string
  apporteur_id: number
  decompte_id: number | null
}
export interface AvanceEnCours { id: number; apporteur_id: number; montant_millimes: number; recu_numero: number; horodatage: string }

export interface SaisieReg extends EnTeteFiche {
  receptionId: string
  numeroDecomptePapier: string
  avances: number[]
  approuvePar: string
  /** Partie « Paiements » laissée vide : la fiche n'émet que le décompte. */
  sens: SensPapier
  montant: string
  mode: ModePapier
  /** Numéro du chèque (ou référence du virement) et banque, s'ils sont notés sur la fiche (T-203). */
  referencePaiement: string
  banquePaiement: string
  heurePaiement: string
}

type Resultat = { corps: Record<string, unknown> | null; erreur: string | null }

const t = libelles.saisieReglement
const refuse = (erreur: string): Resultat => ({ corps: null, erreur })

export function saisieRegVide(): SaisieReg {
  return {
    numeroPapier: '', heure: '', observations: '', operateur: '', receptionId: '', numeroDecomptePapier: '',
    avances: [], approuvePar: '', sens: '', montant: '', mode: 'especes', referencePaiement: '', banquePaiement: '', heurePaiement: '',
  }
}

/** Corps de la commande ; `decompteEmis` : la réception a déjà son décompte au logiciel. */
export function construireCorpsReg(s: SaisieReg, decompteEmis: boolean): Resultat {
  if (!s.numeroPapier.trim() || !s.heure) return refuse(libelles.saisieProduction.erreurFiche)
  const receptionId = entierPositif(s.receptionId)
  if (receptionId === null) return refuse(t.erreurReception)
  let paiement: Record<string, unknown> | null = null
  if (s.sens !== '' || s.montant.trim() !== '') {
    const montant = uniteExacte(s.montant, 3)
    if (s.sens === '') return refuse(t.erreurSens)
    if (montant === null || montant === 0) return refuse(t.erreurMontant)
    paiement = {
      sens: s.sens, montant_millimes: montant, mode: s.mode, horodatage: s.heurePaiement || null,
      ...corpsReferencesPapier(s.mode, { reference: s.referencePaiement, banque: s.banquePaiement }),
    }
  }
  if (decompteEmis && paiement === null) return refuse(t.erreurPaiement)
  const corps: Record<string, unknown> = {
    numero_papier: s.numeroPapier.trim().toUpperCase(), horodatage_metier: s.heure,
    observations: s.observations.trim() || null, operateur_id: entierPositif(s.operateur),
    reception_id: receptionId, paiement,
  }
  if (!decompteEmis) {
    corps.avances_ids = [...s.avances].sort((a, b) => a - b)
    corps.approuve_par_id = s.avances.length > 0 ? entierPositif(s.approuvePar) : null
    corps.numero_decompte_papier = s.numeroDecomptePapier.trim() || null
  }
  return { corps, erreur: null }
}
