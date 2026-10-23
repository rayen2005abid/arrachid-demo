import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, Choix, Panneau as TiroirCorrection } from '../administration/composants'
import { Chiffres } from '../composants/Chiffres'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { ValidationPin } from '../composants/ValidationPin'
import { formaterHorodatage } from '../format/dates'
import { SAISIE_VIDE, type ChampAnalyse, type SaisieAnalyse } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { ChampsAnalyse, TableauAnalyses, TableauPrix } from './AnalysesEtPrix'
import { CorrectionReglement } from './CorrectionReglement'
import {
  analyseActive,
  bacsRemplacables,
  cheminCorrection,
  cheminDepuisAdresse,
  cheminVue,
  corpsBacs,
  corpsCorrectionAnalyse,
  corpsCorrectionPrix,
  corpsPesee,
  corrigeable,
  permise,
  prixActif,
  saisieDepuis,
  texteFait,
  textePrix,
  type Erreurs,
  type TypePesee,
  type VueCorrection,
} from './logique'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { ReceptionsTrouvees } from '../recherche/ReceptionsTrouvees'
import type { ReceptionTrouvee } from '../recherche/receptions'
import { useRechercheReception } from '../recherche/useRechercheReception'
import { RetourFiches } from '../saisieDifferee/composantsFiche'
import '../styles/bureau.css'

const t = libelles.corrections
const RECHERCHE = '/api/corrections/receptions/recherche'

type Mode = 'pesee' | 'bacs' | 'analyse' | 'prix'
const TITRES: Record<Mode, string> = { pesee: t.corrigerPesee, bacs: t.corrigerBacs, analyse: t.corrigerAnalyse, prix: t.corrigerPrix }
const CONSEQUENCES: Record<Mode, string> = { pesee: t.consequencePesee, bacs: t.consequenceBacs, analyse: t.consequenceAnalyse, prix: t.consequencePrix }

