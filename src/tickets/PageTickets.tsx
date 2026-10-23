import { useState, type FormEvent } from 'react'
import { lire } from '../api/client'
import { useLecture } from '../api/useLecture'
import { messageUtilisateur } from '../api/erreurs'
import { useSoumission } from '../api/useSoumission'
import { Champ } from '../composants/Champ'
import { Chiffres } from '../composants/Chiffres'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { Icone } from '../composants/Icone'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { aujourdHuiTunis, formaterHorodatage } from '../format/dates'
import { grouperMilliers } from '../format/saisie'
import { libelles } from '../libelles'
import { AfficheEtatImpression } from './EtatImpression'
import {
  cheminApercu,
  cheminDuJour,
  cheminImpression,
  cheminRecherche,
  etiquetteImpression,
  remplacer,
  tonResultat,
  tonStatutPiece,
  type EtatImpression,
  type Impression,
  type Piece,
} from './logique'
import '../styles/tickets.css'

const t = libelles.tickets

const netKg = (piece: Piece) => (piece.net_kg === null ? '—' : grouperMilliers(piece.net_kg))

/** Date et heure en chiffres tabulaires, alignées à gauche : ce n'est pas une quantité. */
const Horodatage = ({ valeur }: { valeur: string }) => <span className="chiffres">{formaterHorodatage(valeur)}</span>

const EtatPiece = ({ piece }: { piece: Piece }) => <Pastille ton={tonStatutPiece(piece.statut)}>{t.statuts[piece.statut]}</Pastille>

// Quatre colonnes : elles tiennent dans la liste étroite. Le net et les impressions sont dans le détail.
const COLONNES_TROUVES: readonly Colonne<Piece>[] = [
  { cle: 'numero', titre: t.colonnes.numero, rendu: (p) => <span className="chiffres">{p.numero_imprime}</span> },
  { cle: 'apporteur', titre: t.colonnes.apporteur, rendu: (p) => p.apporteur_nom ?? '—' },
  { cle: 'emis', titre: t.colonnes.emisLe, rendu: (p) => <Horodatage valeur={p.emis_le} /> },
  { cle: 'statut', titre: t.colonnes.statut, rendu: (p) => <EtatPiece piece={p} /> },
]

const COLONNES_HISTORIQUE: readonly Colonne<Impression>[] = [
  { cle: 'numero', titre: t.colonnesHistorique.numero, rendu: (i) => i.numero_impression, nombre: true },
  { cle: 'resultat', titre: t.colonnesHistorique.resultat, rendu: (i) => <Pastille ton={tonResultat(i.resultat)}>{t.resultats[i.resultat]}</Pastille> },
  { cle: 'le', titre: t.colonnesHistorique.le, rendu: (i) => <Horodatage valeur={i.imprime_le} /> },
  { cle: 'par', titre: t.colonnesHistorique.par, rendu: (i) => i.imprime_par_nom },
  { cle: 'poste', titre: t.colonnesHistorique.poste, rendu: (i) => i.poste_libelle },
]

interface PropsDetail {
  piece: Piece
  /** Dernier résultat d'impression de ce ticket, s'il vient d'être imprimé. */
  etat: EtatImpression | null
  /** Erreur de la dernière demande d'impression (F8). */
  erreur: string | null
  surNouvelEtat: (etat: EtatImpression) => void
}

/** Le ticket choisi : chiffres, résultat de la dernière impression, aperçu, historique des impressions. */
function DetailTicket({ piece, etat, erreur, surNouvelEtat }: PropsDetail) {
  const [apercu, definirApercu] = useState(false)
  const imprimable = piece.actions_possibles.includes('imprimer')
  return (
    <>
      <Panneau titre={remplacer(t.ticket, { numero: piece.numero_imprime })} icone="printer" actions={<EtatPiece piece={piece} />}>
        <Chiffres
          valeurs={[
            { etiquette: t.apporteur, valeur: piece.apporteur_nom ?? '—', texte: true },
            { etiquette: t.reception, valeur: piece.reception_numero ?? '—' },
            { etiquette: t.net, valeur: netKg(piece), unite: t.kg },
            { etiquette: t.emisLe, valeur: formaterHorodatage(piece.emis_le) },
            { etiquette: t.emisPar, valeur: piece.emis_par_nom, texte: true },
          ]}
        />
        <p>{remplacer(t.impressionsConfirmees, { nombre: piece.nombre_impressions })}</p>
        {!imprimable && <Note ton="alerte">{t.annule}</Note>}
        {imprimable && piece.nombre_impressions > 0 && <Note>{t.consequenceReimpression}</Note>}
        {erreur !== null && <Note ton="erreur">{erreur}</Note>}
        {etat !== null && <AfficheEtatImpression etat={etat} surNouvelEtat={surNouvelEtat} />}
        <div>
          <button type="button" className="bouton-secondaire" onClick={() => definirApercu((v) => !v)}>
            {apercu ? t.masquerApercu : t.apercu}
          </button>
        </div>
        {apercu && (
          <div className="apercu-cadre">
            <img className="apercu-ticket" src={cheminApercu(piece.id)} alt={remplacer(t.apercuAlternatif, { numero: piece.numero_imprime })} />
          </div>
        )}
      </Panneau>
      <Panneau titre={t.historique} icone="history" compte={piece.impressions?.length ?? 0} serre>
        <TableauDonnees
          legende={t.historique}
          colonnes={COLONNES_HISTORIQUE}
          lignes={piece.impressions ?? []}
          cleLigne={(i) => i.numero_impression}
          vide={t.aucuneImpression}
        />
      </Panneau>
    </>
  )
}

