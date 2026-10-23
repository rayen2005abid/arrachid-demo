// TDB-01 — Tableau de bord du propriétaire et du responsable : accès rapides aux écrans, calendrier, situation du jour
// et agenda de la semaine. Module à part dans la barre ; l'écran ne crée aucune donnée du moulin : tout renvoie vers
// l'écran qui détient la donnée. Les écrans « Pilotage » et « Aujourd'hui au bureau » de la maquette ne sont pas
// dans la bêta.
import { useEffect, useMemo, useState } from 'react'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { useServeur } from '../contextes/serveur'
import { useSessionOuverte } from '../contextes/session'
import { useTouches } from '../contextes/touches'
import { useCompteurs } from '../useCompteurs'
import { aujourdHuiTunis } from '../format/dates'
import { useEcransMasques } from '../laboratoire/useEcransMasques'
import { libelles } from '../libelles'
import { entreesVisibles, sansEcrans } from '../navigation'
import '../styles/tableauDeBord.css'
import { Agenda } from './Agenda'
import { BarreAcces } from './BarreAcces'
import { Calendrier } from './Calendrier'
import {
  ajouterJours, dateCourte, decalerMois, ecrireRendezVous, GROUPES_ACCES, lireRendezVous, lundiDe, minutesTunis,
  premierDuMois, type RendezVous,
} from './logique'
import { Situation } from './Situation'
import { TiroirNouveauRdv, TiroirVoirRdv } from './TiroirsAgenda'

const t = libelles.tableauDeBord
const k = t.agenda

type Tiroir = { type: 'nouveau'; jour: string; debut: string } | { type: 'voir'; rdv: RendezVous } | null

export function PageTableauDeBord() {
  const { utilisateur, poste, permissions } = useSessionOuverte()
  const { etat } = useServeur()
  const masques = useEcransMasques()
  const visibles = useMemo(() => sansEcrans(entreesVisibles(permissions, utilisateur.role, poste.type_poste), masques), [permissions, utilisateur.role, poste.type_poste, masques])
  const entrees = useMemo(() => new Map(visibles.map((e) => [e.code, e])), [visibles])
  const boutons = useMemo(() => {
    const codes = new Set(GROUPES_ACCES.flatMap((g) => g.boutons.map((b) => b.code)))
    return visibles.filter((e) => codes.has(e.code))
  }, [visibles])
  const indicateurs = useCompteurs(boutons, etat)

  const [aujourdhui, definirAujourdhui] = useState(() => aujourdHuiTunis())
  const [maintenant, definirMaintenant] = useState(() => minutesTunis())
  const [lundi, definirLundi] = useState(() => lundiDe(aujourdHuiTunis()))
  const [mois, definirMois] = useState(() => premierDuMois(aujourdHuiTunis()))
  const [rendezVous, definirRendezVous] = useState<RendezVous[]>(lireRendezVous)
  const [tiroir, definirTiroir] = useState<Tiroir>(null)
  const [message, definirMessage] = useState<{ texte: string; type: 'ok' | 'info' } | null>(null)

  // La ligne « maintenant » et le jour courant avancent tout seuls (écran laissé ouvert la nuit).
  useEffect(() => {
    const minuteur = setInterval(() => {
      definirMaintenant(minutesTunis())
      definirAujourdhui(aujourdHuiTunis())
    }, 30_000)
    return () => clearInterval(minuteur)
  }, [])

  function montrerSemaine(nouveauLundi: string) {
    definirLundi(nouveauLundi)
    definirMois(premierDuMois(ajouterJours(nouveauLundi, 3)))
  }
  const semaine = (decalage: number) => montrerSemaine(ajouterJours(lundi, 7 * decalage))
  const cetteSemaine = () => montrerSemaine(lundiDe(aujourdhui))
  const nouveau = (jour = aujourdhui, debut = '08:00') => {
    definirMessage(null)
    definirTiroir({ type: 'nouveau', jour, debut })
  }

  function ranger(liste: RendezVous[]) {
    definirRendezVous(liste)
    ecrireRendezVous(liste)
  }

  useTouches(
    tiroir !== null
      ? {}
      : {
          F2: { libelle: k.nouveau, action: () => nouveau(lundi <= aujourdhui && aujourdhui <= ajouterJours(lundi, 6) ? aujourdhui : lundi) },
          F5: { libelle: k.precedente, action: () => semaine(-1) },
          F6: { libelle: k.cetteSemaine, action: cetteSemaine },
          F7: { libelle: k.suivante, action: () => semaine(1) },
        },
  )

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.tableauDeBord} code="TDB-01" sousTitre={t.sousTitre} message={message} />
      <div className="mes-page tdb">
        <BarreAcces entrees={entrees} indicateurs={indicateurs} />
        <div className="tdb-corps">
          <div className="tdb-gauche">
            <Calendrier
              mois={mois}
              lundi={lundi}
              aujourdhui={aujourdhui}
              surJour={(jour) => {
                montrerSemaine(lundiDe(jour))
                definirMois(premierDuMois(jour))
              }}
              surMois={(decalage) => definirMois(decalerMois(mois, decalage))}
            />
            <Situation jour={aujourdhui} entrees={entrees} etat={etat} />
          </div>
          <Agenda
            lundi={lundi}
            aujourdhui={aujourdhui}
            maintenant={maintenant}
            rendezVous={rendezVous}
            surSemaine={semaine}
            surAujourdhui={cetteSemaine}
            surNouveau={nouveau}
            surVoir={(rdv) => definirTiroir({ type: 'voir', rdv })}
          />
        </div>
      </div>
      {tiroir?.type === 'nouveau' && (
        <TiroirNouveauRdv
          jour={tiroir.jour}
          debut={tiroir.debut}
          surFermer={() => definirTiroir(null)}
          surAjouter={(rdv) => {
            ranger([...rendezVous, rdv])
            definirTiroir(null)
            definirMessage({ texte: k.ajoute.replace('{date}', dateCourte(rdv.jour)).replace('{heure}', rdv.debut), type: 'ok' })
          }}
        />
      )}
      {tiroir?.type === 'voir' && (
        <TiroirVoirRdv
          rdv={tiroir.rdv}
          surFermer={() => definirTiroir(null)}
          surRetirer={() => {
            ranger(rendezVous.filter((r) => r.id !== tiroir.rdv.id))
            definirTiroir(null)
            definirMessage({ texte: k.retire.replace('{objet}', tiroir.rdv.objet), type: 'info' })
          }}
        />
      )}
    </section>
  )
}
