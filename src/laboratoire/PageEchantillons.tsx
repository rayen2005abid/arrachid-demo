import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { Panneau } from '../composants/Panneau'
import { Pastille, type TonPastille } from '../composants/Pastille'
import { Puces } from '../composants/Puces'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { Tiroir } from '../composants/Tiroir'
import { formaterDate, formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'
import {
  cheminDestruction,
  cheminRegistre,
  compterEchantillons,
  etatEchantillon,
  filtrerEchantillons,
  lireDetruits,
  peutDetruire,
  type Echantillon,
  type EtatEchantillon,
  type FiltreEchantillons,
} from './logique'
import '../styles/laboratoire.css'

const t = libelles.labo
const PERIODE_MS = 5000
const TONS: Record<EtatEchantillon, TonPastille> = { conserve: 'ok', a_detruire: 'alerte', detruit: 'neutre' }
const FILTRES: readonly FiltreEchantillons[] = ['actifs', 'a_detruire', 'detruits']

/**
 * Registre des échantillons d'olives (CONTEXTE §11.2) : conservation et destruction. « À détruire » est ce que le
 * serveur propose (fin de conservation atteinte) ; la destruction se confirme dans un tiroir.
 */
export function PageEchantillons() {
  const [filtre, definirFiltre] = useState<FiltreEchantillons>('actifs')
  const avecDetruits = lireDetruits(filtre)
  const registre = useLecture<Echantillon[]>(cheminRegistre(avecDetruits), PERIODE_MS)
  const s = useSoumission()
  const [aDetruire, definirADetruire] = useState<Echantillon | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)

  // Les nombres comptent la réponse reçue : ceux des détruits ne sont connus que si elle les contient. Pendant un
  // changement de filtre qui demande une autre lecture, le tableau attend la réponse.
  const echantillons = registre.donnees ?? []
  const nombres = compterEchantillons(echantillons, registre.cheminLu === cheminRegistre(true))
  const lignes = registre.donnees === null || registre.cheminLu !== cheminRegistre(avecDetruits) ? null : filtrerEchantillons(echantillons, filtre)

  const ouvrir = (echantillon: Echantillon | null) => {
    s.reinitialiser()
    definirADetruire(echantillon)
  }

  const detruire = async () => {
    if (aDetruire === null || s.enCours) return
    const reponse = await s.soumettre<{ echantillon: Echantillon }>(cheminDestruction(aDetruire.id), {})
    if (reponse === null) return
    definirMessage({ texte: t.detruit.replace('{reference}', reponse.echantillon.reference), type: 'ok' })
    ouvrir(null)
    await registre.recharger()
  }

  const colonnes: Colonne<Echantillon>[] = [
    { cle: 'reference', titre: t.colonnes.reference, rendu: (e) => <span className="labo-reference">{e.reference}</span> },
    { cle: 'reception', titre: t.colonnes.reception, rendu: (e) => <>{e.reception.numero} <span className="aide">{t.regimes[e.reception.regime]}</span></>, nombre: true },
    { cle: 'apporteur', titre: t.colonnes.apporteur, rendu: (e) => e.reception.apporteur },
    { cle: 'preleve', titre: t.colonnes.preleve, rendu: (e) => formaterHorodatage(e.preleve_le), nombre: true },
    { cle: 'par', titre: t.colonnes.par, rendu: (e) => e.preleve_par },
    { cle: 'emplacement', titre: t.colonnes.emplacement, rendu: (e) => e.emplacement },
    { cle: 'conservation', titre: t.colonnes.conservation, rendu: (e) => formaterDate(e.date_fin_conservation), nombre: true },
    {
      cle: 'etat',
      titre: t.colonnes.etat,
      rendu: (e) => {
        const etat = etatEchantillon(e)
        return (
          <div className="labo-etape">
            <Pastille ton={TONS[etat]}>{t.etats[etat]}</Pastille>
            <span className="aide">
              {e.detruit_le !== null && e.detruit_par !== null
                ? t.detruitLe.replace('{date}', formaterHorodatage(e.detruit_le)).replace('{nom}', e.detruit_par)
                : e.analyse_saisie ? t.analyseSaisie : t.analyseEnAttente}
            </span>
          </div>
        )
      },
    },
    {
      cle: 'action',
      titre: t.colonnes.actions,
      rendu: (e) =>
        peutDetruire(e) && (
          <button type="button" className="bouton-secondaire" onClick={() => ouvrir(e)}>{t.detruire}</button>
        ),
    },
  ]

  const resume = t.resumeEchantillons.replace('{aDetruire}', String(nombres.a_detruire)).replace('{conserves}', String(nombres.actifs - nombres.a_detruire))

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.echantillons} sousTitre={registre.donnees === null ? undefined : resume} message={message} />
      <div className="mes-page labo-page">
        <Puces
          libelle={t.filtres.nom}
          puces={FILTRES.map((valeur) => ({ valeur, libelle: t.filtres[valeur], nombre: nombres[valeur] }))}
          valeur={filtre}
          surChoisir={definirFiltre}
        />
        <Panneau titre={t.titreRegistre} icone="test-tube" compte={lignes?.length} serre>
          <TableauDonnees
            legende={t.titreRegistre}
            colonnes={colonnes}
            lignes={lignes}
            cleLigne={(e) => e.id}
            vide={filtre === 'actifs' ? t.aucunEchantillon : t.aucunPourFiltre}
            erreur={registre.erreur}
          />
        </Panneau>
      </div>

      {aDetruire !== null && (
        <Tiroir
          titre={t.titreDestruction.replace('{reference}', aDetruire.reference)}
          icone="test-tube"
          etiquette={t.confirmerDestruction}
          surValider={() => void detruire()}
          surFermer={() => ouvrir(null)}
          enCours={s.enCours}
          erreur={s.erreur}
          consequence={t.consequenceDestruction}
        >
          <p>
            {t.contenuDestruction
              .replace('{numero}', String(aDetruire.reception.numero))
              .replace('{apporteur}', aDetruire.reception.apporteur)
              .replace('{emplacement}', aDetruire.emplacement)}
          </p>
        </Tiroir>
      )}
    </section>
  )
}
