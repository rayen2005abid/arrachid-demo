// Cuve de destination d'un contenant d'huile d'achat (PRD-02 ; CONTEXTE §17.2) : l'huile et la tolérance en tête, les
// cuves proposées par le serveur avec leur acidité, l'écart et l'acidité après ce contenant, puis les cuves de même
// qualité refusées (avec la raison chiffrée et la dérogation possible) ; le reste des cuves est replié.
// Tout chiffre vient du serveur : l'écran ne calcule ni moyenne ni écart.
import { CarteChoix, CartesChoix } from '../composants/CartesChoix'
import { Chiffres } from '../composants/Chiffres'
import { Jauge } from '../composants/Jauge'
import { largeurNiveau } from '../composants/logique'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { afficherAciditePortee } from '../cuves/logique'
import { afficherCentiemes } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import {
  afficherAciditeOuRien,
  afficherAciditePassage,
  afficherKg,
  manqueDePlace,
  nombreRepliees,
  plagesDeCodes,
  regrouperEcartees,
  type AciditePassage,
  type CuveEcartee,
  type CuveRecommandee,
  type Orientation,
  type RaisonCuve,
} from './pesees'

const t = libelles.pesees
const qualites = libelles.triturations.qualites

interface Props {
  acidite: AciditePassage
  orientation: Orientation
  /** Poids tapé maintenant, en grammes (null s'il est vide ou illisible). */
  poidsG: number | null
  cuveChoisie: number | null
  surChoisir: (cuveId: number) => void
  /** La personne peut déroger à la tolérance (permission renvoyée par le serveur). */
  peutDeroger: boolean
  surDeroger: (cuve: CuveEcartee) => void
  erreur?: string
}

