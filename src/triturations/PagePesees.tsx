import { useState, type FormEvent } from 'react'
import { useDiffere } from '../api/useDiffere'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Afficheur } from '../composants/Afficheur'
import { CarteChoix, CartesChoix } from '../composants/CartesChoix'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { Jauge } from '../composants/Jauge'
import { ListeDetail } from '../composants/ListeDetail'
import { largeurNiveau } from '../composants/logique'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { CorrectionFait } from '../corrections/CorrectionFait'
import { correctionOuverte, correctionPesee, type Correction } from '../corrections/huile'
import { useSessionOuverte } from '../contextes/session'
import { formaterHorodatage } from '../format/dates'
import { grouperMilliers } from '../format/saisie'
import { afficherCentiemes } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { DestinationCuves } from './DestinationCuves'
import { CHEMIN_TRITURATIONS, type File, type Passage } from './logique'
import {
  afficherAciditeOuRien,
  afficherKg,
  CHEMIN_ALERTES,
  cheminAcquittement,
  cheminDerogation,
  cheminPesees,
  codeDestination,
  corpsDerogation,
  corpsPesee,
  cuveChoisissable,
  cuveProposee,
  passagesAPeser,
  poidsSaisi,
  tamponChoisissable,
  tamponPropose,
  type AlertePesee,
  type CuveEcartee,
  type PeseeHuile,
  type VuePesees,
} from './pesees'
import { TiroirDerogation } from './TiroirDerogation'
import '../styles/production.css'

const t = libelles.pesees
const PERIODE_MS = 5000
const FORMULAIRE = 'formulaire-pesee'
const SAISIE_POIDS = 'poids-contenant'

/** Après une pesée ou un changement de passage, le poids du contenant suivant se tape tout de suite. */
function revenirAuPoids() {
  requestAnimationFrame(() => document.getElementById(SAISIE_POIDS)?.focus())
}

