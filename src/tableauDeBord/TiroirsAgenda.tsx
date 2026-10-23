// Tiroirs de l'agenda : ajouter un rendez-vous, ou voir et retirer celui qu'on a touché.
import { useState } from 'react'
import { Champ, ChampChoix } from '../composants/Champ'
import { Tiroir } from '../composants/Tiroir'
import { libelles } from '../libelles'
import { CATEGORIES, creerRendezVous, dateAvecJour, DUREES_MIN, type CategorieRdv, type RendezVous } from './logique'

const k = libelles.tableauDeBord.agenda

/** Fiche en lecture : une ligne par information. */
function Fiche({ lignes }: { lignes: readonly { libelle: string; valeur: string }[] }) {
  return (
    <dl className="tdb-fiche">
      {lignes.map((l) => (
        <div key={l.libelle}>
          <dt>{l.libelle}</dt>
          <dd>{l.valeur}</dd>
        </div>
      ))}
    </dl>
  )
}

interface PropsNouveau {
  jour: string
  debut: string
  surAjouter: (rdv: RendezVous) => void
  surFermer: () => void
}

/** Identifiant local d'un rendez-vous (pas de `crypto.randomUUID` : indisponible hors HTTPS sur le réseau du moulin). */
const nouvelId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function TiroirNouveauRdv({ jour, debut, surAjouter, surFermer }: PropsNouveau) {
  const [heure, definirHeure] = useState(debut)
  const [objet, definirObjet] = useState('')
  const [detail, definirDetail] = useState('')
  const [dureeMin, definirDuree] = useState('60')
  const [categorie, definirCategorie] = useState<CategorieRdv>('administration')
  const [erreur, definirErreur] = useState<string | null>(null)

  function valider() {
    const resultat = creerRendezVous({ jour, debut: heure, dureeMin: Number(dureeMin), objet, detail, categorie }, nouvelId())
    if ('erreur' in resultat) definirErreur(resultat.erreur)
    else surAjouter(resultat.rdv)
  }

  return (
    <Tiroir titre={k.nouveau} icone="calendar-plus" etiquette={k.ajouter} surValider={valider} surFermer={surFermer} erreur={erreur}>
      <Fiche lignes={[{ libelle: k.jour, valeur: dateAvecJour(jour) }]} />
      <Champ id="rdv-objet" libelle={k.objet} requis autoFocus placeholder={k.objetExemple} valeur={objet} surChangement={definirObjet} />
      <Champ id="rdv-detail" libelle={k.detail} placeholder={k.detailExemple} valeur={detail} surChangement={definirDetail} />
      <Champ id="rdv-heure" libelle={k.debut} chiffres placeholder="08:30" maxLength={5} valeur={heure} surChangement={definirHeure} />
      <ChampChoix id="rdv-duree" libelle={k.duree} valeur={dureeMin} surChangement={definirDuree} options={DUREES_MIN.map((d) => ({ valeur: String(d), libelle: k.durees[d] }))} />
      <ChampChoix id="rdv-categorie" libelle={k.categorie} valeur={categorie} surChangement={(v) => definirCategorie(v as CategorieRdv)} options={CATEGORIES.map((c) => ({ valeur: c, libelle: k.categories[c] }))} />
    </Tiroir>
  )
}

interface PropsVoir {
  rdv: RendezVous
  surRetirer: () => void
  surFermer: () => void
}

export function TiroirVoirRdv({ rdv, surRetirer, surFermer }: PropsVoir) {
  return (
    <Tiroir titre={k.rendezVous} icone="calendar-clock" etiquette={k.fermer} surValider={surFermer} surFermer={surFermer}>
      <Fiche
        lignes={[
          { libelle: k.objet, valeur: rdv.objet },
          { libelle: k.jour, valeur: dateAvecJour(rdv.jour) },
          { libelle: k.debut, valeur: `${rdv.debut} – ${rdv.fin}` },
          { libelle: k.categorie, valeur: k.categories[rdv.categorie] },
          ...(rdv.detail === '' ? [] : [{ libelle: k.detail, valeur: rdv.detail }]),
        ]}
      />
      <p className="tdb-memo">{k.memo}</p>
      <button type="button" className="bouton-secondaire" onClick={surRetirer}>{k.retirer}</button>
    </Tiroir>
  )
}
