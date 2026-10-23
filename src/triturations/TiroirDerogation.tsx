// Dérogation à la tolérance d'acidité pour UN contenant (CONTEXTE §17.2 ; PROMPT T4.5), dans un tiroir ouvert depuis la
// cuve refusée : ses chiffres (contenant, huile, cuve, écart, après), la raison et le PIN du responsable. La qualité,
// la capacité et la moyenne dans la qualité restent contrôlées par le serveur : seule la tolérance se lève.
import { useState } from 'react'
import { Champ } from '../composants/Champ'
import { Chiffres, type Chiffre } from '../composants/Chiffres'
import { Note } from '../composants/Note'
import { Tiroir } from '../composants/Tiroir'
import { ValidationPin } from '../composants/ValidationPin'
import { afficherAciditePortee } from '../cuves/logique'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { afficherAciditeOuRien, afficherAciditePassage, afficherKg, type AciditePassage, type CuveEcartee } from './pesees'

const t = libelles.pesees

interface Props {
  cuve: CuveEcartee
  poidsG: number
  acidite: AciditePassage
  /** Écart d'acidité toléré, déjà mis en forme (« 0,10 »). */
  max: string
  /** Le serveur a jugé la cuve pour ce poids : son acidité « après » vaut pour ce contenant. */
  apresAJour: boolean
  enCours: boolean
  erreur: unknown
  surValider: (motif: string, validation: Validation) => void
  surFermer: () => void
}

export function TiroirDerogation({ cuve, poidsG, acidite, max, apresAJour, enCours, erreur, surValider, surFermer }: Props) {
  const [motif, definirMotif] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [invalide, definirInvalide] = useState(false)
  const titre = t.titreDerogation.replace('{code}', cuve.code)
  const ecart = afficherAciditeOuRien(cuve.ecart_acidite)
  const apres = apresAJour ? afficherAciditeOuRien(cuve.acidite_apres) : null
  const aciditeCuve = afficherAciditePortee(cuve)

  const chiffres: Chiffre[] = [
    { etiquette: t.derogationChiffres.contenant, valeur: afficherKg(poidsG), unite: 'kg', ton: 'fort' },
    { etiquette: t.derogationChiffres.huile, valeur: afficherAciditePassage(acidite), unite: '%' },
    { etiquette: t.derogationChiffres.cuve.replace('{code}', cuve.code), valeur: aciditeCuve, unite: aciditeCuve === '—' ? undefined : '%' },
    ...(ecart === null ? [] : [{ etiquette: t.derogationChiffres.ecart.replace('{max}', max), valeur: ecart, ton: 'mauvais' as const }]),
    ...(apres === null ? [] : [{ etiquette: t.derogationChiffres.apres, valeur: apres, unite: '%' }]),
  ]

  const valider = () => {
    const raison = motif.trim()
    if (raison === '' || validation === null) {
      definirInvalide(true)
      return
    }
    surValider(raison, validation)
  }

  return (
    <Tiroir
      titre={titre}
      icone="triangle-alert"
      etiquette={t.enregistrerDerogation}
      surValider={valider}
      surFermer={surFermer}
      enCours={enCours}
      erreur={erreur}
      nomFormulaire={titre}
      consequence={t.derogationConsequence.replace('{poids}', afficherKg(poidsG)).replace('{code}', cuve.code)}
    >
      <Chiffres valeurs={chiffres} />
      <Note ton="alerte">{t.aideDerogation}</Note>
      <Champ
        id="motif-derogation"
        libelle={t.motif}
        valeur={motif}
        surChangement={(valeur) => { definirMotif(valeur); definirInvalide(false) }}
        erreur={invalide && motif.trim() === '' ? t.motifObligatoire : undefined}
      />
      <ValidationPin surValidation={definirValidation} />
      {invalide && validation === null && <p className="mes-champ-erreur">{t.pinObligatoire}</p>}
    </Tiroir>
  )
}
