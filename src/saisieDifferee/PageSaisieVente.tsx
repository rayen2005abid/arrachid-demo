import { useState } from 'react'
import { useDiffere } from '../api/useDiffere'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, Choix } from '../administration/composants'
import { grammesVersKg } from '../administration/unites'
import type { Client } from '../clients/logique'
import { type MessageEcran } from '../composants/EnTeteEcran'
import { Note } from '../composants/Note'
import { formaterHorodatage } from '../format/dates'
import { afficherMillimes } from '../format/montants'
import { libelles } from '../libelles'
import { CadreFiche, Cellule, CelluleChoix, EnTeteDeFiche, FichesRecentes, Heure, PageFichePapier, PartieFiche, TableauLignes } from './composantsFiche'
import type { Auteur, FicheReprise } from './logiqueProduction'
import {
  CHEMIN_VEN, construireCorpsVen, ligneVide, saisieVenVide,
  type ArticlePapier, type Echantillon, type LignePapier, type ModePapier, type SaisieVen,
} from './logiqueVente'

const c = libelles.saisieProduction
const t = libelles.saisieVente
const FORMULAIRE = 'formulaire-fiche-ven'
const MODES: ModePapier[] = ['especes', 'cheque', 'virement']

interface Contrat { id: number; numero: number; client_id: number; client: string; qualite: string; poids_restant_g: number }
interface CuveCode { id: number; code: string }
interface Preparation {
  utilisateurs: Auteur[]
  contrats: Contrat[]
  cuves: CuveCode[]
  detail: { articles: (ArticlePapier & { prix_unitaire_millimes: number })[]; cuves: CuveCode[] }
  session_caisse: { ouverte_le: string } | null
}
interface Resultat { bon: { numero: number } | null; vente: { numero: number } | null }