/** Corrections d'une réception (CONTEXTE §29, PROMPT §6.18) : pesées, bacs, analyse, prix, historique. */
export function PageCorrections() {
  const [parametres] = useSearchParams()
  const [saisie, definirSaisie] = useState('')
  // `?reception=12` (lien des analyses saisies du labo) : l'écran s'ouvre sur cette réception.
  const [chemin, definirChemin] = useState<string | null>(() => cheminDepuisAdresse(parametres.get('reception')))
  // Numéro du ticket, numéro de réception ou nom (EM-07) : une seule réception s'ouvre, plusieurs se choisissent.
  const trouvees = useRechercheReception(RECHERCHE, t.erreurs.numero)
  const vue = useLecture<VueCorrection>(chemin)
  const s = useSoumission()
  const [mode, definirMode] = useState<Mode | null>(null)
  const [type, definirType] = useState<TypePesee>('tare')
  const [poids, definirPoids] = useState('')
  const [ancien, definirAncien] = useState('')
  const [nouveau, definirNouveau] = useState('')
  const [ajout, definirAjout] = useState('')
  const [analyse, definirAnalyse] = useState<SaisieAnalyse>(SAISIE_VIDE)
  const [varieteId, definirVarieteId] = useState('')
  const [prix, definirPrix] = useState('')
  const [motif, definirMotif] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [erreurs, definirErreurs] = useState<Erreurs>({})
  const [message, definirMessage] = useState<MessageEcran | null>(null)

  const donnees = chemin === null ? null : vue.donnees
  const reception = donnees?.reception ?? null
  const prixEnVigueur = prixActif(donnees?.prix ?? [])
  // Valeur inhabituelle : le serveur demande une confirmation, envoyée à la validation suivante.
  const aConfirmer = mode === 'analyse' && s.code === 'analyse_suspecte'

  const ouvrir = (suivant: Mode | null) => {
    s.reinitialiser()
    definirType(reception?.pesee_directe === true ? 'directe' : 'tare')
    definirPoids('')
    definirAncien('')
    definirNouveau('')
    definirAjout('')
    // L'analyse corrigée part des valeurs en vigueur : on ne retape que la valeur fausse.
    const depart = saisieDepuis(suivant === 'analyse' ? analyseActive(donnees?.analyses ?? []) : null)
    definirAnalyse(depart.saisie)
    definirVarieteId(depart.varieteId)
    definirPrix('')
    definirMotif('')
    definirValidation(null)
    definirErreurs({})
    definirMode(suivant)
  }

  const choisirTrouvee = (trouvee: ReceptionTrouvee | null) => {
    ouvrir(null)
    definirMessage(null)
    definirChemin(trouvee === null ? null : cheminVue(trouvee.reception_id))
  }

  const chercher = async () => {
    choisirTrouvee(null)
    choisirTrouvee(await trouvees.chercher(saisie))
  }

  const changerAnalyse = (champ: ChampAnalyse, valeur: string) => {
    definirAnalyse((ancienne) => ({ ...ancienne, [champ]: valeur }))
    if (aConfirmer) s.reinitialiser()
  }

  const corps = () => {
    if (mode === 'pesee') return corpsPesee(type, poids, motif, validation)
    if (mode === 'bacs') return corpsBacs(ancien, nouveau, ajout, motif, validation)
    if (mode === 'analyse') return corpsCorrectionAnalyse(analyse, varieteId, aConfirmer, motif, validation)
    return corpsCorrectionPrix(prix, motif, validation)
  }

  const valider = async () => {
    if (mode === null || reception === null) return
    const r = corps()
    definirErreurs(r.erreurs)
    if (r.corps === null) return
    const reponse = await s.soumettre(cheminCorrection(reception.id, mode), r.corps)
    if (reponse === null) return
    ouvrir(null)
    definirMessage({ texte: t.corrige, type: 'ok' })
    await vue.recharger()
  }

  type Pesee = VueCorrection['pesees'][number]
  type Bac = VueCorrection['bacs'][number]
  type Correction = VueCorrection['corrections'][number]
  const colonnesPesees: Colonne<Pesee>[] = [
    { cle: 'type', titre: t.type, rendu: (p) => t.types[p.type] },
    { cle: 'poids', titre: t.poids, rendu: (p) => p.poids_kg, nombre: true },
    { cle: 'source', titre: t.source, rendu: (p) => t.sources[p.source] },
    { cle: 'heure', titre: t.heure, rendu: (p) => <span className="chiffres">{formaterHorodatage(p.horodatage)}</span> },
    { cle: 'par', titre: t.par, rendu: (p) => p.operateur_nom },
    { cle: 'etat', titre: t.etat, rendu: (p) => (p.active ? t.actif : t.remplace) },
  ]
  const colonnesBacs: Colonne<Bac>[] = [
    { cle: 'numero', titre: t.bac, rendu: (b) => b.numero, nombre: true },
    { cle: 'etat', titre: t.etat, rendu: (b) => t.etatsBac[b.etat] },
  ]
  const colonnesHistorique: Colonne<Correction>[] = [
    { cle: 'heure', titre: t.heure, rendu: (c) => <span className="chiffres">{formaterHorodatage(c.horodatage)}</span> },
    { cle: 'par', titre: t.par, rendu: (c) => c.auteur_nom },
    { cle: 'avant', titre: t.avant, rendu: (c) => texteFait(c.avant) },
    { cle: 'apres', titre: t.apres, rendu: (c) => texteFait(c.apres) },
    { cle: 'motif', titre: t.motif, rendu: (c) => c.motif },
    { cle: 'reglement', titre: t.reglementColonne, rendu: (c) => c.apres_reglement === 1 && <Pastille ton="alerte">{t.apresReglement}</Pastille> },
  ]

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.corrections} sousTitre={libelles.ecrans.rattrapage} message={message}>
        <RetourFiches />
      </EnTeteEcran>
      <div className="mes-page bureau-page">

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void chercher()
        }}
      >
        <Panneau titre={t.titreRecherche} icone="search">
          <div className="bureau-recherche-ligne">
            <Champ id="numero" libelle={t.recherche} aide={t.rechercheAide} valeur={saisie} surChangement={definirSaisie} autoFocus erreur={trouvees.erreur} />
            <button type="submit" className={reception === null ? 'bouton-principal' : 'bouton-secondaire'} disabled={trouvees.enCours}>{t.chercher}</button>
          </div>
        </Panneau>
      </form>

      {trouvees.resultat !== null && (
        <ReceptionsTrouvees resultat={trouvees.resultat} surChoisir={choisirTrouvee} choisie={reception?.id ?? null} />
      )}

      {chemin !== null && vue.erreur !== null && <Note ton="erreur">{vue.erreur}</Note>}

      {donnees !== null && reception !== null && (
        <>
          <Panneau
            titre={t.reception.replace('{numero}', String(reception.numero)).replace('{apporteur}', reception.apporteur.nom)}
            icone="file-pen"
            actions={<Pastille ton={corrigeable(reception.statut) ? 'action' : 'neutre'}>{t.statuts[reception.statut as keyof typeof t.statuts] ?? reception.statut}</Pastille>}
          >
            <div className="bureau-formulaire">
              {reception.net_kg !== null && (
                <Chiffres valeurs={reception.pesee_directe ? [
                  { etiquette: t.types.directe, valeur: reception.net_kg, unite: 'kg', ton: 'fort' },
                ] : [
                  { etiquette: t.types.brut, valeur: reception.poids_brut_kg, unite: 'kg' },
                  { etiquette: t.types.tare, valeur: reception.poids_tare_kg, unite: 'kg' },
                  { etiquette: t.net, valeur: reception.net_kg, unite: 'kg', ton: 'fort' },
                ]} />
              )}
              {mode === null && corrigeable(reception.statut) && (
                <div className="bureau-actions">
                  <button type="button" className="bouton-secondaire" onClick={() => ouvrir('pesee')}>{t.corrigerPesee}</button>
                  <button type="button" className="bouton-secondaire" onClick={() => ouvrir('bacs')}>{t.corrigerBacs}</button>
                  {permise(donnees, 'corriger_analyse') && <button type="button" className="bouton-secondaire" onClick={() => ouvrir('analyse')}>{t.corrigerAnalyse}</button>}
                  {permise(donnees, 'corriger_prix') && <button type="button" className="bouton-secondaire" onClick={() => ouvrir('prix')}>{t.corrigerPrix}</button>}
                </div>
              )}
              {!corrigeable(reception.statut) && <Note>{t.nonCorrigeable}</Note>}
            </div>
          </Panneau>

          {mode !== null && (
            <TiroirCorrection
              titre={TITRES[mode]}
              consequence={CONSEQUENCES[mode]}
              etiquette={aConfirmer ? libelles.labo.analyse.confirmer : t.enregistrer}
              enCours={s.enCours}
              erreur={s.erreur}
              bloque={validation === null}
              surValider={() => void valider()}
              surAnnuler={() => ouvrir(null)}
            >
              {mode === 'analyse' && (
                <ChampsAnalyse saisie={analyse} surChangement={changerAnalyse} varieteId={varieteId} surVariete={definirVarieteId} erreurs={erreurs} aConfirmer={aConfirmer} />
              )}
              {mode === 'prix' && prixEnVigueur !== null && (
                <Champ
                  id="prix"
                  libelle={t.nouveauPrix[prixEnVigueur.unite_prix]}
                  aide={t.prixEnVigueur.replace('{prix}', textePrix(prixEnVigueur.prix_unitaire_millimes_kg ?? 0, prixEnVigueur.unite_prix))}
                  valeur={prix}
                  surChangement={definirPrix}
                  erreur={erreurs.prix}
                  inputMode="decimal"
                  autoFocus
                />
              )}
              {mode === 'pesee' && (
                <>
                  <Choix
                    id="type"
                    libelle={t.type}
                    valeur={type}
                    surChangement={(v) => definirType(v === 'brut' || v === 'directe' ? v : 'tare')}
                    options={(reception.pesee_directe ? (['directe'] as const) : (['brut', 'tare'] as const)).map((v) => ({ valeur: v, libelle: t.types[v] }))}
                  />
                  <Champ id="poids" libelle={t.nouveauPoids} valeur={poids} surChangement={definirPoids} erreur={erreurs.poids} inputMode="numeric" autoFocus />
                </>
              )}
              {mode === 'bacs' && (
                <>
                  <Choix
                    id="ancien"
                    libelle={t.remplacerBac}
                    valeur={ancien}
                    surChangement={definirAncien}
                    erreur={erreurs.ancien}
                    options={bacsRemplacables(donnees.bacs).map((b) => ({ valeur: String(b.numero), libelle: `${t.bac} ${b.numero}` }))}
                  />
                  <Champ id="nouveau" libelle={t.parBac} valeur={nouveau} surChangement={definirNouveau} erreur={erreurs.nouveau} inputMode="numeric" />
                  <Champ id="ajout" libelle={t.ajouterBac} valeur={ajout} surChangement={definirAjout} erreur={erreurs.bac} inputMode="numeric" />
                </>
              )}
              <Champ id="motif" libelle={t.motif} valeur={motif} surChangement={definirMotif} erreur={erreurs.motif} />
              <ValidationPin surValidation={definirValidation} />
            </TiroirCorrection>
          )}

          <div className="bureau-colonnes bureau-colonnes-egales">
            <Panneau titre={t.pesees} icone="scale" serre>
              <TableauDonnees legende={t.legendePesees} colonnes={colonnesPesees} lignes={donnees.pesees} cleLigne={(p) => `${p.type}-${p.id}`} vide={t.aucunePesee}
                classeLigne={(p) => (p.active ? undefined : 'ligne-inactive')} />
            </Panneau>
            <Panneau titre={t.bacs} icone="grid-3x3" serre>
              <TableauDonnees legende={t.legendeBacs} colonnes={colonnesBacs} lignes={donnees.bacs} cleLigne={(b) => b.id} vide={t.aucunBac}
                classeLigne={(b) => (b.etat === 'occupe' ? undefined : 'ligne-inactive')} />
            </Panneau>
          </div>

          <TableauAnalyses analyses={donnees.analyses} />
          <TableauPrix prix={donnees.prix} />

          <CorrectionReglement vue={donnees} surCorrige={async () => { definirMessage({ texte: t.corrige, type: 'ok' }); await vue.recharger() }} />

          <Panneau titre={t.historique} icone="history" compte={donnees.corrections.length} serre>
            <TableauDonnees legende={t.legendeHistorique} colonnes={colonnesHistorique} lignes={donnees.corrections} cleLigne={(c) => c.id} vide={t.aucunHistorique} />
          </Panneau>
        </>
      )}
    </div>
    </section>
  )
}
