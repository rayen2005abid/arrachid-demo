// Pesée directe (JOURNAL_DECISIONS E-38) : un petit lot, souvent des sacs sans remorque, pesé une seule fois sur la
// balance à plateforme. Apporteur → CIN présenté → régime → bacs → poids → Enregistrer et imprimer le ticket. Ce poids
// est le net : le serveur crée la réception, les bacs, le lot, le ticket et le SMS en une commande.
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { creerSuiviCommande } from '../api/soumission'
import { CHEMIN_GRILLE, type Bac } from '../bacs/logique'
import { ChampChoix } from '../composants/Champ'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { useBrouillon } from '../contextes/useBrouillon'
import { libelles } from '../libelles'
import { ChampApporteur } from './ChampApporteur'
import { surEntree } from './clavier'
import { ChampPont, FORMULAIRE_PRINCIPAL, type Principal } from './champs'
import { Afficheur, ChoixRegime } from './composants'
import { corpsDirecte, DIRECTE_VIDE, type ApporteurTrouve, type SaisieDirecte } from './logique'
import { ResultatTicket, type ResultatTare } from './ModeTare'
import { NouvelApporteur } from './NouvelApporteur'
import { ZoneBacs } from './ZoneBacs'

const t = libelles.reception

interface Props {
  surPrincipal: (principal: Principal) => void
  surReussite: (message: string) => void
  resultat: ResultatTare | null
  surResultat: (resultat: ResultatTare | null) => void
}

export function ModeDirecte({ surPrincipal, surReussite, resultat, surResultat }: Props) {
  const [s, definirS] = useBrouillon<SaisieDirecte>('reception.directe', DIRECTE_VIDE)
  const [recherche, definirRecherche] = useBrouillon('reception.directe.recherche', '')
  const suiviInitial = useMemo(creerSuiviCommande, [])
  const [suivi] = useBrouillon('reception.directe.commande', suiviInitial)
  const [enregistrement, definirEnregistrement] = useBrouillon('reception.directe.enCours', false)
  const [nouvel, definirNouvel] = useState(false)
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const soumission = useSoumission(suivi)
  const grille = useLecture<Bac[]>(CHEMIN_GRILLE, 5000)
  const champRecherche = useRef<HTMLInputElement>(null)
  const champCin = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!nouvel && resultat === null) {
      surPrincipal({ formulaire: FORMULAIRE_PRINCIPAL, etiquette: t.enregistrerDirecte, enCours: soumission.enCours || enregistrement })
    }
  }, [nouvel, resultat, soumission.enCours, enregistrement, surPrincipal])

  const changer = <K extends keyof SaisieDirecte>(cle: K, valeur: SaisieDirecte[K]) => {
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
    const r = corpsDirecte(s)
    definirErreurLocale(r.erreur)
    if (r.corps === null) return
    definirEnregistrement(true)
    try {
      const reponse = await soumission.soumettre<ResultatTare>('/api/receptions/pesee-directe', r.corps)
      if (reponse === null) return
      flushSync(() => {
        definirS(DIRECTE_VIDE)
        definirRecherche('')
      })
      soumission.reinitialiser()
      void grille.recharger()
      surResultat(reponse)
      surReussite(t.ticket.replace('{numero}', String(reponse.reception.ticket?.numero ?? '')))
    } finally {
      definirEnregistrement(false)
    }
  }

  if (resultat !== null) {
    return (
      <ResultatTicket
        resultat={resultat}
        mode="directe"
        surPrincipal={surPrincipal}
        surSuivante={() => { surResultat(null); setTimeout(() => champRecherche.current?.focus()) }}
        surImpression={(impression) => surResultat({ ...resultat, impression })}
      />
    )
  }

  const erreur = erreurLocale ?? soumission.erreur
  const erreurPoids = erreur !== null && (erreurLocale === t.erreurs.poids || soumission.champ?.startsWith('poids')) ? erreur : undefined
  const erreurBacs = erreur !== null && (erreurLocale === t.erreurs.bacs || soumission.champ === 'bacs') ? erreur : undefined
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
      <form id={FORMULAIRE_PRINCIPAL} className="pont-formulaire" aria-label={t.modes.directe} onSubmit={(e) => void valider(e)} onKeyDown={surEntree}>
        <Panneau titre={t.titreDirecte} icone="weight">
          <Note>{t.directeAide}</Note>
          <div className="pont-grille">
            <div className="pont-plein mes-pile">
              <ChampApporteur
                id="rec-directe-recherche"
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
                id="rec-directe-cin"
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
            <ChampPont id="rec-directe-bacs" libelle={t.bacs} aide={t.bacsAide} valeur={s.bacs} surChangement={(v) => changer('bacs', v)} erreur={erreurBacs} chiffres />
            <div className="pont-plein">
              <ChoixRegime valeur={s.regime} surChoisir={(r) => changer('regime', r)} />
            </div>
            {s.regime === 'mixte' && (
              <>
                <ChampChoix
                  id="rec-directe-mode-partage"
                  libelle={t.modePartage}
                  data-champ
                  valeur={s.modePartage}
                  options={[{ valeur: 'huile_kg', libelle: t.huileKg }, { valeur: 'pourcentage', libelle: t.pourcentage }]}
                  surChangement={(v) => changer('modePartage', v === 'pourcentage' ? 'pourcentage' : 'huile_kg')}
                />
                <ChampPont
                  id="rec-directe-valeur-partage"
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
        <Afficheur
          id="rec-directe-poids"
          titre={t.afficheurBalance}
          toujoursManuel
          libelle={t.poidsAfficheur}
          nomAccessible={t.poidsDirecte}
          valeur={s.poids}
          surChangement={(v) => changer('poids', v)}
          erreur={erreurPoids}
        />
        {erreur !== null && erreurPoids === undefined && erreurBacs === undefined && <Note ton="erreur">{erreur}</Note>}
      </form>
      <ZoneBacs grille={grille} texte={s.bacs} surChanger={(v) => changer('bacs', v)} />
    </div>
  )
}
