import { useRef, useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { AfficheErreur } from '../composants/AfficheErreur'
import { formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'

interface EtatSauvegarde {
  statut: 'a_jour' | 'en_retard' | 'erreur' | 'inactif'
  derniere_reussite: string | null
  dernier_essai: string | null
  dernier_fichier: string | null
  derniere_erreur: string | null
  nocturne: Record<string, { statut: string; dernier_fichier: string | null; derniere_reussite: string | null; derniere_erreur: string | null }>
}
interface Sante {
  actif: boolean
  derniere_execution: string | null
  derniere_erreur: string | null
  attente: string | null
}
interface Essai {
  id: number
  type: 'imprimante' | 'sms'
  statut: 'en_attente' | 'reussi' | 'echec' | 'non_confirme' | 'simule'
  cause: string | null
  cree_le: string
}
interface Ensemble {
  version: string
  disque: { total_octets: number; libre_octets: number }
  base: { quick_check: 'ok' | 'erreur' }
  travailleurs: Record<'sms' | 'sauvegarde' | 'el_fatoora' | 'etat_materiel', Sante>
  imprimantes: { id: number; code: string; etat: string }[]
  essais: Essai[]
  compteurs_en_retard: CompteurEnRetard[]
}
export interface CompteurEnRetard {
  type_numero: string
  campagne_id: number
  campagne: string | null
  serie: string
  prochain_numero: number
  plus_grand_numero: number
}
interface Journal { evenements: { horodatage: string; niveau: string; composant: string; evenement: string }[] }

const t = libelles.diagnostic
const date = (valeur: string | null) => valeur ? formaterHorodatage(valeur) : t.aucune
const taille = (octets: number) => `${(octets / (1024 ** 3)).toFixed(1)} Go`
const retard = (c: CompteurEnRetard) => t.compteurEnRetard
  .replace('{serie}', t.seriesNumeros[c.type_numero] ?? c.type_numero)
  .replace('{campagne}', c.campagne ?? String(c.campagne_id))
  .replace('{prochain}', String(c.prochain_numero))
  .replace('{plus_grand}', String(c.plus_grand_numero))

/** EM-01 : une ligne rouge par série dont le prochain numéro est déjà attribué. */
export function PanneauNumerotation({ compteurs }: { compteurs: readonly CompteurEnRetard[] }) {
  return <Panneau titre={t.numerotation}>
    {compteurs.length === 0 ? <p><Pastille ton="ok">{t.numerotationEnOrdre}</Pastille></p> : <>
      <p className="aide">{t.numerotationAide}</p>
      <ul>{compteurs.map((c) => <li key={`${c.type_numero}-${c.campagne_id}-${c.serie}`}>
        <Pastille ton="erreur">{retard(c)}</Pastille>
      </li>)}</ul>
    </>}
  </Panneau>
}

/** Diagnostic administrateur T7.4 ; journal réduit à des codes sans données métier. */
export function PageDiagnostic() {
  const sauvegardes = useLecture<EtatSauvegarde>('/api/diagnostic/sauvegardes', 30000)
  const ensemble = useLecture<Ensemble>('/api/diagnostic/ensemble', 30000)
  const journal = useLecture<Journal>('/api/diagnostic/journal', 30000)
  const commande = useSoumission()
  const actionCourante = useRef<string | null>(null)
  const [telephone, definirTelephone] = useState('')
  const [dernierResultat, definirDernierResultat] = useState<Essai | null>(null)

  const actualiser = async () => { await Promise.all([sauvegardes.recharger(), ensemble.recharger(), journal.recharger()]) }
  const testerImprimante = async (id: number) => {
    const action = `imprimante:${id}`
    if (actionCourante.current !== action) { commande.reinitialiser(); actionCourante.current = action }
    const resultat = await commande.soumettre<Essai>(`/api/diagnostic/imprimantes/${id}/test`, {})
    if (resultat !== null) { definirDernierResultat(resultat); await actualiser() }
  }
  const testerSms = async () => {
    const action = `sms:${telephone}`
    if (actionCourante.current !== action) { commande.reinitialiser(); actionCourante.current = action }
    const resultat = await commande.soumettre<Essai>('/api/diagnostic/sms/test', { telephone })
    if (resultat !== null) { definirDernierResultat(resultat); await actualiser() }
  }

  return <section>
    <EnTeteEcran titre={t.titre} principal={{ etiquette: t.actualiser, surClic: () => void actualiser() }} />
    <div className="mes-page">
      <p className="aide">{t.aide}</p>
      <AfficheErreur erreur={sauvegardes.erreur ?? ensemble.erreur ?? journal.erreur ?? commande.erreur} />

      {ensemble.donnees && <>
        <Panneau titre={t.serveur}><dl className="fiche">
          <dt>{t.version}</dt><dd>{ensemble.donnees.version}</dd>
          <dt>{t.disque}</dt><dd>{taille(ensemble.donnees.disque.libre_octets)} / {taille(ensemble.donnees.disque.total_octets)}</dd>
          <dt>{t.base}</dt><dd>{ensemble.donnees.base.quick_check === 'ok' ? t.sain : t.anomalie}</dd>
        </dl></Panneau>
        <PanneauNumerotation compteurs={ensemble.donnees.compteurs_en_retard} />
        <Panneau titre={t.travailleurs} serre><div className="mes-tableau"><table className="tableau-admin"><thead><tr><th>{t.travailleur}</th><th>{t.statut}</th><th>{t.dernierEssai}</th><th>{t.derniereErreur}</th></tr></thead>
          <tbody>{(Object.entries(ensemble.donnees.travailleurs) as [keyof Ensemble['travailleurs'], Sante][]).map(([nom, sante]) =>
            <tr key={nom}><td>{t.nomsTravailleurs[nom]}</td><td>{sante.actif ? t.actif : t.inactif}{sante.attente ? ` — ${sante.attente}` : ''}</td><td>{date(sante.derniere_execution)}</td><td>{sante.derniere_erreur ?? t.aucune}</td></tr>
          )}</tbody></table></div></Panneau>
        <Panneau titre={t.imprimantes}>
        {ensemble.donnees.imprimantes.length === 0 ? <p>{t.aucuneImprimante}</p> :
          <ul>{ensemble.donnees.imprimantes.map((imprimante) => <li key={imprimante.id}>
            {imprimante.code} — {imprimante.etat} <button type="button" disabled={commande.enCours} onClick={() => void testerImprimante(imprimante.id)}>{t.testerImprimante}</button>
          </li>)}</ul>}
        </Panneau>
        <Panneau titre={t.sms}>
        <p className="aide">{t.smsAide}</p>
        <label htmlFor="telephone-test-sms">{t.telephone}</label>{' '}
        <input id="telephone-test-sms" type="tel" autoComplete="off" value={telephone} onChange={(e) => definirTelephone(e.target.value)} />{' '}
        <button type="button" disabled={commande.enCours || telephone.trim() === ''} onClick={() => void testerSms()}>{t.testerSms}</button>
        {dernierResultat && <p role="status">{t.dernierResultat} : {t.statutsEssai[dernierResultat.statut]}{dernierResultat.cause ? ` (${dernierResultat.cause})` : ''}</p>}
        </Panneau>
        <Panneau titre={t.essais}>
        {ensemble.donnees.essais.length === 0 ? <p>{t.aucunEssai}</p> : <ul>{ensemble.donnees.essais.map((essai) =>
          <li key={essai.id}>{date(essai.cree_le)} — {essai.type === 'sms' ? t.sms : t.imprimantes} : {t.statutsEssai[essai.statut]}</li>
        )}</ul>}
        </Panneau>
      </>}

      <Panneau titre={t.sauvegardes}>
      {sauvegardes.donnees && <dl className="fiche">
        <dt>{t.statut}</dt><dd>{t.statuts[sauvegardes.donnees.statut]}</dd>
        <dt>{t.derniereReussite}</dt><dd>{date(sauvegardes.donnees.derniere_reussite)}</dd>
        <dt>{t.dernierEssai}</dt><dd>{date(sauvegardes.donnees.dernier_essai)}</dd>
        <dt>{t.dernierFichier}</dt><dd>{sauvegardes.donnees.dernier_fichier ?? t.aucune}</dd>
        {sauvegardes.donnees.derniere_erreur && <><dt>{t.derniereErreur}</dt><dd>{sauvegardes.donnees.derniere_erreur}</dd></>}
      </dl>}
      {sauvegardes.donnees && Object.entries(sauvegardes.donnees.nocturne).map(([destination, etat]) => <dl className="fiche" key={destination}>
        <dt>{t.destination}</dt><dd>{destination}</dd>
        <dt>{t.statut}</dt><dd>{etat.statut}</dd>
        <dt>{t.derniereReussite}</dt><dd>{date(etat.derniere_reussite)}</dd>
        <dt>{t.dernierFichier}</dt><dd>{etat.dernier_fichier ?? t.aucune}</dd>
        {etat.derniere_erreur && <><dt>{t.derniereErreur}</dt><dd>{etat.derniere_erreur}</dd></>}
      </dl>)}
      </Panneau>

      <Panneau titre={t.journal}>
      <p className="aide">{t.journalAide}</p>
      {journal.donnees && (journal.donnees.evenements.length === 0 ? <p>{t.aucunEvenement}</p> : <ul>{journal.donnees.evenements.map((ligne, index) =>
        <li key={`${ligne.horodatage}-${index}`}>{date(ligne.horodatage)} — {ligne.niveau} — {ligne.composant} — {ligne.evenement}</li>
      )}</ul>)}
      </Panneau>
    </div>
  </section>
}
