import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, Choix } from '../administration/composants'
import { type MessageEcran } from '../composants/EnTeteEcran'
import { Note } from '../composants/Note'
import { formaterHorodatage } from '../format/dates'
import { afficherMillimes } from '../format/montants'
import { libelles } from '../libelles'
import { CadreFiche, Case, EnTeteDeFiche, FichesRecentes, Heure, PageFichePapier, PartieFiche } from './composantsFiche'
import { optionsAuteurs, type Auteur, type FicheReprise } from './logiqueProduction'
import {
  CHEMIN_REG, construireCorpsReg, saisieRegVide,
  type AvanceEnCours, type ModePapier, type ReceptionARegler, type SaisieReg, type SensPapier,
} from './logiqueReglement'

const c = libelles.saisieProduction
const t = libelles.saisieReglement
const FORMULAIRE = 'formulaire-fiche-reg'

interface Preparation {
  utilisateurs: Auteur[]
  receptions: ReceptionARegler[]
  avances: AvanceEnCours[]
  session_caisse: { ouverte_le: string } | null
}
interface Resultat { decompte: { numero: number }; recu: { numero: number } | null }

/** Reprise de la fiche REG : décompte s'il manque, puis le paiement noté, à leur heure. */
export function PageSaisieReglement() {
  const [saisie, definirSaisie] = useState<SaisieReg>(saisieRegVide)
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const soumission = useSoumission()
  const preparation = useLecture<Preparation>(`${CHEMIN_REG}/preparation`)
  const fiches = useLecture<FicheReprise[]>(CHEMIN_REG)
  const donnees = preparation.donnees
  const reception = donnees?.receptions.find((r) => String(r.reception_id) === saisie.receptionId) ?? null
  const decompteEmis = reception?.decompte_id != null
  const avances = reception === null || decompteEmis ? [] : (donnees?.avances ?? []).filter((a) => a.apporteur_id === reception.apporteur_id)

  const changer = <K extends keyof SaisieReg>(cle: K, valeur: SaisieReg[K]) => {
    definirSaisie((avant) => ({ ...avant, [cle]: valeur }))
    definirErreurLocale(null)
    soumission.reinitialiser()
  }
  const basculerAvance = (id: number, cochee: boolean) =>
    changer('avances', cochee ? [...saisie.avances, id] : saisie.avances.filter((a) => a !== id))

  const enregistrer = async () => {
    const resultat = construireCorpsReg(saisie, decompteEmis)
    definirErreurLocale(resultat.erreur)
    if (resultat.corps === null) return
    const reponse = await soumission.soumettre<Resultat>(CHEMIN_REG, resultat.corps)
    await Promise.all([fiches.recharger(), preparation.recharger()])
    if (reponse === null) return
    const texte = t.succes.replace('{numero}', String(reponse.decompte.numero))
    definirMessage({ texte: reponse.recu === null ? texte : texte + t.succesRecu.replace('{numero}', String(reponse.recu.numero)), type: 'ok' })
    definirSaisie(saisieRegVide())
    soumission.reinitialiser()
  }

  return (
    <PageFichePapier
      titre={libelles.ecrans.saisieReglement}
      message={message}
      principal={{ etiquette: c.enregistrer, formulaire: FORMULAIRE, enCours: soumission.enCours }}
      aide={t.aide}
      erreur={preparation.erreur}
      recentes={<FichesRecentes fiches={fiches.donnees} erreur={fiches.erreur} />}
    >
      <form id={FORMULAIRE} onSubmit={(e) => { e.preventDefault(); void enregistrer() }}>
        <CadreFiche titre={t.titreFiche} icone="hand-coins">
          <PartieFiche>
            <EnTeteDeFiche prefixe="reg" libelleHeure={t.heure} saisie={saisie} auteurs={donnees?.utilisateurs ?? []} changer={changer} />
            <Choix id="reception-reg" libelle={t.reception} valeur={saisie.receptionId} surChangement={(v) => { changer('receptionId', v); changer('avances', []) }}
              options={(donnees?.receptions ?? []).map((r) => ({ valeur: String(r.reception_id), libelle: t.receptionOption.replace('{numero}', String(r.reception_numero)).replace('{apporteur}', r.apporteur) }))} />
            {reception !== null && !decompteEmis && <Champ id="decompte-papier-reg" libelle={t.numeroDecomptePapier} valeur={saisie.numeroDecomptePapier} surChangement={(v) => changer('numeroDecomptePapier', v)} />}
          </PartieFiche>
          <p className="mes-champ-aide">{c.auteurAide}</p>
          {reception !== null && <Note ton="ok">{decompteEmis ? t.decompteEmis : t.decompteAEmettre}</Note>}

          {avances.length > 0 && (
            <PartieFiche titre={t.titreAvances}>
              <div className="fiche-cases">
                {avances.map((a) => (
                  <Case key={a.id} libelle={t.avance.replace('{montant}', afficherMillimes(a.montant_millimes)).replace('{numero}', String(a.recu_numero))}
                    coche={saisie.avances.includes(a.id)} surChangement={(v) => basculerAvance(a.id, v)} />
                ))}
              </div>
              {saisie.avances.length > 0 && <Choix id="approuve-par-reg" libelle={t.approuvePar} valeur={saisie.approuvePar} surChangement={(v) => changer('approuvePar', v)} options={optionsAuteurs(donnees?.utilisateurs ?? [], true)} />}
            </PartieFiche>
          )}

          <PartieFiche titre={t.titrePaiement}>
            <Choix id="sens-reg" libelle={t.sens} valeur={saisie.sens} surChangement={(v) => changer('sens', v as SensPapier)}
              options={(['paye', 'encaisse'] as const).map((s) => ({ valeur: s, libelle: t.sensOptions[s] }))} />
            <Champ id="montant-reg" libelle={t.montant} valeur={saisie.montant} surChangement={(v) => changer('montant', v)} inputMode="decimal" />
            <Choix id="mode-reg" libelle={t.mode} valeur={saisie.mode} surChangement={(v) => changer('mode', (v || 'especes') as ModePapier)}
              options={(['especes', 'cheque', 'virement'] as const).map((m) => ({ valeur: m, libelle: t.modes[m] }))} />
            {saisie.mode !== 'especes' && (
              <>
                <Champ id="reference-reg" libelle={saisie.mode === 'cheque' ? libelles.references.numeroCheque : libelles.references.referenceVirement} valeur={saisie.referencePaiement} surChangement={(v) => changer('referencePaiement', v)} />
                <Champ id="banque-reg" libelle={libelles.references.banque} valeur={saisie.banquePaiement} surChangement={(v) => changer('banquePaiement', v)} />
              </>
            )}
            <Heure id="heure-paiement-reg" libelle={t.heurePaiement} valeur={saisie.heurePaiement} surChangement={(v) => changer('heurePaiement', v)} />
          </PartieFiche>
          <p className="mes-champ-aide">{t.aidePaiement}</p>
          {donnees !== null && (donnees.session_caisse === null
            ? <Note ton="alerte">{t.caisseFermee}</Note>
            : <Note>{t.caisseOuverte.replace('{date}', formaterHorodatage(donnees.session_caisse.ouverte_le))}</Note>)}
          <PartieFiche>
            <Champ id="observations-reg" libelle={c.observations} valeur={saisie.observations} surChangement={(v) => changer('observations', v)} />
          </PartieFiche>
          {(erreurLocale ?? soumission.erreur) !== null && <Note ton="erreur">{erreurLocale ?? soumission.erreur}</Note>}
        </CadreFiche>
      </form>
    </PageFichePapier>
  )
}
