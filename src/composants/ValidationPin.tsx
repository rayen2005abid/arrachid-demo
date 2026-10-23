import { useEffect, useRef } from 'react'
import type { Validation } from '../types'
const validationDemo: Validation = { utilisateur_id: 1, pin: 'demonstration' }
export function ValidationPin({ surValidation }: { surValidation: (v: Validation | null) => void; seulProprietaire?: boolean; utilisateurPropose?: number }) {
  const rappelInitial = useRef(surValidation)
  useEffect(() => { rappelInitial.current(validationDemo) }, [])
  return <div className="aide"><p>Validation de démonstration au nom du Propriétaire — aucun PIN requis.</p><button type="button" className="bouton-secondaire" onClick={() => surValidation(validationDemo)}>Confirmer en mode démo</button></div>
}