/** Trituration en cours (CONTEXTE §16.1) : peser chaque contenant d'huile et choisir sa destination. */
export function PagePesees() {
  const { permissions } = useSessionOuverte()
  const voitAlertes = permissions.includes('acquitter_alerte_pesee')
  const file = useLecture<File>(CHEMIN_TRITURATIONS, PERIODE_MS)
  const passages = passagesAPeser(file.donnees?.passages ?? [])
  const [choisi, definirChoisi] = useState<number | null>(null)
  const passageId = passages.some((p) => p.id === choisi) ? choisi : passages.length === 1 ? (passages[0]?.id ?? null) : null
  const [poids, definirPoids] = useState('')
  // Le poids tapé part au serveur après une courte pause : il juge alors la place dans chaque cuve.
  const poidsG = useDiffere(poidsSaisi(poids), 300)
  const lecture = useLecture<{ pesees_huile: VuePesees }>(passageId === null ? null : cheminPesees(passageId, poidsG), PERIODE_MS)
  const alertes = useLecture<{ alertes: AlertePesee[] }>(voitAlertes ? CHEMIN_ALERTES : null, PERIODE_MS)
  const s = useSoumission()
  const [cuveId, definirCuveId] = useState<number | null>(null)
  const [tamponId, definirTamponId] = useState<number | null>(null)
  // Cuve refusée par la seule tolérance, pour laquelle le responsable déroge dans un tiroir.
  const [derogation, definirDerogation] = useState<CuveEcartee | null>(null)
  const [invalide, definirInvalide] = useState(false)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  // Pesée que le responsable est en train de corriger (T4.10), dans un tiroir.
  const [demande, definirDemande] = useState<Correction | null>(null)

  const vue = lecture.donnees?.pesees_huile.passage.id === passageId ? (lecture.donnees?.pesees_huile ?? null) : null
  const poidsTape = poidsSaisi(poids)
  const peutPeser = vue?.actions_possibles.includes('peser') ?? false
  const peutDeroger = vue?.actions_possibles.includes('deroger') ?? false
  const cuve = vue === null ? null : cuveProposee(vue, cuveId, poidsTape)
  const tampon = vue === null ? null : tamponPropose(vue, tamponId, poidsTape)
  const aucunTamponLibre = vue?.destination === 'tampon' && vue.tampons.length > 0 && tampon === null
  const actives = vue?.pesees.filter((pesee) => pesee.active) ?? []
  const corrigeables = vue?.pesees_corrigeables ?? []
  const correction = correctionOuverte(demande, corrigeables)
  const orientation = vue?.orientation ?? null
  const apresAJour = poidsTape !== null && orientation?.poids_g === poidsTape

  const remettreSaisie = () => {
    s.reinitialiser()
    definirPoids('')
    definirDerogation(null)
    definirInvalide(false)
  }

  const choisirPassage = (id: number) => {
    remettreSaisie()
    definirDemande(null)
    definirCuveId(null)
    definirTamponId(null)
    definirChoisi(id)
    revenirAuPoids()
  }

  const terminer = async (reponse: { pesees_huile: VuePesees }) => {
    const derniere = reponse.pesees_huile.pesees.filter((pesee) => pesee.active).at(-1)
    if (derniere !== undefined) {
      definirMessage({
        texte: t.enregistree.replace('{sequence}', String(derniere.sequence)).replace('{poids}', afficherKg(derniere.poids_g)).replace('{destination}', codeDestination(derniere)),
        type: 'ok',
      })
    }
    remettreSaisie()
    revenirAuPoids()
    await Promise.all([lecture.recharger(), alertes.recharger(), file.recharger()])
  }

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    if (vue === null || passageId === null || s.enCours) return
    const corps = corpsPesee(vue, poids, cuve, tampon)
    if (corps === null) {
      definirInvalide(true)
      return
    }
    const reponse = await s.soumettre<{ pesees_huile: VuePesees }>(cheminPesees(passageId), corps)
    if (reponse !== null) await terminer(reponse)
  }

  const deroger = async (motif: string, validation: Validation) => {
    if (derogation === null || passageId === null || s.enCours) return
    const corps = corpsDerogation(poids, derogation.id, motif)
    if (corps === null) return
    const reponse = await s.soumettre<{ pesees_huile: VuePesees }>(cheminDerogation(passageId), { ...corps, validation })
    if (reponse !== null) await terminer(reponse)
  }

  const ouvrirDerogation = (ecartee: CuveEcartee) => {
    s.reinitialiser()
    if (poidsTape === null) {
      // La dérogation vaut pour un contenant pesé : le poids d'abord.
      definirInvalide(true)
      definirMessage({ texte: t.derogationPoidsDabord, type: 'alerte' })
      revenirAuPoids()
      return
    }
    definirDemande(null)
    definirMessage(null)
    definirDerogation(ecartee)
  }

  const acquitter = async (alerte: AlertePesee) => {
    s.reinitialiser()
    const reponse = await s.soumettre<{ alerte: AlertePesee }>(cheminAcquittement(alerte.id), {})
    if (reponse === null) return
    definirMessage({ texte: t.acquittee, type: 'ok' })
    s.reinitialiser()
    await alertes.recharger()
  }

  const principal = vue !== null && peutPeser ? { etiquette: t.enregistrer, formulaire: FORMULAIRE, enCours: s.enCours && derogation === null } : null
  const poidsInvalide = invalide && poidsTape === null
  const destinationManquante = invalide && poidsTape !== null && vue !== null && corpsPesee(vue, poids, cuve, tampon) === null
  const listeAlertes = alertes.donnees?.alertes ?? []

  const colonnes: Colonne<PeseeHuile>[] = [
    { cle: 'numero', titre: t.colonnes.numero, rendu: (p) => p.sequence, nombre: true },
    { cle: 'heure', titre: t.colonnes.heure, rendu: (p) => formaterHorodatage(p.horodatage), nombre: true },
    { cle: 'poids', titre: t.colonnes.poids, rendu: (p) => afficherKg(p.poids_g), nombre: true },
    {
      cle: 'destination',
      titre: t.colonnes.destination,
      rendu: (p) => (
        <span className="prod-actions">
          <span className="prod-chiffres-texte">{codeDestination(p)}</span>
          {!p.active && <Pastille>{t.remplacee}</Pastille>}
        </span>
      ),
    },
    { cle: 'operateur', titre: t.colonnes.operateur, rendu: (p) => p.operateur },
    ...(corrigeables.length > 0
      ? [
          {
            cle: 'correction',
            titre: libelles.correctionsHuile.colonne,
            rendu: (p: PeseeHuile) =>
              corrigeables.includes(p.id) && p.id !== correction?.id && (
                <button type="button" className="bouton-secondaire bouton-petit" onClick={() => { definirMessage(null); definirDerogation(null); definirDemande(correctionPesee(p)) }}>{libelles.correctionsHuile.corriger}</button>
              ),
          },
        ]
      : []),
  ]

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.triturationEnCours} sousTitre={t.resume.replace('{passages}', String(passages.length))} message={message} principal={principal} />
      <div className="mes-page prod-page">
        <ListeDetail
          listeEtroite
          liste={
            <>
              <Panneau titre={t.enCours} icone="play" compte={passages.length} serre>
                {file.erreur !== null && <Note ton="erreur">{file.erreur}</Note>}
                {passages.length === 0 && !file.chargement && <EtatVide message={t.aucunPassage} />}
                {passages.length > 0 && (
                  <div className="prod-cartes">
                    {passages.map((passage) => (
                      <CartePassage key={passage.id} passage={passage} courant={passage.id === passageId} surChoisir={() => choisirPassage(passage.id)} />
                    ))}
                  </div>
                )}
              </Panneau>

              {voitAlertes && listeAlertes.length > 0 && (
                <Panneau titre={t.titreAlertes} icone="triangle-alert" compte={listeAlertes.length}>
                  {alertes.erreur !== null && <Note ton="erreur">{alertes.erreur}</Note>}
                  {listeAlertes.map((alerte) => (
                    <Note key={alerte.id} ton="alerte">
                      <p>
                        {t.alerte
                          .replace('{numero}', String(alerte.trituration.numero))
                          .replace('{ligne}', alerte.trituration.ligne)
                          .replace('{nombre}', String(alerte.details.nombre))
                          .replace('{poids}', afficherKg(alerte.details.poids_g))}
                      </p>
                      <div className="prod-actions">
                        <button type="button" className="bouton-secondaire bouton-petit" disabled={s.enCours} onClick={() => void acquitter(alerte)}>{t.acquitter}</button>
                      </div>
                    </Note>
                  ))}
                </Panneau>
              )}
            </>
          }
          detail={
            <>
              {passageId === null && passages.length > 1 && (
                <Panneau titre={t.afficheur} icone="weight">
                  <EtatVide message={t.choisir} />
                </Panneau>
              )}
              {lecture.erreur !== null && <Note ton="erreur">{lecture.erreur}</Note>}
              {vue !== null && peutPeser && (
                <form id={FORMULAIRE} className="prod-formulaire" onSubmit={(e) => void enregistrer(e)} aria-label={t.enregistrer} noValidate>
                  <Afficheur
                    titre={t.afficheur}
                    source={`${t.saisieManuelle} — ${t.lecture}`}
                    unite={t.kg}
                    lignes={[
                      {
                        id: SAISIE_POIDS,
                        libelle: t.contenant.replace('{numero}', String(actives.length + 1)),
                        nom: t.poidsAccessible,
                        valeur: poids,
                        surChangement: (valeur) => { definirPoids(valeur); definirInvalide(false); s.reinitialiser() },
                        invalide: poidsInvalide,
                        autoFocus: true,
                      },
                    ]}
                    erreur={poidsInvalide ? t.poidsInvalide : undefined}
                  />

                  {vue.destination === 'cuve' && vue.acidite !== null && orientation !== null && (
                    <DestinationCuves
                      acidite={vue.acidite}
                      orientation={orientation}
                      poidsG={poidsTape}
                      cuveChoisie={cuve}
                      surChoisir={(id) => { definirCuveId(id); definirInvalide(false) }}
                      peutDeroger={peutDeroger}
                      surDeroger={ouvrirDerogation}
                      erreur={destinationManquante ? t.destinationObligatoire : undefined}
                    />
                  )}
                  {/* Sans acidité, le serveur ne propose ni n'accepte aucune cuve : le dire au lieu d'un écran muet. */}
                  {vue.destination === 'cuve' && vue.acidite === null && (
                    <Panneau titre={t.titreCuves} icone="arrow-right">
                      <Note ton="erreur">{t.sansAcidite}</Note>
                    </Panneau>
                  )}

                  {vue.destination === 'tampon' && (
                    <Panneau titre={t.titreTampons} icone="arrow-right">
                      <Note>{t.huileTampon}</Note>
                      {vue.tampons.length === 0 && <Note ton="erreur">{t.aucunTampon}</Note>}
                      {aucunTamponLibre && <Note ton="erreur">{t.aucunTamponLibre}</Note>}
                      {vue.tampons.length > 0 && (
                        <CartesChoix libelle={t.titreTampons} etiquetteCachee erreur={destinationManquante && !aucunTamponLibre ? t.destinationObligatoire : undefined}>
                          {vue.tampons.map((unTampon) => (
                            <CarteChoix
                              key={unTampon.id}
                              titre={unTampon.code}
                              choisie={tampon === unTampon.id}
                              inactive={!tamponChoisissable(unTampon, poidsTape)}
                              surChoisir={() => { definirTamponId(unTampon.id); definirInvalide(false) }}
                            >
                              <span>{t.tamponDetail.replace('{contenu}', afficherKg(unTampon.contenu_g)).replace('{capacite}', afficherKg(unTampon.capacite_g))}</span>
                              <Jauge niveau={largeurNiveau(unTampon.contenu_g, unTampon.capacite_g)} />
                              <span>
                                {unTampon.etat === 'occupe'
                                  ? t.tamponOccupe.replace('{numero}', String(unTampon.passage_occupant ?? ''))
                                  : unTampon.libre_g === 0
                                    ? t.tamponPlein
                                    : t.tamponLibre.replace('{libre}', afficherKg(unTampon.libre_g))}
                              </span>
                            </CarteChoix>
                          ))}
                        </CartesChoix>
                      )}
                    </Panneau>
                  )}

                  <ApercuPesee vue={vue} numero={actives.length + 1} poidsG={poidsTape} cuveId={cuve} tamponId={tampon} apresAJour={apresAJour} />
                  {s.erreur !== null && derogation === null && <Note ton="erreur">{s.erreur}</Note>}
                </form>
              )}

              {vue !== null && (
                <Panneau titre={t.titrePesees} icone="list" compte={t.total.replace('{poids}', afficherKg(vue.huile_totale_g))} serre>
                  <TableauDonnees
                    legende={t.titrePesees}
                    colonnes={colonnes}
                    lignes={vue.pesees}
                    cleLigne={(p) => p.id}
                    vide={t.aucunePesee}
                    className="tableau-triturations"
                    classeLigne={(p) => (p.active ? undefined : 'prod-remplacee')}
                  />
                  {peutPeser && <p className="prod-discret prod-pied">{t.apresPesees}</p>}
                </Panneau>
              )}
            </>
          }
        />
      </div>

      {derogation !== null && poidsTape !== null && vue !== null && vue.acidite !== null && orientation !== null && (
        <TiroirDerogation
          key={derogation.id}
          cuve={derogation}
          poidsG={poidsTape}
          acidite={vue.acidite}
          max={afficherCentiemes(orientation.parametres.ecart_acidite_max_centiemes)}
          apresAJour={apresAJour}
          enCours={s.enCours}
          erreur={s.erreur}
          surValider={(motif, validation) => void deroger(motif, validation)}
          surFermer={() => { s.reinitialiser(); definirDerogation(null) }}
        />
      )}

      {correction !== null && derogation === null && (
        <CorrectionFait
          key={correction.id}
          correction={correction}
          surSucces={async (texte) => { definirDemande(null); definirMessage({ texte, type: 'ok' }); await lecture.recharger() }}
          surFermeture={() => definirDemande(null)}
        />
      )}
    </section>
  )
}

