import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { AfficheErreur } from '../composants/AfficheErreur'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { ListeDetail } from '../composants/ListeDetail'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'
import { FormulaireValeur } from '../parametres/FormulaireValeur'
import { PlagesValidation } from '../parametres/PlagesValidation'
import type { ListeParametres, Parametre } from '../parametres/logique'

const l = libelles.parametres

function afficherValeur(parametre: Parametre, valeur: string): string {
  if (parametre.type_valeur === 'booleen') return valeur === '1' ? l.oui : l.non
  return valeur
}

function Versions({ parametre }: { parametre: Parametre }) {
  if (parametre.versions.length === 0) return <p className="aide">{l.aucuneVersion}</p>
  return <details>
    <summary>{l.historique} ({parametre.versions.length})</summary>
    <ul className="versions">{parametre.versions.map((v) => <li key={v.id}>
      <code>{afficherValeur(parametre, v.valeur)}</code> — {l.du} {formaterHorodatage(v.valide_du)}
      {v.valide_au !== null && ` ${l.au} ${formaterHorodatage(v.valide_au)}`} — {l.par} {v.auteur.nom} : {v.motif}
    </li>)}</ul>
  </details>
}

/** Paramètres du propriétaire : manquants d'abord, puis valeur et versions de la ligne choisie. */
export function PageParametres() {
  const { donnees, erreur, recharger } = useLecture<ListeParametres>('/api/parametres')
  const [selection, definirSelection] = useState<string | null>(null)
  const [ouvert, definirOuvert] = useState(false)
  const [enregistrees, definirEnregistrees] = useState(0)
  const parametres = donnees === null ? null : [...donnees.parametres].sort((a, b) => Number(a.valeur_actuelle !== null) - Number(b.valeur_actuelle !== null))
  const choisi = parametres?.find((p) => p.cle === selection) ?? parametres?.[0] ?? null

  const apresEnregistrement = async () => {
    definirOuvert(false)
    await recharger()
    definirEnregistrees((n) => n + 1)
  }

  const colonnes: Colonne<Parametre>[] = [
    { cle: 'libelle', titre: l.titre, rendu: (p) => p.libelle },
    { cle: 'valeur', titre: l.valeurActuelle, rendu: (p) => p.valeur_actuelle === null ? <Pastille ton="alerte">{l.aucuneValeur}</Pastille> : afficherValeur(p, p.valeur_actuelle.valeur) },
  ]

  return <section>
    <EnTeteEcran titre={l.titre} />
    <div className="mes-page">
      <p className="aide">{l.aide}</p>
      <AfficheErreur erreur={erreur} />
      {enregistrees > 0 && <p role="status" className="message-ok">{l.enregistree}</p>}
      <ListeDetail liste={<Panneau titre={l.titre} compte={parametres?.length} serre>
        <TableauDonnees legende={l.titre} colonnes={colonnes} lignes={parametres} cleLigne={(p) => p.cle}
          vide={l.aucunParametre} erreur={erreur} surChoisir={(p) => definirSelection(p.cle)} choisie={choisi?.cle} />
      </Panneau>} detail={choisi === null ? <Panneau titre={l.titre}><EtatVide message={libelles.commun.chargement} /></Panneau> :
        <article className={choisi.valeur_actuelle === null ? 'carte-parametre parametre-manquant' : 'carte-parametre'} aria-label={choisi.libelle}>
          <h2>{choisi.libelle}</h2>
          <p className="aide"><code>{choisi.cle}</code></p>
          <p>{l.valeurActuelle} : <strong>{choisi.valeur_actuelle ? afficherValeur(choisi, choisi.valeur_actuelle.valeur) : l.aucuneValeur}</strong></p>
          {choisi.suggestion !== null && <p className="aide">{l.suggestion} : <code>{choisi.suggestion}</code>{choisi.source_suggestion && ` (${choisi.source_suggestion})`}</p>}
          <Versions parametre={choisi} />
          <button type="button" className="bouton-secondaire" onClick={() => definirOuvert(true)}>{l.nouvelleValeur}</button>
          {ouvert && donnees !== null && <FormulaireValeur key={choisi.cle} parametre={choisi} liste={donnees}
            surEnregistree={() => void apresEnregistrement()} surAnnulation={() => definirOuvert(false)} />}
        </article>} />
      <PlagesValidation />
    </div>
  </section>
}
