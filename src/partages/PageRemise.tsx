import { useState, type FormEvent } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Afficheur } from '../composants/Afficheur'
import { CarteChoix, CartesChoix } from '../composants/CartesChoix'
import { Champ } from '../composants/Champ'
import { Chiffres } from '../composants/Chiffres'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { Jauge } from '../composants/Jauge'
import { ListeDetail } from '../composants/ListeDetail'
import { largeurNiveau } from '../composants/logique'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille, type TonPastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { ValidationPin } from '../composants/ValidationPin'
import { CorrectionFait } from '../corrections/CorrectionFait'
import { correctionContenant, correctionOuverte, type Correction } from '../corrections/huile'
import { afficherCentiemes } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import {
  afficherEcart,
  afficherKg,
  CHEMIN_PARTAGES,
  cheminCloture,
  cheminContenants,
  cheminRemise,
  corpsCloture,
  corpsContenant,
  corpsValidation,
  cuveProposee,
  cuveRequise,
  huileNette,
  partConvenue,
  quantiteAtteinte,
  resteBloquant,
  tamponPropose,
  type ContenantRemis,
  type FileRemise,
  type ResumeRemise,
  type VueRemise,
} from './remise'
import '../styles/production.css'

const t = libelles.remise
const PERIODE_MS = 5000
const FORMULAIRE = 'formulaire-remise'
type Reponse = { remise_huile: VueRemise }
type Etape = keyof typeof t.etapes
const TONS: Record<Etape, TonPastille> = { a_partager: 'action', bloque: 'erreur', calcule: 'action', remise_en_cours: 'alerte', ecart_a_valider: 'alerte', remis: 'ok' }

function etape(resume: Pick<ResumeRemise, 'statut_partage' | 'blocage'>): Etape {
  if (resume.statut_partage !== null) return resume.statut_partage
  return resume.blocage === null ? 'a_partager' : 'bloque'
}

function PastilleEtape({ resume }: { resume: Pick<ResumeRemise, 'statut_partage' | 'blocage'> }) {
  const e = etape(resume)
  return <Pastille ton={TONS[e]}>{t.etapes[e]}</Pastille>
}

