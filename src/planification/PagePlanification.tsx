import { useState, type FormEvent } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ } from '../composants/Champ'
import { Chiffres } from '../composants/Chiffres'
import { ChoixBoutons } from '../composants/ChoixBoutons'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { Icone } from '../composants/Icone'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille, type TonPastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { aujourdHuiTunis, formaterDate } from '../format/dates'
import { afficherMillimes } from '../format/montants'
import { grouperMilliers } from '../format/saisie'
import { libelles } from '../libelles'
import {
  afficherMinutes,
  avecNiveau,
  CHEMIN_ORDRE,
  CHEMIN_PLANIFICATION,
  CHEMIN_RESERVATIONS,
  cheminAnnulation,
  corpsOrdre,
  corpsReservation,
  deplacer,
  memeOrdre,
  NIVEAUX,
  parJour,
  PLAGES,
  quantiteSaisissable,
  type LotAPlanifier,
  type Niveau,
  type Planification,
  type Reservation,
  type SaisieReservation,
} from './logique'
import '../styles/production.css'

const t = libelles.planification
const PERIODE_MS = 5000
const FORMULAIRE = 'formulaire-planification'
const TONS_NIVEAU: Record<Niveau, TonPastille> = { normal: 'neutre', prioritaire: 'alerte', matinal: 'violet' }

function saisieInitiale(): SaisieReservation {
  return { date: aujourdHuiTunis(), plage: 'matin', niveau: 'normal', quantite: '' }
}

