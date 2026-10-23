import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BarreEtat } from '../composants/BarreEtat'
import { BarreTouches } from '../composants/BarreTouches'
import { Compteur } from '../composants/Compteur'
import { Icone } from '../composants/Icone'
import { Lampe } from '../composants/Lampe'
import { Quitter } from '../composants/Quitter'
import { libelleCampagne } from '../composants/libellesEtat'
import { densitePoste } from '../composants/logique'
import { SousOnglets } from '../composants/SousOnglets'
import type { Indicateur } from '../compteurs'
import { indicateurOnglet } from '../compteurs'
import { useServeur } from '../contextes/serveur'
import { useSessionOuverte } from '../contextes/session'
import { FournisseurTouches } from '../contextes/FournisseurTouches'
import { libelles } from '../libelles'
import { useEcransMasques } from '../laboratoire/useEcransMasques'
import { entreesVisibles, ICONES_GROUPES, libelleSousOnglet, moduleAffiche, modulesVisibles, ongletActif, ongletsVisibles, sansEcrans } from '../navigation'
import { useCompteurs } from '../useCompteurs'

const HEURE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const DATE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', day: '2-digit', month: '2-digit', year: 'numeric' })

/** « Campagne 2026-2027 » ; un libellé qui commence déjà par « Campagne » n'est pas répété. */
function texteCampagne(campagne: unknown) {
  const k = libelles.coquille
  if (campagne == null) return libelles.barreEtat.aucuneCampagne
  const libelle = libelleCampagne(campagne)
  return libelle.toLowerCase().startsWith(k.campagne.toLowerCase()) ? libelle : `${k.campagne} ${libelle}`
}

function Horloge() {
  const [maintenant, definirMaintenant] = useState(() => new Date())
  useEffect(() => {
    const minuteur = setInterval(() => definirMaintenant(new Date()), 15_000)
    return () => clearInterval(minuteur)
  }, [])
  return (
    <div className="mes-horloge">
      <strong>{HEURE.format(maintenant)}</strong>
      <span>{DATE.format(maintenant)}</span>
    </div>
  )
}

/** « Aller au contenu » : le focus passe au contenu de l'écran sans changer l'adresse (le routeur garde la sienne). */
function allerAuContenu(e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  document.getElementById('contenu')?.focus()
}

/** Compteur, voyant ou court texte d'un onglet ou d'un sous-onglet (compteurs.ts). */
function AfficheIndicateur({ indicateur }: { indicateur: Indicateur | null | undefined }) {
  if (indicateur == null) return null
  if (indicateur.type === 'nombre') return <Compteur nombre={indicateur.nombre} ton={indicateur.ton} libelle={indicateur.libelle} />
  if (indicateur.type === 'lampe') return <Lampe etat={indicateur.etat} libelle={indicateur.libelle} libelleCache />
  return <span className="mes-onglet-texte">{indicateur.texte}</span>
}

/**
 * Écran opérationnel au style de la maquette MES (T-86, T-164) : barre du haut, barre des modules (seulement si le
 * rôle en voit plusieurs), onglets du module affiché avec icônes et compteurs, sous-onglets de l'onglet ouvert,
 * contenu, touches de fonction, barre d'état. Les onglets regroupent des routes existantes (`navigation.ts`).
 * `data-densite` donne des cibles de 44 px aux tablettes du laboratoire et de la production (composants.css).
 */
export function Coquille() {
  const { utilisateur, poste, permissions } = useSessionOuverte()
  const { etat } = useServeur()
  const { pathname } = useLocation()
  const masques = useEcransMasques()
  const onglets = ongletsVisibles(sansEcrans(entreesVisibles(permissions, utilisateur.role, poste.type_poste), masques))
  const modules = modulesVisibles(onglets)
  const groupe = moduleAffiche(onglets, pathname, poste.type_poste)
  const ongletsDuModule = onglets.filter((onglet) => onglet.groupe === groupe)
  const actif = ongletActif(onglets, pathname)
  const indicateurs = useCompteurs(ongletsDuModule.flatMap((onglet) => onglet.ecrans), etat)
  const barreOnglets = useRef<HTMLElement>(null)
  const k = libelles.coquille

  // L'onglet ouvert reste visible quand la barre défile (petits écrans).
  useEffect(() => {
    barreOnglets.current?.querySelector('[aria-current]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [actif?.id])

  return (
    <FournisseurTouches>
      <div className="mes" data-densite={densitePoste(poste.type_poste)}>
        <a href="#contenu" className="lien-evitement" onClick={allerAuContenu}>{k.allerAuContenu}</a>
        <header className="mes-barre">
          <Link to="/" className="mes-marque">
            <span className="mes-logo" aria-hidden="true"><span /><span /><span /><span /></span>
            <span className="mes-nom"><span>{k.module}</span>{libelles.application.nom}</span>
          </Link>
          <div className="mes-infos">
            <span><strong>{libelles.application.sousTitre}</strong> · {libelles.typesPoste[poste.type_poste]}</span>
            <span>{texteCampagne(etat?.campagne)}</span>
            <span>{k.poste} <strong>{poste.libelle}</strong> <span className="chiffres">{poste.code}</span></span>
          </div>
          <div className="mes-utilisateur">
            <strong>{utilisateur.nom}</strong>
            <span>{libelles.roles[utilisateur.role]}</span>
          </div>
          <Horloge />
          <Quitter />
        </header>
        {modules.length > 1 && (
          <nav className="mes-modules" aria-label={k.modules}>
            {modules.map((module) => (
              <Link key={module.groupe} to={module.cible} className="mes-module" data-module={module.groupe} aria-current={module.groupe === groupe ? 'true' : undefined}>
                <Icone nom={ICONES_GROUPES[module.groupe]} />
                {libelles.groupes[module.groupe]}
              </Link>
            ))}
          </nav>
        )}
        <nav ref={barreOnglets} className="mes-onglets" aria-label={libelles.menu.nom}>
          {ongletsDuModule.map((onglet) => (
            <Link key={onglet.id} to={onglet.cible} className="mes-onglet" aria-current={onglet.id === actif?.id ? 'true' : undefined}>
              <Icone nom={onglet.icone} />
              {onglet.libelle}
              <AfficheIndicateur indicateur={indicateurOnglet(onglet.ecrans, indicateurs)} />
            </Link>
          ))}
        </nav>
        {actif !== null && (
          <SousOnglets
            libelle={libelles.sousOnglets.nom.replace('{onglet}', actif.libelle)}
            onglets={actif.sousOnglets.map((entree) => ({
              chemin: entree.chemin,
              libelle: libelleSousOnglet(entree),
              icone: entree.icone,
              code: entree.code,
              indicateur: <AfficheIndicateur indicateur={indicateurs.get(entree.code)} />,
            }))}
          />
        )}
        <main id="contenu" className="mes-contenu" tabIndex={-1}><Outlet /></main>
        <BarreTouches />
        <BarreEtat />
      </div>
    </FournisseurTouches>
  )
}
