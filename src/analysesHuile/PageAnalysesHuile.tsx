import { useState, type FormEvent } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Afficheur } from '../composants/Afficheur'
import { CarteChoix, CartesChoix } from '../composants/CartesChoix'
import { Champ } from '../composants/Champ'
import { Chiffres } from '../composants/Chiffres'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { ValidationPin } from '../composants/ValidationPin'
import { afficherKg } from '../cuves/logique'
import { formaterHorodatage } from '../format/dates'
import { afficherCentiemes } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import {
  CHEMIN_ANALYSES_HUILE,
  CHEMIN_ECHANTILLONS,
  cheminReclassement,
  corpsAnalyseHuile,
  corpsPrelevement,
  corpsReclassement,
  cuveAReclasser,
  echantillonMontre,
  type Choix,
  type CuveAReclasser,
  type EchantillonHuile,
  type EcranAnalysesHuile,
} from './analyses'
import '../styles/production.css'

const t = libelles.analysesHuile
const PERIODE_MS = 5000
const FORMULAIRE = 'formulaire-analyse-huile'
const VIDE: EcranAnalysesHuile = { a_analyser: [], analyses: [], cuves: [], passages: [], cuves_a_reclasser: [], reservations_a_revoir: [], actions_possibles: [] }
type Reponse = { echantillon_huile: EchantillonHuile }

function sujet(echantillon: EchantillonHuile): string {
  if (echantillon.cuve !== null) return t.sujets.cuve.replace('{code}', echantillon.cuve.code)
  if (echantillon.trituration !== null) return t.sujets.trituration.replace('{numero}', String(echantillon.trituration.numero))
  return t.sujets.chargement
}

