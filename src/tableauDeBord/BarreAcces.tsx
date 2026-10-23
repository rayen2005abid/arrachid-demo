// Barre d'accès rapides : un groupe par module, ses boutons épinglés toujours visibles, les autres dans un menu ouvert
// par le nom du groupe. Un bouton n'existe que si l'utilisateur voit l'écran qu'il ouvre ; le choix des épingles reste
// sur le poste. Les nombres sont ceux des compteurs des onglets (compteurs.ts), jamais recalculés ici.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '../composants/Icone'
import type { Indicateur } from '../compteurs'
import { libelles } from '../libelles'
import type { EntreeMenu } from '../navigation'
import { basculerEpingle, ecrireEpingles, GROUPES_ACCES, lireEpingles, type BoutonAcces } from './logique'

const t = libelles.tableauDeBord.barre

interface Props {
  /** Écrans visibles de l'utilisateur, par code. */
  entrees: ReadonlyMap<string, EntreeMenu>
  indicateurs: ReadonlyMap<string, Indicateur>
}

const nombreDe = (indicateur: Indicateur | undefined) => (indicateur?.type === 'nombre' ? indicateur.nombre : 0)

function Bouton({ bouton, entree, indicateur }: { bouton: BoutonAcces; entree: EntreeMenu; indicateur: Indicateur | undefined }) {
  return (
    <Link to={entree.chemin} className={`tdb-bouton${bouton.teinte === undefined ? '' : ` tdb-t-${bouton.teinte}`}`} title={entree.libelle}>
      <span className="tdb-tuile">
        <Icone nom={bouton.icone} />
        {indicateur?.type === 'nombre' && indicateur.nombre > 0 && (
          <span className={`tdb-pastille-n${indicateur.ton === 'alerte' ? ' alerte' : ''}`}>
            <span aria-hidden="true">{indicateur.nombre}</span>
            <span className="visuellement-cache">{indicateur.libelle}</span>
          </span>
        )}
      </span>
      <span className="tdb-bouton-libelle">{bouton.libelle}</span>
    </Link>
  )
}

export function BarreAcces({ entrees, indicateurs }: Props) {
  const [epingles, definirEpingles] = useState<string[]>(lireEpingles)
  const [ouvert, definirOuvert] = useState<string | null>(null)

  // Le menu se ferme quand on clique ailleurs, qu'on choisit un bouton ou qu'on tape Échap.
  useEffect(() => {
    if (ouvert === null) return
    const clic = (e: MouseEvent) => {
      const cible = e.target as Element
      if (cible.closest('.tdb-menu, .tdb-groupe-nom') !== null && cible.closest('a') === null) return
      definirOuvert(null)
    }
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && definirOuvert(null)
    document.addEventListener('click', clic)
    document.addEventListener('keydown', touche)
    return () => {
      document.removeEventListener('click', clic)
      document.removeEventListener('keydown', touche)
    }
  }, [ouvert])

  function epingler(code: string) {
    const suite = basculerEpingle(epingles, code)
    definirEpingles(suite)
    ecrireEpingles(suite)
  }

  return (
    <div className="tdb-barre" role="toolbar" aria-label={t.nom}>
      {GROUPES_ACCES.map((groupe) => {
        const boutons = groupe.boutons.filter((b) => entrees.has(b.code))
        if (boutons.length === 0) return null
        const visibles = boutons.filter((b) => epingles.includes(b.code))
        const caches = boutons.filter((b) => !epingles.includes(b.code))
        const alerteCachee = caches.reduce((somme, b) => somme + nombreDe(indicateurs.get(b.code)), 0)
        const estOuvert = ouvert === groupe.id
        return (
          <div key={groupe.id} className={`tdb-groupe tdb-g-${groupe.id}${estOuvert ? ' ouvert' : ''}${visibles.length === 0 ? ' vide' : ''}`}>
            <button
              type="button"
              className="tdb-groupe-nom"
              aria-expanded={estOuvert}
              title={caches.length > 0 ? `${caches.length} ${t.autres}` : t.tous}
              onClick={() => definirOuvert(estOuvert ? null : groupe.id)}
            >
              {groupe.libelle}
              {caches.length > 0 && <span className="tdb-plus">+{caches.length}</span>}
              {alerteCachee > 0 && <span className="tdb-pastille">{alerteCachee}</span>}
              <Icone nom="chevron-down" />
            </button>
            {visibles.length > 0 && (
              <div className="tdb-boutons">
                {visibles.map((b) => <Bouton key={b.code} bouton={b} entree={entrees.get(b.code)!} indicateur={indicateurs.get(b.code)} />)}
              </div>
            )}
            {estOuvert && (
              <div className="tdb-menu" role="group" aria-label={groupe.libelle}>
                <div className="tdb-menu-titre">
                  <span>{groupe.libelle}</span>
                  <button type="button" className="tdb-fermer" aria-label={t.fermer} onClick={() => definirOuvert(null)}><Icone nom="x" /></button>
                </div>
                <div className="tdb-menu-boutons">
                  {boutons.map((b) => {
                    const garde = epingles.includes(b.code)
                    return (
                      <div key={b.code} className="tdb-item">
                        <Bouton bouton={b} entree={entrees.get(b.code)!} indicateur={indicateurs.get(b.code)} />
                        <button type="button" className="tdb-epingle" aria-pressed={garde} title={garde ? t.desepingler : t.epingler} aria-label={`${garde ? t.desepingler : t.epingler} : ${b.libelle}`} onClick={() => epingler(b.code)}>
                          <Icone nom={garde ? 'pin' : 'pin-off'} />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <p className="tdb-menu-aide"><Icone nom="pin" />{t.aide}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
