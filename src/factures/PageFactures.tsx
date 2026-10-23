import { useState } from 'react'
import { useDiffere } from '../api/useDiffere'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { lire } from '../api/client'
import type { Client } from '../clients/logique'
import { Champ } from '../composants/Champ'
import { Chiffres } from '../composants/Chiffres'
import { ChoixBoutons } from '../composants/ChoixBoutons'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille, type TonPastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { Tiroir } from '../composants/Tiroir'
import { grammesVersKg } from '../administration/unites'
import { afficherMillimes } from '../format/montants'
import { uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'
import '../styles/bureau.css'
import { SectionAvoirs, type LigneFactureAvoir } from './SectionAvoirs'
import { libelleElFatoora } from './elFatoora'
import { corpsReferences, referencesCompletes, REFERENCES_VIDES, type References } from '../caisse/references'
import { ChampsReferences } from '../composants/ChampsReferences'

const t = libelles.factures
const DELAI_FRAPPE_MS = 250
type Mode = 'especes' | 'cheque' | 'virement'
const MODES: Mode[] = ['especes', 'cheque', 'virement']

type TypeSource = 'chargement' | 'vente_detail' | 'partage_huile'
interface Source { id: number; poids_charge_g?: number; qualite?: string; nombre_lignes?: number; ht_millimes?: number; redevance_millimes?: number; apporteur?: string }
interface Preparation {
  client: { id: number; nom: string; regime_tva: string }
  chargements: Source[]
  ventes_detail: Source[]
  redevances: Source[]
}
interface Facture {
  id: number; numero: number; client_nom: string; montant_ttc_millimes: number
  paye_millimes: number; compense_millimes: number; credite_millimes: number; rembourse_millimes: number
  redevance_decompte_emis: boolean
  restant_millimes: number; etat_paiement: string; statut_el_fatoora: string; erreur_el_fatoora: string | null; lignes: LigneFactureAvoir[]
}
interface Liste { factures: Facture[] }
interface ChoixSource { type_source: TypeSource; source_id: number }

const cle = (source: ChoixSource) => `${source.type_source}:${source.source_id}`
const TONS_PAIEMENT: Record<string, TonPastille> = { non_reglee: 'action', partielle: 'action', reglee: 'ok', compensation_en_attente: 'alerte' }
const TONS_EL_FATOORA: Record<string, TonPastille> = { a_envoyer: 'neutre', envoyee: 'neutre', acceptee: 'ok', rejetee: 'erreur' }

/** Factures et avoirs (FAC-01) : liste à gauche ; à droite la facture choisie, son encaissement et ses avoirs. */
export function PageFactures() {
  const liste = useLecture<Liste>('/api/factures')
  const commande = useSoumission()
  // Émission d'une facture, dans un tiroir.
  const [emission, definirEmission] = useState(false)
  const [recherche, saisirRecherche] = useState('')
  const differee = useDiffere(recherche, DELAI_FRAPPE_MS)
  const clients = useLecture<Client[]>(emission && differee.trim().length >= 2 ? `/api/clients?q=${encodeURIComponent(differee.trim())}` : null)
  const [clientId, choisirClient] = useState<number | null>(null)
  const preparation = useLecture<Preparation>(clientId === null ? null : `/api/factures/preparation?client_id=${clientId}`)
  const [sources, choisirSources] = useState<ChoixSource[]>([])
  const [vendeurAdresse, saisirAdresse] = useState('')
  const [vendeurMatricule, saisirMatricule] = useState('')
  // Facture choisie et son encaissement.
  const [facture, choisirFacture] = useState<Facture | null>(null)
  const [recuId, choisirRecu] = useState<number | null>(null)
  const [montant, saisirMontant] = useState('')
  const [mode, choisirMode] = useState<Mode>('especes')
  const [references, definirReferences] = useState<References>(REFERENCES_VIDES)
  const [referencesVerifiees, definirReferencesVerifiees] = useState(false)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)

  const ouvrirEmission = () => {
    commande.reinitialiser()
    definirErreurLocale(null)
    saisirRecherche(''); choisirClient(null); choisirSources([]); saisirAdresse(''); saisirMatricule('')
    definirEmission(true)
  }
  const fermerEmission = () => {
    commande.reinitialiser()
    definirErreurLocale(null)
    definirEmission(false)
  }
  const choisir = (item: Facture) => {
    choisirFacture(item)
    choisirRecu(null)
    saisirMontant('')
    definirErreurLocale(null)
    commande.reinitialiser()
  }

  const basculer = (source: ChoixSource) => {
    choisirSources((avant) => avant.some((item) => cle(item) === cle(source))
      ? avant.filter((item) => cle(item) !== cle(source))
      : source.type_source === 'vente_detail' || avant.some((item) => item.type_source === 'vente_detail')
        ? [source] : [...avant, source])
    definirErreurLocale(null)
    commande.reinitialiser()
  }
  const emettre = async () => {
    if (clientId === null || sources.length === 0) { definirErreurLocale(t.erreurSources); return }
    const reponse = await commande.soumettre<{ facture: Facture }>('/api/factures', {
      client_id: clientId, sources,
      vendeur_adresse: vendeurAdresse.trim() || null,
      vendeur_matricule_fiscal: vendeurMatricule.trim() || null,
    })
    if (reponse === null) return
    definirEmission(false)
    choisir(reponse.facture)
    definirMessage({ texte: t.archivee.replace('{numero}', String(reponse.facture.numero)), type: 'ok' })
    await liste.recharger()
  }
  const encaisser = async () => {
    if (facture === null) return
    const valeur = uniteExacte(montant, 3)
    if (valeur === null || valeur <= 0) { definirErreurLocale(t.erreurMontant); return }
    if (!referencesCompletes(mode, references)) { definirReferencesVerifiees(true); return }
    const reponse = await commande.soumettre<{ facture: Facture; recu: { id: number } }>(`/api/factures/${facture.id}/encaissements`, {
      montant_millimes: valeur, mode, ...corpsReferences(mode, references),
    })
    if (reponse === null) return
    definirReferences(REFERENCES_VIDES)
    definirReferencesVerifiees(false)
    choisirFacture(reponse.facture)
    choisirRecu(reponse.recu.id)
    saisirMontant('')
    definirErreurLocale(null)
    definirMessage({ texte: t.encaisse.replace('{numero}', String(facture.numero)), type: 'ok' })
    commande.reinitialiser()
    await liste.recharger()
  }

  const groupe = (type: TypeSource, items: Source[], decrire: (s: Source) => string) => items.length > 0 && (
    <fieldset className="bureau-groupe">
      <legend className="mes-etiquette">{t.groupes[type]}</legend>
      {items.map((item) => {
        const source = { type_source: type, source_id: item.id }
        return (
          <label key={cle(source)} className="mes-case">
            <input type="checkbox" checked={sources.some((choix) => cle(choix) === cle(source))} onChange={() => basculer(source)} />
            {decrire(item)}
          </label>
        )
      })}
    </fieldset>
  )

  const colonnes: Colonne<Facture>[] = [
    { cle: 'numero', titre: t.colonnes.numero, rendu: (f) => f.numero, nombre: true },
    { cle: 'client', titre: t.colonnes.client, rendu: (f) => f.client_nom },
    { cle: 'ttc', titre: t.colonnes.ttc, rendu: (f) => afficherMillimes(f.montant_ttc_millimes), nombre: true },
    { cle: 'reste', titre: t.colonnes.reste, rendu: (f) => afficherMillimes(f.restant_millimes), nombre: true },
    { cle: 'paiement', titre: t.colonnes.paiement, rendu: (f) => <Pastille ton={TONS_PAIEMENT[f.etat_paiement] ?? 'neutre'}>{t.paiements[f.etat_paiement] ?? f.etat_paiement}</Pastille> },
    { cle: 'elFatoora', titre: t.colonnes.elFatoora, rendu: (f) => <Pastille ton={TONS_EL_FATOORA[f.statut_el_fatoora] ?? 'neutre'}>{libelleElFatoora(f.statut_el_fatoora)}</Pastille> },
  ]

  const prep = preparation.donnees !== null && clientId === preparation.donnees.client.id ? preparation.donnees : null
  const encaissable = facture !== null && facture.restant_millimes > 0 && facture.etat_paiement !== 'compensation_en_attente'

  const listeFactures = (
    <Panneau titre={t.liste} icone="receipt" compte={liste.donnees?.factures.length} serre>
      <TableauDonnees
        legende={t.legendeListe}
        colonnes={colonnes}
        lignes={liste.donnees?.factures ?? (liste.erreur === null ? null : [])}
        cleLigne={(f) => f.id}
        vide={t.aucune}
        erreur={liste.erreur}
        surChoisir={choisir}
        choisie={facture?.id ?? null}
      />
    </Panneau>
  )

  const detail = facture === null ? (
    <Panneau titre={t.detail} icone="receipt"><EtatVide message={t.choisir} /></Panneau>
  ) : (
    <>
      <Panneau
        titre={t.facture.replace('{numero}', String(facture.numero))}
        icone="receipt"
        compte={facture.client_nom}
        actions={<a href={`/api/factures/${facture.id}/pdf`} target="_blank" rel="noreferrer">{t.ouvrirFacture}</a>}
      >
        <div className="bureau-formulaire">
          <Chiffres valeurs={[
            { etiquette: t.montants.total, valeur: afficherMillimes(facture.montant_ttc_millimes) },
            { etiquette: t.montants.encaisse, valeur: afficherMillimes(facture.paye_millimes) },
            { etiquette: t.montants.avoirs, valeur: afficherMillimes(facture.credite_millimes) },
            { etiquette: t.montants.rembourse, valeur: afficherMillimes(facture.rembourse_millimes) },
            { etiquette: t.montants.compense, valeur: afficherMillimes(facture.compense_millimes) },
            { etiquette: t.montants.reste, valeur: afficherMillimes(facture.restant_millimes), ton: 'fort' },
          ]} />
          <p className="bureau-ligne-etat">
            <span className="mes-etiquette">{t.elFatoora}</span>
            <Pastille ton={TONS_EL_FATOORA[facture.statut_el_fatoora] ?? 'neutre'}>{libelleElFatoora(facture.statut_el_fatoora, facture.erreur_el_fatoora)}</Pastille>
          </p>
          {facture.etat_paiement === 'compensation_en_attente' && <Note ton="alerte">{t.compensation}</Note>}
          {recuId !== null && <a href={`/api/reglements/${recuId}/pdf`} target="_blank" rel="noreferrer">{t.ouvrirRecu}</a>}
        </div>
      </Panneau>
      {encaissable && (
        <form onSubmit={(e) => { e.preventDefault(); void encaisser() }} aria-label={t.encaissement} noValidate>
          <Panneau titre={t.encaissement} icone="wallet">
            <div className="bureau-formulaire">
              <Champ id="montant-facture" libelle={t.montant} valeur={montant} surChangement={(v) => { saisirMontant(v); definirErreurLocale(null); commande.reinitialiser() }} inputMode="decimal" placeholder="0,000" chiffres />
              <ChoixBoutons libelle={t.mode} options={MODES.map((m) => ({ valeur: m, libelle: t.modes[m] }))} valeur={mode} surChoisir={(m) => { choisirMode(m); definirReferencesVerifiees(false); commande.reinitialiser() }} />
              <ChampsReferences id="facture" mode={mode} valeur={references} surChangement={(v) => { definirReferences(v); commande.reinitialiser() }} verifier={referencesVerifiees} />
              {!emission && (erreurLocale ?? commande.erreur) !== null && <Note ton="erreur">{erreurLocale ?? commande.erreur}</Note>}
              <div className="bureau-actions">
                <button type="submit" className="bouton-secondaire" disabled={commande.enCours}>{t.encaisser}</button>
              </div>
            </div>
          </Panneau>
        </form>
      )}
      <SectionAvoirs key={facture.id} facture={facture} surEmission={async () => {
        choisirFacture((await lire<{ facture: Facture }>(`/api/factures/${facture.id}`)).facture)
        await liste.recharger()
      }} />
    </>
  )

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.factures} sousTitre={t.sousTitre} message={message}
        principal={emission ? null : { etiquette: t.nouvelle, surClic: ouvrirEmission }} />
      <div className="mes-page bureau-page">
        <ListeDetail liste={listeFactures} detail={detail} />
      </div>

      {emission && (
        <Tiroir
          titre={t.nouvelle}
          icone="receipt"
          etiquette={t.emettre}
          surValider={() => void emettre()}
          surFermer={fermerEmission}
          enCours={commande.enCours}
          erreur={erreurLocale ?? commande.erreur ?? clients.erreur ?? preparation.erreur}
        >
          <Champ id="client-facture" libelle={t.rechercheClient} valeur={recherche} surChangement={(v) => saisirRecherche(v)} />
          {(clients.donnees ?? []).length > 0 && (
            <div className="bureau-actions">
              {(clients.donnees ?? []).map((client) => (
                <button type="button" key={client.id} className="bouton-secondaire" aria-pressed={clientId === client.id}
                  onClick={() => { choisirClient(client.id); choisirSources([]); commande.reinitialiser() }}>
                  {client.nom}{clientId === client.id ? ` · ${t.choisi}` : ''}
                </button>
              ))}
            </div>
          )}
          {prep !== null && <>
            <Note>{t.clientRegime.replace('{client}', prep.client.nom).replace('{regime}', libelles.clients.regimes[prep.client.regime_tva as keyof typeof libelles.clients.regimes] ?? prep.client.regime_tva)}</Note>
            {prep.chargements.length + prep.ventes_detail.length + prep.redevances.length === 0 ? <EtatVide message={t.aucuneSource} /> : <>
              {groupe('chargement', prep.chargements, (s) => t.sourceChargement.replace('{id}', String(s.id)).replace('{qualite}', libelles.contrats.qualites[s.qualite as keyof typeof libelles.contrats.qualites] ?? s.qualite ?? '').replace('{kg}', grammesVersKg(s.poids_charge_g ?? 0)))}
              {groupe('vente_detail', prep.ventes_detail, (s) => t.sourceVente.replace('{id}', String(s.id)).replace('{lignes}', String(s.nombre_lignes)).replace('{montant}', afficherMillimes(s.ht_millimes ?? 0)))}
              {groupe('partage_huile', prep.redevances, (s) => t.sourceRedevance.replace('{id}', String(s.id)).replace('{apporteur}', s.apporteur ?? '').replace('{montant}', afficherMillimes(s.redevance_millimes ?? 0)))}
              <p className="mes-champ-aide">{t.aideSources}</p>
            </>}
            <Champ id="vendeur-adresse" libelle={t.vendeurAdresse} valeur={vendeurAdresse} surChangement={(v) => { saisirAdresse(v); commande.reinitialiser() }} />
            <Champ id="vendeur-matricule" libelle={t.vendeurMatricule} valeur={vendeurMatricule} surChangement={(v) => { saisirMatricule(v); commande.reinitialiser() }} />
          </>}
        </Tiroir>
      )}
    </section>
  )
}