export function DestinationCuves({ acidite, orientation, poidsG, cuveChoisie, surChoisir, peutDeroger, surDeroger, erreur }: Props) {
  const max = afficherCentiemes(orientation.parametres.ecart_acidite_max_centiemes)
  // « Après » n'est montré que si le serveur a jugé les cuves pour le poids tapé (la lecture suit la frappe).
  const apresAJour = poidsG !== null && orientation.poids_g === poidsG
  const autres = regrouperEcartees(orientation.ecartees)
  const repliees = nombreRepliees(autres)

  return (
    <Panneau titre={t.titreCuves} icone="arrow-right">
      <Chiffres
        libelle={t.huile.titre}
        valeurs={[
          { etiquette: t.huile.acidite, valeur: afficherAciditePassage(acidite), unite: '%', ton: 'fort' },
          { etiquette: t.huile.qualite, valeur: qualites[orientation.qualite], texte: true },
          { etiquette: t.huile.tolerance, valeur: max },
        ]}
      />

      {orientation.recommandees.length === 0 && <Note ton="erreur">{t.aucuneCuve}</Note>}
      {orientation.recommandees.length > 0 && (
        <CartesChoix libelle={t.titreCuves} etiquetteCachee erreur={erreur}>
          {orientation.recommandees.map((cuve) => (
            <CarteCuve key={cuve.id} cuve={cuve} max={max} poidsG={poidsG} apresAJour={apresAJour} choisie={cuveChoisie === cuve.id} surChoisir={() => surChoisir(cuve.id)} />
          ))}
        </CartesChoix>
      )}
      {orientation.recommandees.length === 0 && erreur !== undefined && <p className="mes-champ-erreur">{erreur}</p>}

      {autres.refusees.length > 0 && (
        <section className="prod-refusees" aria-label={t.refusees}>
          <h3 className="mes-etiquette">{`${t.refusees} (${autres.refusees.length})`}</h3>
          <ul>
            {autres.refusees.map((cuve) => (
              <li key={cuve.id}>
                <span className="prod-refusee-tete">
                  <strong>{cuve.code}</strong>
                  <span className="prod-chiffres-texte">{stockEtAcidite(cuve)}</span>
                </span>
                <ul className="prod-raisons">
                  {cuve.raisons.map((raison) => (
                    <li key={raison}>{raisonChiffree(cuve, raison, max, poidsG, apresAJour)}</li>
                  ))}
                </ul>
                {peutDeroger && cuve.derogation_possible && (
                  <button type="button" className="bouton-secondaire bouton-petit" onClick={() => surDeroger(cuve)}>{t.deroger}</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {repliees > 0 && (
        // Ouvert d'office quand la cuve choisie est une compatible non proposée : le choix reste visible.
        <details className="prod-autres" open={autres.nonProposees.some((cuve) => cuve.id === cuveChoisie) || undefined}>
          <summary>{t.autres.replace('{nombre}', String(repliees))}</summary>
          {autres.nonProposees.length > 0 && (
            <div className="prod-non-proposees">
              <CartesChoix libelle={t.nonProposees}>
                {autres.nonProposees.map((cuve) => (
                  <CarteCuve key={cuve.id} cuve={cuve} max={max} poidsG={poidsG} apresAJour={apresAJour} choisie={cuveChoisie === cuve.id} surChoisir={() => surChoisir(cuve.id)} />
                ))}
              </CartesChoix>
              <p className="prod-discret">{t.nonProposeesAide}</p>
            </div>
          )}
          <dl>
            {autres.autreQualite.map((groupe) => (
              <div key={groupe.qualite}>
                <dt>{`${t.autreQualite} — ${qualites[groupe.qualite]} (${groupe.codes.length})`}</dt>
                <dd>{plagesDeCodes(groupe.codes)}</dd>
              </div>
            ))}
            {autres.horsService.length > 0 && (
              <div>
                <dt>{t.horsService}</dt>
                <dd>{plagesDeCodes(autres.horsService)}</dd>
              </div>
            )}
          </dl>
        </details>
      )}
    </Panneau>
  )
}

interface PropsCarte {
  /** Cuve proposée, ou compatible non proposée (choisissable aussi). */
  cuve: CuveRecommandee | CuveEcartee
  max: string
  poidsG: number | null
  apresAJour: boolean
  choisie: boolean
  surChoisir: () => void
}

function CarteCuve({ cuve, max, poidsG, apresAJour, choisie, surChoisir }: PropsCarte) {
  const manque = manqueDePlace(cuve, poidsG)
  const ecart = afficherAciditeOuRien(cuve.ecart_acidite)
  const apres = afficherAciditeOuRien(cuve.acidite_apres)
  // Une cuve non proposée n'a pas de catégorie du serveur : son état se lit sur son stock.
  const categorie = 'categorie' in cuve ? cuve.categorie : cuve.stock_calcule_g === 0 ? 'cuve_vide' : 'cuve_utilisee'
  return (
    <CarteChoix
      titre={
        <span className="prod-cuve-titre">
          {cuve.code}
          <Pastille ton={categorie === 'cuve_en_derogation' ? 'alerte' : 'neutre'}>{t.categories[categorie]}</Pastille>
        </span>
      }
      choisie={choisie}
      inactive={manque > 0}
      surChoisir={surChoisir}
    >
      <span className="prod-chiffres-texte">{t.cuveDetail.replace('{stock}', afficherKg(cuve.stock_calcule_g)).replace('{capacite}', afficherKg(cuve.capacite_g))}</span>
      <Jauge niveau={largeurNiveau(cuve.stock_calcule_g, cuve.capacite_g)} qualite={cuve.qualite_affectee ?? undefined} />
      <span>{aciditeCuve(cuve)}</span>
      {ecart !== null && <span className="prod-chiffres-texte">{t.ecartCuve.replace('{ecart}', ecart).replace('{max}', max)}</span>}
      {manque > 0 && <span className="prod-cuve-manque">{t.manque.replace('{kg}', afficherKg(manque))}</span>}
      {manque === 0 && apresAJour && (
        <span className="prod-cuve-apres">
          {apres === null
            ? t.apresSansAcidite.replace('{stock}', afficherKg(cuve.stock_apres_g))
            : t.apres.replace('{stock}', afficherKg(cuve.stock_apres_g)).replace('{acidite}', apres)}
        </span>
      )}
    </CarteChoix>
  )
}

function aciditeCuve(cuve: CuveRecommandee | CuveEcartee): string {
  if (cuve.stock_calcule_g === 0) return t.cuveVide
  const acidite = afficherAciditePortee(cuve)
  return acidite === '—' ? t.aciditeInconnue : t.aciditeCuve.replace('{acidite}', acidite)
}

function stockEtAcidite(cuve: CuveEcartee): string {
  const stock = t.cuveDetail.replace('{stock}', afficherKg(cuve.stock_calcule_g)).replace('{capacite}', afficherKg(cuve.capacite_g))
  if (cuve.stock_calcule_g === 0) return `${stock} — ${t.cuveVide}`
  return `${stock} — ${aciditeCuve(cuve)}`
}

/** La raison du serveur, avec ses chiffres quand il les a donnés (écart, acidité après, place manquante). */
function raisonChiffree(cuve: CuveEcartee, raison: RaisonCuve, max: string, poidsG: number | null, apresAJour: boolean): string {
  if (raison === 'capacite_depassee') {
    const manque = manqueDePlace(cuve, poidsG)
    return manque > 0 ? t.manque.replace('{kg}', afficherKg(manque)) : t.raisonsCuve.capacite_depassee
  }
  if (raison === 'hors_tolerance') {
    const ecart = afficherAciditeOuRien(cuve.ecart_acidite)
    return ecart === null ? t.raisonsCuve.hors_tolerance : t.horsTolerance.replace('{ecart}', ecart).replace('{max}', max)
  }
  if (raison === 'moyenne_hors_qualite') {
    const apres = apresAJour ? afficherAciditeOuRien(cuve.acidite_apres) : null
    return apres === null ? t.raisonsCuve.moyenne_hors_qualite : t.moyenneHorsQualite.replace('{acidite}', apres)
  }
  return t.raisonsCuve[raison]
}
