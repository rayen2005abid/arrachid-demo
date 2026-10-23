// Déchargement (CONTEXTE §7.1 pt 2, §7.6) : réception → numéros de bacs (tapés ou cliqués dans la
// grille) → Confirmer le déchargement. Le serveur refuse un bac qui contient déjà des olives.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { CHEMIN_GRILLE, type Bac } from '../bacs/logique'
import { ChampChoix } from '../composants/Champ'
import { Chiffres } from '../composants/Chiffres'
import { Icone } from '../composants/Icone'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { grouperMilliers } from '../format/saisie'
import { libelles } from '../libelles'
import { surEntree } from './clavier'
import { ChampPont, FORMULAIRE_PRINCIPAL, type Principal } from './champs'
import { ChoixRegime } from './composants'
import { ZoneBacs } from './ZoneBacs'
import { corpsDechargement, corpsPartage, heureLocale, type DetailReception, type ModePartage, type Regime, type ResumeReception } from './logique'

const t = libelles.reception

interface Props {
  receptions: readonly ResumeReception[]
  selection: number | null
  surChoisir: (id: number | null) => void
  surPrincipal: (principal: Principal) => void
  surReussite: (message: string) => void
}

export function ModeDechargement({ receptions, selection, surChoisir, surPrincipal, surReussite }: Props) {
  const aDecharger = receptions.filter((r) => r.statut === 'pesee_brut')
  const choisie = aDecharger.find((r) => r.id === selection) ?? null
  const [bacs, definirBacs] = useState('')
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const soumission = useSoumission()
  const grille = useLecture<Bac[]>(CHEMIN_GRILLE, 5000)
  const champBacs = useRef<HTMLInputElement>(null)
  const champReception = useRef<HTMLSelectElement>(null)

  useEffect(() => surPrincipal({ formulaire: FORMULAIRE_PRINCIPAL, etiquette: t.confirmerDechargement, enCours: soumission.enCours }), [soumission.enCours, surPrincipal])
  // Une réception choisie dans la file : on passe directement aux bacs.
  useEffect(() => {
    if (choisie !== null) champBacs.current?.focus()
    else champReception.current?.focus()
  }, [choisie?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const changerBacs = (valeur: string) => {
    definirBacs(valeur)
    definirErreurLocale(null)
    soumission.reinitialiser()
  }

  const valider = async (e: FormEvent) => {
    e.preventDefault()
    if (soumission.enCours) return
    if (choisie === null) {
      definirErreurLocale(t.erreurs.reception)
      return
    }
    const r = corpsDechargement(bacs)
    definirErreurLocale(r.erreur)
    if (r.corps === null) return
    const reponse = await soumission.soumettre<{ reception: DetailReception }>(`/api/receptions/${choisie.id}/dechargement`, r.corps)
    if (reponse === null) return
    surReussite(t.dechargementConfirme.replace('{numero}', String(reponse.reception.numero)).replace('{bacs}', reponse.reception.bacs.join(', ')))
    flushSync(() => definirBacs(''))
    soumission.reinitialiser()
    surChoisir(null)
    void grille.recharger()
  }

  const erreur = erreurLocale ?? soumission.erreur
  return (
    <div className="pont-travail">
      <form id={FORMULAIRE_PRINCIPAL} aria-label={t.modes.dechargement} onSubmit={(e) => void valider(e)} onKeyDown={surEntree}>
        <Panneau titre={t.modes.dechargement} icone="grid-3x3">
          <ChampChoix
            id="rec-a-decharger"
            libelle={t.receptionADecharger}
            data-champ
            ref={champReception}
            valeur={choisie === null ? '' : String(choisie.id)}
            choixVide={aDecharger.length === 0 ? t.aucuneADecharger : '—'}
            options={aDecharger.map((r) => ({
              valeur: String(r.id),
              libelle: `${r.numero} · ${r.apporteur.nom} · ${r.immatriculation ?? '—'} · ${grouperMilliers(r.poids_brut_kg ?? 0)} kg`,
            }))}
            surChangement={(v) => surChoisir(v === '' ? null : Number(v))}
          />
          {choisie !== null ? (
            <Chiffres
              valeurs={[
                { etiquette: t.brut, valeur: grouperMilliers(choisie.poids_brut_kg ?? 0), unite: t.kg },
                { etiquette: t.regime, valeur: t.regimes[choisie.regime], texte: true },
                { etiquette: t.arrivee, valeur: heureLocale(choisie.cree_le) },
              ]}
            />
          ) : (
            aDecharger.length > 0 && <Note>{t.choisirADecharger}</Note>
          )}
          <ChampPont id="rec-bacs" libelle={t.bacs} aide={t.bacsAide} valeur={bacs} surChangement={changerBacs} refChamp={champBacs} chiffres />
          {erreur !== null && <Note ton="erreur">{erreur}</Note>}
        </Panneau>
      </form>

      {choisie !== null && <ChangementRegime key={choisie.id} reception={choisie} surReussite={surReussite} />}

      <ZoneBacs grille={grille} texte={bacs} surChanger={changerBacs} />
    </div>
  )
}

/** Changement de régime tant que les olives ne sont pas déversées (CONTEXTE §7.1). */
function ChangementRegime({ reception, surReussite }: { reception: ResumeReception; surReussite: (message: string) => void }) {
  const [ouvert, definirOuvert] = useState(false)
  const [regime, definirRegime] = useState<Regime | null>(reception.regime)
  const [mode, definirMode] = useState<ModePartage>('huile_kg')
  const [valeur, definirValeur] = useState('')
  const [erreur, definirErreur] = useState<string | null>(null)
  const s = useSoumission()
  if (!reception.actions_possibles.includes('changer_regime')) return null

  const enregistrer = async () => {
    const r = corpsPartage(regime, mode, valeur)
    definirErreur(r.erreur)
    if (r.corps === null) return
    const reponse = await s.soumettre<{ reception: DetailReception }>(`/api/receptions/${reception.id}/regime`, r.corps)
    if (reponse === null) return
    surReussite(t.regimeChange.replace('{regime}', t.regimes[reponse.reception.regime]))
    definirOuvert(false)
    s.reinitialiser()
  }

  if (!ouvert) {
    return (
      <div>
        <button type="button" className="bouton-secondaire bouton-petit" onClick={() => definirOuvert(true)}>
          <Icone nom="percent" />
          {t.changerRegime}
        </button>
      </div>
    )
  }
  const message = erreur ?? s.erreur
  return (
    <Panneau titre={t.changerRegime} icone="percent">
      <ChoixRegime valeur={regime} surChoisir={(r) => { definirRegime(r); s.reinitialiser() }} />
      {regime === 'mixte' && (
        <div className="pont-grille">
          <ChampChoix
            id="rec-regime-mode"
            libelle={t.modePartage}
            valeur={mode}
            options={[{ valeur: 'huile_kg', libelle: t.huileKg }, { valeur: 'pourcentage', libelle: t.pourcentage }]}
            surChangement={(v) => definirMode(v === 'pourcentage' ? 'pourcentage' : 'huile_kg')}
          />
          <ChampPont id="rec-regime-valeur" libelle={mode === 'huile_kg' ? t.valeurHuile : t.valeurPourcentage} valeur={valeur} surChangement={definirValeur} inputMode="decimal" horsOrdre chiffres />
        </div>
      )}
      {message !== null && <Note ton="erreur">{message}</Note>}
      <div className="pont-ligne">
        <button type="button" className="bouton-secondaire" disabled={s.enCours} onClick={() => void enregistrer()}>{t.enregistrerRegime}</button>
        <button type="button" className="bouton-secondaire" onClick={() => definirOuvert(false)}>{libelles.commun.annuler}</button>
      </div>
    </Panneau>
  )
}
