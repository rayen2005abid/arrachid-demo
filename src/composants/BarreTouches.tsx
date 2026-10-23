// Barre des touches F1–F12 en bas de chaque écran (maquette MES, T-86) ; sous 1280 px, seulement les touches
// définies (T-164, A12).
import { useNavigate } from 'react-router-dom'
import { NOMS_TOUCHES, useBarreTouches, useTouches } from '../contextes/touches'
import { libelles } from '../libelles'

export function BarreTouches() {
  const naviguer = useNavigate()
  // F12 ramène toujours à l'accueil (le « synoptique » de la maquette) ; un écran peut la redéfinir.
  useTouches({ F12: { libelle: libelles.coquille.accueil, action: () => naviguer('/') } })
  const touches = useBarreTouches()
  return (
    // Raccourcis de commandes déjà présentes à l'écran : cachés aux lecteurs d'écran pour ne pas les doubler.
    <div className="mes-touches" aria-hidden="true">
      {NOMS_TOUCHES.map((nom) => {
        const touche = touches[nom]
        return (
          <button
            key={nom}
            type="button"
            tabIndex={-1}
            // Sous 1280 px, les touches sans action sont cachées (T-164, A12 ; base.css).
            className={touche === undefined ? 'mes-touche mes-touche-vide' : nom === 'F8' ? 'mes-touche mes-touche-principale' : 'mes-touche'}
            disabled={touche === undefined || touche.inactif === true}
            onClick={() => touche?.action()}
          >
            <span className="mes-touche-nom">{nom}</span>
            <span className="mes-touche-libelle">{touche?.libelle ?? ''}</span>
          </button>
        )
      })}
    </div>
  )
}