/** Planification (CONTEXTE §13) : réserver un passage pour un lot et ranger l'ordre d'un jour. */
export function PagePlanification() {
  const vue = useLecture<Planification>(CHEMIN_PLANIFICATION, PERIODE_MS)
  const s = useSoumission()
  const [lotId, definirLotId] = useState<number | null>(null)
  const [saisie, definirSaisie] = useState<SaisieReservation>(saisieInitiale)
  const [invalide, definirInvalide] = useState(false)
  // Ordre d'un jour en cours de rangement par le responsable, avant enregistrement.
  const [rangement, definirRangement] = useState<{ date: string; ids: number[] } | null>(null)
  const [motif, definirMotif] = useState('')
  const [message, definirMessage] = useState<MessageEcran | null>(null)

  const lots = vue.donnees?.lots_a_planifier ?? []
  const reservations = vue.donnees?.reservations ?? []
  const actions = vue.donnees?.actions_possibles ?? []
  const lot = lots.find((l) => l.id === lotId) ?? null
  const peutRanger = actions.includes('reordonner')

  const choisir = (suivant: LotAPlanifier | null) => {
    s.reinitialiser()
    definirInvalide(false)
    definirRangement(null)
    definirMotif('')
    definirSaisie(saisieInitiale())
    definirLotId(suivant?.id ?? null)
  }

  const reserver = async (e: FormEvent) => {
    e.preventDefault()
    if (lot === null || s.enCours) return
    const corps = corpsReservation(lot, saisie)
    if (corps === null) {
      definirInvalide(true)
      return
    }
    const reponse = await s.soumettre<{ reservation: Reservation }>(CHEMIN_RESERVATIONS, corps)
    if (reponse === null) return
    definirMessage({ texte: t.reservee.replace('{numero}', String(reponse.reservation.lot.numero)), type: 'ok' })
    await vue.recharger()
    choisir(null)
  }

  const annuler = async (reservation: Reservation) => {
    s.reinitialiser()
    const reponse = await s.soumettre<{ reservation: Reservation }>(cheminAnnulation(reservation.id), {})
    if (reponse === null) return
    definirMessage({ texte: t.annulee.replace('{numero}', String(reservation.lot.numero)), type: 'ok' })
    s.reinitialiser()
    await vue.recharger()
  }

  const bouger = (date: string, ids: number[], id: number, sens: -1 | 1) => {
    const depart = rangement !== null && rangement.date === date ? rangement.ids : ids
    const suite = deplacer(depart, id, sens)
    if (rangement === null) {
      s.reinitialiser()
      definirLotId(null)
    }
    definirRangement(memeOrdre(suite, ids) ? null : { date, ids: suite })
  }

  const ranger = async (e: FormEvent) => {
    e.preventDefault()
    if (rangement === null || s.enCours) return
    const corps = corpsOrdre(rangement.date, rangement.ids, motif)
    if (corps === null) {
      definirInvalide(true)
      return
    }
    const reponse = await s.soumettre<{ planification: Planification }>(CHEMIN_ORDRE, corps)
    if (reponse === null) return
    definirMessage({ texte: t.rangee.replace('{date}', formaterDate(rangement.date)), type: 'ok' })
    await vue.recharger()
    choisir(null)
  }

  const principal =
    rangement !== null
      ? { etiquette: t.enregistrerOrdre, formulaire: FORMULAIRE, enCours: s.enCours }
      : lot !== null
        ? { etiquette: t.reserver, formulaire: FORMULAIRE, enCours: s.enCours }
        : null
  const resume = t.resume.replace('{lots}', String(lots.length)).replace('{reservations}', String(reservations.length))
  const resteNet = (l: LotAPlanifier) => t.resteNet.replace('{reste}', grouperMilliers(l.reste_kg)).replace('{net}', grouperMilliers(l.net_kg))

  const colonnesLots: Colonne<LotAPlanifier>[] = [
    { cle: 'lot', titre: t.colonnes.lot, rendu: (l) => l.numero, nombre: true },
    { cle: 'apporteur', titre: t.colonnes.apporteur, rendu: (l) => l.apporteur },
    { cle: 'regime', titre: t.colonnes.regime, rendu: (l) => t.regimes[l.regime] },
    { cle: 'reste', titre: t.colonnes.reste, rendu: resteNet, nombre: true },
    { cle: 'prix', titre: t.colonnes.prix, rendu: (l) => l.prix_en_attente && <Pastille>{t.prixEnAttente}</Pastille> },
  ]

  const erreurQuantite = lot === null ? undefined : invalide ? t.quantiteInvalide.replace('{reste}', grouperMilliers(lot.reste_kg)) : s.champ === 'quantite_prevue_kg' && s.erreur !== null ? s.erreur : undefined

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.planification} sousTitre={resume} message={message} principal={principal} />
      <div className="mes-page prod-page">
        <ListeDetail
          liste={
            <Panneau titre={t.aPlanifier} icone="list" compte={lots.length} serre>
              <TableauDonnees
                legende={t.aPlanifier}
                colonnes={colonnesLots}
                lignes={vue.donnees === null ? null : lots}
                cleLigne={(l) => l.id}
                vide={t.aucunLot}
                erreur={vue.erreur}
                surChoisir={actions.includes('reserver') ? choisir : undefined}
                choisie={lot?.id ?? null}
              />
            </Panneau>
          }
          detail={
            lot !== null && rangement === null ? (
              <Panneau titre={t.titreLot.replace('{numero}', String(lot.numero)).replace('{apporteur}', lot.apporteur)} icone="calendar-clock">
                <form id={FORMULAIRE} className="prod-formulaire" onSubmit={(e) => void reserver(e)} aria-label={t.titreReservation} noValidate>
                  <Chiffres
                    valeurs={[
                      { etiquette: t.colonnes.regime, valeur: t.regimes[lot.regime], texte: true },
                      { etiquette: t.colonnes.reste, valeur: resteNet(lot) },
                      ...(lot.prix_en_attente ? [{ etiquette: t.colonnes.prix, valeur: t.prixEnAttente, texte: true }] : []),
                    ]}
                  />
                  <div className="prod-grille">
                    <Champ
                      id="date"
                      type="date"
                      libelle={t.date}
                      valeur={saisie.date}
                      min={aujourdHuiTunis()}
                      surChangement={(date) => definirSaisie({ ...saisie, date })}
                      erreur={s.champ === 'date_souhaitee' && s.erreur !== null ? s.erreur : undefined}
                      chiffres
                    />
                    {quantiteSaisissable(lot) && (
                      <Champ
                        id="quantite"
                        libelle={t.quantite}
                        aide={t.quantiteAide}
                        valeur={saisie.quantite}
                        surChangement={(quantite) => { definirSaisie({ ...saisie, quantite }); definirInvalide(false) }}
                        erreur={erreurQuantite}
                        inputMode="numeric"
                        placeholder={String(lot.reste_kg)}
                        chiffres
                      />
                    )}
                  </div>
                  <ChoixBoutons
                    libelle={t.plage}
                    options={PLAGES.map((plage) => ({ valeur: plage, libelle: t.plages[plage], inactive: saisie.niveau === 'matinal' && plage !== 'matin' }))}
                    valeur={saisie.plage}
                    surChoisir={(plage) => definirSaisie({ ...saisie, plage })}
                  />
                  <ChoixBoutons
                    libelle={t.niveau}
                    options={NIVEAUX.map((niveau) => ({ valeur: niveau, libelle: t.niveaux[niveau] }))}
                    valeur={saisie.niveau}
                    surChoisir={(niveau) => definirSaisie(avecNiveau(saisie, niveau))}
                    aide={saisie.niveau === 'matinal' ? t.aideMatinal : undefined}
                  />
                  {s.erreur !== null && s.champ !== 'date_souhaitee' && s.champ !== 'quantite_prevue_kg' && <Note ton="erreur">{s.erreur}</Note>}
                  <div className="prod-actions">
                    <button type="button" className="bouton-secondaire" onClick={() => choisir(null)}>{libelles.commun.annuler}</button>
                  </div>
                </form>
              </Panneau>
            ) : rangement !== null ? (
              <Panneau titre={t.titreOrdre} icone="list-ordered" compte={formaterDate(rangement.date)}>
                <form id={FORMULAIRE} className="prod-formulaire" onSubmit={(e) => void ranger(e)} aria-label={t.titreOrdre} noValidate>
                  <Champ
                    id="motif"
                    libelle={t.motif}
                    aide={t.motifAide}
                    valeur={motif}
                    surChangement={(valeur) => { definirMotif(valeur); definirInvalide(false) }}
                    erreur={invalide ? t.motifObligatoire : undefined}
                    autoFocus
                  />
                  {s.erreur !== null && <Note ton="erreur">{s.erreur}</Note>}
                  <div className="prod-actions">
                    <button type="button" className="bouton-secondaire" onClick={() => choisir(null)}>{t.abandonnerOrdre}</button>
                  </div>
                </form>
              </Panneau>
            ) : (
              <Panneau titre={t.titreReservation} icone="calendar-clock">
                <EtatVide message={lots.length === 0 ? t.rien : t.choisirLot} />
              </Panneau>
            )
          }
        />

        <Panneau
          titre={t.reservations}
          icone="list-ordered"
          compte={vue.donnees?.capacite_kg_h == null ? t.sansDebit : t.debit.replace('{debit}', grouperMilliers(vue.donnees.capacite_kg_h))}
          serre
        >
          {lot === null && rangement === null && s.erreur !== null && <Note ton="erreur">{s.erreur}</Note>}
          {vue.donnees !== null && reservations.length === 0 && <EtatVide message={t.aucuneReservation} />}
          {parJour(reservations).map((jour) => {
            const ids = jour.reservations.map((r) => r.id)
            const enRangement = rangement !== null && rangement.date === jour.date
            const affichees = enRangement ? rangement.ids.map((id) => jour.reservations.find((r) => r.id === id)).filter((r): r is Reservation => r !== undefined) : jour.reservations
            const colonnes: Colonne<Reservation>[] = [
              { cle: 'rang', titre: t.colonnes.rang, rendu: (r) => <strong>{affichees.indexOf(r) + 1}</strong>, nombre: true },
              { cle: 'lot', titre: t.colonnes.lot, rendu: (r) => <>{r.lot.numero} <span className="aide">{t.regimes[r.regime]}</span></>, nombre: true },
              { cle: 'apporteur', titre: t.colonnes.apporteur, rendu: (r) => r.apporteur },
              { cle: 'quantite', titre: t.colonnes.quantite, rendu: (r) => grouperMilliers(r.quantite_prevue_kg), nombre: true },
              { cle: 'plage', titre: t.colonnes.plage, rendu: (r) => t.plages[r.plage_souhaitee] },
              { cle: 'niveau', titre: t.colonnes.niveau, rendu: (r) => <Pastille ton={TONS_NIVEAU[r.niveau_service]}>{t.niveaux[r.niveau_service]}</Pastille> },
              { cle: 'supplement', titre: t.colonnes.supplement, rendu: (r) => (r.supplement_millimes === 0 ? '—' : afficherMillimes(r.supplement_millimes)), nombre: true },
              {
                cle: 'estimation',
                titre: t.colonnes.estimation,
                rendu: (r) =>
                  enRangement || r.duree_estimee_min == null || r.debut_estime_min == null
                    ? '—'
                    : t.estimation.replace('{debut}', afficherMinutes(r.debut_estime_min)).replace('{duree}', afficherMinutes(r.duree_estimee_min)),
              },
              {
                cle: 'actions',
                titre: t.colonnes.actions,
                rendu: (r) => {
                  const position = affichees.indexOf(r)
                  return (
                    <div className="prod-actions prod-actions-ligne">
                      {peutRanger && affichees.length > 1 && (
                        <>
                          <button type="button" className="bouton-secondaire bouton-petit" aria-label={t.monter.replace('{numero}', String(r.lot.numero))} disabled={position === 0} onClick={() => bouger(jour.date, ids, r.id, -1)}>
                            <Icone nom="arrow-up" />
                          </button>
                          <button type="button" className="bouton-secondaire bouton-petit" aria-label={t.descendre.replace('{numero}', String(r.lot.numero))} disabled={position === affichees.length - 1} onClick={() => bouger(jour.date, ids, r.id, 1)}>
                            <Icone nom="arrow-down" />
                          </button>
                        </>
                      )}
                      {r.actions_possibles.includes('annuler') && rangement === null && (
                        <button type="button" className="bouton-secondaire bouton-petit" aria-label={t.annulerLot.replace('{numero}', String(r.lot.numero))} disabled={s.enCours} onClick={() => void annuler(r)}>
                          <Icone nom="x" />
                          {t.annuler}
                        </button>
                      )}
                    </div>
                  )
                },
              },
            ]
            return (
              <TableauDonnees
                key={jour.date}
                legende={formaterDate(jour.date)}
                legendeVisible
                colonnes={colonnes}
                lignes={affichees}
                cleLigne={(r) => r.id}
                vide={t.aucuneReservation}
                className="tableau-planification"
              />
            )
          })}
        </Panneau>
      </div>
    </section>
  )
}
