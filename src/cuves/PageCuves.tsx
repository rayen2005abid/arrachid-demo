import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLecture } from '../api/useLecture'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { libelles } from '../libelles'
import { Acidite, CuveCave, EchantillonRemplissage, Jauge, PastilleQualite, Qualite } from './composants'
import { CuveChoisie } from './CuveChoisie'
import { DetailCuve } from './DetailCuve'
import { afficherKg, CHEMIN_REGISTRE, identifiantCuve, rangeesCuves, stockTotal, tailleCuve, type Cuve, type Registre, type Remplissage, type ResumeQualite } from './logique'
import '../styles/production.css'

const t = libelles.cuves
const PERIODE_MS = 5000

/**
 * Liste des cuves (CONTEXTE §17), en cave à huile comme le prototype v3 : cuves dessinées par rangée, détail de la cuve
 * touchée et stock par qualité, puis le registre (stock, remplissage, acidité, réservé, disponible).
 */
function ListeCuves() {
  const registre = useLecture<Registre>(CHEMIN_REGISTRE, PERIODE_MS)
  const cuves = registre.donnees?.cuves ?? []
  const qualites = registre.donnees?.qualites ?? []
  // Cuve touchée dans la cave ; la première tant qu'aucune ne l'a été (ou si elle a disparu du registre).
  const [choisieId, definirChoisieId] = useState<number | null>(null)
  const choisie = cuves.find((c) => c.id === choisieId) ?? cuves[0]
  const resume = t.resume.replace('{cuves}', String(cuves.length)).replace('{stock}', afficherKg(stockTotal(cuves)))

  const colonnes: Colonne<Cuve>[] = [
    { cle: 'cuve', titre: t.colonnes.cuve, rendu: (c) => <><span className="cuve-code">{c.code}</span> <span className="aide">{c.libelle}</span></> },
    { cle: 'qualite', titre: t.colonnes.qualite, rendu: (c) => <Qualite cuve={c} /> },
    { cle: 'stock', titre: t.colonnes.stock, rendu: (c) => <>{afficherKg(c.stock_calcule_g)} <span className="aide">{t.capacite.replace('{capacite}', afficherKg(c.capacite_g))}</span></>, nombre: true },
    { cle: 'remplissage', titre: t.colonnes.remplissage, rendu: (c) => <Jauge cuve={c} /> },
    { cle: 'acidite', titre: t.colonnes.acidite, rendu: (c) => <Acidite cuve={c} /> },
    { cle: 'reserve', titre: t.colonnes.reserve, rendu: (c) => afficherKg(c.stock_reserve_g), nombre: true },
    { cle: 'disponible', titre: t.colonnes.disponible, rendu: (c) => <span className="cuve-disponible">{afficherKg(c.stock_disponible_g)}</span>, nombre: true },
    { cle: 'campagnes', titre: t.colonnes.campagnes, rendu: (c) => (c.campagnes_origine.length === 0 ? '—' : c.campagnes_origine.map((x) => x.libelle).join(', ')) },
  ]

  const colonnesQualites: Colonne<ResumeQualite>[] = [
    { cle: 'qualite', titre: t.colonnes.qualite, rendu: (q) => <span className="prod-actions"><PastilleQualite qualite={q.qualite} /><Pastille ton="sombre">{t.qualites[q.qualite]}</Pastille></span> },
    { cle: 'stock', titre: t.colonnes.stock, rendu: (q) => afficherKg(q.stock_calcule_g), nombre: true },
    { cle: 'reserve', titre: t.colonnes.reserve, rendu: (q) => afficherKg(q.stock_reserve_g), nombre: true },
    { cle: 'sansCuve', titre: t.colonnes.reserveSansCuve, rendu: (q) => afficherKg(q.reserve_sans_cuve_g), nombre: true },
    { cle: 'disponible', titre: t.colonnes.disponible, rendu: (q) => <span className="cuve-disponible">{afficherKg(q.stock_disponible_g)}</span>, nombre: true },
  ]

  const qualitesPanneau = qualites.length > 0 && (
    <Panneau titre={t.titreQualites} icone="droplets" className="cuves-qualites" serre>
      <TableauDonnees legende={t.legendeQualites} colonnes={colonnesQualites} lignes={qualites} cleLigne={(q) => q.qualite} vide={t.aucune} />
    </Panneau>
  )

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.cuves} sousTitre={registre.donnees === null ? undefined : resume} />
      <div className="mes-page prod-page">
        {registre.erreur !== null && <Note ton="erreur">{registre.erreur}</Note>}
        <Panneau titre={t.titreListe} icone="cylinder" compte={cuves.length} serre>
          {registre.donnees !== null && cuves.length === 0 && <EtatVide message={t.aucune} />}
          {cuves.length > 0 && <Cave cuves={cuves} choisie={choisie?.id ?? null} surChoix={definirChoisieId} />}
        </Panneau>

        {choisie !== undefined && <ListeDetail liste={<CuveChoisie cuve={choisie} />} detail={qualitesPanneau} />}
        {choisie === undefined && qualitesPanneau}

        {cuves.length > 0 && (
          <Panneau titre={t.titreRegistre} icone="list" serre>
            <TableauDonnees
              legende={t.titreRegistre}
              colonnes={colonnes}
              lignes={cuves}
              cleLigne={(c) => c.id}
              vide={t.aucune}
              className="tableau-cuves"
              surChoisir={(c) => definirChoisieId(c.id)}
              choisie={choisie?.id ?? null}
            />
          </Panneau>
        )}
      </div>
    </section>
  )
}

