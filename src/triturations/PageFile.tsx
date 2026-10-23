import { useEffect, useState, type FormEvent } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ } from '../composants/Champ'
import { ChoixBoutons } from '../composants/ChoixBoutons'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { Icone } from '../composants/Icone'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille, type TonPastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { Tiroir } from '../composants/Tiroir'
import { formaterHorodatage } from '../format/dates'
import { grouperMilliers } from '../format/saisie'
import { afficherCentiemes } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import {
  achatChoisissable,
  afficherAciditeGroupe,
  basculerAchat,
  basculerEntier,
  CHEMIN_TRITURATIONS,
  cheminAction,
  cheminRegroupement,
  CHOIX_VIDE,
  choixEncoreValide,
  choixVide,
  corpsCreation,
  corpsFinProduction,
  etatFroid,
  passagesDeLigne,
  type Choix,
  type File,
  type Passage,
  type Regroupement,
  type Statut,
} from './logique'
import '../styles/production.css'

const t = libelles.triturations
const PERIODE_MS = 5000
const FORMULAIRE = 'formulaire-trituration'
const TONS_STATUT: Record<Statut, TonPastille> = {
  planifiee: 'neutre',
  en_cours: 'ok',
  production_terminee: 'action',
  rendement_bloque: 'erreur',
  terminee: 'ok',
  annulee: 'neutre',
}

/** Ce qui tourne sur chaque ligne et ce qui y est planifié : les passages du serveur, sans avancement ni fin estimée. */
function Lignes({ file }: { file: File }) {
  if (file.lignes.length === 0) return null
  return (
    <Panneau titre={t.lignes} icone="factory" compte={file.lignes.length} serre>
      <div className="prod-lignes">
        {file.lignes.map((ligne) => {
          const { enCours, planifies } = passagesDeLigne(file.passages, ligne.id)
          return (
            <section key={ligne.id} className={enCours.length > 0 ? 'prod-ligne prod-ligne-active' : 'prod-ligne'} aria-label={ligne.libelle}>
              <div className="prod-ligne-tete">
                <Icone nom="factory" />
                <h3>{ligne.libelle}</h3>
                {enCours.length > 0 ? <Pastille ton="ok" icone="play">{t.statuts.en_cours}</Pastille> : <Pastille>{t.aucunEnCours}</Pastille>}
              </div>
              {enCours.map((passage) => (
                <div key={passage.id} className="prod-lots">
                  <strong>{t.passage.replace('{numero}', String(passage.numero))} — {passage.lots.map((lot) => lot.apporteur).join(', ')}</strong>
                  <div className="prod-ligne-chiffres">
                    <span>{t.chiffresLigne.olives} <strong>{grouperMilliers(passage.poids_kg)}</strong></span>
                    {passage.debut !== null && <span>{t.chiffresLigne.debut} <strong>{formaterHorodatage(passage.debut)}</strong></span>}
                  </div>
                </div>
              ))}
              <p className="prod-discret">
                {planifies.length === 0 ? t.aucunPlanifie : t.planifies.replace('{passages}', planifies.map((p) => t.passage.replace('{numero}', String(p.numero))).join(', '))}
              </p>
            </section>
          )
        })}
      </div>
    </Panneau>
  )
}

