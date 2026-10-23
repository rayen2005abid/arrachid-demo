import { Afficheur } from '../composants/Afficheur'
import { CarteChoix, CartesChoix } from '../composants/CartesChoix'
import { Champ } from '../composants/Champ'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille, type TonPastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { ValidationPin } from '../composants/ValidationPin'
import { formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'
import { afficherKg } from './logique'
import { afficherEcart, type Inventaire } from './operations'
import { FORMULAIRE_OPERATION, type OperationsCuve } from './useOperationsCuve'

const t = libelles.cuves.operations
const TONS: Record<Inventaire['etat'], TonPastille> = { a_valider: 'alerte', ajuste: 'ok', conforme: 'ok', perime: 'neutre' }

/** Panneau des opérations d'une cuve (T4.9) : choix de l'opération, saisie, contrôles et mélanges autorisés. */
export function PanneauOperations({ operations }: { operations: OperationsCuve }) {
  const {
    s, cuve, inventaires, autorisations, campagnes, possibles, aAjuster, operation, registre, destinations, approuvee,
    poids, motif, destination, campagne, invalide, pese, etiquettePoids, poidsFaux, visible,
    ouvrir, enregistrer, definirPoids, definirMotif, definirValidation, definirDestination, definirCampagne, definirInvalide, definirMessage,
  } = operations
  if (!visible) return null

  const colonnes: Colonne<Inventaire>[] = [
    { cle: 'date', titre: t.controle.date, rendu: (i) => formaterHorodatage(i.horodatage), nombre: true },
    { cle: 'mesure', titre: t.controle.mesure, rendu: (i) => afficherKg(i.mesure_physique_g), nombre: true },
    { cle: 'stock', titre: t.controle.stock, rendu: (i) => afficherKg(i.stock_calcule_g), nombre: true },
    { cle: 'ecart', titre: t.controle.ecart, rendu: (i) => <span className={i.ecart_g < 0 ? 'prod-sortie' : i.ecart_g > 0 ? 'prod-entree' : undefined}>{afficherEcart(i.ecart_g)}</span>, nombre: true },
    { cle: 'etat', titre: t.controle.etat, rendu: (i) => <Pastille ton={TONS[i.etat]}>{t.etats[i.etat]}</Pastille> },
    { cle: 'par', titre: t.controle.par, rendu: (i) => i.operateur },
    {
      cle: 'action',
      titre: t.controle.action,
      rendu: (i) => (
        <>
          {i.actions_possibles.includes('valider_ajustement') && i.id !== aAjuster?.id && (
            <button type="button" className="bouton-secondaire bouton-petit" onClick={() => { definirMessage(null); ouvrir('ajustement', i.id) }}>{t.ouvrirAjustement}</button>
          )}
          {i.valide_par !== null && <span className="aide">{t.ajustePar.replace('{nom}', i.valide_par).replace('{motif}', i.motif ?? '')}</span>}
        </>
      ),
    },
  ]

  return (
    <form id={FORMULAIRE_OPERATION} className="prod-formulaire" onSubmit={(e) => void enregistrer(e)} aria-label={t.titre} noValidate>
      {possibles.length > 0 && (
        <Panneau titre={t.titre} icone="sliders-horizontal">
          <CartesChoix libelle={t.titre} etiquetteCachee>
            {possibles.map((op) => (
              <CarteChoix key={op} titre={t.noms[op]} choisie={operation === op} surChoisir={() => { definirMessage(null); ouvrir(operation === op ? null : op) }}>
                {t.aides[op] !== '' && <span>{t.aides[op]}</span>}
              </CarteChoix>
            ))}
          </CartesChoix>
          {pese && operation !== null && (
            <Afficheur
              titre={etiquettePoids}
              source={t.saisieManuelle}
              unite="kg"
              lignes={[
                {
                  id: 'poids-operation',
                  libelle: t.noms[operation],
                  nom: etiquettePoids,
                  valeur: poids,
                  surChangement: (valeur) => { definirPoids(valeur); definirInvalide(false); s.reinitialiser() },
                  invalide: poidsFaux,
                  autoFocus: true,
                },
              ]}
              erreur={poidsFaux ? (operation === 'inventaire' ? t.mesureInvalide : t.poidsInvalide) : undefined}
            />
          )}
          {operation === 'inventaire' && cuve !== null && <Note>{t.stockCalcule.replace('{kg}', afficherKg(cuve.stock_calcule_g))}</Note>}
          {operation === 'ajustement' && aAjuster !== null && (
            <Note ton="alerte" vivante>{t.ajustementDe.replace('{date}', formaterHorodatage(aAjuster.horodatage)).replace('{ecart}', afficherEcart(aAjuster.ecart_g))}</Note>
          )}
          {operation === 'transfert' && (
            <>
              {registre.donnees !== null && destinations.length === 0 && <Note ton="alerte">{t.aucuneDestination}</Note>}
              <CartesChoix libelle={t.destination} erreur={invalide && destination === null ? t.destinationObligatoire : undefined}>
                {destinations.map((d) => (
                  <CarteChoix key={d.id} titre={d.code} choisie={destination === d.id} surChoisir={() => { definirDestination(d.id); definirInvalide(false); s.reinitialiser() }}>
                    <span>{t.stockCuve.replace('{kg}', afficherKg(d.stock_calcule_g))}</span>
                    <span>{libelles.cuves.qualites[d.qualite_affectee]}</span>
                  </CarteChoix>
                ))}
              </CartesChoix>
            </>
          )}
          {operation === 'melange' && (
            <CartesChoix libelle={t.campagne} erreur={invalide && campagne === null ? t.campagneObligatoire : undefined}>
              {campagnes.map((c) => (
                <CarteChoix key={c.id} titre={c.libelle} choisie={campagne === c.id} surChoisir={() => { definirCampagne(c.id); definirInvalide(false); s.reinitialiser() }} />
              ))}
            </CartesChoix>
          )}
          {approuvee && (
            <>
              <Champ
                id="motif-operation"
                libelle={t.motif}
                valeur={motif}
                surChangement={(valeur) => { definirMotif(valeur); definirInvalide(false); s.reinitialiser() }}
                erreur={invalide && motif.trim() === '' ? t.motifObligatoire : undefined}
                autoFocus={operation !== 'transfert'}
              />
              <ValidationPin surValidation={definirValidation} />
              {invalide && operations.validation === null && <p className="mes-champ-erreur">{t.pinObligatoire}</p>}
            </>
          )}
          {s.erreur !== null && <Note ton="erreur">{s.erreur}</Note>}
        </Panneau>
      )}
      {inventaires.length > 0 && (
        <Panneau titre={t.titreControles} icone="list" compte={inventaires.length} serre>
          <TableauDonnees legende={t.titreControles} colonnes={colonnes} lignes={inventaires} cleLigne={(i) => i.id} vide={t.titreControles} className="tableau-cuves" />
        </Panneau>
      )}
      {autorisations.length > 0 && (
        <Panneau titre={t.titreAutorisations} icone="history" compte={autorisations.length}>
          {autorisations.map((a) => (
            <p key={a.id} className="prod-discret">
              {t.autorisation.replace('{campagne}', a.campagne_source.libelle).replace('{date}', formaterHorodatage(a.horodatage)).replace('{nom}', a.autorise_par).replace('{motif}', a.motif)}
            </p>
          ))}
        </Panneau>
      )}
    </form>
  )
}
