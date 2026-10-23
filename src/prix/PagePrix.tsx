import { useState, type FormEvent } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ } from '../composants/Champ'
import { Chiffres, type Chiffre } from '../composants/Chiffres'
import { ChoixBoutons } from '../composants/ChoixBoutons'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { ValidationPin } from '../composants/ValidationPin'
import { afficherMillimes } from '../format/montants'
import { entierPositif, grouperMilliers } from '../format/saisie'
import { afficherCentiemes, CHAMPS_ANALYSE, type ChampAnalyse } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { useSessionOuverte } from '../contextes/session'
import { useBrouillon } from '../contextes/useBrouillon'
import { cheminImpression, peutReessayer, texteEtat, tonResultat, type EtatImpression } from '../tickets/logique'
import {
  apercuMontant,
  CHEMIN_ATTENTE,
  CHEMIN_PRIX,
  CHEMIN_REFUS_FACON,
  CHEMIN_REFUS_RETOUR,
  corpsPrix,
  corpsRefus,
  corpsRetour,
  inhabituelle,
  millimes,
  peutFixer,
  peutRefuser,
  type PrixFixe,
  type ReceptionAPrix,
  type SuiteRefus,
} from './logique'
import '../styles/bureau.css'

const t = libelles.prix
const PERIODE_MS = 5000
const FORMULAIRE = 'formulaire-prix'
const SUITES: SuiteRefus[] = ['facon', 'retour']

/** Résultats du laboratoire et régime de la réception, tels que le serveur les donne. */
function chiffresReception(reception: ReceptionAPrix): Chiffre[] {
  const analyse = libelles.labo.analyse
  return [
    { etiquette: t.regime, valeur: t.regimes[reception.regime], texte: true },
    { etiquette: t.net, valeur: grouperMilliers(reception.net_kg), ton: 'fort' },
    ...CHAMPS_ANALYSE.map((champ): Chiffre => inhabituelle(reception, champ)
      ? { etiquette: analyse.champs[champ], valeur: <>{afficherCentiemes(reception.analyse[champ])}<span className="visuellement-cache"> {t.inhabituelle}</span></>, ton: 'mauvais' }
      : { etiquette: analyse.champs[champ], valeur: afficherCentiemes(reception.analyse[champ]) }),
    { etiquette: analyse.variete, valeur: reception.analyse.variete ?? analyse.varieteInconnue, texte: true },
    ...(reception.partage === null ? [] : [{
      etiquette: t.partAgriculteur,
      valeur: reception.partage.pourcentage_agriculteur_centiemes !== null
        ? `${afficherCentiemes(reception.partage.pourcentage_agriculteur_centiemes)} %`
        : `${afficherMillimes(reception.partage.huile_agriculteur_declaree_g ?? 0)} kg`,
    }]),
  ]
}

/** Mesure de la liste : une valeur hors des plages porte une pastille d'alerte, avec un texte lu. */
function mesure(reception: ReceptionAPrix, champ: ChampAnalyse) {
  const valeur = afficherCentiemes(reception.analyse[champ])
  if (!inhabituelle(reception, champ)) return valeur
  return <Pastille ton="alerte" icone="triangle-alert">{valeur}<span className="visuellement-cache"> {t.inhabituelle}</span></Pastille>
}

/** Dernière décision enregistrée à ce poste : seule la réponse de la commande la donne (aucune liste des prix fixés). */
function chiffresDecision(prix: PrixFixe): Chiffre[] {
  const decision: Chiffre[] = prix.prix_unitaire_millimes_kg === null
    ? [
        { etiquette: t.decision, valeur: prix.suite_refus === 'retour' ? t.refuseVersRetour : t.refuseVersFacon, texte: true },
        { etiquette: t.motif, valeur: prix.motif ?? '', texte: true },
        prix.suite_refus === 'retour'
          ? { etiquette: t.poidsRetour, valeur: grouperMilliers(prix.poids_retour_kg ?? 0) }
          : { etiquette: t.nouveauTicket, valeur: String(prix.ticket?.numero ?? '') },
      ]
    : [
        { etiquette: t.unites[prix.unite_prix], valeur: afficherMillimes(prix.prix_unitaire_millimes_kg) },
        { etiquette: t.montant, valeur: prix.montant_millimes === null ? t.montantApres : `${afficherMillimes(prix.montant_millimes)} DT`, ton: 'fort', texte: prix.montant_millimes === null },
      ]
  return [{ etiquette: t.apporteur, valeur: prix.reception.apporteur, texte: true }, ...decision, { etiquette: t.validePar, valeur: prix.valide_par, texte: true }]
}

