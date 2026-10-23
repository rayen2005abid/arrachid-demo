// Bacs (T2.3, BAC-01), refait en Session 4 sur prototype/arrachid-mes.html : filtres en puces, une carte par bac
// (libre ou occupé, comme le serveur le dit), libération confirmée dans un tiroir (CONTEXTE §7.6).
import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { Icone } from '../composants/Icone'
import { Note } from '../composants/Note'
import { Pastille } from '../composants/Pastille'
import { Puces } from '../composants/Puces'
import { Tiroir } from '../composants/Tiroir'
import { formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'
import { remplacer } from '../tickets/logique'
import { CHEMIN_GRILLE, cheminLiberation, compter, corpsLiberation, filtrer, peutLiberer, trierParNumero, type Bac, type FiltreBacs } from './logique'
import '../styles/pont.css'

const t = libelles.bacs
const PERIODE_MS = 5000

/** Grille des bacs (CONTEXTE §7.6) : libre ou occupé, et libération sur confirmation physique. */
export function PageBacs() {
  const grille = useLecture<Bac[]>(CHEMIN_GRILLE, PERIODE_MS)
  const s = useSoumission()
  const [aLiberer, definirALiberer] = useState<Bac | null>(null)
  const [filtre, definirFiltre] = useState<FiltreBacs>('tous')

  const ouvrir = (bac: Bac | null) => {
    s.reinitialiser()
    definirALiberer(bac)
  }

  const confirmer = async () => {
    if (aLiberer?.occupation == null) return
    const reponse = await s.soumettre<{ bac: Bac }>(cheminLiberation(aLiberer.occupation.bac_reception_id), corpsLiberation())
    if (reponse === null) return
    ouvrir(null)
    await grille.recharger()
  }

  const bacs = trierParNumero(grille.donnees ?? [])
  const nombres = compter(bacs)
  const affiches = filtrer(bacs, filtre)

  return (
    <section>
      <EnTeteEcran
        titre={libelles.ecrans.bacs}
        sousTitre={t.resume.replace('{libres}', String(nombres.libres)).replace('{occupes}', String(nombres.occupes))}
      />
      <div className="mes-page mes-pile">
        {grille.erreur !== null && <Note ton="erreur">{grille.erreur}</Note>}
        <Puces
          libelle={t.filtre}
          valeur={filtre}
          surChoisir={definirFiltre}
          puces={[
            { valeur: 'tous', libelle: t.filtres.tous, nombre: bacs.length },
            { valeur: 'libres', libelle: t.filtres.libres, nombre: nombres.libres },
            { valeur: 'occupes', libelle: t.filtres.occupes, nombre: nombres.occupes },
          ]}
        />
        {grille.donnees !== null && bacs.length === 0 && <EtatVide message={t.aucun} />}
        {bacs.length > 0 && affiches.length === 0 && <EtatVide message={t.aucunFiltre} />}
        <ul className="bacs-cartes">
          {affiches.map((bac) => (
            <li key={bac.id} className={bac.occupation === null ? 'bac-carte' : 'bac-carte bac-carte-occupe'} aria-label={`${t.bac} ${bac.numero}`}>
              <div className="bac-carte-tete">
                <span className="bac-carte-numero">{bac.numero}</span>
                <Pastille ton={bac.occupation === null ? 'ok' : 'alerte'}>{bac.occupation === null ? t.libre : t.occupe}</Pastille>
              </div>
              {bac.occupation === null ? (
                <p className="pont-discret">{t.pret}</p>
              ) : (
                <>
                  <p><strong>{bac.occupation.apporteur}</strong></p>
                  <p className="pont-discret">
                    {remplacer(t.detailOccupation, {
                      numero: bac.occupation.numero_reception,
                      regime: t.regimes[bac.occupation.regime],
                      depuis: formaterHorodatage(bac.occupation.occupe_le),
                    })}
                  </p>
                </>
              )}
              {peutLiberer(bac) && (
                <button type="button" className="bouton-secondaire bouton-petit" onClick={() => ouvrir(bac)}>
                  <Icone nom="check" />
                  {t.liberer}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {aLiberer?.occupation != null && (
        <Tiroir
          titre={t.titreConfirmation.replace('{numero}', String(aLiberer.numero))}
          icone="grid-3x3"
          etiquette={t.confirmer}
          surValider={() => void confirmer()}
          surFermer={() => ouvrir(null)}
          enCours={s.enCours}
          erreur={s.erreur}
        >
          <p>{t.contenu.replace('{apporteur}', aLiberer.occupation.apporteur).replace('{numero}', String(aLiberer.occupation.numero_reception))}</p>
          <Note ton="alerte">{t.consequence}</Note>
        </Tiroir>
      )}
    </section>
  )
}
