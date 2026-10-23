import { useState, type FormEvent } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ } from '../composants/Champ'
import { Chiffres, type Chiffre } from '../composants/Chiffres'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille, type TonPastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { ValidationPin } from '../composants/ValidationPin'
import { grouperMilliers } from '../format/saisie'
import { afficherCentiemes } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import {
  afficherEcart,
  afficherKg,
  CHEMIN_CONTROLES,
  cheminControle,
  cheminJustification,
  corpsJustification,
  etat,
  passageMontre,
  reperesJauge,
  tonVerdict,
  tousLesPassages,
  type Controle,
  type FileRendement,
  type VueRendement,
} from './rendement'
import '../styles/production.css'

const t = libelles.rendement
const PERIODE_MS = 5000
const FORMULAIRE = 'formulaire-rendement'
type Reponse = { controle_rendement: VueRendement }
const TONS: Record<ReturnType<typeof etat>, TonPastille> = { a_controler: 'action', remise_en_cours: 'alerte', ok: 'ok', alerte: 'alerte', bloque: 'erreur', justifie: 'ok' }

/**
 * Jauge du rendement (maquette MES) : la bande de tolérance autour de la référence et le rendement réel. Repères
 * seulement, cachés aux lecteurs d'écran : les chiffres écrits au-dessus et le verdict viennent du serveur.
 */
function JaugeRendement({ controle }: { controle: Controle }) {
  if (controle.rendement_reference_centiemes === null || controle.tolerance_centiemes === null) return null
  const reperes = reperesJauge(controle.rendement_reel_centiemes, controle.rendement_reference_centiemes, controle.tolerance_centiemes)
  return (
    <div className="prod-jauge-rendement" aria-hidden="true">
      <span className="prod-jauge-bande" style={{ left: reperes.bande.gauche, width: reperes.bande.largeur }} />
      <span className="prod-jauge-repere" style={{ left: reperes.reference }}><span>{t.repereReference}</span></span>
      <span className={`prod-jauge-repere prod-jauge-reel-${tonVerdict(controle.statut)}`} style={{ left: reperes.reel }}><span>{t.repereReel}</span></span>
    </div>
  )
}