/** Analyses d'huile (CONTEXTE §20) : prélèvement, saisie de l'acidité, reclassement d'une cuve. */
export function PageAnalysesHuile() {
  const lecture = useLecture<EcranAnalysesHuile>(CHEMIN_ECHANTILLONS, PERIODE_MS)
  const s = useSoumission()
  const ecran = lecture.donnees ?? VIDE
  const [choisi, definirChoisi] = useState<number | null>(null)
  const [choix, definirChoix] = useState<Choix | null>(null)
  const [aReclasser, definirAReclasser] = useState<number | null>(null)
  const [acidite, definirAcidite] = useState('')
  const [motif, definirMotif] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [invalide, definirInvalide] = useState(false)
  const [message, definirMessage] = useState<MessageEcran | null>(null)

  const echantillon = echantillonMontre(ecran, choisi)
  const cuve: CuveAReclasser | null = ecran.cuves_a_reclasser.find((c) => c.id === aReclasser && c.actions_possibles.includes('reclasser')) ?? null
  const aAnalyser = echantillon !== null && echantillon.actions_possibles.includes('analyser')
  const peutPrelever = ecran.actions_possibles.includes('prelever')
  // Valeur inhabituelle : le serveur demande une confirmation, envoyée au prochain F8.
  const aConfirmer = s.code === 'analyse_suspecte'

  const vider = () => {
    s.reinitialiser()
    definirAcidite('')
    definirMotif('')
    definirValidation(null)
    definirInvalide(false)
  }

  const montrer = (cible: { echantillon?: number; choix?: Choix; cuve?: number }) => {
    vider()
    definirMessage(null)
    definirChoisi(cible.echantillon ?? null)
    definirChoix(cible.choix ?? null)
    definirAReclasser(cible.cuve ?? null)
  }

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    if (s.enCours) return
    if (cuve !== null) {
      const corps = corpsReclassement(cuve, motif)
      if (corps === null || validation === null) {
        definirInvalide(true)
        return
      }
      const reponse = await s.soumettre<{ cuve: { code: string } }>(cheminReclassement(cuve.id), { ...corps, validation })
      if (reponse === null) return
      montrer({})
      definirMessage({ texte: t.reclassee.replace('{code}', cuve.code).replace('{qualite}', t.qualites[cuve.qualite_calculee]), type: 'ok' })
    } else if (aAnalyser && echantillon !== null) {
      const corps = corpsAnalyseHuile(echantillon.id, acidite, aConfirmer)
      if (corps === null) {
        definirInvalide(true)
        return
      }
      const reponse = await s.soumettre<Reponse>(CHEMIN_ANALYSES_HUILE, corps)
      if (reponse === null) return
      const analyse = reponse.echantillon_huile.analyse
      if (analyse !== null) {
        definirMessage({
          texte: t.analysee.replace('{reference}', reponse.echantillon_huile.reference).replace('{acidite}', afficherCentiemes(analyse.acidite_centiemes)).replace('{qualite}', t.qualites[analyse.classement]),
          type: cuveAReclasser(reponse.echantillon_huile) ? 'alerte' : 'ok',
        })
      }
      vider()
    } else {
      const corps = corpsPrelevement(choix)
      if (corps === null) return
      const reponse = await s.soumettre<Reponse>(CHEMIN_ECHANTILLONS, corps)
      if (reponse === null) return
      montrer({ echantillon: reponse.echantillon_huile.id })
      definirMessage({ texte: t.preleve.replace('{reference}', reponse.echantillon_huile.reference), type: 'ok' })
    }
    await lecture.recharger()
  }

  const principal =
    cuve !== null
      ? { etiquette: t.reclasser.replace('{qualite}', t.qualites[cuve.qualite_calculee]), formulaire: FORMULAIRE, enCours: s.enCours }
      : aAnalyser
        ? { etiquette: aConfirmer ? t.confirmer : t.enregistrerAnalyse, formulaire: FORMULAIRE, enCours: s.enCours }
        : choix !== null && peutPrelever
          ? { etiquette: t.enregistrerPrelevement, formulaire: FORMULAIRE, enCours: s.enCours }
          : null

  const colonnesAAnalyser: Colonne<EchantillonHuile>[] = [
    { cle: 'reference', titre: t.colonnes.reference, rendu: (e) => <strong className="prod-chiffres-texte">{e.reference}</strong> },
    { cle: 'sujet', titre: t.colonnes.sujet, rendu: sujet },
    { cle: 'preleve', titre: t.colonnes.preleve, rendu: (e) => formaterHorodatage(e.preleve_le), nombre: true },
    { cle: 'par', titre: t.colonnes.par, rendu: (e) => e.preleve_par },
  ]
  const colonnesAnalyses: Colonne<EchantillonHuile>[] = [
    { cle: 'reference', titre: t.colonnes.reference, rendu: (e) => <strong className="prod-chiffres-texte">{e.reference}</strong> },
    { cle: 'sujet', titre: t.colonnes.sujet, rendu: sujet },
    { cle: 'acidite', titre: t.colonnes.acidite, rendu: (e) => (e.analyse === null ? '—' : afficherCentiemes(e.analyse.acidite_centiemes)), nombre: true },
    { cle: 'classement', titre: t.colonnes.classement, rendu: (e) => e.analyse !== null && <Pastille ton="sombre">{t.qualites[e.analyse.classement]}</Pastille> },
  ]

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.analysesHuile} sousTitre={t.resume.replace('{echantillons}', String(ecran.a_analyser.length))} message={message} principal={principal} />
      <div className="mes-page prod-page">
        <ListeDetail
          liste={
            <>
              <Panneau titre={t.titreAAnalyser} icone="flask-round" compte={ecran.a_analyser.length} serre>
                <TableauDonnees
                  legende={t.titreAAnalyser}
                  colonnes={colonnesAAnalyser}
                  lignes={lecture.donnees === null ? null : ecran.a_analyser}
                  cleLigne={(e) => e.id}
                  vide={t.aucun}
                  erreur={lecture.erreur}
                  surChoisir={(e) => montrer({ echantillon: e.id })}
                  choisie={echantillon?.id ?? null}
                />
              </Panneau>
              {ecran.analyses.length > 0 && (
                <Panneau titre={t.dernieres} icone="history" serre>
                  <TableauDonnees
                    legende={t.dernieres}
                    colonnes={colonnesAnalyses}
                    lignes={ecran.analyses}
                    cleLigne={(e) => e.id}
                    vide={t.aucun}
                    surChoisir={(e) => montrer({ echantillon: e.id })}
                    choisie={echantillon?.id ?? null}
                  />
                </Panneau>
              )}
              {peutPrelever && (
                <Panneau titre={t.titrePrelevement} icone="test-tube">
                  {ecran.cuves.length === 0 && ecran.passages.length === 0 && <EtatVide message={t.rienAPrelever} />}
                  {ecran.cuves.length > 0 && (
                    <CartesChoix libelle={t.cuves}>
                      {ecran.cuves.map((c) => (
                        <CarteChoix key={c.id} titre={c.code} choisie={choix?.type === 'cuve' && choix.id === c.id} surChoisir={() => montrer({ choix: { type: 'cuve', id: c.id } })}>
                          <span>{t.stock.replace('{kg}', afficherKg(c.stock_calcule_g))}</span>
                          <span>{t.qualites[c.qualite_affectee]}</span>
                        </CarteChoix>
                      ))}
                    </CartesChoix>
                  )}
                  {ecran.passages.length > 0 && (
                    <CartesChoix libelle={t.passages}>
                      {ecran.passages.map((p) => (
                        <CarteChoix key={p.id} titre={t.sujets.trituration.replace('{numero}', String(p.numero))} choisie={choix?.type === 'trituration' && choix.id === p.id} surChoisir={() => montrer({ choix: { type: 'trituration', id: p.id } })}>
                          <span>{t.ligne.replace('{ligne}', p.ligne)}</span>
                        </CarteChoix>
                      ))}
                    </CartesChoix>
                  )}
                </Panneau>
              )}
            </>
          }
          detail={
            <form id={FORMULAIRE} className="prod-formulaire" onSubmit={(e) => void enregistrer(e)} aria-label={principal?.etiquette ?? libelles.ecrans.analysesHuile} noValidate>
              {ecran.cuves_a_reclasser.length > 0 && (
                <Panneau titre={t.titreReclassement} icone="triangle-alert" compte={ecran.cuves_a_reclasser.length}>
                  {ecran.cuves_a_reclasser.map((c) => (
                    <Note key={c.id} ton="alerte">
                      <p>{t.aReclasser.replace('{code}', c.code).replace('{affectee}', t.qualites[c.qualite_affectee]).replace('{calculee}', t.qualites[c.qualite_calculee])}</p>
                      {c.actions_possibles.includes('reclasser') && c.id !== cuve?.id && (
                        <div className="prod-actions">
                          <button type="button" className="bouton-secondaire bouton-petit" onClick={() => montrer({ cuve: c.id })}>{t.ouvrirReclassement}</button>
                        </div>
                      )}
                    </Note>
                  ))}
                  {ecran.reservations_a_revoir.map((r) => (
                    <Note key={r.id} ton="erreur">
                      {t.reservationARevoir.replace('{contrat}', String(r.contrat_vente_id)).replace('{kg}', afficherKg(r.poids_reserve_g)).replace('{qualite}', t.qualites[r.qualite])}
                    </Note>
                  ))}
                  {cuve !== null && (
                    <>
                      <Champ
                        id="motif-reclassement"
                        libelle={t.motif}
                        valeur={motif}
                        surChangement={(valeur) => { definirMotif(valeur); definirInvalide(false); s.reinitialiser() }}
                        erreur={invalide && motif.trim() === '' ? t.motifObligatoire : undefined}
                        autoFocus
                      />
                      <ValidationPin surValidation={definirValidation} />
                      {invalide && validation === null && <p className="mes-champ-erreur">{t.pinObligatoire}</p>}
                    </>
                  )}
                </Panneau>
              )}

              {echantillon !== null && (
                <Panneau titre={t.titreEchantillon.replace('{reference}', echantillon.reference).replace('{sujet}', sujet(echantillon))} icone="flask-round">
                  <p className="prod-discret">
                    {t.detail.replace('{heure}', formaterHorodatage(echantillon.preleve_le)).replace('{nom}', echantillon.preleve_par).replace('{fin}', echantillon.conservation_jusqua.split('-').reverse().join('/'))}
                  </p>
                  {aAnalyser && (
                    <Afficheur
                      titre={t.afficheur}
                      source={t.saisieManuelle}
                      unite="%"
                      lignes={[
                        {
                          id: 'acidite-huile',
                          decimales: 2,
                          libelle: t.aciditeCourte,
                          nom: t.acidite,
                          valeur: acidite,
                          surChangement: (valeur) => { definirAcidite(valeur); definirInvalide(false); s.reinitialiser() },
                          invalide,
                          autoFocus: true,
                          placeholder: '0,00',
                        },
                      ]}
                      erreur={invalide ? t.aciditeInvalide : undefined}
                    />
                  )}
                  {echantillon.analyse !== null && (
                    <Chiffres
                      valeurs={[
                        { etiquette: t.acidite, valeur: `${afficherCentiemes(echantillon.analyse.acidite_centiemes)} %` },
                        { etiquette: t.classement, valeur: t.qualites[echantillon.analyse.classement], ton: 'fort', texte: true },
                        { etiquette: t.analyseur, valeur: echantillon.analyse.analyseur, texte: true },
                      ]}
                    />
                  )}
                  {cuveAReclasser(echantillon) && echantillon.cuve !== null && echantillon.analyse !== null && (
                    <Note ton="alerte" vivante>
                      {t.aReclasser.replace('{code}', echantillon.cuve.code).replace('{affectee}', t.qualites[echantillon.cuve.qualite_affectee]).replace('{calculee}', t.qualites[echantillon.analyse.classement])}
                    </Note>
                  )}
                </Panneau>
              )}

              {echantillon === null && cuve === null && (
                <Panneau titre={t.afficheur} icone="flask-round">
                  <EtatVide message={t.choisir} />
                </Panneau>
              )}
              {s.erreur !== null && <Note ton="erreur">{s.erreur}</Note>}
            </form>
          }
        />
      </div>
    </section>
  )
}
