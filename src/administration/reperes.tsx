import { Icone } from '../composants/Icone'
import type { NomIcone } from '../composants/icones'
import type { TypeEquipement } from './types'
import '../styles/administration.css'

const equipements: Record<TypeEquipement, NomIcone> = {
  bascule: 'scale',
  imprimante_ticket: 'printer',
  imprimante_a4: 'printer',
  analyseur: 'flask-conical',
  balance_huile: 'weight',
  thermometre: 'gauge',
  ligne_trituration: 'factory',
}

export function RepereEquipement({ type }: { type: TypeEquipement }) {
  return <span className="admin-objet-icone"><Icone nom={equipements[type]} /></span>
}

export function RepereArticle({ type }: { type: 'huile' | 'contenant' | 'service' }) {
  const icone: NomIcone = type === 'huile' ? 'droplet' : type === 'contenant' ? 'package' : 'settings'
  return <span className="admin-objet-icone"><Icone nom={icone} /></span>
}

export function Initiales({ nom }: { nom: string }) {
  const lettres = nom.trim().split(/\s+/).slice(0, 2).map((mot) => mot[0]?.toLocaleUpperCase('fr') ?? '').join('')
  return <span className="admin-avatar" aria-hidden="true">{lettres}</span>
}
