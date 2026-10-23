import { useEffect, useState } from 'react'
import { envoyer } from '../api/client'
import { messageUtilisateur } from '../api/erreurs'
import { useDiffere } from '../api/useDiffere'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import type { Client } from '../clients/logique'
import { Champ, ChampChoix } from '../composants/Champ'
import { Chiffres } from '../composants/Chiffres'
import { corpsReferences, referencesCompletes, REFERENCES_VIDES, type References } from '../caisse/references'
import { ChampsReferences } from '../composants/ChampsReferences'
import { ChoixBoutons } from '../composants/ChoixBoutons'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { Icone } from '../composants/Icone'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { grammesVersKg } from '../administration/unites'
import { formaterHorodatage } from '../format/dates'
import { afficherMillimes } from '../format/montants'
import { uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'
import '../styles/bureau.css'
import { convertirLitres, formaterKg, formaterLitres, joindreCuves, lignesVente, litresIndicatifs, type ArticleDetail, type UniteHuile } from './logique'

const t = libelles.ventesDetail
const FORMULAIRE = 'formulaire-vente-detail'
const DELAI_FRAPPE_MS = 250
type Mode = 'especes' | 'cheque' | 'virement'
const MODES: Mode[] = ['especes', 'cheque', 'virement']

interface Cuve { id: number; code: string; qualite_affectee: string; disponible_g: number }
interface Preparation { articles: ArticleDetail[]; cuves: Cuve[]; densite_g_l: number | null }
interface Apercu { totaux: { montant_ttc_millimes: number }; lignes?: { article_id: number; montant_ht_millimes: number }[] }
interface Vente { id: number; numero: number; client_id: number | null; recu_id: number; montant_ttc_millimes: number; cree_le: string; mode: Mode }

const lienRecu = (vente: Vente) => `/api/reglements/${vente.recu_id}/pdf`

/** Vente au comptoir (VTE-01) : articles et prix du serveur à gauche, vente en cours à droite ; le reçu après. */
export function PageVentesDetail() {
  const preparation = useLecture<Preparation>('/api/ventes-detail/preparation')
  const historique = useLecture<{ ventes: Vente[] }>('/api/ventes-detail')
  const commande = useSoumission()
  const [recherche, saisirRecherche] = useState('')
  const differee = useDiffere(recherche, DELAI_FRAPPE_MS)
  const [client, choisirClient] = useState<Client | null>(null)
  const clients = useLecture<Client[]>(client === null && differee.trim().length >= 2 ? `/api/clients?q=${encodeURIComponent(differee.trim())}` : null)
  const [quantites, saisirQuantites] = useState<Record<number, string>>({})
  // Unité tapée par huile (kg par défaut) ; les litres sont convertis en grammes avant l'envoi.
  const [unites, definirUnites] = useState<Record<number, UniteHuile>>({})
  // Cuve choisie par huile : extra vierge et vierge sortent chacune de leur cuve.
  const [cuvesChoisies, choisirCuves] = useState<Record<number, string>>({})
  const [mode, choisirMode] = useState<Mode>('especes')
  const [references, definirReferences] = useState<References>(REFERENCES_VIDES)
  const [referencesVerifiees, definirReferencesVerifiees] = useState(false)
  const [erreur, definirErreur] = useState<string | null>(null)
  const [derniere, definirDerniere] = useState<Vente | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)

  const articles = preparation.donnees?.articles ?? []
  const densite = preparation.donnees?.densite_g_l ?? null
  const tapees = lignesVente(articles, quantites, unites, densite).lignes
  const demande = tapees === undefined ? null : joindreCuves(articles, tapees, cuvesChoisies)
  const cleApercu = demande !== null ? JSON.stringify({ client_id: client?.id ?? null, cuve_id: null, lignes: demande }) : null
  const [revisionApercu, reviserApercu] = useState(0)
  const [calcul, definirCalcul] = useState<{ cle: string; apercu?: Apercu; erreur?: string } | null>(null)
  const apercu = cleApercu !== null && calcul?.cle === cleApercu ? calcul.apercu : undefined
  const erreurApercu = cleApercu !== null && calcul?.cle === cleApercu ? calcul.erreur : undefined
  useEffect(() => {
    if (cleApercu === null) return
    let actif = true
    const delai = setTimeout(() => {
      void envoyer<{ apercu: Apercu }>('/api/ventes-detail/apercu', JSON.parse(cleApercu) as Record<string, unknown>)
        .then((reponse) => { if (actif) definirCalcul({ cle: cleApercu, apercu: reponse.apercu }) })
        .catch((erreur: unknown) => { if (actif) definirCalcul({ cle: cleApercu, erreur: messageUtilisateur(erreur) }) })
    }, DELAI_FRAPPE_MS)
    return () => { actif = false; clearTimeout(delai) }
  }, [cleApercu, revisionApercu])
  useEffect(() => {
    // Un refus confirmé autorise un nouveau calcul ; une panne réseau garde le même essai.
    if (commande.code !== 'apercu_vente_modifie') return
    definirCalcul(null)
    reviserApercu((revision) => revision + 1)
  }, [commande.code])

  const changerQuantite = (id: number, valeur: string) => {
    saisirQuantites((avant) => ({ ...avant, [id]: valeur }))
    definirErreur(null)
    commande.reinitialiser()
  }
  const changerUnite = (id: number, unite: UniteHuile) => {
    definirUnites((avant) => ({ ...avant, [id]: unite }))
    definirErreur(null)
    commande.reinitialiser()
  }
  const enLitres = (a: ArticleDetail) => a.type_article === 'huile' && unites[a.id] === 'L'
  const conversion = (a: ArticleDetail) => (enLitres(a) && densite !== null ? convertirLitres(quantites[a.id] ?? '', densite) : null)

  const qualiteDe = (a: ArticleDetail) => (a.qualite_huile === 'vierge' ? t.qualites.vierge : t.qualites.extra_vierge)
  const retirerHuile = (id: number) => {
    changerQuantite(id, '')
    choisirCuves((avant) => ({ ...avant, [id]: '' }))
  }

  const encaisser = async () => {
    if (commande.enCours || articles.length === 0) return
    const { lignes: saisies, erreur: invalide } = lignesVente(articles, quantites, unites, densite)
    if (saisies === undefined) { definirErreur(invalide ?? null); return }
    const lignes = joindreCuves(articles, saisies, cuvesChoisies)
    if (lignes === null) {
      const sansCuve = huilesChoisies.find((a) => cuvesDe(a).length === 0)
      definirErreur(sansCuve ? t.erreurSansCuve.replace('{qualite}', qualiteDe(sansCuve)) : t.erreurCuve)
      return
    }
    if (apercu === undefined) { definirErreur(erreurApercu ?? t.apercuManquant); return }
    if (!referencesCompletes(mode, references)) { definirReferencesVerifiees(true); return }
    const reponse = await commande.soumettre<{ vente: Vente }>('/api/ventes-detail', {
      client_id: client?.id ?? null, cuve_id: null, lignes, mode, montant_ttc_attendu_millimes: apercu.totaux.montant_ttc_millimes, ...corpsReferences(mode, references),
    })
    if (reponse === null) return
    definirReferences(REFERENCES_VIDES)
    definirReferencesVerifiees(false)
    definirDerniere(reponse.vente)
    definirMessage({ texte: t.encaissee.replace('{numero}', String(reponse.vente.numero)).replace('{montant}', afficherMillimes(reponse.vente.montant_ttc_millimes)), type: 'ok' })
    saisirQuantites({}); choisirCuves({}); definirErreur(null)
    commande.reinitialiser()
    await Promise.all([preparation.recharger(), historique.recharger()])
  }

  const huilesChoisies = articles.filter((a) => a.type_article === 'huile' && (quantites[a.id] ?? '').trim())
  const cuvesQualite = (a: ArticleDetail) => (preparation.donnees?.cuves ?? []).filter((c) => c.qualite_affectee === a.qualite_huile)
  const cuvesDe = (a: ArticleDetail) => cuvesQualite(a).filter((c) => c.disponible_g > 0)
  // Volume indicatif seulement pour une huile tapée en kg : en litres, la conversion s'affiche sous la saisie.
  const litresDe = (a: ArticleDetail) => {
    const grammes = enLitres(a) ? null : uniteExacte(quantites[a.id] ?? '', 3)
    return grammes !== null && densite !== null && densite > 0 ? litresIndicatifs(grammes, densite) : null
  }
  const enCours = articles.filter((a) => (quantites[a.id] ?? '').trim() !== '')
  const prixUnitaire = (a: ArticleDetail) => (a.type_article === 'huile' ? t.prixKg : t.prixPiece).replace('{prix}', afficherMillimes(a.prix_unitaire_millimes))

  const quantiteLigne = (a: ArticleDetail) => {
    const litresTapes = conversion(a)
    if (litresTapes !== null) return t.quantiteLitres.replace('{litres}', formaterLitres(litresTapes.millilitres)).replace('{kg}', formaterKg(litresTapes.grammes))
    return `${quantites[a.id]?.trim() ?? ''} ${enLitres(a) ? t.unitesHuile.L : t.unites[a.type_article]}`
  }
  const montantLigne = (a: ArticleDetail) => apercu?.lignes?.find((l) => l.article_id === a.id)?.montant_ht_millimes

  const colonnesLignes: Colonne<ArticleDetail>[] = [
    { cle: 'article', titre: t.colonnesLignes.article, rendu: (a) => a.libelle },
    { cle: 'quantite', titre: t.colonnesLignes.quantite, rendu: (a) => quantiteLigne(a), nombre: true },
    { cle: 'prix', titre: t.colonnesLignes.prix, rendu: (a) => afficherMillimes(a.prix_unitaire_millimes), nombre: true },
  ]
  const colonnesVentes: Colonne<Vente>[] = [
    { cle: 'numero', titre: t.colonnes.numero, rendu: (v) => v.numero, nombre: true },
    { cle: 'le', titre: t.colonnes.le, rendu: (v) => <span className="chiffres">{formaterHorodatage(v.cree_le)}</span> },
    { cle: 'client', titre: t.colonnes.client, rendu: (v) => (v.client_id === null ? <Pastille>{t.sansClient}</Pastille> : <Pastille ton="action">{t.avecClient}</Pastille>) },
    { cle: 'mode', titre: t.colonnes.mode, rendu: (v) => t.modes[v.mode] ?? v.mode },
    { cle: 'montant', titre: t.colonnes.montant, rendu: (v) => afficherMillimes(v.montant_ttc_millimes), nombre: true },
    { cle: 'recu', titre: t.colonnes.recu, rendu: (v) => <a href={lienRecu(v)} target="_blank" rel="noreferrer">{t.recu}</a> },
  ]

  const liste = (
    <>
      <Panneau titre={t.articles} icone="package">
        {articles.length === 0 ? <EtatVide message={preparation.donnees === null ? libelles.commun.chargement : t.aucunArticle} /> : (
          <ul className="bureau-articles" aria-label={t.legendeArticles}>
            {articles.map((article) => (
              <li key={article.id} className="bureau-article">
                {article.type_article === 'huile' ? (
                  <QuantiteHuile
                    article={article}
                    aide={prixUnitaire(article)}
                    valeur={quantites[article.id] ?? ''}
                    surChangement={(valeur) => changerQuantite(article.id, valeur)}
                    unite={unites[article.id] ?? 'kg'}
                    surUnite={(unite) => changerUnite(article.id, unite)}
                    litresPossibles={densite !== null && densite > 0}
                    conversion={conversion(article)}
                    montantHt={montantLigne(article)}
                    sansCuve={preparation.donnees !== null && cuvesDe(article).length === 0}
                  />
                ) : (
                  <Champ
                    id={`quantite-${article.id}`}
                    libelle={article.libelle}
                    aide={article.type_article === 'contenant' ? `${prixUnitaire(article)} · ${t.stock.replace('{n}', String(article.stock))}` : prixUnitaire(article)}
                    valeur={quantites[article.id] ?? ''}
                    surChangement={(valeur) => changerQuantite(article.id, valeur)}
                    placeholder={t.unites[article.type_article]}
                    inputMode="decimal"
                    chiffres
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Panneau>
      <Panneau titre={t.recentes} icone="history" compte={historique.donnees?.ventes.length} serre>
        <TableauDonnees
          legende={t.legendeRecentes}
          colonnes={colonnesVentes}
          lignes={historique.donnees?.ventes ?? (historique.erreur === null ? null : [])}
          cleLigne={(v) => v.id}
          vide={t.aucuneVente}
          erreur={historique.erreur}
        />
      </Panneau>
    </>
  )

  const detail = (
    <>
      {derniere !== null && (
        <Panneau titre={t.derniere} icone="receipt" compte={t.vente.replace('{numero}', String(derniere.numero))} actions={<a href={lienRecu(derniere)} target="_blank" rel="noreferrer">{t.ouvrirRecu}</a>}>
          <Chiffres valeurs={[{ etiquette: t.montant, valeur: afficherMillimes(derniere.montant_ttc_millimes), ton: 'fort' }]} />
        </Panneau>
      )}
      <form id={FORMULAIRE} onSubmit={(e) => { e.preventDefault(); void encaisser() }} aria-label={t.venteEnCours} noValidate>
        <Panneau titre={t.venteEnCours} icone="shopping-bag">
          <div className="bureau-formulaire">
            {preparation.erreur !== null && <Note ton="erreur">{preparation.erreur}</Note>}
            {client === null ? (
              <div className="bureau-recherche">
                <Champ id="client-vente" libelle={t.client} aide={t.clientAide} valeur={recherche} surChangement={saisirRecherche} placeholder={t.clientRecherche} />
                {(clients.donnees ?? []).length > 0 && (
                  <div className="bureau-actions">
                    {(clients.donnees ?? []).map((c) => (
                      <button type="button" key={c.id} className="bouton-secondaire" onClick={() => { choisirClient(c); saisirRecherche('') }}>{c.nom}</button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bureau-choisi">
                <span className="mes-etiquette">{t.clientChoisi}</span>
                <strong>{client.nom}</strong>
                <button type="button" className="bouton-secondaire bouton-petit" onClick={() => choisirClient(null)}>{t.retirerClient}</button>
              </div>
            )}

            <TableauDonnees legende={t.lignes} legendeVisible colonnes={colonnesLignes} lignes={enCours} cleLigne={(a) => a.id} vide={t.panierVide} />

            {huilesChoisies.map((huile) => {
              const litres = litresDe(huile)
              const qualite = qualiteDe(huile)
              if (cuvesDe(huile).length === 0) {
                const vides = cuvesQualite(huile).map((c) => c.code)
                return (
                  <CuveAbsente
                    key={huile.id}
                    id={`cuve-vente-${huile.id}`}
                    libelle={t.cuvePour.replace('{qualite}', qualite)}
                    qualite={qualite}
                    vides={vides}
                    surRetirer={() => retirerHuile(huile.id)}
                  />
                )
              }
              return (
                <div key={huile.id} className="bureau-cuve-huile">
                  <ChampChoix
                    id={`cuve-vente-${huile.id}`}
                    libelle={t.cuvePour.replace('{qualite}', qualite)}
                    valeur={cuvesChoisies[huile.id] ?? ''}
                    surChangement={(valeur) => { choisirCuves((avant) => ({ ...avant, [huile.id]: valeur })); definirErreur(null) }}
                    options={cuvesDe(huile).map((c) => ({ valeur: String(c.id), libelle: t.cuveOption.replace('{code}', c.code).replace('{kg}', grammesVersKg(c.disponible_g)) }))}
                    choixVide={t.choisirCuve}
                  />
                  {litres !== null && <Note>{t.litres.replace('{litres}', litres)}</Note>}
                </div>
              )
            })}
            {huilesChoisies.length > 0 && densite === null && <Note ton="alerte">{t.densiteManquante}</Note>}

            {apercu !== undefined && <Chiffres libelle={t.montant} valeurs={[{ etiquette: t.montant, valeur: afficherMillimes(apercu.totaux.montant_ttc_millimes), ton: 'fort' }]} />}
            {cleApercu !== null && apercu === undefined && erreurApercu === undefined && <Note>{t.apercuEnCours}</Note>}
            {erreurApercu !== undefined && (
              <>
                <Note ton="erreur">{erreurApercu}</Note>
                <button type="button" className="bouton-secondaire" onClick={() => { definirCalcul(null); reviserApercu((revision) => revision + 1) }}>{t.reessayerApercu}</button>
              </>
            )}
            <ChoixBoutons libelle={t.mode} options={MODES.map((m) => ({ valeur: m, libelle: t.modes[m] }))} valeur={mode} surChoisir={(m) => { choisirMode(m); definirReferencesVerifiees(false) }} />
            <ChampsReferences id="vente" mode={mode} valeur={references} surChangement={(v) => { definirReferences(v); commande.reinitialiser() }} verifier={referencesVerifiees} />
            {(erreur ?? commande.erreur) !== null && <Note ton="erreur">{erreur ?? commande.erreur}</Note>}
            <Note>{t.montantServeur}</Note>
          </div>
        </Panneau>
      </form>
    </>
  )

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.ventesDetail} sousTitre={t.sousTitre} message={message} principal={{ etiquette: t.encaisser, formulaire: FORMULAIRE, enCours: commande.enCours, inactif: articles.length === 0 || (cleApercu !== null && apercu === undefined) }} />
      <div className="mes-page bureau-page">
        <ListeDetail liste={liste} detail={detail} />
      </div>
    </section>
  )
}

interface PropsQuantiteHuile {
  article: ArticleDetail
  aide: string
  valeur: string
  surChangement: (valeur: string) => void
  unite: UniteHuile
  surUnite: (unite: UniteHuile) => void
  /** Sans densité d'affichage, l'huile ne se tape qu'en kg. */
  litresPossibles: boolean
  conversion: { millilitres: number; grammes: number } | null
  /** Montant HT de la ligne calculé par le serveur (aperçu), une fois la cuve choisie. */
  montantHt: number | undefined
  /** Aucune cuve de détail de cette qualité n'a d'huile : prévenu avant même de taper. */
  sansCuve: boolean
}

/** Quantité d'une huile en kg ou en L ; en litres, les kg convertis et le montant de la ligne sous la saisie. */
function QuantiteHuile({ article, aide, valeur, surChangement, unite, surUnite, litresPossibles, conversion, montantHt, sansCuve }: PropsQuantiteHuile) {
  const id = `quantite-${article.id}`
  // Choix kg | L collé à la saisie, à sa hauteur : une seule étiquette (le nom de l'huile) au-dessus.
  const choixUnite = (
    <div className="bureau-unite" role="radiogroup" aria-label={t.unite}>
      {(['kg', 'L'] as const).map((u) => (
        <button key={u} type="button" role="radio" aria-checked={u === unite} disabled={u === 'L' && !litresPossibles} onClick={() => surUnite(u)}>
          {t.unitesHuile[u]}
        </button>
      ))}
    </div>
  )
  return (
    <div className="bureau-quantite-huile">
      <Champ id={id} libelle={article.libelle} aide={aide} valeur={valeur} surChangement={surChangement} placeholder={t.unitesHuile[unite]} inputMode="decimal" chiffres suffixe={choixUnite} />
      {unite === 'L' && conversion !== null && (
        <p className="bureau-conversion" aria-live="polite">
          <span>{t.conversion.replace('{litres}', formaterLitres(conversion.millilitres)).replace('{kg}', formaterKg(conversion.grammes))}</span>
          {montantHt !== undefined && <strong>{t.totalLigne.replace('{montant}', afficherMillimes(montantHt))}</strong>}
        </p>
      )}
      {sansCuve && (
        <p className="bureau-article-sans-cuve">
          <Icone nom="cylinder" />
          {t.articleSansCuve}
        </p>
      )}
    </div>
  )
}

interface PropsCuveAbsente {
  id: string
  libelle: string
  qualite: string
  /** Codes des cuves de détail de cette qualité, toutes vides ; aucun : aucune cuve de détail affectée. */
  vides: string[]
  surRetirer: () => void
}

/** À la place d'une liste de cuves vide : pourquoi l'huile ne peut pas sortir, et comment continuer la vente. */
function CuveAbsente({ id, libelle, qualite, vides, surRetirer }: PropsCuveAbsente) {
  const raison = vides.length === 0
    ? t.cuveAbsenteAucune.replace('{qualite}', qualite)
    : (vides.length === 1 ? t.cuveAbsenteVide : t.cuveAbsenteVides).replace('{codes}', vides.join(', '))
  return (
    <div className="mes-champ">
      <span id={`${id}-etiquette`} className="mes-etiquette">{libelle}</span>
      <div className="bureau-cuve-absente" role="status" aria-labelledby={`${id}-etiquette`}>
        <span className="bureau-cuve-absente-icone"><Icone nom="cylinder" /></span>
        <div className="bureau-cuve-absente-texte">
          <strong>{t.cuveAbsenteTitre.replace('{qualite}', qualite)}</strong>
          <p>{raison}</p>
          <p>{t.cuveAbsenteConseil.replace('{qualite}', qualite)}</p>
          <button type="button" className="bouton-secondaire bouton-petit" onClick={surRetirer}>
            <Icone nom="x" />
            {t.retirerHuile.replace('{qualite}', qualite)}
          </button>
        </div>
      </div>
    </div>
  )
}