/** Écran des prix (CONTEXTE §12) : le responsable ou le propriétaire fixe ou refuse le prix, avec son PIN. */
export function PagePrix() {
  const { utilisateur } = useSessionOuverte()
  const attente = useLecture<ReceptionAPrix[]>(CHEMIN_ATTENTE, PERIODE_MS)
  const s = useSoumission()
  const impression = useSoumission()
  const [etatImpression, definirEtatImpression] = useState<EtatImpression | null>(null)
  const [choisiId, definirChoisiId] = useBrouillon<number | null>('prix.reception', null)
  const [saisie, definirSaisie] = useBrouillon('prix.saisie', '')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [invalide, definirInvalide] = useState(false)
  // Refus du prix (CONTEXTE §12.3) : même validation par PIN, avec une raison.
  const [refus, definirRefus] = useBrouillon('prix.refus', false)
  const [suite, definirSuite] = useBrouillon<SuiteRefus>('prix.suite', 'facon')
  const [poidsRetour, definirPoidsRetour] = useBrouillon('prix.poidsRetour', '')
  const [motif, definirMotif] = useBrouillon('prix.motif', '')
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const [dernier, definirDernier] = useState<PrixFixe | null>(null)
  // Après une décision enregistrée, jusqu'à la relecture : F8 ne la relance pas.
  const [actualisation, definirActualisation] = useState(false)

  const receptions = (attente.donnees ?? []).filter(peutFixer)
  // Une seule réception en attente : elle est proposée d'office.
  const choisi = receptions.find((r) => r.id === choisiId) ?? (receptions.length === 1 ? receptions[0] : null) ?? null

  const basculer = (versRefus: boolean) => {
    s.reinitialiser()
    definirValidation(null)
    definirInvalide(false)
    definirRefus(versRefus)
  }

  const choisir = (id: number | null) => {
    basculer(false)
    definirSaisie('')
    definirMotif('')
    definirSuite('facon')
    definirPoidsRetour('')
    definirChoisiId(id)
  }

  const terminer = async (prix: PrixFixe, texte: string, etat: EtatImpression | null = null) => {
    definirDernier(prix)
    definirEtatImpression(etat)
    impression.reinitialiser()
    definirMessage({ texte, type: 'ok' })
    definirActualisation(true)
    try {
      await attente.recharger()
    } finally {
      definirActualisation(false)
    }
    choisir(null)
  }

  const fixer = async (e: FormEvent) => {
    e.preventDefault()
    if (choisi === null || s.enCours || actualisation) return
    if (millimes(saisie) === null) {
      definirInvalide(true)
      return
    }
    const corps = corpsPrix(choisi.id, saisie, validation)
    if (corps === null) return
    const reponse = await s.soumettre<{ prix: PrixFixe }>(CHEMIN_PRIX, corps)
    if (reponse !== null) await terminer(reponse.prix, t.fixe.replace('{numero}', String(reponse.prix.reception.numero)))
  }

  const refuser = async (e: FormEvent) => {
    e.preventDefault()
    if (choisi === null || s.enCours || actualisation) return
    if (motif.trim() === '') {
      definirInvalide(true)
      return
    }
    if (suite === 'retour') {
      if (entierPositif(poidsRetour) === null) {
        definirInvalide(true)
        return
      }
      const corpsR = corpsRetour(choisi.id, motif, poidsRetour, validation)
      if (corpsR === null) return
      const retour = await s.soumettre<{ prix: PrixFixe }>(CHEMIN_REFUS_RETOUR, corpsR)
      if (retour !== null) await terminer(retour.prix, t.refuseRetour.replace('{numero}', String(retour.prix.reception.numero)))
      return
    }
    const corps = corpsRefus(choisi.id, motif, validation)
    if (corps === null) return
    const reponse = await s.soumettre<{ prix: PrixFixe; impression: EtatImpression }>(CHEMIN_REFUS_FACON, corps)
    if (reponse === null) return
    const texte = t.refuse.replace('{numero}', String(reponse.prix.reception.numero)).replace('{ticket}', String(reponse.prix.ticket?.numero ?? ''))
    await terminer(reponse.prix, texte, reponse.impression)
  }

  const reessayerImpression = async () => {
    if (etatImpression === null || impression.enCours) return
    const reponse = await impression.soumettre<{ impression: EtatImpression }>(cheminImpression(etatImpression.piece_id), {})
    if (reponse !== null) definirEtatImpression(reponse.impression)
  }

  const apercu = choisi === null ? null : apercuMontant(choisi, saisie)
  const erreurServeur = s.champ === 'prix_unitaire_millimes_kg' || s.champ === 'motif' || s.champ === 'poids_kg' ? null : s.erreur

  const colonnes: Colonne<ReceptionAPrix>[] = [
    { cle: 'numero', titre: t.colonnes.numero, rendu: (r) => r.numero, nombre: true },
    { cle: 'apporteur', titre: t.colonnes.apporteur, rendu: (r) => r.apporteur },
    { cle: 'regime', titre: t.colonnes.regime, rendu: (r) => <Pastille>{t.regimes[r.regime]}</Pastille> },
    { cle: 'net', titre: t.colonnes.net, rendu: (r) => grouperMilliers(r.net_kg), nombre: true },
    { cle: 'acidite', titre: t.colonnes.acidite, rendu: (r) => mesure(r, 'acidite_centiemes'), nombre: true },
    { cle: 'rendement', titre: t.colonnes.rendement, rendu: (r) => mesure(r, 'rendement_prevu_centiemes'), nombre: true },
    { cle: 'huile', titre: t.colonnes.huile, rendu: (r) => mesure(r, 'taux_huile_centiemes'), nombre: true },
  ]

  const liste = (
    <>
      <Panneau titre={t.attente} icone="tag" compte={receptions.length} serre>
        <TableauDonnees
          legende={t.legendeAttente}
          colonnes={colonnes}
          lignes={attente.donnees === null ? null : receptions}
          cleLigne={(r) => r.id}
          vide={t.aucune}
          erreur={attente.erreur}
          surChoisir={(r) => choisir(r.id)}
          choisie={choisi?.id ?? null}
        />
      </Panneau>
      {dernier !== null && (
        <Panneau titre={t.derniere} icone="history" compte={t.reception.replace('{numero}', String(dernier.reception.numero))}>
          <Chiffres valeurs={chiffresDecision(dernier)} />
          {etatImpression !== null && (
            <Note ton={tonResultat(etatImpression.statut)} vivante>
              <p>{texteEtat(etatImpression)}</p>
              {peutReessayer(etatImpression) && (
                <button type="button" className="bouton-secondaire" disabled={impression.enCours} onClick={() => void reessayerImpression()}>{libelles.reception.reessayerImpression}</button>
              )}
            </Note>
          )}
          {impression.erreur !== null && <Note ton="erreur">{impression.erreur}</Note>}
        </Panneau>
      )}
    </>
  )

  const detail = choisi === null ? (
    <Panneau titre={t.titrePrix} icone="tag"><EtatVide message={receptions.length === 0 ? t.aucune : t.choisir} /></Panneau>
  ) : (
    <>
      <Panneau titre={t.titreReception.replace('{numero}', String(choisi.numero)).replace('{apporteur}', choisi.apporteur)} icone="flask-conical" compte={choisi.analyse.reference}>
        <Chiffres valeurs={chiffresReception(choisi)} />
        {choisi.analyse.inhabituelles.length > 0 && <Note ton="alerte">{t.aideInhabituelles}</Note>}
      </Panneau>

      {refus ? (
        <form id={FORMULAIRE} onSubmit={(e) => void refuser(e)} aria-label={t.titreRefus} noValidate>
          <Panneau titre={t.titreRefus} icone="tag">
            <div className="bureau-formulaire">
              <ChoixBoutons
                libelle={t.suite}
                options={SUITES.map((valeur) => ({ valeur, libelle: t.suites[valeur] }))}
                valeur={suite}
                surChoisir={(valeur) => { definirSuite(valeur); definirInvalide(false) }}
                aide={suite === 'facon' ? t.aideFacon : t.aideRetour}
              />
              {suite === 'retour' && (
                <Champ
                  id="poids-retour"
                  libelle={t.poidsRetour}
                  valeur={poidsRetour}
                  surChangement={(valeur) => { definirPoidsRetour(valeur); definirInvalide(false) }}
                  erreur={invalide && entierPositif(poidsRetour) === null ? t.poidsRetourInvalide : s.champ === 'poids_kg' && s.erreur !== null ? s.erreur : undefined}
                  inputMode="numeric"
                  chiffres
                />
              )}
              <Champ
                id="motif"
                libelle={t.motif}
                valeur={motif}
                surChangement={(valeur) => { definirMotif(valeur); definirInvalide(false) }}
                erreur={invalide && motif.trim() === '' ? t.motifObligatoire : s.champ === 'motif' && s.erreur !== null ? s.erreur : undefined}
                autoFocus
              />
              {validation === null && <Note>{t.aidePin}</Note>}
              <ValidationPin key={`refus-${choisi.id}`} utilisateurPropose={utilisateur.id} surValidation={definirValidation} />
              {erreurServeur !== null && <Note ton="erreur">{erreurServeur}</Note>}
              <Note ton="alerte">{suite === 'facon' ? t.consequenceRefus : t.consequenceRetour}</Note>
              <div className="bureau-actions">
                <button type="button" className="bouton-secondaire" onClick={() => basculer(false)}>{t.revenirAuPrix}</button>
              </div>
            </div>
          </Panneau>
        </form>
      ) : (
        <form id={FORMULAIRE} onSubmit={(e) => void fixer(e)} aria-label={t.titrePrix} noValidate>
          <Panneau titre={t.titrePrix} icone="tag">
            <div className="bureau-formulaire">
              <div className="bureau-prix">
                <Champ
                  id="prix"
                  libelle={t.unites[choisi.unite_prix]}
                  aide={choisi.unite_prix === 'kg_huile' ? t.aideHuile : undefined}
                  valeur={saisie}
                  surChangement={(valeur) => { definirSaisie(valeur); definirInvalide(false) }}
                  erreur={invalide ? t.invalide : s.champ === 'prix_unitaire_millimes_kg' && s.erreur !== null ? s.erreur : undefined}
                  inputMode="decimal"
                  placeholder="0,000"
                  autoFocus
                  chiffres
                  grand
                />
                {choisi.unite_prix === 'kg_olives' && (
                  <Chiffres valeurs={[{ etiquette: t.apercu, valeur: apercu === null ? '—' : `${afficherMillimes(apercu)} DT`, ton: 'afficheur' }]} />
                )}
              </div>
              {validation === null && <Note>{t.aidePin}</Note>}
              <ValidationPin key={choisi.id} utilisateurPropose={utilisateur.id} surValidation={definirValidation} />
              {erreurServeur !== null && <Note ton="erreur">{erreurServeur}</Note>}
              <Note>{t.consequence}</Note>
              {peutRefuser(choisi) && (
                <div className="bureau-actions">
                  <button type="button" className="bouton-secondaire bouton-danger" onClick={() => basculer(true)}>{t.refuser}</button>
                </div>
              )}
            </div>
          </Panneau>
        </form>
      )}
    </>
  )

  return (
    <section>
      <EnTeteEcran
        titre={libelles.ecrans.prix}
        sousTitre={t.resume.replace('{nombre}', String(receptions.length))}
        message={message}
        principal={choisi === null ? null : { etiquette: refus ? t.enregistrerRefus : t.fixer, formulaire: FORMULAIRE, enCours: s.enCours || actualisation, inactif: validation === null }}
      />
      <div className="mes-page bureau-page">
        <ListeDetail liste={liste} detail={detail} />
      </div>
    </section>
  )
}