/** Remise d'huile (CONTEXTE §16.2–§16.3) : partage, contenants de l'agriculteur, clôture. */
export function PageRemise() {
  const file = useLecture<FileRemise>(CHEMIN_PARTAGES, PERIODE_MS)
  const ouverts = file.donnees?.passages ?? []
  const clos = file.donnees?.remis ?? []
  const [choisi, definirChoisi] = useState<number | null>(null)
  const connus = [...ouverts, ...clos]
  const passageId = connus.some((p) => p.passage.id === choisi) ? choisi : ouverts.length === 1 ? (ouverts[0]?.passage.id ?? null) : null
  const lecture = useLecture<Reponse>(passageId === null ? null : cheminRemise(passageId), PERIODE_MS)
  const s = useSoumission()
  const [vide, definirVide] = useState('')
  const [plein, definirPlein] = useState('')
  const [tamponId, definirTamponId] = useState<number | null>(null)
  const [cuveId, definirCuveId] = useState<number | null>(null)
  const [motif, definirMotif] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [invalide, definirInvalide] = useState(false)
  const [clotureInvalide, definirClotureInvalide] = useState(false)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  // Contenant que le responsable est en train de corriger (T4.10), dans un tiroir.
  const [demande, definirDemande] = useState<Correction | null>(null)

  const vue = lecture.donnees?.remise_huile.passage.id === passageId ? (lecture.donnees?.remise_huile ?? null) : null
  const peut = (action: string) => vue?.actions_possibles.includes(action) ?? false
  const tampon = vue === null ? null : tamponPropose(vue, tamponId)
  const cuve = vue === null ? null : cuveProposee(vue, cuveId)
  const net = huileNette(vide, plein)
  const actifs = vue?.contenants.filter((contenant) => contenant.active) ?? []
  const corrigeables = vue?.contenants_corrigeables ?? []
  const correction = correctionOuverte(demande, corrigeables)

  const remettreSaisie = () => {
    s.reinitialiser()
    definirVide('')
    definirPlein('')
    definirMotif('')
    definirValidation(null)
    definirInvalide(false)
    definirClotureInvalide(false)
  }

  const choisirPassage = (id: number) => {
    remettreSaisie()
    definirTamponId(null)
    definirCuveId(null)
    definirDemande(null)
    definirMessage(null)
    definirChoisi(id)
  }

  const rafraichir = async () => {
    remettreSaisie()
    await Promise.all([lecture.recharger(), file.recharger()])
  }

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    if (vue === null || s.enCours) return
    if (vue.partage === null) {
      if (!peut('calculer')) return
      const reponse = await s.soumettre<Reponse>(CHEMIN_PARTAGES, { trituration_id: vue.passage.id })
      if (reponse === null) return
      definirMessage({ texte: t.calcule.replace('{due}', afficherKg(reponse.remise_huile.partage?.huile_due_g ?? 0)), type: 'ok' })
      await rafraichir()
      return
    }
    const corps = corpsContenant(vide, plein, tampon)
    if (corps === null) {
      definirInvalide(true)
      return
    }
    const reponse = await s.soumettre<Reponse>(cheminContenants(vue.partage.id), corps)
    if (reponse === null) return
    const dernier = reponse.remise_huile.contenants.filter((contenant) => contenant.active).at(-1)
    if (dernier !== undefined) {
      definirMessage({
        texte: t.enregistre
          .replace('{sequence}', String(dernier.sequence))
          .replace('{poids}', afficherKg(dernier.huile_nette_g))
          .replace('{reste}', afficherKg(Math.max(0, reponse.remise_huile.reste_du_g ?? 0))),
        type: 'ok',
      })
    }
    await rafraichir()
  }

  const cloturer = async (avecValidation: boolean) => {
    if (vue === null || vue.partage === null || s.enCours) return
    const corps = avecValidation ? corpsValidation(vue, cuve, motif) : corpsCloture(vue, cuve)
    if (corps === null || (avecValidation && validation === null)) {
      definirClotureInvalide(true)
      return
    }
    s.reinitialiser()
    const reponse = await s.soumettre<Reponse>(cheminCloture(vue.partage.id, avecValidation), avecValidation ? { ...corps, validation } : corps)
    if (reponse === null) return
    // La remise close reste à l'écran (bon de sortie, écart), même si elle quitte la liste des remises ouvertes.
    definirChoisi(vue.passage.id)
    const cloture = reponse.remise_huile.cloture
    if (cloture !== null) {
      definirMessage({ texte: t.cloturee.replace('{poids}', afficherKg(cloture.huile_remise_g)).replace('{numero}', String(cloture.bon_sortie?.numero ?? '')), type: 'ok' })
    }
    await rafraichir()
  }

  const principal =
    vue === null
      ? null
      : vue.partage === null
        ? peut('calculer')
          ? { etiquette: t.calculer, formulaire: FORMULAIRE, enCours: s.enCours }
          : null
        : peut('peser_contenant') && vue.tampons.length > 0
          ? { etiquette: t.enregistrer, formulaire: FORMULAIRE, enCours: s.enCours }
          : null
  const poidsInvalides = invalide && net === null
  const tamponManquant = invalide && net !== null && tampon === null
  const convenu = vue === null ? null : partConvenue(vue)
  const horsTolerance = vue?.ecart_hors_tolerance === true
  const bloqueParReste = vue !== null && resteBloquant(vue)
  const besoinCuve = vue !== null && cuveRequise(vue)

  const colonnesListe: Colonne<ResumeRemise>[] = [
    { cle: 'passage', titre: t.colonnesListe.passage, rendu: (r) => <strong>{r.passage.numero}</strong>, nombre: true },
    { cle: 'apporteur', titre: t.colonnesListe.apporteur, rendu: (r) => <>{r.apporteur} <span className="aide">{t.colonnesListe.reception} {r.reception.numero}</span></> },
    { cle: 'regime', titre: t.colonnesListe.regime, rendu: (r) => t.regimes[r.regime] },
    { cle: 'huile', titre: t.colonnesListe.huile, rendu: (r) => afficherKg(r.huile_pesee_g), nombre: true },
    { cle: 'etape', titre: t.colonnesListe.etape, rendu: (r) => <PastilleEtape resume={r} /> },
  ]

  const colonnesContenants: Colonne<ContenantRemis>[] = [
    { cle: 'numero', titre: t.colonnes.numero, rendu: (c) => c.sequence, nombre: true },
    { cle: 'vide', titre: t.colonnes.vide, rendu: (c) => afficherKg(c.poids_vide_g), nombre: true },
    { cle: 'plein', titre: t.colonnes.plein, rendu: (c) => afficherKg(c.poids_plein_g), nombre: true },
    { cle: 'huile', titre: t.colonnes.huile, rendu: (c) => <strong>{afficherKg(c.huile_nette_g)}</strong>, nombre: true },
    {
      cle: 'tampon',
      titre: t.colonnes.tampon,
      rendu: (c) => (
        <span className="prod-actions">
          <span className="prod-chiffres-texte">{c.tampon?.code ?? ''}</span>
          {!c.active && <Pastille>{t.remplace}</Pastille>}
        </span>
      ),
    },
    ...(corrigeables.length > 0
      ? [
          {
            cle: 'correction',
            titre: libelles.correctionsHuile.colonne,
            rendu: (c: ContenantRemis) =>
              corrigeables.includes(c.id) && c.id !== correction?.id && (
                <button type="button" className="bouton-secondaire bouton-petit" onClick={() => { definirMessage(null); definirDemande(correctionContenant(c)) }}>{libelles.correctionsHuile.corriger}</button>
              ),
          },
        ]
      : []),
  ]

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.remiseHuile} sousTitre={t.resume.replace('{passages}', String(ouverts.length))} message={message} principal={principal} />
      <div className="mes-page prod-page">
        <ListeDetail
          liste={
            <>
              <Panneau titre={t.aRemettre} icone="list" compte={ouverts.length} serre>
                <TableauDonnees
                  legende={t.aRemettre}
                  colonnes={colonnesListe}
                  lignes={file.donnees === null ? null : ouverts}
                  cleLigne={(r) => r.passage.id}
                  vide={t.aucun}
                  erreur={file.erreur}
                  surChoisir={(r) => choisirPassage(r.passage.id)}
                  choisie={passageId}
                />
              </Panneau>
              {clos.length > 0 && (
                <Panneau titre={t.remis} icone="circle-check" compte={clos.length} serre>
                  <TableauDonnees
                    legende={t.remisLegende}
                    colonnes={colonnesListe}
                    lignes={clos}
                    cleLigne={(r) => r.passage.id}
                    vide={t.aucun}
                    surChoisir={(r) => choisirPassage(r.passage.id)}
                    choisie={passageId}
                  />
                </Panneau>
              )}
            </>
          }
          detail={
            <>
              {passageId === null && ouverts.length > 1 && (
                <Panneau titre={libelles.ecrans.remiseHuile} icone="droplets">
                  <EtatVide message={t.choisir} />
                </Panneau>
              )}
              {lecture.erreur !== null && <Note ton="erreur">{lecture.erreur}</Note>}

              {vue !== null && convenu !== null && (
                <Panneau
                  titre={t.titrePartage.replace('{numero}', String(vue.passage.numero)).replace('{apporteur}', vue.apporteur)}
                  icone="droplets"
                  actions={<PastilleEtape resume={{ statut_partage: vue.partage?.statut ?? null, blocage: vue.blocage }} />}
                >
                  <Note>{t.convenu[convenu.type].replace('{valeur}', convenu.valeur)}</Note>
                  <Chiffres
                    valeurs={[
                      { etiquette: t.huilePesee, valeur: `${afficherKg(vue.partage?.huile_totale_g ?? vue.huile_pesee_g)} ${t.kg}` },
                      ...(vue.partage === null
                        ? []
                        : [
                            { etiquette: t.due, valeur: `${afficherKg(vue.partage.huile_due_g)} ${t.kg}` },
                            { etiquette: t.huilerie, valeur: `${afficherKg(vue.partage.huile_huilerie_g)} ${t.kg}` },
                            { etiquette: t.dejaRemis, valeur: `${afficherKg(vue.huile_remise_g)} ${t.kg}` },
                            ...(vue.cloture === null ? [{ etiquette: t.reste, valeur: `${afficherKg(Math.max(0, vue.reste_du_g ?? 0))} ${t.kg}`, ton: 'fort' as const }] : []),
                          ]),
                    ]}
                  />
                  {vue.partage !== null && vue.partage.huile_due_g > 0 && (
                    <div className="mes-champ">
                      <span className="mes-etiquette">{t.progression}</span>
                      <Jauge niveau={largeurNiveau(vue.huile_remise_g, vue.partage.huile_due_g)} />
                    </div>
                  )}
                  {vue.blocage !== null && <Note ton="erreur">{t.blocages[vue.blocage]}</Note>}
                  {vue.partage === null && vue.blocage === null && <Note>{t.aCalculer}</Note>}
                </Panneau>
              )}

              {vue !== null && principal !== null && (
                <form id={FORMULAIRE} className="prod-formulaire" onSubmit={(e) => void enregistrer(e)} aria-label={principal.etiquette} noValidate>
                  {vue.partage !== null && (
                    <>
                      <Afficheur
                        titre={`${t.afficheur} — ${t.contenant.replace('{numero}', String(actifs.length + 1))}`}
                        source={`${t.saisieManuelle} — ${t.lecture}`}
                        unite={t.kg}
                        lignes={[
                          { id: 'poids-vide', libelle: t.vide, nom: t.videAccessible, valeur: vide, surChangement: (valeur) => { definirVide(valeur); definirInvalide(false); s.reinitialiser() }, invalide: poidsInvalides, autoFocus: true },
                          { id: 'poids-plein', libelle: t.plein, nom: t.pleinAccessible, valeur: plein, surChangement: (valeur) => { definirPlein(valeur); definirInvalide(false); s.reinitialiser() }, invalide: poidsInvalides },
                        ]}
                        pied={net === null ? undefined : t.net.replace('{poids}', afficherKg(net))}
                        erreur={poidsInvalides ? t.poidsInvalides : undefined}
                      />
                      {quantiteAtteinte(vue) && <Note ton="ok" vivante>{t.arreter}</Note>}
                      {vue.tampons.length > 1 && (
                        <CartesChoix libelle={t.titreTampons} erreur={tamponManquant ? t.tamponObligatoire : undefined}>
                          {vue.tampons.map((unTampon) => (
                            <CarteChoix key={unTampon.id} titre={unTampon.code} choisie={tampon === unTampon.id} surChoisir={() => { definirTamponId(unTampon.id); definirInvalide(false) }}>
                              <span>{t.tamponDetail.replace('{solde}', afficherKg(unTampon.solde_g))}</span>
                            </CarteChoix>
                          ))}
                        </CartesChoix>
                      )}
                    </>
                  )}
                  {s.erreur !== null && <Note ton="erreur">{s.erreur}</Note>}
                </form>
              )}

              {vue !== null && vue.partage !== null && (
                <Panneau titre={t.titreContenants} icone="list" compte={`${afficherKg(vue.huile_remise_g)} ${t.kg}`} serre>
                  <TableauDonnees
                    legende={t.titreContenants}
                    colonnes={colonnesContenants}
                    lignes={vue.contenants}
                    cleLigne={(c) => c.id}
                    vide={t.aucunContenant}
                    className="tableau-triturations"
                    classeLigne={(c) => (c.active ? undefined : 'prod-remplacee')}
                  />
                </Panneau>
              )}

              {vue !== null && vue.partage !== null && vue.cloture === null && (actifs.length > 0 || vue.partage.huile_due_g === 0) && (peut('cloturer') || peut('valider_ecart')) && (
                <Panneau titre={t.titreCloture} icone="circle-check">
                  {vue.tolerance_g === null && <Note ton="erreur">{t.toleranceAbsente}</Note>}
                  {vue.tolerance_g !== null && vue.ecart_g !== null && (
                    <Note ton={horsTolerance ? 'alerte' : 'info'}>
                      {(horsTolerance ? t.ecartHorsTolerance : t.ecartDansTolerance).replace('{ecart}', afficherEcart(vue.ecart_g)).replace('{tolerance}', afficherKg(vue.tolerance_g))}
                    </Note>
                  )}
                  {bloqueParReste && <Note ton="erreur">{t.resteFacon.replace('{kg}', afficherKg(vue.reste_tampons_g))}</Note>}
                  {besoinCuve && (
                    <>
                      <Note>{t.partHuilerie.replace('{kg}', afficherKg(vue.reste_tampons_g)).replace('{acidite}', afficherCentiemes(vue.acidite_centiemes ?? 0))}</Note>
                      {(vue.orientation?.recommandees.length ?? 0) === 0 && <Note ton="erreur">{t.aucuneCuve}</Note>}
                      {(vue.orientation?.recommandees.length ?? 0) > 0 && (
                        <CartesChoix libelle={t.titreCuves} etiquetteCachee erreur={clotureInvalide && cuve === null ? t.cuveObligatoire : undefined}>
                          {vue.orientation?.recommandees.map((recommandee) => (
                            <CarteChoix key={recommandee.id} titre={recommandee.code} choisie={cuve === recommandee.id} surChoisir={() => { definirCuveId(recommandee.id); definirClotureInvalide(false) }}>
                              <span>{recommandee.stock_calcule_g === 0 ? t.cuveVide : t.cuveDetail.replace('{stock}', afficherKg(recommandee.stock_calcule_g)).replace('{capacite}', afficherKg(recommandee.capacite_g))}</span>
                              <Jauge niveau={largeurNiveau(recommandee.stock_calcule_g, recommandee.capacite_g)} qualite={recommandee.qualite_affectee} />
                              <span>{libelles.triturations.qualites[recommandee.qualite_affectee]}</span>
                            </CarteChoix>
                          ))}
                        </CartesChoix>
                      )}
                    </>
                  )}
                  {horsTolerance && peut('valider_ecart') && (
                    <>
                      <Champ
                        id="motif-ecart"
                        libelle={t.motif}
                        valeur={motif}
                        surChangement={(valeur) => { definirMotif(valeur); definirClotureInvalide(false) }}
                        erreur={clotureInvalide && motif.trim() === '' ? t.motifObligatoire : undefined}
                      />
                      <ValidationPin surValidation={definirValidation} />
                      {clotureInvalide && validation === null && <p className="mes-champ-erreur">{t.pinObligatoire}</p>}
                    </>
                  )}
                  <div className="prod-actions">
                    {horsTolerance && peut('valider_ecart') && (
                      <button type="button" className="bouton-secondaire" disabled={s.enCours || bloqueParReste} onClick={() => void cloturer(true)}>{t.valider}</button>
                    )}
                    {!horsTolerance && peut('cloturer') && (
                      <button type="button" className="bouton-secondaire" disabled={s.enCours || bloqueParReste || vue.tolerance_g === null} onClick={() => void cloturer(false)}>{t.cloturer}</button>
                    )}
                  </div>
                  {principal === null && s.erreur !== null && <Note ton="erreur">{s.erreur}</Note>}
                </Panneau>
              )}

              {vue !== null && vue.cloture !== null && (
                <Panneau titre={t.titreClos} icone="circle-check">
                  <Note ton="ok">
                    <p>{t.clos.replace('{poids}', afficherKg(vue.cloture.huile_remise_g)).replace('{ecart}', afficherEcart(vue.cloture.ecart_g)).replace('{numero}', String(vue.cloture.bon_sortie?.numero ?? ''))}</p>
                    {vue.cloture.valide_par !== null && <p>{t.closValide.replace('{nom}', vue.cloture.valide_par).replace('{motif}', vue.cloture.motif_ecart ?? '')}</p>}
                    {vue.cloture.entree_cuve !== null && <p>{t.closCuve.replace('{poids}', afficherKg(vue.cloture.entree_cuve.poids_g)).replace('{code}', vue.cloture.entree_cuve.cuve.code)}</p>}
                  </Note>
                </Panneau>
              )}
            </>
          }
        />
      </div>

      {correction !== null && (
        <CorrectionFait
          key={correction.id}
          correction={correction}
          surSucces={async (texte) => { definirDemande(null); definirMessage({ texte, type: 'ok' }); await rafraichir() }}
          surFermeture={() => definirDemande(null)}
        />
      )}
    </section>
  )
}