/** Contrôle de rendement (CONTEXTE §19) : verdict de chaque passage, justification du responsable. */
export function PageRendement() {
  const file = useLecture<FileRendement>(CHEMIN_CONTROLES, PERIODE_MS)
  const s = useSoumission()
  const [choisi, definirChoisi] = useState<number | null>(null)
  const [motif, definirMotif] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [invalide, definirInvalide] = useState(false)
  const [message, definirMessage] = useState<MessageEcran | null>(null)

  const donnees = file.donnees ?? { passages: [], alertes: [], controles: [] }
  const passageId = passageMontre(donnees, choisi)
  const vue = tousLesPassages(donnees).find((v) => v.passage.id === passageId) ?? null
  const peut = (action: string) => vue?.actions_possibles.includes(action) ?? false
  const controle = vue?.controle ?? null

  const remettreSaisie = () => {
    s.reinitialiser()
    definirMotif('')
    definirValidation(null)
    definirInvalide(false)
  }

  const choisirPassage = (v: VueRendement) => {
    remettreSaisie()
    definirMessage(null)
    definirChoisi(v.passage.id)
  }

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    if (vue === null || s.enCours) return
    let reponse: Reponse | null
    if (peut('controler')) {
      reponse = await s.soumettre<Reponse>(cheminControle(vue.passage.id), {})
    } else {
      const corps = corpsJustification(motif)
      if (corps === null || validation === null) {
        definirInvalide(true)
        return
      }
      reponse = await s.soumettre<Reponse>(cheminJustification(vue.passage.id), { ...corps, validation })
    }
    if (reponse === null) return
    const statut = reponse.controle_rendement.controle?.statut
    if (statut !== undefined) {
      definirMessage({ texte: t.resultats[statut].replace('{numero}', String(vue.passage.numero)), type: statut === 'ok' || statut === 'justifie' ? 'ok' : 'alerte' })
    }
    definirChoisi(vue.passage.id)
    remettreSaisie()
    await file.recharger()
  }

  const principal = peut('controler')
    ? { etiquette: t.controler, formulaire: FORMULAIRE, enCours: s.enCours }
    : peut('justifier')
      ? { etiquette: t.justifier, formulaire: FORMULAIRE, enCours: s.enCours }
      : null

  const colonnes: Colonne<VueRendement>[] = [
    { cle: 'passage', titre: t.colonnes.passage, rendu: (v) => <strong>{v.passage.numero}</strong>, nombre: true },
    { cle: 'ligne', titre: t.colonnes.ligne, rendu: (v) => v.passage.ligne },
    { cle: 'regime', titre: t.colonnes.regime, rendu: (v) => (v.regime === null ? '—' : t.regimes[v.regime]) },
    { cle: 'olives', titre: t.colonnes.olives, rendu: (v) => grouperMilliers(v.olives_kg), nombre: true },
    { cle: 'huile', titre: t.colonnes.huile, rendu: (v) => afficherKg(v.huile_g), nombre: true },
    { cle: 'etat', titre: t.colonnes.etat, rendu: (v) => <Pastille ton={TONS[etat(v)]}>{t.etats[etat(v)]}</Pastille> },
  ]
  const tableau = (titre: string, lignes: VueRendement[], vide: string) => (
    <TableauDonnees legende={titre} colonnes={colonnes} lignes={file.donnees === null ? null : lignes} cleLigne={(v) => v.passage.id} vide={vide} surChoisir={choisirPassage} choisie={passageId} />
  )
  const derniers = donnees.controles.filter((v) => !donnees.alertes.some((a) => a.passage.id === v.passage.id))

  const chiffres: Chiffre[] = vue === null ? [] : [
    { etiquette: t.olives, valeur: grouperMilliers(vue.olives_kg), unite: t.kg },
    { etiquette: t.huile, valeur: afficherKg(vue.huile_g), unite: t.kg },
    ...(vue.rendement_reel_centiemes === null ? [] : [{ etiquette: t.reel, valeur: `${afficherCentiemes(vue.rendement_reel_centiemes)} %`, ton: 'fort' as const }]),
    ...(controle !== null && controle.rendement_reference_centiemes !== null ? [{ etiquette: t.references[controle.type_reference], valeur: `${afficherCentiemes(controle.rendement_reference_centiemes)} %` }] : []),
    ...(controle !== null && controle.ecart_centiemes !== null
      ? [{ etiquette: t.ecart, valeur: afficherEcart(controle.ecart_centiemes), ton: controle.statut === 'bloque' || controle.statut === 'alerte' ? ('mauvais' as const) : undefined }]
      : []),
    ...(controle !== null && controle.tolerance_centiemes !== null ? [{ etiquette: t.tolerance, valeur: `± ${afficherCentiemes(controle.tolerance_centiemes)}` }] : []),
  ]
  const tonNote = controle === null ? 'info' : tonVerdict(controle.statut)

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.controleRendement} sousTitre={t.resume.replace('{passages}', String(donnees.passages.length))} message={message} principal={principal} />
      <div className="mes-page prod-page">
        <ListeDetail
          liste={
            <>
              <Panneau titre={t.aTraiter} icone="triangle-alert" compte={donnees.passages.length} serre>
                {file.erreur !== null && <Note ton="erreur">{file.erreur}</Note>}
                {tableau(t.aTraiter, donnees.passages, t.aucun)}
              </Panneau>
              {donnees.alertes.length > 0 && (
                <Panneau titre={t.alertes} icone="triangle-alert" compte={donnees.alertes.length} serre>
                  {tableau(t.alertes, donnees.alertes, t.aucun)}
                </Panneau>
              )}
              {derniers.length > 0 && (
                <Panneau titre={t.derniers} icone="history" serre>
                  {tableau(t.derniers, derniers, t.aucun)}
                </Panneau>
              )}
            </>
          }
          detail={
            <>
              {vue === null && tousLesPassages(donnees).length > 0 && (
                <Panneau titre={libelles.ecrans.controleRendement} icone="gauge">
                  <EtatVide message={t.choisir} />
                </Panneau>
              )}
              {vue !== null && (
                <Panneau
                  titre={t.titre.replace('{numero}', String(vue.passage.numero)).replace('{ligne}', vue.passage.ligne)}
                  icone="gauge"
                  actions={<Pastille ton={TONS[etat(vue)]}>{t.etats[etat(vue)]}</Pastille>}
                >
                  <p className="prod-discret">{vue.lots.map((lot) => t.lot.replace('{numero}', String(lot.numero)).replace('{kg}', String(lot.poids_kg))).join(' · ')}</p>
                  <Chiffres valeurs={chiffres} />
                  {controle !== null && (
                    <>
                      <JaugeRendement controle={controle} />
                      <meter className="visuellement-cache" min={0} max={100} value={controle.rendement_reel_centiemes / 100} aria-label={t.reel} />
                    </>
                  )}
                  {controle === null && <Note>{vue.etape === 'a_controler' ? t.aControler : t.remiseEnCours}</Note>}
                  {controle !== null && controle.rendement_reference_centiemes === null && <Note>{t.sansReference}</Note>}
                  {controle !== null && <Note ton={tonNote} vivante>{t.verdicts[controle.statut]}</Note>}
                  {controle?.justification != null && (
                    <p className="prod-discret">{t.justifiePar.replace('{nom}', controle.justification.justifie_par).replace('{motif}', controle.justification.texte)}</p>
                  )}
                </Panneau>
              )}

              {vue !== null && principal !== null && (
                <form id={FORMULAIRE} className="prod-formulaire" onSubmit={(e) => void enregistrer(e)} aria-label={principal.etiquette} noValidate>
                  {peut('justifier') && (
                    <Panneau titre={t.titreJustification} icone="file-pen">
                      <Champ
                        id="motif-rendement"
                        libelle={t.motif}
                        valeur={motif}
                        surChangement={(valeur) => { definirMotif(valeur); definirInvalide(false); s.reinitialiser() }}
                        erreur={invalide && motif.trim() === '' ? t.motifObligatoire : undefined}
                        autoFocus
                      />
                      <ValidationPin surValidation={definirValidation} />
                      {invalide && validation === null && <p className="mes-champ-erreur">{t.pinObligatoire}</p>}
                    </Panneau>
                  )}
                  {s.erreur !== null && <Note ton="erreur">{s.erreur}</Note>}
                </form>
              )}
            </>
          }
        />
      </div>
    </section>
  )
}
