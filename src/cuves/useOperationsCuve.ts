// État et commandes des opérations de cuve (T4.9 ; CONTEXTE §17.4, §18) pour le détail d'une cuve :
// une opération ouverte à la fois, validée par F8. Purge et contrôle : un poids ; ajustement,
// transfert et mélange : raison et PIN du responsable. L'affichage est dans `OperationsCuve.tsx`.
import { useState, type FormEvent } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import type { ActionPrincipale, MessageEcran } from '../composants/EnTeteEcran'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { CHEMIN_REGISTRE, type DetailCuve, type Registre } from './logique'
import {
  afficherEcart,
  CHEMIN_TRANSFERTS,
  cheminAjustement,
  cheminAutorisations,
  cheminInventaires,
  cheminPurges,
  corpsApprobation,
  corpsInventaire,
  corpsMelange,
  corpsPurge,
  corpsTransfert,
  destinationsPossibles,
  inventaireAAjuster,
  operationsPossibles,
  type Inventaire,
  type Operation,
} from './operations'

const t = libelles.cuves.operations
export const FORMULAIRE_OPERATION = 'formulaire-operation-cuve'

interface Envoi {
  chemin: string
  corps: Record<string, unknown> | null
  succes: (reponse: { inventaire_cuve?: Inventaire }) => MessageEcran
}

export function useOperationsCuve(detail: DetailCuve | null, recharger: () => Promise<void>) {
  const s = useSoumission()
  const [ouverte, definirOuverte] = useState<Operation | null>(null)
  const [inventaireId, definirInventaireId] = useState<number | null>(null)
  const [poids, definirPoids] = useState('')
  const [motif, definirMotif] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [destination, definirDestination] = useState<number | null>(null)
  const [campagne, definirCampagne] = useState<number | null>(null)
  const [invalide, definirInvalide] = useState(false)
  const [message, definirMessage] = useState<MessageEcran | null>(null)

  const cuve = detail?.cuve ?? null
  const inventaires = detail?.inventaires ?? []
  const autorisations = detail?.autorisations_melange ?? []
  const campagnes = detail?.campagnes_precedentes ?? []
  const possibles = cuve === null ? [] : operationsPossibles(cuve)
  const aAjuster = inventaireAAjuster(inventaires, inventaireId)
  // Une opération que le serveur ne propose plus (stock vidé, contrôle périmé) se referme.
  const operation = ouverte === 'ajustement' ? (aAjuster === null ? null : ouverte) : ouverte !== null && possibles.includes(ouverte) ? ouverte : null
  const registre = useLecture<Registre>(operation === 'transfert' ? CHEMIN_REGISTRE : null)
  const destinations = cuve === null ? [] : destinationsPossibles(registre.donnees?.cuves ?? [], cuve.id)
  const approuvee = operation === 'ajustement' || operation === 'transfert' || operation === 'melange'

  const ouvrir = (cible: Operation | null, inventaire: number | null = null) => {
    s.reinitialiser()
    definirOuverte(cible)
    definirInventaireId(inventaire)
    definirPoids('')
    definirMotif('')
    definirValidation(null)
    definirDestination(null)
    definirCampagne(null)
    definirInvalide(false)
  }

  const envoi = (): Envoi | null => {
    if (cuve === null) return null
    switch (operation) {
      case 'purge':
        return { chemin: cheminPurges(cuve.id), corps: corpsPurge(poids), succes: () => ({ texte: t.purgee.replace('{kg}', poids.trim()).replace('{code}', cuve.code), type: 'ok' }) }
      case 'inventaire':
        return {
          chemin: cheminInventaires(cuve.id),
          corps: corpsInventaire(poids),
          succes: (reponse) => {
            const ecart = reponse.inventaire_cuve?.ecart_g ?? 0
            return ecart === 0 ? { texte: t.controleConforme, type: 'ok' } : { texte: t.controleEcart.replace('{ecart}', afficherEcart(ecart)), type: 'alerte' }
          },
        }
      case 'ajustement':
        if (aAjuster === null) return null
        return { chemin: cheminAjustement(aAjuster.id), corps: corpsApprobation(motif), succes: () => ({ texte: t.ajuste.replace('{code}', cuve.code).replace('{ecart}', afficherEcart(aAjuster.ecart_g)), type: 'ok' }) }
      case 'transfert': {
        const arrivee = destinations.find((d) => d.id === destination)?.code ?? ''
        return {
          chemin: CHEMIN_TRANSFERTS,
          corps: corpsTransfert(cuve.id, destination, poids, motif),
          succes: () => ({ texte: t.transfere.replace('{kg}', poids.trim()).replace('{source}', cuve.code).replace('{destination}', arrivee), type: 'ok' }),
        }
      }
      case 'melange': {
        const libelle = campagnes.find((c) => c.id === campagne)?.libelle ?? ''
        return { chemin: cheminAutorisations(cuve.id), corps: corpsMelange(campagne, motif), succes: () => ({ texte: t.autorise.replace('{code}', cuve.code).replace('{campagne}', libelle), type: 'ok' }) }
      }
      default:
        return null
    }
  }

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    const commande = envoi()
    if (commande === null || s.enCours) return
    if (commande.corps === null || (approuvee && validation === null)) {
      definirInvalide(true)
      return
    }
    const reponse = await s.soumettre<{ inventaire_cuve?: Inventaire }>(commande.chemin, approuvee ? { ...commande.corps, validation } : commande.corps)
    if (reponse === null) return
    ouvrir(null)
    definirMessage(commande.succes(reponse))
    await recharger()
  }

  const etiquettes: Record<Operation, string> = {
    purge: t.enregistrerPurge,
    inventaire: t.enregistrerControle,
    ajustement: t.ajuster,
    transfert: t.transferer,
    melange: t.autoriser,
  }
  const principal: ActionPrincipale | null = operation === null ? null : { etiquette: etiquettes[operation], formulaire: FORMULAIRE_OPERATION, enCours: s.enCours }
  const pese = operation === 'purge' || operation === 'inventaire' || operation === 'transfert'
  const etiquettePoids = operation === 'inventaire' ? t.mesure : operation === 'transfert' ? t.poidsTransfert : t.poidsPurge
  const poidsFaux = invalide && pese && (operation === 'inventaire' ? corpsInventaire(poids) : corpsPurge(poids)) === null
  const visible = cuve !== null && (possibles.length > 0 || inventaires.length > 0 || autorisations.length > 0)

  return {
    s, cuve, inventaires, autorisations, campagnes, possibles, aAjuster, operation, registre, destinations, approuvee,
    poids, motif, validation, destination, campagne, invalide, message, principal, pese, etiquettePoids, poidsFaux, visible,
    ouvrir, enregistrer, definirPoids, definirMotif, definirValidation, definirDestination, definirCampagne, definirInvalide, definirMessage,
  }
}

export type OperationsCuve = ReturnType<typeof useOperationsCuve>
