import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, ChampChoix } from '../composants/Champ'
import { Chiffres } from '../composants/Chiffres'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { Etapes } from '../composants/Etapes'
import { EtatVide } from '../composants/EtatVide'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { formaterHorodatage } from '../format/dates'
import { grouperMilliers } from '../format/saisie'
import { libelles } from '../libelles'
import { surEntree } from '../reception/clavier'
import {
  aAnalyser,
  afficherCentiemes,
  CHAMPS_ANALYSE,
  champsInvalides,
  CHEMIN_ANALYSES,
  CHEMIN_VARIETES,
  cibleAnalyse,
  corpsAnalyse,
  SAISIE_VIDE,
  surPlace,
  varietesActives,
  type Analyse,
  type ChampAnalyse,
  type SaisieAnalyse,
  type Variete,
} from './analyse'
import {
  CHEMIN_ECHANTILLONS,
  CHEMIN_FILE,
  compter,
  corpsEchantillon,
  dernierEmplacement,
  peutPrelever,
  rangParcours,
  receptionMontree,
  texteBacs,
  type Echantillon,
  type ReceptionEnAttente,
} from './logique'
import { AnalysesSaisies } from './AnalysesSaisies'
import '../styles/laboratoire.css'

const t = libelles.labo
const a = libelles.labo.analyse
const PERIODE_MS = 5000
const FORMULAIRE_PRELEVEMENT = 'formulaire-prelevement'
const FORMULAIRE_ANALYSE = 'formulaire-analyse'
// Seconde adresse de l'écran (LAB-03) : il s'ouvre sur la saisie d'analyse.
const CHEMIN_SAISIE = '/laboratoire/analyses'
const PARCOURS = [
  { cle: 'ticket', libelle: t.etapesParcours.ticket },
  { cle: 'echantillon', libelle: t.etapesParcours.echantillon },
  { cle: 'analyse', libelle: t.etapesParcours.analyse },
  { cle: 'prix', libelle: t.etapesParcours.prix },
]

// Sur place (E-37), la réception s'analyse sans échantillon : l'étape « échantillon » disparaît du parcours.
const PARCOURS_SUR_PLACE = PARCOURS.filter((etape) => etape.cle !== 'echantillon')

const peutAnalyser = (reception: ReceptionEnAttente) => reception.etape === 'a_analyser' && reception.actions_possibles.includes('analyser')

/**
 * Analyses d'olives (CONTEXTE §11.1–§11.3 ; T-164, A3) : la file du labo à gauche ; à droite, l'action de la réception
 * choisie selon son étape : enregistrer l'échantillon (seul l'emplacement est saisi), ou saisir les quatre résultats
 * de l'analyseur. `/laboratoire/file` et `/laboratoire/analyses` ouvrent cet écran ; la seconde propose d'office le
 * seul échantillon qui attend son analyse.
 */
