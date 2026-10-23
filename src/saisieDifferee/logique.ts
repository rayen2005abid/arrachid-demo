import { entierPositif, uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'

export interface SaisieReception {
  numeroPapier: string
  heure: string
  apporteurId: string
  nouvelApporteur: boolean
  nouveauType: 'personne' | 'societe'
  nouveauNom: string
  nouveauCin: string
  nouveauMatricule: string
  nouveauTelephone: string
  nouveauLocalite: string
  confirmerTelephone: boolean
  cinDe: 'apporteur' | 'conducteur'
  cinPresentee: string
  immatriculation: string
  regime: 'achat' | 'facon' | 'mixte'
  modePartage: 'huile_kg' | 'pourcentage'
  valeurPartage: string
  brut: string
  tare: string
  bacs: string
  brutLe: string
  dechargementLe: string
  tareLe: string
  operateurBrut: string
  operateurDechargement: string
  operateurTare: string
  observations: string
  vidages: Record<string, { heure: string; operateur: string }>
}

export function construireCorpsReception(s: SaisieReception): { corps: Record<string, unknown> | null; erreur: string | null } {
  const apporteur = entierPositif(s.apporteurId)
  const brut = entierPositif(s.brut)
  const tare = entierPositif(s.tare)
  const bacs = s.bacs.split(/[\s,;]+/).filter(Boolean).map(entierPositif)
  if (!s.numeroPapier.trim() || !s.heure || (!s.nouvelApporteur && apporteur === null) || brut === null || tare === null || bacs.length === 0 || bacs.some((n) => n === null)) {
    return { corps: null, erreur: libelles.saisieDifferee.erreurChamps }
  }
  if (s.nouvelApporteur && (!s.nouveauNom.trim() || !s.nouveauTelephone.trim() || !(s.nouveauType === 'personne' ? s.nouveauCin.trim() : s.nouveauMatricule.trim()))) {
    return { corps: null, erreur: libelles.saisieDifferee.erreurNouvelApporteur }
  }
  const corps: Record<string, unknown> = {
    numero_papier: s.numeroPapier.trim().toUpperCase(), horodatage_metier: s.heure,
    apporteur_id: s.nouvelApporteur ? null : apporteur,
    nouvel_apporteur: s.nouvelApporteur ? {
      type_apporteur: s.nouveauType, nom: s.nouveauNom.trim(),
      cin: s.nouveauType === 'personne' ? s.nouveauCin.trim() : null,
      matricule_fiscal: s.nouveauType === 'societe' ? s.nouveauMatricule.trim() : null,
      telephone: s.nouveauTelephone.trim(), localite: s.nouveauLocalite.trim() || null,
      confirmer_telephone: s.confirmerTelephone,
    } : null,
    cin_de: s.cinDe, cin_presentee: s.cinPresentee.trim() || null,
    immatriculation: s.immatriculation.trim() || null, regime: s.regime,
    poids_brut_kg: brut, poids_tare_kg: tare, bacs,
    horodatage_brut: s.brutLe || null, horodatage_dechargement: s.dechargementLe || null,
    horodatage_tare: s.tareLe || null,
    operateur_brut_id: entierPositif(s.operateurBrut),
    operateur_dechargement_id: entierPositif(s.operateurDechargement),
    operateur_tare_id: entierPositif(s.operateurTare),
    observations: s.observations.trim() || null,
    mode_partage: null, huile_agriculteur_declaree_g: null, pourcentage_agriculteur_centiemes: null,
  }
  if (s.regime === 'mixte') {
    const valeur = uniteExacte(s.valeurPartage, s.modePartage === 'huile_kg' ? 3 : 2)
    if (valeur === null) return { corps: null, erreur: libelles.saisieDifferee.erreurPartage }
    corps.mode_partage = s.modePartage
    if (s.modePartage === 'huile_kg') corps.huile_agriculteur_declaree_g = valeur
    else corps.pourcentage_agriculteur_centiemes = valeur
  }
  const vidages = []
  for (const [numero, vidage] of Object.entries(s.vidages)) {
    if (!vidage.heure) continue
    const bac = entierPositif(numero)
    if (bac === null) return { corps: null, erreur: libelles.saisieDifferee.erreurBac }
    vidages.push({ numero_bac: bac, horodatage: vidage.heure, operateur_id: entierPositif(vidage.operateur) })
  }
  corps.vidages = vidages
  return { corps, erreur: null }
}