const LEGENDE: readonly Remplissage[] = ['extra_vierge', 'vierge', 'lampante', 'attente', 'vide']

function libelleRemplissage(remplissage: Remplissage): string {
  if (remplissage === 'attente') return t.cave.attente
  if (remplissage === 'vide') return t.cave.vide
  return t.qualites[remplissage]
}

/** Cave à huile (prototype v3) : la légende des couleurs, puis les cuves dessinées par rangée, posées sur le sol. */
function Cave({ cuves, choisie, surChoix }: { cuves: readonly Cuve[]; choisie: number | null; surChoix: (id: number) => void }) {
  const capaciteMax = Math.max(...cuves.map((c) => c.capacite_g))
  return (
    <div className="cave">
      <ul className="cave-legende" aria-label={t.cave.legende}>
        {LEGENDE.map((remplissage) => (
          <li key={remplissage}>
            <EchantillonRemplissage remplissage={remplissage} />
            {libelleRemplissage(remplissage)}
          </li>
        ))}
      </ul>
      <p className="visuellement-cache">{t.cave.choisir}</p>
      {rangeesCuves(cuves).map((rangee) => (
        <div className="cave-rangee" key={rangee.groupe ?? ''}>
          <h3 className="cave-rangee-titre">
            <span className="cave-rangee-nom">{rangee.groupe ?? t.cave.sansGroupe}</span>
            <span className="cave-rangee-trait" aria-hidden="true" />
            <span className="cave-rangee-total">
              {t.cave.totalRangee.replace('{stock}', afficherKg(rangee.stock_g)).replace('{capacite}', afficherKg(rangee.capacite_g))}
            </span>
          </h3>
          <ul className="cave-cuves">
            {rangee.cuves.map((cuve) => (
              <li key={cuve.id}>
                <CuveCave cuve={cuve} taille={tailleCuve(cuve.capacite_g, capaciteMax)} choisie={cuve.id === choisie} surChoix={() => surChoix(cuve.id)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Écran « Cuves » (lecture seule) : la liste, ou le détail d'une cuve avec `?cuve=<id>`. */
export function PageCuves() {
  const [parametres] = useSearchParams()
  const cuveId = identifiantCuve(parametres.get('cuve'))
  return cuveId === null ? <ListeCuves /> : <DetailCuve cuveId={cuveId} />
}