export function PageAnalysesOlives() {
  const { pathname } = useLocation()
  const vueAnalyse = pathname === CHEMIN_SAISIE
  const file = useLecture<ReceptionEnAttente[]>(CHEMIN_FILE, PERIODE_MS)
  const s = useSoumission()
  const [parametres, definirParametres] = useSearchParams()
  const [choisieId, definirChoisieId] = useState<number | null>(null)
  const [emplacement, definirEmplacement] = useState('')
  const [saisie, definirSaisie] = useState<SaisieAnalyse>(SAISIE_VIDE)
  const [varieteId, definirVarieteId] = useState('')
  const [invalides, definirInvalides] = useState<ChampAnalyse[]>([])
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const [derniere, definirDerniere] = useState<Analyse | null>(null)
  // Nombre d'analyses enregistrées ici : la liste des analyses saisies se relit après chacune.
  const [enregistrees, definirEnregistrees] = useState(0)

  const receptions = file.donnees ?? []
  const nombres = compter(receptions)
  const choisie = receptionMontree(receptions, choisieId, parametres.get('echantillon'), vueAnalyse)
  const prelevement = choisie !== null && choisie.etape === 'a_prelever' && peutPrelever(choisie)
  const analyse = choisie !== null && peutAnalyser(choisie)
  const varietes = useLecture<Variete[]>(analyse ? CHEMIN_VARIETES : null)
  // Valeur inhabituelle : le serveur demande une confirmation, envoyée au prochain F8.
  const aConfirmer = analyse && s.code === 'analyse_suspecte'

  // Une autre réception à droite (choisie, ou sortie de la file) : la saisie repart à neuf, avec un nouvel identifiant
  // de commande. Ainsi des valeurs tapées pour une réception ne partent jamais pour une autre.
  const idMontree = choisie?.id ?? null
  const [idSaisie, definirIdSaisie] = useState<number | null>(idMontree)
  if (idSaisie !== idMontree) {
    definirIdSaisie(idMontree)
    definirSaisie(SAISIE_VIDE)
    definirVarieteId('')
    definirInvalides([])
    definirEmplacement(dernierEmplacement(receptions))
  }
  const { reinitialiser } = s
  useEffect(() => {
    reinitialiser()
  }, [idMontree, reinitialiser])

  const choisir = (reception: ReceptionEnAttente | null) => {
    definirChoisieId(reception?.id ?? null)
    // Le choix à la main remplace l'échantillon nommé dans l'adresse.
    if (parametres.has('echantillon')) definirParametres({}, { replace: true })
  }

  const prelever = async (e: FormEvent) => {
    e.preventDefault()
    if (choisie === null || !prelevement || s.enCours) return
    const reponse = await s.soumettre<{ echantillon: Echantillon }>(CHEMIN_ECHANTILLONS, corpsEchantillon(choisie.id, emplacement))
    if (reponse === null) return
    definirMessage({ texte: t.enregistre.replace('{reference}', reponse.echantillon.reference), type: 'ok' })
    choisir(null)
    await file.recharger()
  }

  const analyser = async (e: FormEvent) => {
    e.preventDefault()
    if (choisie === null || !analyse || s.enCours) return
    const corps = corpsAnalyse(cibleAnalyse(choisie), saisie, varieteId, aConfirmer)
    if (corps === null) {
      definirInvalides(champsInvalides(saisie))
      return
    }
    const reponse = await s.soumettre<{ analyse: Analyse }>(CHEMIN_ANALYSES, corps)
    if (reponse === null) return
    definirDerniere(reponse.analyse)
    definirEnregistrees((n) => n + 1)
    definirMessage({ texte: a.enregistree.replace('{numero}', String(reponse.analyse.reception.numero)), type: 'ok' })
    // File relue d'abord : la réception analysée n'est plus proposée d'office.
    await file.recharger()
    choisir(null)
  }

  const changer = (champ: ChampAnalyse, valeur: string) => {
    definirSaisie((ancienne) => ({ ...ancienne, [champ]: valeur }))
    definirInvalides((anciens) => anciens.filter((c) => c !== champ))
    if (aConfirmer) s.reinitialiser()
  }

  const erreurChamp = (champ: ChampAnalyse): string | undefined => {
    if (invalides.includes(champ)) return a.invalide
    return s.champ === champ && s.erreur !== null ? s.erreur : undefined
  }
  const erreurAnalyse = s.champ !== null && (CHAMPS_ANALYSE as readonly string[]).includes(s.champ) ? null : s.erreur

  const principal = prelevement
    ? { etiquette: t.enregistrer, formulaire: FORMULAIRE_PRELEVEMENT, enCours: s.enCours }
    : analyse
      ? { etiquette: aConfirmer ? a.confirmer : a.enregistrer, formulaire: FORMULAIRE_ANALYSE, enCours: s.enCours }
      : null

  const colonnes: Colonne<ReceptionEnAttente>[] = [
    // Cinq colonnes : la file tient dans la moitié d'une tablette de 1024 px. Bacs et heure du ticket sont à droite.
    { cle: 'reception', titre: t.colonnes.reception, rendu: (r) => r.numero, nombre: true },
    { cle: 'apporteur', titre: t.colonnes.apporteur, rendu: (r) => <div className="labo-etape">{r.apporteur}<span className="aide">{t.regimes[r.regime]}</span></div> },
    { cle: 'net', titre: t.colonnes.net, rendu: (r) => grouperMilliers(r.net_kg), nombre: true },
    {
      cle: 'etape',
      titre: t.colonnes.etape,
      rendu: (r) => (
        <div className="labo-etape">
          <Pastille ton={r.etape === 'a_prelever' ? 'action' : 'alerte'} icone={r.etape === 'a_prelever' ? 'test-tube' : 'flask-conical'}>{t.etapes[r.etape]}</Pastille>
          {r.echantillon !== null && <span className="labo-reference">{r.echantillon.reference}</span>}
        </div>
      ),
    },
    {
      cle: 'action',
      titre: t.colonnes.actions,
      rendu: (r) =>
        peutPrelever(r) ? (
          <button type="button" className="bouton-secondaire" onClick={(e) => { e.stopPropagation(); choisir(r) }}>{t.prelever}</button>
        ) : peutAnalyser(r) ? (
          <button type="button" className="bouton-secondaire" onClick={(e) => { e.stopPropagation(); choisir(r) }}>{t.analyser}</button>
        ) : null,
    },
  ]

  const vide = vueAnalyse && aAnalyser(receptions).length === 0 ? a.aucune : receptions.length === 0 ? t.rien : vueAnalyse ? t.choisirAnalyse : t.choisir

  return (
    <section>
      <EnTeteEcran
        titre={libelles.onglets.analysesOlives}
        sousTitre={t.resume.replace('{aPrelever}', String(nombres.aPrelever)).replace('{aAnalyser}', String(nombres.aAnalyser))}
        message={message}
        principal={principal}
      />
      <div className="mes-page">
        <ListeDetail
          liste={
            <Panneau titre={t.titreFile} icone="list" compte={receptions.length} serre className="labo-file">
              <TableauDonnees
                legende={t.titreFile}
                colonnes={colonnes}
                lignes={file.donnees}
                cleLigne={(r) => r.id}
                vide={t.aucune}
                erreur={file.erreur}
                surChoisir={choisir}
                choisie={choisie?.id ?? null}
              />
            </Panneau>
          }
          detail={
            <>
              {choisie === null ? (
                <Panneau titre={libelles.onglets.analysesOlives} icone="flask-conical">
                  <EtatVide message={vide} />
                </Panneau>
              ) : (
                <Panneau
                  titre={choisie.etape === 'a_analyser' && choisie.echantillon !== null ? a.titreEchantillon.replace('{reference}', choisie.echantillon.reference) : t.titreReception.replace('{numero}', String(choisie.numero))}
                  icone={choisie.etape === 'a_prelever' ? 'test-tube' : 'flask-conical'}
                  compte={choisie.etape === 'a_analyser' && choisie.echantillon !== null ? a.reception.replace('{numero}', String(choisie.numero)) : undefined}
                  actions={<Pastille ton={choisie.etape === 'a_prelever' ? 'action' : 'alerte'}>{t.etapes[choisie.etape]}</Pastille>}
                >
                  <Chiffres
                    valeurs={[
                      { etiquette: t.colonnes.apporteur, valeur: choisie.apporteur, texte: true },
                      { etiquette: t.colonnes.regime, valeur: t.regimes[choisie.regime], texte: true },
                      { etiquette: t.colonnes.net, valeur: grouperMilliers(choisie.net_kg) },
                      { etiquette: t.colonnes.bacs, valeur: texteBacs(choisie.bacs) },
                      { etiquette: t.colonnes.ticket, valeur: formaterHorodatage(choisie.ticket_le) },
                      ...(choisie.echantillon === null ? [] : [{ etiquette: t.colonnes.emplacement, valeur: choisie.echantillon.emplacement, texte: true }]),
                    ]}
                  />
                  {surPlace(choisie) ? (
                    <Etapes libelle={t.parcours} etapes={PARCOURS_SUR_PLACE} rangActuel={1} />
                  ) : (
                    <Etapes libelle={t.parcours} etapes={PARCOURS} rangActuel={rangParcours(choisie)} />
                  )}

                  {prelevement && (
                    <form id={FORMULAIRE_PRELEVEMENT} className="labo-formulaire" onSubmit={(e) => void prelever(e)} aria-label={t.titrePrelevement.replace('{numero}', String(choisie.numero))} noValidate>
                      <Note>{t.contenu.replace('{apporteur}', choisie.apporteur).replace('{bacs}', texteBacs(choisie.bacs))}</Note>
                      <Champ
                        id="emplacement"
                        libelle={t.emplacement}
                        aide={t.emplacementAide}
                        valeur={emplacement}
                        surChangement={definirEmplacement}
                        erreur={s.champ === 'emplacement' && s.erreur !== null ? s.erreur : undefined}
                        autoFocus
                        maxLength={60}
                      />
                      {s.erreur !== null && s.champ !== 'emplacement' && <Note ton="erreur">{s.erreur}</Note>}
                      <p className="labo-consequence">{t.consequencePrelevement}</p>
                    </form>
                  )}

                  {analyse && (
                    <form id={FORMULAIRE_ANALYSE} className="labo-formulaire" onSubmit={(e) => void analyser(e)} onKeyDown={surEntree} aria-label={a.titre} noValidate>
                      <Note>{a.contenu.replace('{apporteur}', choisie.apporteur).replace('{net}', grouperMilliers(choisie.net_kg))}</Note>
                      <div className="labo-resultats">
                        {CHAMPS_ANALYSE.map((champ, rang) => (
                          <Champ
                            key={champ}
                            id={champ}
                            libelle={a.champs[champ]}
                            valeur={saisie[champ]}
                            surChangement={(valeur) => changer(champ, valeur)}
                            erreur={erreurChamp(champ)}
                            inputMode="decimal"
                            decimales={2}
                            placeholder="0,00"
                            autoFocus={rang === 0}
                            data-champ
                            grand
                          />
                        ))}
                      </div>
                      <ChampChoix
                        id="variete"
                        libelle={a.variete}
                        valeur={varieteId}
                        options={varietesActives(varietes.donnees ?? []).map((v) => ({ valeur: String(v.id), libelle: v.libelle }))}
                        surChangement={definirVarieteId}
                        choixVide={a.varieteInconnue}
                        data-champ
                      />
                      {erreurAnalyse !== null && <Note ton="erreur">{erreurAnalyse}</Note>}
                      {aConfirmer && <Note ton="alerte">{a.aideConfirmation}</Note>}
                    </form>
                  )}

                  {!prelevement && !analyse && <EtatVide message={t.aucuneAction} />}
                </Panneau>
              )}

              {derniere !== null && (
                <Panneau titre={a.derniere} icone="history" compte={derniere.echantillon.reference}>
                  <Chiffres
                    libelle={a.derniere}
                    valeurs={[
                      { etiquette: t.colonnes.reception, valeur: `${derniere.reception.numero} — ${derniere.reception.apporteur}`, texte: true },
                      ...CHAMPS_ANALYSE.map((champ) => ({ etiquette: a.champs[champ], valeur: afficherCentiemes(derniere[champ]) })),
                      { etiquette: a.variete, valeur: derniere.variete?.libelle ?? a.varieteInconnue, texte: true },
                      { etiquette: a.analyseur, valeur: derniere.analyseur, texte: true },
                    ]}
                  />
                </Panneau>
              )}
            </>
          }
        />
        <AnalysesSaisies version={enregistrees} />
      </div>
    </section>
  )
}
