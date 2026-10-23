import { useState } from 'react'
import { useSoumission } from '../api/useSoumission'
import { Champ } from '../composants/Champ'
import { Note } from '../composants/Note'
import { Tiroir } from '../composants/Tiroir'
import { ValidationPin } from '../composants/ValidationPin'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { corpsCorrection, poidsCorrige, valeursInitiales, type Correction } from './huile'

const t = libelles.correctionsHuile

interface Props {
  correction: Correction
  /** Correction enregistrée : l'écran affiche le message et recharge ses données. */
  surSucces: (message: string) => void | Promise<void>
  surFermeture: () => void
}

/**
 * Tiroir d'une correction (T4.10) : poids corrigés, raison et PIN du responsable ; F8 l'enregistre, Échap le ferme.
 * Le formulaire porte le titre de la correction. À monter avec `key={correction.id}` : une autre ligne repart d'une
 * saisie neuve.
 */
export function CorrectionFait({ correction, surSucces, surFermeture }: Props) {
  const s = useSoumission()
  const [valeurs, definirValeurs] = useState(() => valeursInitiales(correction.champs))
  const [motif, definirMotif] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [invalide, definirInvalide] = useState(false)

  const enregistrer = async () => {
    if (s.enCours) return
    const corps = corpsCorrection(correction.champs, valeurs, motif)
    if (corps === null || validation === null) {
      definirInvalide(true)
      return
    }
    const reponse = await s.soumettre<unknown>(correction.chemin, { ...corps, validation })
    if (reponse !== null) await surSucces(correction.succes)
  }

  return (
    <Tiroir
      titre={correction.titre}
      nomFormulaire={correction.titre}
      icone="file-pen"
      etiquette={correction.etiquetteAction}
      surValider={() => void enregistrer()}
      surFermer={surFermeture}
      enCours={s.enCours}
      erreur={s.erreur}
    >
      {correction.aide !== undefined && <Note>{correction.aide}</Note>}
      {correction.champs.map((champ, rang) => (
        <Champ
          key={champ.cle}
          id={`correction-${champ.cle}`}
          libelle={champ.etiquette}
          valeur={valeurs[champ.cle] ?? ''}
          surChangement={(valeur) => { definirValeurs({ ...valeurs, [champ.cle]: valeur }); definirInvalide(false); s.reinitialiser() }}
          erreur={invalide && poidsCorrige(champ, valeurs[champ.cle] ?? '') === null ? t.poidsInvalide : undefined}
          inputMode="decimal"
          autoFocus={rang === 0}
          chiffres
        />
      ))}
      <Champ
        id="correction-motif"
        libelle={t.motif}
        valeur={motif}
        surChangement={(valeur) => { definirMotif(valeur); definirInvalide(false); s.reinitialiser() }}
        erreur={invalide && motif.trim() === '' ? t.motifObligatoire : undefined}
        autoFocus={correction.champs.length === 0}
      />
      <ValidationPin surValidation={definirValidation} />
      {invalide && validation === null && <p className="mes-champ-erreur">{t.pinObligatoire}</p>}
    </Tiroir>
  )
}
