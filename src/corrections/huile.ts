// Logique pure des corrections de l'huile et des cuves (T4.10 ; CONTEXTE §18, §29) : pesée
// d'huile, contenant de remise, mouvement manuel de cuve. Le serveur dit ce qui se corrige encore
// (`pesees_corrigeables`, `contenants_corrigeables`, `mouvements_corrigeables`) et refait tous les
// effets ; l'écran ne fait que saisir les poids corrigés, la raison et le PIN.
import { grammesVersKg, kgVersGrammes } from '../administration/unites'
import { libelles } from '../libelles'

export function cheminCorrectionPesee(peseeId: number): string {
  return `/api/corrections/pesees-huile/${peseeId}`
}

export function cheminCorrectionContenant(contenantId: number): string {
  return `/api/corrections/contenants-remise/${contenantId}`
}

export function cheminCorrectionMouvement(mouvementId: number): string {
  return `/api/corrections/mouvements-cuve/${mouvementId}`
}

/** Un poids à corriger, tapé en kg et envoyé en grammes sous le nom `cle`. */
export interface ChampPoids {
  cle: string
  etiquette: string
  /** Poids en vigueur, en grammes : affiché d'abord, à remplacer. */
  actuelG: number
  /** Un contenant vide peut peser zéro. */
  zeroPermis?: boolean
  /** Laissé vide, le champ n'est pas envoyé (purge seulement annulée). */
  facultatif?: boolean
}

/** Demande de correction ouverte sur un écran : ce qui est corrigé, où l'envoyer, quoi saisir. */
export interface Correction {
  /** Identifiant du fait corrigé : la demande se referme si le serveur ne le propose plus. */
  id: number
  titre: string
  aide?: string
  chemin: string
  champs: ChampPoids[]
  etiquetteAction: string
  /** Message affiché une fois la correction enregistrée. */
  succes: string
}

export function valeursInitiales(champs: readonly ChampPoids[]): Record<string, string> {
  return Object.fromEntries(champs.map((champ) => [champ.cle, champ.facultatif === true ? '' : grammesVersKg(champ.actuelG)]))
}

/** Grammes d'un champ ; `undefined` s'il est facultatif et vide, `null` si la saisie est fausse. */
export function poidsCorrige(champ: ChampPoids, texte: string): number | null | undefined {
  if (texte.trim() === '') return champ.facultatif === true ? undefined : null
  const grammes = kgVersGrammes(texte)
  if (grammes === null || (grammes === 0 && champ.zeroPermis !== true)) return null
  return grammes
}

/** Corps de la commande, sans le PIN que l'écran joint ; `null` si un poids ou la raison manque. */
export function corpsCorrection(champs: readonly ChampPoids[], valeurs: Readonly<Record<string, string>>, motif: string): Record<string, unknown> | null {
  const raison = motif.trim()
  if (raison === '') return null
  const corps: Record<string, unknown> = { motif: raison }
  for (const champ of champs) {
    const grammes = poidsCorrige(champ, valeurs[champ.cle] ?? '')
    if (grammes === null) return null
    if (grammes !== undefined) corps[champ.cle] = grammes
  }
  return corps
}

/** La demande ouverte, tant que le serveur propose encore de corriger ce fait. */
export function correctionOuverte(correction: Correction | null, corrigeables: readonly number[] | undefined): Correction | null {
  return correction !== null && (corrigeables ?? []).includes(correction.id) ? correction : null
}

const t = libelles.correctionsHuile

/** Correction du poids d'une pesée d'huile. */
export function correctionPesee(pesee: { id: number; sequence: number; poids_g: number }): Correction {
  const numero = String(pesee.sequence)
  return {
    id: pesee.id,
    titre: t.titrePesee.replace('{numero}', numero),
    aide: t.aidePesee,
    chemin: cheminCorrectionPesee(pesee.id),
    champs: [{ cle: 'poids_g', etiquette: t.poidsCorrige, actuelG: pesee.poids_g }],
    etiquetteAction: t.actionPesee,
    succes: t.peseeCorrigee.replace('{numero}', numero),
  }
}

/** Correction des deux poids d'un contenant de remise. */
export function correctionContenant(contenant: { id: number; sequence: number; poids_vide_g: number; poids_plein_g: number }): Correction {
  const numero = String(contenant.sequence)
  return {
    id: contenant.id,
    titre: t.titreContenant.replace('{numero}', numero),
    aide: t.aideContenant,
    chemin: cheminCorrectionContenant(contenant.id),
    champs: [
      { cle: 'poids_vide_g', etiquette: t.poidsVide, actuelG: contenant.poids_vide_g, zeroPermis: true },
      { cle: 'poids_plein_g', etiquette: t.poidsPlein, actuelG: contenant.poids_plein_g },
    ],
    etiquetteAction: t.actionContenant,
    succes: t.contenantCorrige.replace('{numero}', numero),
  }
}

/** Une purge se repèse ou s'annule ; un ajustement ou un transfert s'annule seulement. */
export function correctionMouvement(mouvement: { id: number; type: string; poids_g: number }): Correction {
  const id = String(mouvement.id)
  const chemin = cheminCorrectionMouvement(mouvement.id)
  if (mouvement.type === 'purge') {
    return {
      id: mouvement.id,
      titre: t.titrePurge.replace('{id}', id),
      aide: t.aidePurge,
      chemin,
      champs: [{ cle: 'poids_g', etiquette: t.poidsPurge, actuelG: mouvement.poids_g, facultatif: true }],
      etiquetteAction: t.actionPurge,
      succes: t.purgeCorrigee.replace('{id}', id),
    }
  }
  return {
    id: mouvement.id,
    titre: t.titreAnnulation.replace('{id}', id),
    aide: mouvement.type === 'ajustement' ? t.aideAjustement : t.aideTransfert,
    chemin,
    champs: [],
    etiquetteAction: t.actionAnnulation,
    succes: t.mouvementAnnule.replace('{id}', id),
  }
}
