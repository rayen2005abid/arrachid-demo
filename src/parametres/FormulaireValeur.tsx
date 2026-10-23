import { useState } from 'react'
import { useSoumission } from '../api/useSoumission'
import { Tiroir } from '../composants/Tiroir'
import { ValidationPin } from '../composants/ValidationPin'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import {
  corpsValeur,
  modeParDefaut,
  modesDebut,
  valeurInitiale,
  verifierValeur,
  type ListeParametres,
  type ModeDebut,
  type Parametre,
} from './logique'

const l = libelles.parametres

interface Props {
  parametre: Parametre
  liste: ListeParametres
  surEnregistree: () => void
  surAnnulation: () => void
}

function SaisieValeur({ parametre, valeur, surChangement }: { parametre: Parametre; valeur: string; surChangement: (v: string) => void }) {
  const id = `valeur-${parametre.cle}`
  const commun = { id, value: valeur, autoFocus: true, onChange: (e: { target: { value: string } }) => surChangement(e.target.value) }
  return (
    <div className="mes-champ">
      <label htmlFor={id} className="mes-etiquette">{l.valeur} ({l.types[parametre.type_valeur]})</label>
      {parametre.type_valeur === 'booleen' ? (
        <select {...commun} className="mes-saisie">
          <option value="" />
          <option value="1">{l.oui}</option>
          <option value="0">{l.non}</option>
        </select>
      ) : parametre.type_valeur === 'entier' ? (
        <input {...commun} className="mes-saisie mes-saisie-chiffres" inputMode="numeric" autoComplete="off" />
      ) : (
        <textarea {...commun} className="mes-saisie mes-saisie-texte" rows={parametre.type_valeur === 'json' ? 4 : 3} spellCheck={false} />
      )}
    </div>
  )
}

/** Nouvelle version d'un paramètre : valeur, début, raison et PIN frais du propriétaire. */
export function FormulaireValeur({ parametre, liste, surEnregistree, surAnnulation }: Props) {
  const soumission = useSoumission()
  const [valeur, definirValeur] = useState(() => valeurInitiale(parametre))
  const [mode, definirMode] = useState<ModeDebut>(() => modeParDefaut(parametre, liste))
  const [motif, definirMotif] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [erreur, definirErreur] = useState<string | null>(null)
  const modes = modesDebut(parametre, liste)

  const modifier = <T,>(definir: (v: T) => void) => (v: T) => {
    definir(v)
    definirErreur(null)
    if (soumission.erreur !== null) soumission.reinitialiser()
  }

  const enregistrer = async () => {
    const probleme =
      verifierValeur(parametre.type_valeur, valeur) ??
      (motif.trim() === '' ? l.erreurs.motifObligatoire : null) ??
      (validation === null ? l.erreurs.validationRequise : null)
    definirErreur(probleme)
    if (probleme !== null || soumission.enCours) return
    const chemin = `/api/parametres/${encodeURIComponent(parametre.cle)}/valeurs`
    const reponse = await soumission.soumettre(chemin, corpsValeur(valeur, mode, liste, motif, validation))
    if (reponse !== null) surEnregistree()
  }

  return (
    <Tiroir titre={l.nouvelleValeur} etiquette={l.enregistrer} enCours={soumission.enCours}
      erreur={erreur ?? soumission.erreur} surValider={() => void enregistrer()} surFermer={surAnnulation}>
      <SaisieValeur parametre={parametre} valeur={valeur} surChangement={modifier(definirValeur)} />
      {parametre.suggestion !== null && valeur !== parametre.suggestion && (
        <button type="button" className="bouton-lien" onClick={() => modifier(definirValeur)(parametre.suggestion ?? '')}>
          {l.reprendreSuggestion} ({parametre.suggestion})
        </button>
      )}
      <fieldset className="mes-groupe">
        <legend className="mes-etiquette">{l.debut}</legend>
        {modes.map((m) => (
          <label key={m} className="mes-case">
            <input type="radio" name={`debut-${parametre.cle}`} checked={mode === m} onChange={() => modifier(definirMode)(m)} />
            {m === 'maintenant' ? l.debutMaintenant : l.debutOuverture}
          </label>
        ))}
      </fieldset>
      <div className="mes-champ">
        <label htmlFor={`motif-${parametre.cle}`} className="mes-etiquette">{l.motif}</label>
        <input id={`motif-${parametre.cle}`} className="mes-saisie" value={motif} autoComplete="off" onChange={(e) => modifier(definirMotif)(e.target.value)} />
      </div>
      <ValidationPin seulProprietaire surValidation={modifier(definirValidation)} />
    </Tiroir>
  )
}