/** Passage en cours dans la liste : apporteurs, ligne, olives, et l'huile déjà pesée. */
function CartePassage({ passage, courant, surChoisir }: { passage: Passage; courant: boolean; surChoisir: () => void }) {
  return (
    <button type="button" className={passage.regime === 'achat' ? 'prod-carte' : 'prod-carte prod-carte-tampon'} aria-current={courant} onClick={surChoisir}>
      <span className="prod-carte-tete">
        <span className="prod-carte-numero">{t.lignePassage.replace('{numero}', String(passage.numero))}</span>
        {passage.regime !== null && <Pastille ton={passage.regime === 'achat' ? 'action' : 'violet'}>{libelles.triturations.regimes[passage.regime]}</Pastille>}
      </span>
      <span className="prod-carte-nom">{passage.lots.map((lot) => lot.apporteur).join(', ')}</span>
      <span className="prod-carte-detail">{t.detailPassage.replace('{ligne}', passage.ligne.libelle).replace('{kg}', grouperMilliers(passage.poids_kg))}</span>
      {passage.huile_pesee_g !== undefined && passage.contenants_peses !== undefined && (
        <span className="prod-carte-detail prod-chiffres-texte">
          {t.huilePassage.replace('{poids}', afficherKg(passage.huile_pesee_g)).replace('{nombre}', String(passage.contenants_peses))}
        </span>
      )}
    </button>
  )
}

