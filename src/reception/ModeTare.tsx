// Tare (CONTEXTE §7.1 pt 3–4, §7.2) : CIN → une réception choisie d'office, plusieurs en cartes →
// poids tare → aperçu du net → Enregistrer la tare et imprimer. Résultat : ticket, impression, SMS.
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'
import { lire } from '../api/client'
import { messageUtilisateur } from '../api/erreurs'
import { useSoumission } from '../api/useSoumission'
import { Chiffres } from '../composants/Chiffres'
import { Icone } from '../composants/Icone'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { entierPositif, grouperMilliers } from '../format/saisie'
import { libelles } from '../libelles'
import { cheminApercu, cheminImpression, peutReessayer, texteEtat, tonResultat, type EtatImpression } from '../tickets/logique'
import { surEntree } from './clavier'
import { ChampPont, FORMULAIRE_PRINCIPAL, type Principal } from './champs'
import { Afficheur } from './composants'
import { cheminRechercheTare, corpsTare, heureLocale, netApercu, texteSms, type DetailReception, type ResumeReception, type RechercheTare } from './logique'

const t = libelles.reception

export interface ResultatTare {
  reception: DetailReception
  impression: EtatImpression
}

interface Props {
  receptions: readonly ResumeReception[]
  selection: number | null
  surChoisir: (id: number | null) => void
  surPrincipal: (principal: Principal) => void
  surReussite: (message: string) => void
  resultat: ResultatTare | null
  surResultat: (resultat: ResultatTare | null) => void
}