/** File de trituration (CONTEXTE §14–§15) : former un passage, le démarrer, finir la production. */
export function PageFile() {
  const file = useLecture<File>(CHEMIN_TRITURATIONS, PERIODE_MS)
  const [choix, definirChoix] = useState<Choix>(CHOIX_VIDE)
  const regroupement = useLecture<Regroupement>(cheminRegroupement(choix.achats), PERIODE_MS)
  const s = useSoumission()
  const [ligneId, definirLigneId] = useState<number | null>(null)
  const [kg, definirKg] = useState<Record<number, string>>({})
  // Passage en cours dont on saisit la fin de production, dans un tiroir.
  const [aFinir, definirAFinir] = useState<number | null>(null)
  const [temperature, definirTemperature] = useState('')
  const [duree, definirDuree] = useState('')
  const [invalide, definirInvalide] = useState(false)
  const [message, definirMessage] = useState<MessageEcran | null>(null)

  const passages = file.donnees?.passages ?? []
  const lignes = file.donnees?.lignes ?? []
  const entiers = file.donnees?.lots_entiers ?? []
  const achats = regroupement.donnees?.lots ?? []
  const peutCreer = file.donnees?.actions_possibles.includes('creer') ?? false
  const groupe = regroupement.donnees?.selection ?? null
  const passageAFinir = passages.find((p) => p.id === aFinir && p.statut === 'en_cours') ?? null
  const ligneChoisie = ligneId ?? (lignes.length === 1 ? (lignes[0]?.id ?? null) : null)

  // Un lot pris ailleurs ou annulé quitte le choix dès la relecture.
  const listeAchats = regroupement.donnees?.lots ?? null
  const listeEntiers = file.donnees?.lots_entiers
  useEffect(() => {
    if (listeEntiers !== undefined) definirChoix((actuel) => choixEncoreValide(actuel, listeEntiers, listeAchats))
  }, [listeEntiers, listeAchats])

  const recharger = async () => {
    await Promise.all([file.recharger(), regroupement.recharger()])
  }

  const abandonner = () => {
    s.reinitialiser()
    definirChoix(CHOIX_VIDE)
    definirKg({})
    definirAFinir(null)
    definirTemperature('')
    definirDuree('')
    definirInvalide(false)
  }

  const choisir = (suivant: Choix) => {
    s.reinitialiser()
    definirAFinir(null)
    definirInvalide(false)
    definirChoix(suivant)
  }

  const creer = async (e: FormEvent) => {
    e.preventDefault()
    if (s.enCours) return
    const corps = corpsCreation(choix, ligneChoisie, kg, achats)
    if (corps === null) {
      definirInvalide(true)
      return
    }
    const reponse = await s.soumettre<{ passage: Passage }>(CHEMIN_TRITURATIONS, corps)
    if (reponse === null) return
    definirMessage({ texte: t.cree.replace('{numero}', String(reponse.passage.numero)), type: 'ok' })
    abandonner()
    await recharger()
  }

  const agir = async (passage: Passage, action: 'demarrage' | 'annulation', texte: string) => {
    s.reinitialiser()
    const reponse = await s.soumettre<{ passage: Passage }>(cheminAction(passage.id, action), {})
    if (reponse === null) return
    definirMessage({ texte: texte.replace('{numero}', String(passage.numero)), type: 'ok' })
    s.reinitialiser()
    await recharger()
  }

  const finir = async () => {
    if (passageAFinir === null || s.enCours) return
    const corps = corpsFinProduction(temperature, duree)
    if (corps === null) {
      definirInvalide(true)
      return
    }
    const reponse = await s.soumettre<{ passage: Passage }>(cheminAction(passageAFinir.id, 'fin-production'), corps)
    if (reponse === null) return
    // Un passage d'achat reçoit aussitôt son contrôle de rendement (T4.7) : le verdict est dit ici.
    const bloque = reponse.passage.statut === 'rendement_bloque'
    definirMessage({ texte: (bloque ? t.finieBloquee : t.finie).replace('{numero}', String(passageAFinir.numero)), type: bloque ? 'alerte' : 'ok' })
    abandonner()
    await recharger()
  }

  const ouvrirFin = (passage: Passage) => {
    abandonner()
    definirAFinir(passage.id)
  }

  const enCreation = !choixVide(choix) && passageAFinir === null
  const principal = enCreation ? { etiquette: t.creer, formulaire: FORMULAIRE, enCours: s.enCours, inactif: groupe !== null && !groupe.compatible } : null
  const resume = t.resume.replace('{lots}', String(entiers.length + achats.length)).replace('{passages}', String(passages.length))
  const kgInvalide = (lotId: number) => invalide && corpsCreation({ entier: null, achats: [lotId] }, ligneChoisie ?? 0, kg, achats) === null

  const colonnes: Colonne<Passage>[] = [
    { cle: 'numero', titre: t.colonnes.numero, rendu: (p) => <strong>{p.numero}</strong>, nombre: true },
    { cle: 'ligne', titre: t.colonnes.ligne, rendu: (p) => p.ligne.libelle },
    {
      cle: 'lots',
      titre: t.colonnes.lots,
      rendu: (p) => (
        <div className="prod-lots">
          {p.lots.map((lot) => (
            <div key={lot.affectation_id}>
              <span className="prod-chiffres-texte">{lot.lot.numero}</span> {lot.apporteur}{' '}
              <span className="aide">
                {t.regimes[lot.regime]}
                {lot.bacs_occupes.length > 0 && ` — ${t.bacs.replace('{bacs}', lot.bacs_occupes.join(', '))}`}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    { cle: 'olives', titre: t.colonnes.olives, rendu: (p) => grouperMilliers(p.poids_kg), nombre: true },
    { cle: 'etat', titre: t.colonnes.etat, rendu: (p) => <Pastille ton={TONS_STATUT[p.statut]}>{t.statuts[p.statut]}</Pastille> },
    {
      cle: 'production',
      titre: t.colonnes.production,
      rendu: (p) => {
        const froid = etatFroid(p)
        return (
          <div className="prod-lots">
            {p.debut !== null && <span>{t.debut.replace('{heure}', formaterHorodatage(p.debut))}</span>}
            {p.temperature_malaxage_centiemes !== null && p.duree_malaxage_min !== null && (
              <span>
                <span className="prod-chiffres-texte">{t.releve.replace('{temperature}', afficherCentiemes(p.temperature_malaxage_centiemes)).replace('{duree}', String(p.duree_malaxage_min))}</span>{' '}
                {/* Le froid vient de l'indicateur du serveur (seuil en vigueur), jamais d'un seuil écrit ici. */}
                {froid === 'respecte' && <Pastille ton="ok">{t.froid.respecte}</Pastille>}
                {froid === 'depasse' && <Pastille ton="erreur">{t.froid.depasse}</Pastille>}
                {froid === 'sans_seuil' && <span title={t.froid.aideSansSeuil}><Pastille>{t.froid.sansSeuil}</Pastille></span>}
              </span>
            )}
          </div>
        )
      },
    },
    {
      cle: 'actions',
      titre: t.colonnes.actions,
      rendu: (p) => (
        <div className="prod-actions prod-actions-ligne">
          {p.actions_possibles.includes('demarrer') && (
            <button type="button" className="bouton-secondaire" disabled={s.enCours} onClick={() => void agir(p, 'demarrage', t.demarre)}>
              <Icone nom="play" />
              {t.demarrer}
            </button>
          )}
          {p.actions_possibles.includes('annuler') && (
            <button type="button" className="bouton-secondaire" disabled={s.enCours} onClick={() => void agir(p, 'annulation', t.annule)}>
              <Icone nom="x" />
              {t.annuler}
            </button>
          )}
          {p.actions_possibles.includes('terminer_production') && (
            <button type="button" className="bouton-secondaire" disabled={s.enCours} onClick={() => ouvrirFin(p)}>
              <Icone nom="square" />
              {t.finProduction}
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.fileTrituration} sousTitre={resume} message={message} principal={principal} />
      <div className="mes-page prod-page">
        {file.donnees !== null && <Lignes file={file.donnees} />}

        <ListeDetail
          listeEtroite
          liste={
            <Panneau titre={t.aTriturer} icone="list" compte={entiers.length + achats.length} serre>
              {(file.erreur ?? regroupement.erreur) !== null && <Note ton="erreur">{file.erreur ?? regroupement.erreur}</Note>}
              {entiers.length + achats.length === 0 && !file.chargement && !regroupement.chargement && <EtatVide message={t.aucunLot} />}
              {entiers.length + achats.length > 0 && (
                <div className="prod-cartes">
                  {entiers.map((lot) => (
                    <button key={`e${lot.id}`} type="button" className="prod-carte prod-carte-tampon" aria-pressed={choix.entier === lot.id} disabled={!peutCreer} onClick={() => choisir(basculerEntier(choix, lot.id))}>
                      <span className="prod-carte-tete">
                        <span className="prod-carte-numero">{lot.numero}</span>
                        <span className="prod-carte-nom">{lot.apporteur}</span>
                        <Pastille ton="violet">{t.regimes[lot.regime]}</Pastille>
                      </span>
                      <span className="prod-carte-detail">{t.entier.replace('{net}', grouperMilliers(lot.net_kg))}</span>
                    </button>
                  ))}
                  {achats.map((lot) => {
                    const choisi = choix.achats.includes(lot.id)
                    const ecarte = !choisi && lot.compatible === false
                    return (
                      <button key={`a${lot.id}`} type="button" className="prod-carte" aria-pressed={choisi} disabled={!peutCreer || !(choisi || achatChoisissable(choix, lot))} onClick={() => choisir(basculerAchat(choix, lot.id))}>
                        <span className="prod-carte-tete">
                          <span className="prod-carte-numero">{lot.numero}</span>
                          <span className="prod-carte-nom">{lot.apporteur}</span>
                          <Pastille ton="action">{t.regimes.achat}</Pastille>
                        </span>
                        <span className="prod-carte-detail">
                          {t.achat.replace('{reste}', grouperMilliers(lot.reste_kg)).replace('{acidite}', afficherCentiemes(lot.acidite_centiemes)).replace('{qualite}', t.qualites[lot.qualite])}
                          {lot.variete !== null && ` — ${lot.variete.libelle}`}
                        </span>
                        {ecarte && <span className="prod-carte-ecart">{lot.raisons.map((raison) => t.raisons[raison]).join(' ')}</span>}
                        {!ecarte && !choisi && lot.avertissements.includes('varietes_differentes') && <span className="prod-carte-detail">{t.varietesDifferentes}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </Panneau>
          }
          detail={
            <Panneau
              titre={t.titreCreation}
              icone="list-ordered"
              compte={groupe === null ? undefined : t.groupe.replace('{kg}', grouperMilliers(groupe.poids_kg)).replace('{acidite}', afficherAciditeGroupe(groupe))}
            >
              {!enCreation && <EtatVide message={t.choisirLots} />}
              {enCreation && (
                <form id={FORMULAIRE} className="prod-formulaire" onSubmit={(e) => void creer(e)} aria-label={t.titreCreation} noValidate>
                  {choix.entier !== null && <Note>{t.lotEntier}</Note>}
                  {choix.achats.length > 0 && (
                    <div className="prod-grille">
                      {choix.achats.map((lotId) => {
                        const lot = achats.find((l) => l.id === lotId)
                        if (lot === undefined) return null
                        return (
                          <Champ
                            key={lotId}
                            id={`kg-${lotId}`}
                            libelle={t.kgDuLot.replace('{numero}', String(lot.numero))}
                            aide={t.kgAide}
                            valeur={kg[lotId] ?? ''}
                            surChangement={(valeur) => { definirKg({ ...kg, [lotId]: valeur }); definirInvalide(false) }}
                            erreur={kgInvalide(lotId) ? t.kgInvalide.replace('{reste}', grouperMilliers(lot.reste_kg)) : undefined}
                            inputMode="numeric"
                            placeholder={String(lot.reste_kg)}
                            chiffres
                          />
                        )
                      })}
                    </div>
                  )}
                  {groupe !== null && !groupe.compatible && <Note ton="erreur">{groupe.raisons.map((raison) => t.raisons[raison]).join(' ')}</Note>}
                  {groupe !== null && groupe.compatible && groupe.qualite !== null && (
                    <div className="prod-actions">
                      <Pastille ton="sombre">{t.qualites[groupe.qualite]}</Pastille>
                      {groupe.avertissements.includes('varietes_differentes') && <Pastille ton="alerte">{t.varietesDifferentes}</Pastille>}
                    </div>
                  )}
                  {lignes.length === 0 ? (
                    <Note ton="erreur">{t.aucuneLigne}</Note>
                  ) : (
                    <ChoixBoutons
                      libelle={t.ligne}
                      options={lignes.map((ligne) => ({ valeur: ligne.id, libelle: ligne.libelle }))}
                      valeur={ligneChoisie}
                      surChoisir={(id) => { definirLigneId(id); definirInvalide(false) }}
                      erreur={invalide && ligneChoisie === null ? t.ligneObligatoire : undefined}
                    />
                  )}
                  {s.erreur !== null && <Note ton="erreur">{s.erreur}</Note>}
                  <div className="prod-actions">
                    <button type="button" className="bouton-secondaire" onClick={abandonner}>{libelles.commun.annuler}</button>
                  </div>
                </form>
              )}
            </Panneau>
          }
        />

        <Panneau titre={t.passages} icone="list-ordered" compte={passages.length} serre>
          {!enCreation && passageAFinir === null && s.erreur !== null && <Note ton="erreur">{s.erreur}</Note>}
          <TableauDonnees
            legende={t.passages}
            colonnes={colonnes}
            lignes={file.donnees === null ? null : passages}
            cleLigne={(p) => p.id}
            vide={t.aucunPassage}
            erreur={file.erreur}
            className="tableau-triturations"
          />
        </Panneau>
      </div>

      {passageAFinir !== null && (
        <Tiroir
          titre={t.titreFin.replace('{numero}', String(passageAFinir.numero))}
          icone="square"
          etiquette={t.terminer}
          surValider={() => void finir()}
          surFermer={abandonner}
          enCours={s.enCours}
          erreur={s.erreur}
        >
          <Champ
            id="temperature"
            libelle={t.temperature}
            aide={t.temperatureAide}
            valeur={temperature}
            surChangement={(valeur) => { definirTemperature(valeur); definirInvalide(false) }}
            erreur={invalide && corpsFinProduction(temperature, '1') === null ? t.temperatureInvalide : undefined}
            inputMode="decimal"
            decimales={2}
            autoFocus
            chiffres
          />
          <Champ
            id="duree"
            libelle={t.duree}
            valeur={duree}
            surChangement={(valeur) => { definirDuree(valeur); definirInvalide(false) }}
            erreur={invalide && corpsFinProduction('1', duree) === null ? t.dureeInvalide : undefined}
            inputMode="numeric"
            chiffres
          />
        </Tiroir>
      )}
    </section>
  )
}
