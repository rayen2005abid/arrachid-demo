// Nouvelle arrivée (CONTEXTE §7.1 pt 1, PROMPT §6.20.4) : apporteur → CIN présenté → plaque →
// régime → poids brut → Enregistrer l'arrivée. Rien n'est imprimé.
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { useSoumission } from '../api/useSoumission'
import { creerSuiviCommande } from '../api/soumission'
import { ChampChoix } from '../composants/Champ'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { useBrouillon } from '../contextes/useBrouillon'
import { grouperMilliers } from '../format/saisie'
import { libelles } from '../libelles'
import { ChampApporteur } from './ChampApporteur'
import { surEntree } from './clavier'
import { ChampPont, FORMULAIRE_PRINCIPAL, type Principal } from './champs'
import { Afficheur, ChoixRegime } from './composants'
import { ARRIVEE_VIDE, corpsArrivee, type ApporteurTrouve, type DetailReception, type SaisieArrivee } from './logique'
import { NouvelApporteur } from './NouvelApporteur'

const t = libelles.reception

interface Props {
  surPrincipal: (principal: Principal) => void
  surReussite: (message: string) => void
  /** Remorque qui vient d'être pesée : proposée d'office au déchargement (F3). */
  surArrivee: (receptionId: number) => void
}

export function ModeArrivee({ surPrincipal, surReussite, surArrivee }: Props) {
  const [s, definirS] = useBrouillon<SaisieArrivee>('reception.arrivee', ARRIVEE_VIDE)
  const [recherche, definirRecherche] = useBrouillon('reception.recherche', '')
  const suiviInitial = useMemo(creerSuiviCommande, [])
  const [suivi] = useBrouillon('reception.commande', suiviInitial)
  const [enregistrement, definirEnregistrement] = useBrouillon('reception.enCours', false)
  const [nouvel, definirNouvel] = useState(false)
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const soumission = useSoumission(suivi)
  const champRecherche = useRef<HTMLInputElement>(null)
  const champCin = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!nouvel) surPrincipal({ formulaire: FORMULAIRE_PRINCIPAL, etiquette: t.enregistrerArrivee, enCours: soumission.enCours || enregistrement })
  }, [nouvel, soumission.enCours, enregistrement, surPrincipal])

  const changer = <K extends keyof SaisieArrivee>(cle: K, valeur: SaisieArrivee[K]) => {
    definirS((avant) => ({ ...avant, [cle]: valeur }))
    definirErreurLocale(null)
    soumission.reinitialiser()
  }

  const choisir = (apporteur: ApporteurTrouve) => {
    flushSync(() => {
      changer('apporteur', apporteur)
      definirNouvel(false)
    })
    champCin.current?.focus()
  }

  const effacerApporteur = () => {
    flushSync(() => changer('apporteur', null))
    champRecherche.current?.focus()
  }

  const valider = async (e: FormEvent) => {
    e.preventDefault()
    if (soumission.enCours || enregistrement) return
    const r = corpsArrivee(s)
    definirErreurLocale(r.erreur)
    if (r.corps === null) return
    definirEnregistrement(true)
    try {
      const reponse = await soumission.soumettre<{ reception: DetailReception }>('/api/receptions', r.corps)
      if (reponse === null) return
      const rec = reponse.reception
      surArrivee(rec.id)
      surReussite(t.arriveeEnregistree.replace('{numero}', String(rec.numero)).replace('{nom}', rec.apporteur.nom).replace('{brut}', grouperMilliers(rec.poids_brut_kg ?? 0)))
      flushSync(() => {
        definirS(ARRIVEE_VIDE)
        definirRecherche('')
      })
      soumission.reinitialiser()
      champRecherche.current?.focus()
    } finally {
      definirEnregistrement(false)
    }
  }

  const erreur = erreurLocale ?? soumission.erreur
  const erreurPoids = erreur !== null && (erreurLocale === t.erreurs.poids || soumission.champ?.startsWith('poids')) ? erreur : undefined
  return (
    <div className="pont-travail">
      {nouvel && (
        <NouvelApporteur
          nomPropose={recherche}
          surCree={choisir}
          surAnnuler={() => { definirNouvel(false); setTimeout(() => champRecherche.current?.focus()) }}
          surPrincipal={surPrincipal}
        />
      )}
      <form id={FORMULAIRE_PRINCIPAL} className="pont-formulaire" aria-label={t.modes.arrivee} onSubmit={(e) => void valider(e)} onKeyDown={surEntree}>
        <Panneau titre={t.titreArrivee} icone="scale">
          <div className="pont-grille">
            <div className="pont-plein mes-pile">
              <ChampApporteur
                id="rec-recherche"
                apporteur={s.apporteur}
                recherche={recherche}
                surRecherche={definirRecherche}
                surChoisir={choisir}
                surChanger={effacerApporteur}
                nouvel={nouvel}
                surNouvel={() => definirNouvel(true)}
                refRecherche={champRecherche}
              />
            </div>
            <div className="mes-pile">
              <ChampPont
                id="rec-cin"
                libelle={t.cinPresentee}
                valeur={s.cinPresentee}
                surChangement={(v) => changer('cinPresentee', v)}
                aide={!s.cinChauffeur && s.apporteur !== null ? t.cinApporteurAide.replace('{cin}', s.apporteur.cin_masquee ?? '—') : undefined}
                refChamp={champCin}
                inputMode="numeric"
                chiffres
              />
              <label className="mes-case">
                <input type="checkbox" checked={s.cinChauffeur} onChange={(e) => changer('cinChauffeur', e.target.checked)} />
                {t.cinChauffeur}
              </label>
            </div>
            <ChampPont id="rec-plaque" libelle={t.plaque} valeur={s.immatriculation} surChangement={(v) => changer('immatriculation', v)} chiffres />
            <div className="pont-plein">
              <ChoixRegime valeur={s.regime} surChoisir={(r) => changer('regime', r)} />
            </div>
            {s.regime === 'mixte' && (
              <>
                <ChampChoix
                  id="rec-mode-partage"
                  libelle={t.modePartage}
                  data-champ
                  valeur={s.modePartage}
                  options={[{ valeur: 'huile_kg', libelle: t.huileKg }, { valeur: 'pourcentage', libelle: t.pourcentage }]}
                  surChangement={(v) => changer('modePartage', v === 'pourcentage' ? 'pourcentage' : 'huile_kg')}
                />
                <ChampPont
                  id="rec-valeur-partage"
                  libelle={s.modePartage === 'huile_kg' ? t.valeurHuile : t.valeurPourcentage}
                  valeur={s.valeurPartage}
                  surChangement={(v) => changer('valeurPartage', v)}
                  inputMode="decimal"
                  chiffres
                />
              </>
            )}
          </div>
        </Panneau>
        <Afficheur id="rec-brut" libelle={t.brut} nomAccessible={t.poidsBrut} valeur={s.brut} surChangement={(v) => changer('brut', v)} erreur={erreurPoids} />
        {erreur !== null && erreurPoids === undefined && <Note ton="erreur">{erreur}</Note>}
      </form>
    </div>
  )
}