/** Reprise de la fiche VEN : chargement de citerne et vente au détail payée, à leur heure. */
export function PageSaisieVente() {
  const [saisie, definirSaisie] = useState<SaisieVen>(saisieVenVide)
  const [recherche, saisirRecherche] = useState('')
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const soumission = useSoumission()
  const preparation = useLecture<Preparation>(`${CHEMIN_VEN}/preparation`)
  const fiches = useLecture<FicheReprise[]>(CHEMIN_VEN)
  const differee = useDiffere(recherche, 250)
  const clients = useLecture<Client[]>(differee.trim().length >= 2 ? `/api/clients?q=${encodeURIComponent(differee.trim())}` : null)
  const donnees = preparation.donnees
  const articles = donnees?.detail.articles ?? []

  const changer = <K extends keyof SaisieVen>(cle: K, valeur: SaisieVen[K]) => {
    definirSaisie((avant) => ({ ...avant, [cle]: valeur }))
    definirErreurLocale(null)
    soumission.reinitialiser()
  }
  const changerLigne = (rang: number, cle: keyof LignePapier, valeur: string) =>
    changer('lignes', saisie.lignes.map((ligne, i) => (i === rang ? { ...ligne, [cle]: valeur } : ligne)))
  const choisirContrat = (valeur: string) => {
    const contrat = donnees?.contrats.find((item) => String(item.id) === valeur)
    changer('contratId', valeur)
    if (contrat) { changer('clientId', String(contrat.client_id)); saisirRecherche(contrat.client) }
  }

  const enregistrer = async () => {
    const resultat = construireCorpsVen(saisie, articles)
    definirErreurLocale(resultat.erreur)
    if (resultat.corps === null) return
    const reponse = await soumission.soumettre<Resultat>(CHEMIN_VEN, resultat.corps)
    await Promise.all([fiches.recharger(), preparation.recharger()])
    if (reponse === null) return
    const parties = [
      reponse.bon !== null ? t.bon.replace('{numero}', String(reponse.bon.numero)) : null,
      reponse.vente !== null ? t.recu.replace('{numero}', String(reponse.vente.numero)) : null,
    ].filter(Boolean)
    definirMessage({ texte: t.succes.replace('{parties}', parties.join(', ')), type: 'ok' })
    definirSaisie(saisieVenVide()); saisirRecherche('')
    soumission.reinitialiser()
  }

  return (
    <PageFichePapier
      titre={libelles.ecrans.saisieVente}
      message={message}
      principal={{ etiquette: c.enregistrer, formulaire: FORMULAIRE, enCours: soumission.enCours }}
      aide={t.aide}
      erreur={preparation.erreur}
      recentes={<FichesRecentes fiches={fiches.donnees} erreur={fiches.erreur} />}
    >
      <form id={FORMULAIRE} onSubmit={(e) => { e.preventDefault(); void enregistrer() }}>
        <CadreFiche titre={t.titreFiche} icone="shopping-bag">
          <PartieFiche>
            <EnTeteDeFiche prefixe="ven" libelleHeure={t.heure} saisie={saisie} auteurs={donnees?.utilisateurs ?? []} changer={changer} />
          </PartieFiche>

          <PartieFiche titre={t.titreClient}>
            <Champ id="client-ven" libelle={t.client} valeur={recherche} surChangement={(v) => { saisirRecherche(v); changer('clientId', '') }} />
          </PartieFiche>
          {saisie.clientId === '' && (clients.donnees ?? []).length > 0 && (
            <div className="bureau-actions">
              {(clients.donnees ?? []).map((client) => <button type="button" key={client.id} className="bouton-secondaire" onClick={() => { changer('clientId', String(client.id)); saisirRecherche(client.nom) }}>{client.nom}</button>)}
            </div>
          )}
          {saisie.clientId !== '' && <Note ton="ok">{t.clientChoisi.replace('{nom}', recherche)}</Note>}

          <PartieFiche titre={t.titreChargement}>
            <Choix id="contrat-ven" libelle={t.contrat} valeur={saisie.contratId} surChangement={choisirContrat}
              options={(donnees?.contrats ?? []).map((contrat) => ({ valeur: String(contrat.id), libelle: t.contratOption.replace('{numero}', String(contrat.numero)).replace('{client}', contrat.client).replace('{kg}', grammesVersKg(contrat.poids_restant_g)) }))} />
            <Choix id="cuve-chargement-ven" libelle={t.cuve} valeur={saisie.cuveChargement} surChangement={(v) => changer('cuveChargement', v)}
              options={(donnees?.cuves ?? []).map((cuve) => ({ valeur: String(cuve.id), libelle: cuve.code }))} />
            <Champ id="vide-ven" libelle={t.vide} valeur={saisie.vide} surChangement={(v) => changer('vide', v)} inputMode="numeric" />
            <Heure id="heure-vide-ven" libelle={t.heureVide} valeur={saisie.heureVide} surChangement={(v) => changer('heureVide', v)} />
            <Champ id="plein-ven" libelle={t.plein} valeur={saisie.plein} surChangement={(v) => changer('plein', v)} inputMode="numeric" />
            <Heure id="heure-plein-ven" libelle={t.heurePlein} valeur={saisie.heurePlein} surChangement={(v) => changer('heurePlein', v)} />
            <Champ id="prix-chargement-ven" libelle={t.prixChargement} valeur={saisie.prixChargement} surChangement={(v) => changer('prixChargement', v)} inputMode="decimal" />
            <Choix id="echantillon-ven" libelle={t.echantillon} valeur={saisie.echantillon} surChangement={(v) => changer('echantillon', v as Echantillon)}
              options={(['present', 'absent'] as const).map((e) => ({ valeur: e, libelle: t.echantillons[e] }))} />
          </PartieFiche>

          <TableauLignes titre={t.titreDetail} colonnes={[t.colonnes.article, t.colonnes.quantite, t.colonnes.prix]} surAjout={() => changer('lignes', [...saisie.lignes, ligneVide()])}>
            {saisie.lignes.map((ligne, rang) => <tr key={rang}>
              <CelluleChoix libelle={t.article} rang={rang} valeur={ligne.articleId} surChangement={(v) => changerLigne(rang, 'articleId', v)}
                options={articles.map((article) => ({ valeur: String(article.id), libelle: t.articleOption.replace('{libelle}', article.libelle).replace('{prix}', afficherMillimes(article.prix_unitaire_millimes)) }))} />
              <Cellule libelle={t.quantite} rang={rang} valeur={ligne.quantite} surChangement={(v) => changerLigne(rang, 'quantite', v)} />
              <Cellule libelle={t.prix} rang={rang} valeur={ligne.prix} surChangement={(v) => changerLigne(rang, 'prix', v)} />
            </tr>)}
          </TableauLignes>
          <PartieFiche>
            <Choix id="cuve-detail-ven" libelle={t.cuveDetail} valeur={saisie.cuveDetail} surChangement={(v) => changer('cuveDetail', v)}
              options={(donnees?.detail.cuves ?? []).map((cuve) => ({ valeur: String(cuve.id), libelle: cuve.code }))} />
          </PartieFiche>

          <PartieFiche titre={t.titrePaiement}>
            <Champ id="montant-ven" libelle={t.montant} valeur={saisie.montant} surChangement={(v) => changer('montant', v)} inputMode="decimal" />
            <Choix id="mode-ven" libelle={t.mode} valeur={saisie.mode} surChangement={(v) => changer('mode', (v || 'especes') as ModePapier)}
              options={MODES.map((m) => ({ valeur: m, libelle: t.modes[m] }))} />
            {saisie.mode !== 'especes' && (
              <>
                <Champ id="reference-ven" libelle={saisie.mode === 'cheque' ? libelles.references.numeroCheque : libelles.references.referenceVirement} valeur={saisie.referencePaiement} surChangement={(v) => changer('referencePaiement', v)} />
                <Champ id="banque-ven" libelle={libelles.references.banque} valeur={saisie.banquePaiement} surChangement={(v) => changer('banquePaiement', v)} />
              </>
            )}
            <Heure id="heure-paiement-ven" libelle={t.heurePaiement} valeur={saisie.heurePaiement} surChangement={(v) => changer('heurePaiement', v)} />
          </PartieFiche>
          {donnees !== null && (donnees.session_caisse === null
            ? <Note ton="alerte">{t.caisseFermee}</Note>
            : <Note>{t.caisseOuverte.replace('{date}', formaterHorodatage(donnees.session_caisse.ouverte_le))}</Note>)}
          <PartieFiche>
            <Champ id="observations-ven" libelle={c.observations} valeur={saisie.observations} surChangement={(v) => changer('observations', v)} />
          </PartieFiche>
          {(erreurLocale ?? soumission.erreur) !== null && <Note ton="erreur">{erreurLocale ?? soumission.erreur}</Note>}
        </CadreFiche>
      </form>
    </PageFichePapier>
  )
}
