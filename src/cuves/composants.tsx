// Petits éléments d'affichage communs à la liste et au détail des cuves (T4.1 ; refonte Session 5).
import type { CSSProperties } from 'react'
import { Pastille } from '../composants/Pastille'
import { afficherCentiemes } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import { afficherAcidite, afficherKg, largeurJauge, qualiteACorriger, remplissageCuve, type Cuve, type Qualite as NomQualite, type Remplissage } from './logique'

const t = libelles.cuves

/** Acidité calculée d'une cuve : valeur, encadrement, ou « Vide / Inconnue / À vérifier ». */
export function Acidite({ cuve }: { cuve: Cuve }) {
  const aide = cuve.etat_acidite === 'inconnue' ? t.aideInconnue : cuve.etat_acidite === 'a_verifier' ? t.aideAVerifier : undefined
  if (cuve.etat_acidite === 'connue') return <span className="prod-chiffres-texte">{afficherAcidite(cuve)}</span>
  return (
    <span title={aide}>
      <Pastille ton={cuve.etat_acidite === 'vide' ? 'neutre' : 'erreur'}>{afficherAcidite(cuve)}</Pastille>
    </span>
  )
}

/** Carré de la couleur de la qualité, devant son nom. */
export function PastilleQualite({ qualite }: { qualite: NomQualite }) {
  return <span className={`cuve-pastille cuve-pastille-${qualite}`} aria-hidden="true" />
}

/** Qualité affectée, et alerte si l'acidité calculée relève d'une autre classe. */
export function Qualite({ cuve }: { cuve: Cuve }) {
  return (
    <span className="prod-actions">
      <Pastille ton="sombre">{t.qualites[cuve.qualite_affectee]}</Pastille>
      {qualiteACorriger(cuve) && cuve.qualite_calculee !== null && (
        <Pastille ton="erreur">{t.qualiteCalculee.replace('{qualite}', t.qualites[cuve.qualite_calculee])}</Pastille>
      )}
    </span>
  )
}

/** Remplissage donné par le serveur : une petite cuve remplie par le bas, simple repère ; le pourcentage écrit fait foi. */
export function Jauge({ cuve }: { cuve: Cuve }) {
  return (
    <span className="jauge-cuve">
      <span className={`jauge-cuve-barre jauge-cuve-${cuve.qualite_affectee}`} aria-hidden="true">
        <span className="jauge-cuve-niveau" style={{ height: largeurJauge(cuve.remplissage_centiemes) }} />
      </span>
      <span className="prod-chiffres-texte">{t.pourcent.replace('{valeur}', afficherCentiemes(cuve.remplissage_centiemes))}</span>
    </span>
  )
}

/** Échantillon de couleur d'une cuve dessinée (légende de la cave). */
export function EchantillonRemplissage({ remplissage }: { remplissage: Remplissage }) {
  return <span className={`cave-echantillon cave-niveau-${remplissage}`} aria-hidden="true" />
}

interface PropsCuveCave {
  cuve: Cuve
  taille: { hauteur: number; largeur: number }
  choisie: boolean
  surChoix: () => void
}

/**
 * Cuve de la cave à huile (prototype v3) : corps rempli par le bas à la couleur de sa qualité, pieds, code et stock.
 * Le dessin n'est qu'un repère : le nom du bouton porte les chiffres du serveur.
 */
export function CuveCave({ cuve, taille, choisie, surChoix }: PropsCuveCave) {
  const remplissage = remplissageCuve(cuve)
  const pourcent = afficherCentiemes(cuve.remplissage_centiemes)
  const nom =
    t.cave.cuve
      .replace('{code}', cuve.code)
      .replace('{stock}', afficherKg(cuve.stock_calcule_g))
      .replace('{capacite}', afficherKg(cuve.capacite_g))
      .replace('{remplissage}', pourcent) + (qualiteACorriger(cuve) ? t.cave.aReclasser : '')
  const style = { '--hauteur': `${taille.hauteur}px`, '--largeur': `${taille.largeur}px` } as CSSProperties
  return (
    <button type="button" className="cave-cuve" style={style} aria-pressed={choisie} aria-label={nom} title={nom} onClick={surChoix}>
      {qualiteACorriger(cuve) && <span className="cave-cuve-alarme" aria-hidden="true">!</span>}
      <span className="cave-cuve-corps" aria-hidden="true">
        {remplissage !== 'vide' && <span className={`cave-cuve-niveau cave-niveau-${remplissage}`} style={{ height: largeurJauge(Math.max(cuve.remplissage_centiemes, 300)) }} />}
        {remplissage !== 'vide' && taille.largeur >= 50 && <span className="cave-cuve-pourcent">{t.pourcent.replace('{valeur}', pourcent)}</span>}
      </span>
      <span className="cave-cuve-pieds" aria-hidden="true" />
      <span className="cave-cuve-code" aria-hidden="true">{cuve.code}</span>
      <span className="cave-cuve-stock" aria-hidden="true">{remplissage === 'vide' ? t.cave.vide : t.kg.replace('{poids}', afficherKg(cuve.stock_calcule_g))}</span>
    </button>
  )
}