/** Tickets (PROMPT §6.20.3) : retrouver un ticket par son numéro ou par le nom, le voir, le réimprimer (F8). */
export function PageTickets() {
  const [saisie, definirSaisie] = useState('')
  const [erreurSaisie, definirErreurSaisie] = useState<string | undefined>()
  const [erreur, definirErreur] = useState<string | null>(null)
  const [trouves, definirTrouves] = useState<Piece[] | null>(null)
  const [choisi, definirChoisi] = useState<number | null>(null)
  const [etat, definirEtat] = useState<EtatImpression | null>(null)
  const impression = useSoumission()
  // Tous les tickets du jour choisi, aujourd'hui d'abord (EM-07) : plus seulement les cinq derniers.
  const [jour, definirJour] = useState(aujourdHuiTunis())
  const derniers = useLecture<Piece[]>(jour === '' ? null : cheminDuJour(jour))
  const piece = trouves?.find((p) => p.id === choisi) ?? null

  // Un ticket du jour : son détail (avec l'historique des impressions) remplace les résultats.
  const choisirRecent = async (recent: Piece) => {
    try {
      const detail = await lire<Piece>(`/api/pieces/${recent.id}`)
      definirTrouves([detail])
      choisir(detail)
      definirErreur(null)
    } catch (e) {
      definirErreur(messageUtilisateur(e))
    }
  }

  // Un autre ticket : nouvel identifiant de commande, jamais celui d'une impression d'un autre ticket.
  const choisir = (suivante: Piece | null) => {
    definirChoisi(suivante?.id ?? null)
    definirEtat(null)
    impression.reinitialiser()
  }

  const chercher = async (evenement: FormEvent) => {
    evenement.preventDefault()
    const chemin = cheminRecherche(saisie)
    definirErreurSaisie(chemin === null ? t.numeroInvalide : undefined)
    if (chemin === null) return
    try {
      const resultats = await lire<Piece[]>(chemin)
      // Détail (historique des impressions) de chaque ticket trouvé.
      const details = await Promise.all(resultats.map((p) => lire<Piece>(`/api/pieces/${p.id}`)))
      definirTrouves(details)
      choisir(details[0] ?? null)
      definirErreur(null)
    } catch (e) {
      definirErreur(messageUtilisateur(e))
    }
  }

  // Après une impression, le ticket est relu : nombre d'impressions, DUPLICATA, historique.
  const recharger = async (id: number) => {
    try {
      const frais = await lire<Piece>(`/api/pieces/${id}`)
      definirTrouves((liste) => liste?.map((p) => (p.id === id ? frais : p)) ?? null)
    } catch {
      // Le résultat d'impression reste affiché ; le ticket sera relu à la prochaine recherche.
    }
  }

  const imprimer = async (cible: Piece) => {
    const reponse = await impression.soumettre<{ impression: EtatImpression }>(cheminImpression(cible.id), {})
    if (reponse === null) return
    definirEtat(reponse.impression)
    await recharger(cible.id)
    await derniers.recharger()
  }

  const nouvelEtat = async (suivant: EtatImpression) => {
    definirEtat(suivant)
    await recharger(suivant.piece_id)
  }

  const principal =
    piece !== null && piece.actions_possibles.includes('imprimer')
      ? { etiquette: etiquetteImpression(piece), surClic: () => void imprimer(piece), enCours: impression.enCours }
      : null

  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.tickets} sousTitre={t.sousTitre} principal={principal} />
      <div className="mes-page">
        <ListeDetail
          listeEtroite
          liste={
            <>
              <Panneau titre={t.recherche} icone="search">
                <form onSubmit={(e) => void chercher(e)} className="recherche-ticket">
                  <Champ
                    id="numero_ticket"
                    libelle={t.numero}
                    aide={t.numeroAide}
                    valeur={saisie}
                    surChangement={definirSaisie}
                    erreur={erreurSaisie}
                    autoFocus
                  />
                  <button type="submit" className="bouton-secondaire">
                    <Icone nom="search" />
                    {t.chercher}
                  </button>
                </form>
                {erreur !== null && <Note ton="erreur">{erreur}</Note>}
              </Panneau>
              <Panneau titre={t.duJour} icone="history" compte={derniers.donnees?.length} serre>
                <Champ id="jour_tickets" type="date" libelle={t.jour} valeur={jour} surChangement={definirJour} />
                <TableauDonnees
                  legende={t.duJour}
                  colonnes={COLONNES_TROUVES}
                  lignes={derniers.donnees}
                  cleLigne={(p) => p.id}
                  vide={t.aucunRecent}
                  erreur={derniers.erreur}
                  surChoisir={(p) => void choisirRecent(p)}
                  choisie={choisi}
                />
              </Panneau>
              {trouves !== null && (
                <Panneau titre={t.trouves} icone="ticket" compte={trouves.length} serre>
                  <TableauDonnees
                    legende={t.trouves}
                    colonnes={COLONNES_TROUVES}
                    lignes={trouves}
                    cleLigne={(p) => p.id}
                    vide={t.aucun}
                    surChoisir={choisir}
                    choisie={choisi}
                  />
                </Panneau>
              )}
            </>
          }
          detail={
            piece === null ? (
              <Panneau titre={t.detail} icone="printer">
                <EtatVide message={t.choisir} />
              </Panneau>
            ) : (
              <DetailTicket key={piece.id} piece={piece} etat={etat} erreur={impression.erreur} surNouvelEtat={(e) => void nouvelEtat(e)} />
            )
          }
        />
      </div>
    </section>
  )
}
