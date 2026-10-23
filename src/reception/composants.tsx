// Éléments communs de l'écran de réception (T2.10, refonte Session 4) : afficheur de la bascule, file d'attente en
// cartes, choix du régime. Au style de prototype/arrachid-mes.html ; l'avancement d'une remorque vient de son statut.
import { flushSync } from 'react-dom'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { EtatVide } from '../composants/EtatVide'
import { Icone } from '../composants/Icone'
import type { NomIcone } from '../composants/icones'
import { Lampe } from '../composants/Lampe'
import { etatsEtapes } from '../composants/logique'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { useServeur } from '../contextes/serveur'
import { grouperMilliers } from '../format/saisie'
import { erreurSaisieNumerique } from '../format/validationNumerique'
import { libelles } from '../libelles'
import { remplacer } from '../tickets/logique'
import { allerAuSuivant } from './clavier'
import { REGIMES, etapeRemorque, heureLocale, type Mode, type Regime, type ResumeReception } from './logique'

const t = libelles.reception

interface PropsAfficheur {
  id: string
  libelle: string
  /** Nom lu par les lecteurs d'écran et les tests (« Poids brut (kg) »). */
  nomAccessible: string
  valeur: string
  surChangement: (valeur: string) => void
  autoFocus?: boolean
  erreur?: string
  /** Titre de l'indicateur : la bascule par défaut, la balance à plateforme en pesée directe. */
  titre?: string
  /** Balance non reliée au PC (pesée directe, E-38) : toujours en saisie manuelle, quel que soit l'état de la bascule. */
  toujoursManuel?: boolean
}

/** Afficheur sombre de la bascule (maquette MES) ; en mode manuel, le poids se tape dedans. */
export function Afficheur({ id, libelle, nomAccessible, valeur, surChangement, autoFocus, erreur, titre = t.afficheur, toujoursManuel = false }: PropsAfficheur) {
  const probleme = erreur ?? erreurSaisieNumerique(valeur, 'numeric')
  const message = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (erreur === undefined) return
    message.current?.scrollIntoView({ block: 'nearest' })
    document.getElementById(id)?.focus({ preventScroll: true })
  }, [erreur, id])
  const { etat } = useServeur()
  const automatique = !toujoursManuel && etat?.bascule === 'automatique'
  return (
    <div className="pont-afficheur">
      <div className="pont-afficheur-tete">
        <span>{titre}</span>
        {!automatique && <Lampe etat="alerte" libelle={t.saisieManuelle} />}
        {!automatique && <span className="pont-afficheur-source">{t.lectureIndicateur}</span>}
      </div>
      <div className="pont-afficheur-ligne">
        <label htmlFor={id}>{libelle}</label>
        <input
          id={id}
          data-champ
          aria-label={nomAccessible}
          aria-invalid={probleme !== undefined}
          aria-describedby={probleme === undefined ? undefined : `${id}-erreur`}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={valeur}
          autoFocus={autoFocus}
          onChange={(e) => surChangement(e.target.value)}
        />
        <span className="pont-afficheur-unite">{t.kg}</span>
      </div>
      {probleme !== undefined && <p ref={message} id={`${id}-erreur`} className="pont-erreur-poids" role="alert">{probleme}</p>}
    </div>
  )
}

/** Trois traits d'avancement : arrivée, déchargement, tare (décoratifs ; l'étiquette d'état dit la même chose). */
function Points({ statut }: { statut: string }) {
  const etats = etatsEtapes(3, etapeRemorque(statut))
  return (
    <span className="pont-points" aria-hidden="true">
      {etats.map((etat, rang) => <span key={rang} className={`pont-point-${etat}`} />)}
    </span>
  )
}

interface PropsFile {
  receptions: readonly ResumeReception[] | null
  selection: number | null
  surChoisir: (reception: ResumeReception, mode: Mode) => void
}

/** File des remorques sur le site, la plus ancienne d'abord (CONTEXTE §7.2) : bleu à décharger, jaune à tarer. */
export function FileAttente({ receptions, selection, surChoisir }: PropsFile) {
  return (
    <Panneau titre={t.file} icone="truck" compte={receptions?.length}>
      {receptions !== null && receptions.length === 0 && <EtatVide message={t.fileVide} />}
      {receptions !== null && receptions.length > 0 && (
        <div className="pont-file">
          {receptions.map((r) => {
            const versee = r.statut === 'versee'
            return (
              <button
                key={r.id}
                type="button"
                className={versee ? 'pont-remorque pont-remorque-versee' : 'pont-remorque'}
                aria-current={r.id === selection}
                onClick={() => surChoisir(r, versee ? 'tare' : 'dechargement')}
              >
                <span className="pont-remorque-tete">
                  <span className="pont-remorque-numero">{remplacer(t.remorque, { numero: r.numero })}</span>
                  <span className="pont-discret chiffres">{heureLocale(r.cree_le)}</span>
                  <Pastille ton={versee ? 'alerte' : 'action'}>{t.etats[versee ? 'versee' : 'pesee_brut']}</Pastille>
                </span>
                <span className="pont-remorque-ligne">
                  <span className="pont-remorque-nom">{r.apporteur.nom}</span>
                  <span className="pont-remorque-brut chiffres">{remplacer(t.brutRemorque, { brut: r.poids_brut_kg === null ? '—' : grouperMilliers(r.poids_brut_kg) })}</span>
                </span>
                <span className="pont-remorque-detail chiffres">
                  {r.cin_masquee ?? '—'} · {r.immatriculation ?? '—'} · {t.regimes[r.regime]}
                </span>
                <Points statut={r.statut} />
              </button>
            )
          })}
        </div>
      )}
    </Panneau>
  )
}

const ICONES_REGIME: Record<Regime, NomIcone> = { achat: 'hand-coins', facon: 'factory', mixte: 'percent' }

interface PropsRegime {
  valeur: Regime | null
  surChoisir: (regime: Regime) => void
}

/** Trois grands choix ; touches 1, 2, 3 ou Entrée sur le choix, puis champ suivant. */
export function ChoixRegime({ valeur, surChoisir }: PropsRegime) {
  const clavier = (e: KeyboardEvent<HTMLButtonElement>, regime: Regime) => {
    const parTouche = REGIMES.find((r) => t.touchesRegime[r] === e.key)
    const choisi = parTouche ?? (e.key === 'Enter' || e.key === ' ' ? regime : null)
    if (choisi === null) return
    e.preventDefault()
    // Le mixte fait apparaître ses champs : ils doivent exister avant de passer au suivant.
    flushSync(() => surChoisir(choisi))
    const formulaire = e.currentTarget.form
    const groupe = e.currentTarget.parentElement
    if (formulaire !== null && groupe !== null) allerAuSuivant(formulaire, groupe)
  }
  return (
    <div className="mes-champ">
      <span className="mes-etiquette" id="etiquette-regime">{t.regime}</span>
      <div className="pont-regimes" role="radiogroup" aria-labelledby="etiquette-regime" data-champ tabIndex={-1}>
        {REGIMES.map((regime) => (
          <button
            key={regime}
            type="button"
            role="radio"
            aria-checked={valeur === regime}
            className="pont-regime"
            onClick={() => surChoisir(regime)}
            onKeyDown={(e) => clavier(e, regime)}
          >
            <Icone nom={ICONES_REGIME[regime]} />
            {t.regimes[regime]}
            <span className="pont-touche" aria-hidden="true">{t.touchesRegime[regime]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