interface PropsApercu {
  vue: VuePesees
  numero: number
  poidsG: number | null
  cuveId: number | null
  tamponId: number | null
  apresAJour: boolean
}

/** Ce que F8 va enregistrer, en clair, juste avant de le faire (CONTEXTE §2.1). */
function ApercuPesee({ vue, numero, poidsG, cuveId, tamponId, apresAJour }: PropsApercu) {
  const a = t.apercu
  let ligne: string
  let detail: string | null = null
  if (poidsG === null) {
    ligne = a.sansPoids
  } else {
    const poids = afficherKg(poidsG)
    const cuve = cuveChoisissable(vue, cuveId)
    const tampon = vue.tampons.find((c) => c.id === tamponId)
    if (vue.destination === 'cuve' && cuve !== undefined) {
      ligne = a.cuve.replace('{numero}', String(numero)).replace('{poids}', poids).replace('{code}', cuve.code)
      const apres = afficherAciditeOuRien(cuve.acidite_apres)
      if (apresAJour) {
        detail = apres === null ? t.apresSansAcidite.replace('{stock}', afficherKg(cuve.stock_apres_g)) : t.apres.replace('{stock}', afficherKg(cuve.stock_apres_g)).replace('{acidite}', apres)
      }
    } else if (vue.destination === 'tampon' && tampon !== undefined) {
      ligne = a.tampon.replace('{numero}', String(numero)).replace('{poids}', poids).replace('{code}', tampon.code)
      detail = a.libreApres.replace('{libre}', afficherKg(Math.max(0, tampon.libre_g - poidsG)))
    } else {
      ligne = a.sansDestination.replace('{numero}', String(numero)).replace('{poids}', poids)
    }
  }
  return (
    <section className="prod-apercu" aria-label={a.titre}>
      <span className="touche-f8" aria-hidden="true">F8</span>
      <p>
        <strong>{ligne}</strong>
        {detail !== null && <span>{detail}</span>}
      </p>
    </section>
  )
}
