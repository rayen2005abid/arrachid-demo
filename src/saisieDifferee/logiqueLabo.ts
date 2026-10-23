// Logique pure de la reprise de la fiche papier du laboratoire (T3.9). Les valeurs tapées
// partent en unités entières ; le serveur recalcule référence, conservation et montants.
import { entierPositif } from '../format/saisie'
import { centiemes, CHAMPS_ANALYSE, SAISIE_VIDE, type ChampAnalyse, type SaisieAnalyse } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import { millimes } from '../prix/logique'
import type { Validation } from '../types'

export const CHEMIN_LABO = '/api/saisie-differee/laboratoire'
export type Decision = '' | 'accepte' | 'refus_facon' | 'refus_retour'

/** Ce que le serveur sait déjà de la réception désignée par la fiche. */
export interface ReceptionFiche {
  id: number
  numero: number
  statut: string
  apporteur: string
  regime: 'achat' | 'facon' | 'mixte'
  net_kg: number | null
  ticket_le: string | null
  echantillon: { id: number; reference: string; preleve_le: string } | null
  analyse_saisie: boolean
  etat_prix: 'sans_objet' | 'en_attente' | 'fixe'
}

export interface SaisieLabo {
  numeroPapier: string
  heure: string
  observations: string
  emplacement: string
  prelevePar: string
  avecAnalyse: boolean
  analyse: SaisieAnalyse
  varieteId: string
  operateurAnalyse: string
  decision: Decision
  prix: string
  motif: string
  poidsRetour: string
  heurePrix: string
  decidePar: string
  avecDestruction: boolean
  heureDestruction: string
  detruitPar: string
}

export function saisieVide(): SaisieLabo {
  return {
    numeroPapier: '', heure: '', observations: '', emplacement: '', prelevePar: '',
    avecAnalyse: false, analyse: { ...SAISIE_VIDE }, varieteId: '', operateurAnalyse: '',
    decision: '', prix: '', motif: '', poidsRetour: '', heurePrix: '', decidePar: '',
    avecDestruction: false, heureDestruction: '', detruitPar: '',
  }
}

/** Parties de la fiche encore à recopier : le reste est déjà dans le logiciel. */
export function partiesOuvertes(reception: ReceptionFiche) {
  return {
    echantillon: reception.echantillon === null,
    analyse: !reception.analyse_saisie,
    prix: reception.etat_prix === 'en_attente',
  }
}

/** « 3 » → 3 ; liste laissée sur « — » → null (le serveur retient alors la personne qui saisit). */
const auteur = (texte: string) => entierPositif(texte)

/**
 * Corps de la commande, ou la première erreur de saisie. Une décision de prix exige le PIN frais
 * d'un responsable ou du propriétaire (CONTEXTE §12.1).
 */
export function construireCorpsLabo(
  s: SaisieLabo,
  reception: ReceptionFiche | null,
  validation: Validation | null,
  confirmer: boolean,
): { corps: Record<string, unknown> | null; erreur: string | null } {
  const t = libelles.saisieLabo
  const refuse = (erreur: string) => ({ corps: null, erreur })
  if (reception === null) return refuse(t.erreurReception)
  if (!s.numeroPapier.trim() || !s.heure) return refuse(t.erreurFiche)
  const ouvertes = partiesOuvertes(reception)
  const corps: Record<string, unknown> = {
    numero_papier: s.numeroPapier.trim().toUpperCase(), horodatage_metier: s.heure,
    observations: s.observations.trim() || null, reception_id: reception.id,
    echantillon: null, analyse: null, prix: null, destruction: null,
  }
  if (ouvertes.echantillon && s.emplacement.trim() !== '') {
    corps.echantillon = { emplacement: s.emplacement.trim(), preleve_par_id: auteur(s.prelevePar) }
  }
  if (ouvertes.analyse && s.avecAnalyse) {
    if (CHAMPS_ANALYSE.some((champ) => centiemes(s.analyse[champ]) === null)) return refuse(libelles.labo.analyse.invalide)
    const valeurs = Object.fromEntries(CHAMPS_ANALYSE.map((champ) => [champ, centiemes(s.analyse[champ])])) as Record<ChampAnalyse, number>
    corps.analyse = { ...valeurs, variete_id: auteur(s.varieteId), confirmer_valeurs: confirmer, operateur_id: auteur(s.operateurAnalyse) }
  }
  if (ouvertes.prix && s.decision !== '') {
    const accepte = s.decision === 'accepte'
    const prix = accepte ? millimes(s.prix) : null
    const poids = s.decision === 'refus_retour' ? entierPositif(s.poidsRetour) : null
    if (accepte && prix === null) return refuse(libelles.prix.invalide)
    if (!accepte && s.motif.trim() === '') return refuse(libelles.prix.motifObligatoire)
    if (s.decision === 'refus_retour' && poids === null) return refuse(libelles.prix.poidsRetourInvalide)
    if (validation === null) return refuse(t.erreurPin)
    corps.prix = {
      decision: s.decision, prix_unitaire_millimes_kg: prix, motif: accepte ? null : s.motif.trim(),
      poids_retour_kg: poids, horodatage: s.heurePrix || null, decide_par_id: auteur(s.decidePar),
    }
    corps.validation = validation
  }
  if (s.avecDestruction) {
    if (!s.heureDestruction) return refuse(t.erreurDestruction)
    corps.destruction = { horodatage: s.heureDestruction, detruit_par_id: auteur(s.detruitPar) }
  }
  if (corps.echantillon === null && corps.analyse === null && corps.prix === null && corps.destruction === null) {
    return refuse(t.erreurVide)
  }
  return { corps, erreur: null }
}
