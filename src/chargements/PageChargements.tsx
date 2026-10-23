// Chargements de citerne (T6.4, CHG-01), au style de prototype/arrachid-mes.html : la liste à gauche, le chargement
// choisi à droite avec ses quatre étapes tirées du `statut` du serveur ; création dans un tiroir (F2) ; l'étape suivante
// sur F8. Rien n'est calculé ici : l'huile chargée, le stock et les contrôles viennent du serveur.
import { useEffect, useState, type FormEvent } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { grammesVersKg } from '../administration/unites'
import { Champ, ChampChoix } from '../composants/Champ'
import { Chiffres, type Chiffre } from '../composants/Chiffres'
import { EnTeteEcran, type ActionPrincipale, type MessageEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { Etapes } from '../composants/Etapes'
import { Icone } from '../composants/Icone'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { Tiroir } from '../composants/Tiroir'
import { useTouches } from '../contextes/touches'
import { afficherMillimes } from '../format/montants'
import { libelles } from '../libelles'
import { remplacer } from '../tickets/logique'
import {
  annulable,
  corpsFinalisation,
  corpsPeseeVide,
  cuvesDuContrat,
  etapesChargement,
  tonStatut,
  type Chargement,
  type Preparation,
} from './logique'
import '../styles/pont.css'

const t = libelles.chargements
const FORMULAIRE = 'formulaire-chargement'
const qualite = (q: string) => libelles.cuves.qualites[q as keyof typeof libelles.cuves.qualites] ?? q

const Etat = ({ c }: { c: Chargement }) => <Pastille ton={tonStatut(c.statut)}>{t.statuts[c.statut]}</Pastille>

const COLONNES: readonly Colonne<Chargement>[] = [
  { cle: 'numero', titre: t.colonnes.numero, rendu: (c) => c.id, nombre: true },
  { cle: 'cuve', titre: t.colonnes.cuve, rendu: (c) => <span className="chiffres">{c.cuve_code}</span> },
  { cle: 'qualite', titre: t.colonnes.qualite, rendu: (c) => qualite(c.qualite) },
  { cle: 'huile', titre: t.colonnes.huile, rendu: (c) => (c.poids_charge_g === null ? '—' : grammesVersKg(c.poids_charge_g)), nombre: true },
  { cle: 'statut', titre: t.colonnes.statut, rendu: (c) => <Etat c={c} /> },
]

/** Valeurs connues du chargement, telles que le serveur les a enregistrées. */
function valeurs(c: Chargement): Chiffre[] {
  const liste: Chiffre[] = [
    { etiquette: t.qualite, valeur: qualite(c.qualite), texte: true },
    { etiquette: t.cuve, valeur: c.cuve_code },
  ]
  if (c.poids_vide_kg !== null) liste.push({ etiquette: t.aVide, valeur: grammesVersKg(c.poids_vide_kg * 1000), unite: t.kg })
  if (c.poids_plein_kg !== null) liste.push({ etiquette: t.plein, valeur: grammesVersKg(c.poids_plein_kg * 1000), unite: t.kg })
  if (c.poids_charge_g !== null) liste.push({ etiquette: t.huileChargee, valeur: grammesVersKg(c.poids_charge_g), unite: t.kg, ton: 'fort' })
  if (c.prix_unitaire_millimes_kg !== null) liste.push({ etiquette: t.prixChargement, valeur: afficherMillimes(c.prix_unitaire_millimes_kg), unite: t.dtKg })
  return liste
}

/** Pesées d'une citerne, échantillon acheteur et bon de chargement conservé. */
export function PageChargements() {
  const preparation = useLecture<Preparation>('/api/chargements/preparation')
  const liste = useLecture<{ chargements: Chargement[] }>('/api/chargements')
  const commande = useSoumission()
  const [tiroir, definirTiroir] = useState(false)
  const [contratId, choisirContrat] = useState('')
  const [cuveId, choisirCuve] = useState('')
  const [chargement, choisirChargement] = useState<Chargement | null>(null)
  const [vide, saisirVide] = useState('')
  const [plein, saisirPlein] = useState('')
  const [prix, saisirPrix] = useState('')
  const [acheteurPresent, definirPresence] = useState(false)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const contrat = preparation.donnees?.contrats.find((c) => c.id === Number(contratId)) ?? null
  const cuves = cuvesDuContrat(preparation.donnees?.cuves ?? [], contrat)

  // La liste relue après chaque commande fait foi pour le chargement affiché (échantillon compris).
  const chargements = liste.donnees?.chargements ?? null
  useEffect(() => {
    if (chargements === null) return
    choisirChargement((actuel) => (actuel === null ? null : (chargements.find((c) => c.id === actuel.id) ?? actuel)))
  }, [chargements])

  const rafraichir = async () => {
    commande.reinitialiser()
    await Promise.all([preparation.recharger(), liste.recharger()])
  }

  const choisir = (suivant: Chargement | null) => {
    choisirChargement(suivant)
    saisirVide('')
    saisirPlein('')
    saisirPrix('')
    definirPresence(false)
    definirErreurLocale(null)
    commande.reinitialiser()
  }

  const ouvrirTiroir = () => {
    choisirContrat('')
    choisirCuve('')
    definirErreurLocale(null)
    commande.reinitialiser()
    definirTiroir(true)
  }
  const fermerTiroir = () => {
    definirTiroir(false)
    definirErreurLocale(null)
    commande.reinitialiser()
  }
  useTouches({ F2: { libelle: t.nouveau, action: ouvrirTiroir } })

  const commencer = async () => {
    if (contrat === null || cuveId === '') {
      definirErreurLocale(t.erreurs.contratCuve)
      return
    }
    const resultat = await commande.soumettre<{ chargement: Chargement }>('/api/chargements', { contrat_id: contrat.id, cuve_id: Number(cuveId) })
    if (resultat === null) return
    definirTiroir(false)
    choisir(resultat.chargement)
    definirMessage({ texte: t.messages.cree, type: 'ok' })
    await rafraichir()
  }

  const peserVide = async () => {
    if (chargement === null) return
    const r = corpsPeseeVide(vide)
    definirErreurLocale(r.erreur)
    if (r.corps === null) return
    const resultat = await commande.soumettre<{ chargement: Chargement }>(`/api/chargements/${chargement.id}/pesee-vide`, r.corps)
    if (resultat === null) return
    choisirChargement(resultat.chargement)
    definirMessage({ texte: t.messages.vide, type: 'ok' })
    await rafraichir()
  }

  const prelever = async () => {
    if (chargement === null) return
    definirErreurLocale(null)
    const resultat = await commande.soumettre<{ echantillon_huile: { reference: string } }>(`/api/chargements/${chargement.id}/echantillon`, { acheteur_present: acheteurPresent })
    if (resultat === null) return
    const reference = resultat.echantillon_huile.reference
    choisirChargement({ ...chargement, echantillon_reference: reference })
    definirMessage({ texte: remplacer(t.messages.echantillon, { reference }), type: 'ok' })
    await rafraichir()
  }

  const finaliser = async () => {
    if (chargement === null) return
    const r = corpsFinalisation(plein, prix)
    definirErreurLocale(r.erreur)
    if (r.corps === null) return
    const resultat = await commande.soumettre<{ chargement: Chargement; bon_chargement: { numero: number } }>(`/api/chargements/${chargement.id}/finalisation`, r.corps)
    if (resultat === null) return
    choisirChargement(resultat.chargement)
    definirMessage({ texte: remplacer(t.messages.termine, { numero: resultat.bon_chargement.numero }), type: 'ok' })
    await rafraichir()
  }

  const annuler = async () => {
    if (chargement === null) return
    const resultat = await commande.soumettre<{ chargement: Chargement }>(`/api/chargements/${chargement.id}/annulation`, {})
    if (resultat === null) return
    choisirChargement(resultat.chargement)
    definirMessage({ texte: t.messages.annule, type: 'ok' })
    await rafraichir()
  }

  const valider = (e: FormEvent) => {
    e.preventDefault()
    if (commande.enCours || chargement === null) return
    if (chargement.statut === 'cree') void peserVide()
    else if (chargement.statut === 'pesee_vide') void finaliser()
  }

  // Une seule action principale (F8) : l'étape suivante du chargement choisi.
  const etiquette = chargement?.statut === 'cree' ? t.peserVide : chargement?.statut === 'pesee_vide' ? t.finaliser : null
  const principal: ActionPrincipale | null = etiquette === null ? null : { etiquette, formulaire: FORMULAIRE, enCours: commande.enCours }
  const erreurAction = tiroir ? null : (erreurLocale ?? commande.erreur)
  const etapes = chargement === null ? null : etapesChargement(chargement)

  return (
    <section className="pont-ecran">
      <EnTeteEcran titre={libelles.ecrans.chargements} sousTitre={t.sousTitre} message={message} principal={principal} />
      <div className="mes-page">
        <ListeDetail
          liste={
            <Panneau
              titre={t.liste}
              icone="truck"
              compte={chargements?.length}
              serre
              actions={
                <button type="button" className="bouton-secondaire bouton-petit" onClick={ouvrirTiroir}>
                  <Icone nom="truck" />
                  {t.nouveau}
                </button>
              }
            >
              <TableauDonnees
                legende={t.liste}
                colonnes={COLONNES}
                lignes={chargements}
                cleLigne={(c) => c.id}
                vide={t.aucun}
                erreur={liste.erreur ?? preparation.erreur}
                surChoisir={choisir}
                choisie={chargement?.id ?? null}
              />
            </Panneau>
          }
          detail={
            chargement === null ? (
              <Panneau titre={libelles.ecrans.chargements} icone="truck">
                <EtatVide message={t.choisir} />
              </Panneau>
            ) : (
              <Panneau titre={remplacer(t.titre, { numero: chargement.id })} icone="truck" actions={<Etat c={chargement} />}>
                {chargement.statut !== 'annule' && etapes !== null && <Etapes libelle={t.etapesLibelle} etapes={etapes.etapes} rangActuel={etapes.rang} />}
                <Chiffres valeurs={valeurs(chargement)} />
                {erreurAction !== null && <Note ton="erreur">{erreurAction}</Note>}
                {(chargement.statut === 'cree' || chargement.statut === 'pesee_vide') && (
                  <form id={FORMULAIRE} className="mes-pile" onSubmit={valider} noValidate>
                    {chargement.statut === 'cree' && (
                      <Champ id="ch-vide" libelle={t.poidsVide} valeur={vide} surChangement={(v) => { saisirVide(v); commande.reinitialiser() }} inputMode="numeric" chiffres autoFocus />
                    )}
                    {chargement.statut === 'pesee_vide' && (
                      <>
                        {chargement.echantillon_reference === null ? (
                          <Note>
                            <p>{t.echantillonAvant}</p>
                            <div className="reception-actions">
                              <label className="mes-case">
                                <input type="checkbox" checked={acheteurPresent} onChange={(e) => definirPresence(e.target.checked)} />
                                {t.acheteurPresent}
                              </label>
                              <button type="button" className="bouton-secondaire bouton-petit" disabled={commande.enCours} onClick={() => void prelever()}>
                                <Icone nom="test-tube" />
                                {t.prelever}
                              </button>
                            </div>
                          </Note>
                        ) : (
                          <Note ton="ok">{remplacer(t.echantillonFait, { reference: chargement.echantillon_reference })}</Note>
                        )}
                        <div className="pont-grille">
                          <Champ id="ch-plein" libelle={t.poidsPlein} valeur={plein} surChangement={(v) => { saisirPlein(v); commande.reinitialiser() }} inputMode="numeric" chiffres />
                          <Champ id="ch-prix" libelle={t.prix} aide={t.prixAide} valeur={prix} surChangement={(v) => { saisirPrix(v); commande.reinitialiser() }} inputMode="decimal" chiffres />
                        </div>
                        <Note>{remplacer(t.consequence, { cuve: chargement.cuve_code })}</Note>
                      </>
                    )}
                  </form>
                )}
                {chargement.statut === 'termine' && (
                  <Note ton="ok">
                    <p>{remplacer(t.termine, { kg: grammesVersKg(chargement.poids_charge_g ?? 0) })}</p>
                    <div>
                      <a className="bouton-secondaire bouton-petit" href={`/api/chargements/${chargement.id}/bon/pdf`} target="_blank" rel="noreferrer">
                        <Icone nom="file-text" />
                        {t.ouvrirBon}
                      </a>
                    </div>
                  </Note>
                )}
                {chargement.statut === 'annule' && <Note>{t.annuleNote}</Note>}
                {annulable(chargement.statut) && (
                  <div>
                    <button type="button" className="bouton-secondaire bouton-danger bouton-petit" disabled={commande.enCours} onClick={() => void annuler()}>
                      <Icone nom="x" />
                      {t.annuler}
                    </button>
                  </div>
                )}
              </Panneau>
            )
          }
        />
      </div>

      {tiroir && (
        <Tiroir
          titre={t.nouveau}
          icone="truck"
          etiquette={t.creer}
          surValider={() => void commencer()}
          surFermer={fermerTiroir}
          enCours={commande.enCours}
          bloque={contrat === null}
          erreur={erreurLocale ?? commande.erreur}
        >
          {preparation.donnees !== null && preparation.donnees.contrats.length === 0 ? (
            <EtatVide message={t.aucunContrat} />
          ) : (
            <ChampChoix
              id="ch-contrat"
              libelle={t.contrat}
              valeur={contratId}
              choixVide={t.choisirContrat}
              options={(preparation.donnees?.contrats ?? []).map((c) => ({
                valeur: String(c.id),
                libelle: remplacer(t.optionContrat, { numero: c.numero, client: c.client, kg: grammesVersKg(c.poids_restant_g) }),
              }))}
              surChangement={(v) => { choisirContrat(v); choisirCuve(''); definirErreurLocale(null); commande.reinitialiser() }}
            />
          )}
          {contrat !== null && (
            <>
              <Chiffres
                valeurs={[
                  { etiquette: t.qualite, valeur: qualite(contrat.qualite), texte: true },
                  { etiquette: t.prixContrat, valeur: afficherMillimes(contrat.prix_unitaire_millimes_kg), unite: t.dtKg },
                  { etiquette: t.reserve, valeur: grammesVersKg(contrat.poids_restant_g), unite: t.kg },
                ]}
              />
              <ChampChoix
                id="ch-cuve"
                libelle={t.cuve}
                valeur={cuveId}
                choixVide={t.choisirCuve}
                options={cuves.map((c) => ({ valeur: String(c.id), libelle: remplacer(t.optionCuve, { code: c.code, kg: grammesVersKg(c.stock_g) }) }))}
                surChangement={(v) => { choisirCuve(v); definirErreurLocale(null); commande.reinitialiser() }}
              />
            </>
          )}
        </Tiroir>
      )}
    </section>
  )
}
