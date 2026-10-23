// Écran de réception (T2.10, PROMPT §6.20.4), refait en Session 4 sur prototype/arrachid-mes.html : file des
// remorques en cartes à gauche ; à droite les modes F2 arrivée / F3 déchargement / F4 tare, l'afficheur de la bascule
// et le formulaire ; F8 action principale dans l'en-tête ; F10 réimpression ; Échap vide. Ordre des champs, focus et
// touches inchangés.
import { useCallback, useEffect, useState } from 'react'
import { useLecture } from '../api/useLecture'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { Icone } from '../composants/Icone'
import type { NomIcone } from '../composants/icones'
import { Note } from '../composants/Note'
import { useTouches } from '../contextes/touches'
import { useSession } from '../contextes/session'
import { libelles } from '../libelles'
import { FORMULAIRE_PRINCIPAL, type Principal } from './champs'
import { FileAttente } from './composants'
import { BROUILLONS_DIRECTE, type Mode, type ResumeReception } from './logique'
import { ModeArrivee } from './ModeArrivee'
import { ModeDechargement } from './ModeDechargement'
import { ModeDirecte } from './ModeDirecte'
import { ModeTare, type ResultatTare } from './ModeTare'
import '../styles/pont.css'

const t = libelles.reception
// F5 : pesée directe d'un petit lot sur la balance à plateforme (E-38).
const ORDRE_MODES: readonly Mode[] = ['arrivee', 'dechargement', 'tare', 'directe']
const TOUCHE_MODE: Record<Mode, 'F2' | 'F3' | 'F4' | 'F5'> = { arrivee: 'F2', dechargement: 'F3', tare: 'F4', directe: 'F5' }
const ICONE_MODE: Record<Mode, NomIcone> = { arrivee: 'scale', dechargement: 'grid-3x3', tare: 'ticket', directe: 'weight' }

export function PageReception() {
  const { brouillons } = useSession()
  const file = useLecture<ResumeReception[]>('/api/receptions/en-attente', 5000)
  const [mode, definirMode] = useState<Mode>('arrivee')
  const [selection, definirSelection] = useState<number | null>(null)
  const [principal, definirPrincipal] = useState<Principal>({ formulaire: FORMULAIRE_PRINCIPAL, etiquette: t.enregistrerArrivee, enCours: false })
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const [resultat, definirResultat] = useState<ResultatTare | null>(null)
  // Chaque changement de mode remonte le formulaire : Échap le vide de la même façon.
  const [generation, definirGeneration] = useState(0)
  const [derniereArrivee, definirDerniereArrivee] = useState<number | null>(null)

  const surPrincipal = useCallback((p: Principal) => definirPrincipal(p), [])
  const { recharger } = file
  const surReussite = useCallback((texte: string) => {
    definirMessage({ texte, type: 'ok' })
    void recharger()
  }, [recharger])

  const changerMode = useCallback((suivant: Mode, id: number | null = null) => {
    brouillons?.effacer('reception.arrivee', 'reception.recherche', 'reception.commande', 'reception.enCours', ...BROUILLONS_DIRECTE)
    definirMode(suivant)
    definirSelection(id ?? (suivant === 'dechargement' ? derniereArrivee : null))
    definirResultat(null)
    definirGeneration((g) => g + 1)
  }, [brouillons, derniereArrivee])

  useTouches({
    F2: { libelle: t.modes.arrivee, action: () => changerMode('arrivee') },
    F3: { libelle: t.modes.dechargement, action: () => changerMode('dechargement') },
    F4: { libelle: t.modes.tare, action: () => changerMode('tare') },
    F5: { libelle: t.modes.directe, action: () => changerMode('directe') },
    F10: { libelle: t.reessayerImpression, action: () => document.getElementById('rec-reessayer')?.click(), inactif: resultat === null },
  })

  // Échap : vide le mode en cours (un dialogue ouvert, comme le nouvel apporteur, l'intercepte avant).
  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      e.preventDefault()
      definirMessage(null)
      changerMode(mode)
    }
    window.addEventListener('keydown', clavier)
    return () => window.removeEventListener('keydown', clavier)
  }, [changerMode, mode])

  const receptions = file.donnees ?? []
  const choisirDansFile = (r: ResumeReception, suivant: Mode) => {
    definirMessage(null)
    if (suivant === mode) {
      definirSelection(r.id)
      definirResultat(null)
    } else {
      changerMode(suivant, r.id)
    }
  }

  return (
    <section className="pont-ecran" aria-label={t.titre}>
      <EnTeteEcran
        titre={t.titre}
        sousTitre={t.sousTitre.replace('{ouvertes}', String(receptions.length))}
        message={message}
        principal={{ etiquette: principal.etiquette, formulaire: principal.formulaire, enCours: principal.enCours }}
      />
      <div className="mes-page pont">
        <div className="mes-pile">
          {file.erreur !== null && <Note ton="erreur">{file.erreur}</Note>}
          <FileAttente receptions={file.donnees} selection={selection} surChoisir={choisirDansFile} />
        </div>
        <div className="pont-travail">
          <div className="pont-modes" role="group" aria-label={libelles.coquille.touches}>
            {ORDRE_MODES.map((m) => (
              <button key={m} type="button" className="pont-mode" aria-pressed={mode === m} onClick={() => changerMode(m)}>
                <span className="pont-mode-touche" aria-hidden="true">{TOUCHE_MODE[m]}</span>
                <Icone nom={ICONE_MODE[m]} />
                {t.modes[m]}
              </button>
            ))}
          </div>
          <div className="pont-travail" key={`${mode}-${generation}`}>
            {mode === 'arrivee' && <ModeArrivee surPrincipal={surPrincipal} surReussite={surReussite} surArrivee={definirDerniereArrivee} />}
            {mode === 'dechargement' && (
              <ModeDechargement receptions={receptions} selection={selection} surChoisir={definirSelection} surPrincipal={surPrincipal} surReussite={surReussite} />
            )}
            {mode === 'directe' && <ModeDirecte surPrincipal={surPrincipal} surReussite={surReussite} resultat={resultat} surResultat={definirResultat} />}
            {mode === 'tare' && (
              <ModeTare
                receptions={receptions}
                selection={selection}
                surChoisir={definirSelection}
                surPrincipal={surPrincipal}
                surReussite={surReussite}
                resultat={resultat}
                surResultat={definirResultat}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