export function ModeTare({ receptions, selection, surChoisir, surPrincipal, surReussite, resultat, surResultat }: Props) {
  const [cin, definirCin] = useState('')
  const [cartes, definirCartes] = useState<RechercheTare['a_tarer'] | null>(null)
  const [aDecharger, definirADecharger] = useState<ResumeReception[]>([])
  const rechercheEnCours = useRef(0)
  const [tare, definirTare] = useState('')
  const [message, definirMessage] = useState<string | null>(null)
  const soumission = useSoumission()
  const champCin = useRef<HTMLInputElement>(null)
  // Trouvée par CIN : gardée telle quelle, sans attendre le prochain rafraîchissement de la file.
  const [trouvee, definirTrouvee] = useState<ResumeReception | null>(null)
  const choisie = receptions.find((r) => r.id === selection && r.statut === 'versee') ?? (trouvee !== null && trouvee.id === selection ? trouvee : null)

  useEffect(() => {
    if (resultat === null) surPrincipal({ formulaire: FORMULAIRE_PRINCIPAL, etiquette: t.enregistrerTare, enCours: soumission.enCours })
  }, [resultat, soumission.enCours, surPrincipal])
  // Réception choisie (file, carte ou CIN) : le poids tare est le champ suivant.
  useEffect(() => {
    if (choisie !== null) document.getElementById('rec-tare')?.focus()
  }, [choisie?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const choisir = (r: ResumeReception) => {
    definirCartes(null)
    definirMessage(null)
    if (r.statut !== 'versee') {
      definirMessage(t.pasDechargee.replace('{numero}', String(r.numero)))
      return
    }
    soumission.reinitialiser()
    definirTrouvee(r)
    surChoisir(r.id)
  }

  const chercher = async () => {
    const recherche = ++rechercheEnCours.current
    const chemin = cheminRechercheTare(cin)
    definirMessage(null)
    definirCartes(null)
    definirADecharger([])
    definirTrouvee(null)
    definirTare('')
    surChoisir(null)
    soumission.reinitialiser()
    if (chemin === null) {
      definirMessage(t.erreurs.cin)
      return
    }
    try {
      const resultat = await lire<RechercheTare>(chemin)
      if (recherche !== rechercheEnCours.current) return
      const trouvees = resultat.a_tarer
      definirADecharger(resultat.a_decharger)
      if (trouvees.length === 0) {
        definirCartes(null)
        if (resultat.a_decharger.length === 0) definirMessage(t.aucuneTare)
      } else if (trouvees.length === 1) {
        choisir(trouvees[0])
      } else {
        flushSync(() => definirCartes(trouvees))
        document.querySelector<HTMLButtonElement>('.rec-carte')?.focus()
      }
    } catch (erreur) {
      if (recherche === rechercheEnCours.current) definirMessage(messageUtilisateur(erreur))
    }
  }

  const toucheCin = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    void chercher()
  }

  const valider = async (e: FormEvent) => {
    e.preventDefault()
    if (soumission.enCours) return
    if (choisie === null) {
      definirMessage(t.erreurs.reception)
      return
    }
    const r = corpsTare(tare)
    definirMessage(r.erreur)
    if (r.corps === null) return
    const reponse = await soumission.soumettre<ResultatTare>(`/api/receptions/${choisie.id}/tare`, r.corps)
    if (reponse === null) return
    soumission.reinitialiser()
    definirCin('')
    definirTare('')
    surChoisir(null)
    surResultat(reponse)
    surReussite(t.ticket.replace('{numero}', String(reponse.reception.ticket?.numero ?? '')))
  }

  if (resultat !== null) {
    return <ResultatTicket resultat={resultat} surPrincipal={surPrincipal} surSuivante={() => { surResultat(null); setTimeout(() => champCin.current?.focus()) }} surImpression={(impression) => surResultat({ ...resultat, impression })} />
  }

  const net = netApercu(choisie?.poids_brut_kg ?? null, tare)
  const tareSaisie = entierPositif(tare)
  const erreur = message ?? soumission.erreur
  const erreurPoids = choisie !== null && erreur !== null && (message !== null || soumission.champ?.startsWith('poids')) ? erreur : undefined
  return (
    <div className="pont-travail">
      <form id={FORMULAIRE_PRINCIPAL} className="pont-formulaire" aria-label={t.modes.tare} onSubmit={(e) => void valider(e)} onKeyDown={surEntree}>
        <Panneau titre={t.titreTare} icone="ticket">
          <div className="pont-grille">
            <ChampPont id="rec-cin-tare" libelle={t.cinTare} aide={t.cinTareAide} valeur={cin} surChangement={(v) => { ++rechercheEnCours.current; definirCin(v); definirMessage(null); definirCartes(null); definirADecharger([]); definirTrouvee(null); definirTare(''); surChoisir(null); soumission.reinitialiser() }} surTouche={toucheCin} refChamp={champCin} inputMode="numeric" autoFocus={choisie === null} chiffres />
            <div className="mes-champ">
              <span className="mes-etiquette" aria-hidden="true">&nbsp;</span>
              <div>
                <button type="button" className="bouton-secondaire" onClick={() => void chercher()}>
                  <Icone nom="search" />
                  {t.chercher}
                </button>
              </div>
            </div>
          </div>
          {aDecharger.map((r) => <Note key={r.id} ton="alerte">{t.pasDechargee.replace('{numero}', String(r.numero))}</Note>)}
          {cartes !== null && (
            <>
              <p role="status">{t.plusieurs.replace('{nombre}', String(cartes.length))}</p>
              <div className="rec-cartes">
                {cartes.map((r) => (
                  <button key={r.id} type="button" className="rec-carte" onClick={() => choisir(r)}>
                    <strong>{t.choisie.replace('{numero}', String(r.numero))}</strong>
                    <strong>{r.apporteur.nom}</strong>
                    <span>{t.bacsResume.replace('{bacs}', r.bacs.join(', '))}</span>
                    <span className="chiffres">{r.immatriculation ?? '—'}</span>
                    <span>{t.arriveeA.replace('{heure}', heureLocale(r.cree_le))}</span>
                    <span className="chiffres">{t.brutKg.replace('{brut}', grouperMilliers(r.poids_brut_kg ?? 0))}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {choisie !== null ? (
            <>
              <p><strong>{t.choisie.replace('{numero}', String(choisie.numero))} · {choisie.apporteur.nom} · {choisie.immatriculation ?? '—'}</strong></p>
              <Chiffres
                valeurs={[
                  { etiquette: t.brut, valeur: grouperMilliers(choisie.poids_brut_kg ?? 0), unite: t.kg },
                  { etiquette: t.tare, valeur: tareSaisie === null ? '—' : grouperMilliers(tareSaisie), unite: t.kg },
                  { etiquette: t.netApercu, valeur: <span aria-live="polite">{net === null ? '—' : grouperMilliers(net)}</span>, unite: t.kg, ton: 'fort' },
                ]}
              />
            </>
          ) : (
            cartes === null && <Note>{t.choisirATarer}</Note>
          )}
        </Panneau>
        {choisie !== null && (
          <Afficheur id="rec-tare" libelle={t.tare} nomAccessible={t.poidsTare} valeur={tare} surChangement={(v) => { definirTare(v); definirMessage(null); soumission.reinitialiser() }} erreur={erreurPoids} />
        )}
        {erreur !== null && erreurPoids === undefined && <Note ton="erreur">{erreur}</Note>}
      </form>
    </div>
  )
}

interface PropsResultat {
  resultat: ResultatTare
  surPrincipal: (principal: Principal) => void
  surSuivante: () => void
  surImpression: (impression: EtatImpression) => void
  /** Mode qui a émis le ticket : il donne le libellé du formulaire et de l'action suivante (F8). */
  mode?: 'tare' | 'directe'
}

/** Ticket émis (tare ou pesée directe) : numéro, état d'impression (Réessayer, F10) et état du SMS. */
export function ResultatTicket({ resultat, surPrincipal, surSuivante, surImpression, mode = 'tare' }: PropsResultat) {
  const s = useSoumission()
  const { reception, impression } = resultat
  const ticket = reception.ticket
  const suivante = mode === 'tare' ? t.nouvelleTare : t.nouvelleDirecte
  useEffect(() => surPrincipal({ formulaire: 'formulaire-tare-suivante', etiquette: suivante, enCours: false }), [surPrincipal, suivante])

  const reessayer = async () => {
    if (ticket === null || s.enCours) return
    const reponse = await s.soumettre<{ impression: EtatImpression }>(cheminImpression(ticket.piece_id), {})
    if (reponse !== null) surImpression(reponse.impression)
    s.reinitialiser()
  }

  const smsEnEchec = reception.sms?.statut === 'echec'
  return (
    <div className="pont-resultat">
      <form id="formulaire-tare-suivante" aria-label={t.modes[mode]} onSubmit={(e) => { e.preventDefault(); surSuivante() }}>
        <Panneau titre={t.ticketEmis} icone="circle-check">
          <p className="rec-ticket-numero" role="status">{t.ticket.replace('{numero}', String(ticket?.numero ?? '—'))}</p>
          <p>{t.resultatTare.replace('{numero}', String(reception.numero)).replace('{nom}', reception.apporteur.nom).replace('{net}', grouperMilliers(reception.net_kg ?? 0)).replace('{bacs}', reception.bacs.join(', '))}</p>
          <dl className="pont-resume">
            <div>
              <dt>{t.impression}</dt>
              <dd>
                <Pastille ton={tonResultat(impression.statut)}>{libelles.tickets.resultats[impression.statut]}</Pastille>
                {impression.message !== null && <span className="pont-alerte">{texteEtat(impression)}</span>}
                {peutReessayer(impression) && (
                  <button type="button" id="rec-reessayer" className="bouton-secondaire bouton-petit" disabled={s.enCours} onClick={() => void reessayer()}>
                    <span className="pont-touche" aria-hidden="true">F10</span> {t.reessayerImpression}
                  </button>
                )}
              </dd>
            </div>
            <div>
              <dt>{t.smsApporteur}</dt>
              <dd className={smsEnEchec ? 'pont-alerte' : undefined}>{texteSms(reception.sms)}</dd>
            </div>
          </dl>
          {s.erreur !== null && <Note ton="erreur">{s.erreur}</Note>}
        </Panneau>
      </form>
      {ticket !== null && (
        <Panneau titre={t.apercuTicket.replace('{numero}', String(ticket.numero))} icone="printer">
          <img className="pont-apercu" src={cheminApercu(ticket.piece_id)} alt={t.apercuTicket.replace('{numero}', String(ticket.numero))} />
        </Panneau>
      )}
    </div>
  )
}
