import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ } from '../composants/Champ'
import { ChoixBoutons } from '../composants/ChoixBoutons'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { ValidationPin } from '../composants/ValidationPin'
import { grammesVersKg } from '../administration/unites'
import { afficherMillimes } from '../format/montants'
import { uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import { corpsReferences, referencesCompletes, REFERENCES_VIDES, type References } from '../caisse/references'
import { ChampsReferences } from '../composants/ChampsReferences'

const t = libelles.factures
type Traitement = 'credit_client' | 'remboursement'
type Mode = 'especes' | 'cheque' | 'virement'
const TRAITEMENTS: Traitement[] = ['credit_client', 'remboursement']
const MODES: Mode[] = ['especes', 'cheque', 'virement']

export interface LigneFactureAvoir {
  id: number; libelle: string; quantite: number; reste_quantite: number
  chargement_id: number | null; type_article: string | null
}
export interface FactureAvoir {
  id: number; numero: number; redevance_decompte_emis: boolean; lignes: LigneFactureAvoir[]
}
interface Avoir {
  id: number; numero: number; facture_id: number; montant_ttc_millimes: number
  choix: string; recu_id: number | null
}

/** Huile (vrac ou détail) en kg à trois décimales ; contenants et services en unités. */
const enKg = (ligne: LigneFactureAvoir) => ligne.chargement_id !== null || ligne.type_article === 'huile'
const libelleChoix = (choix: string) => t.traitements[choix as Traitement] ?? choix

/** Le responsable choisit le crédit ou le remboursement et confirme tout retour de contenant. */
export function SectionAvoirs({ facture, surEmission }: { facture: FactureAvoir; surEmission: () => Promise<void> }) {
  const liste = useLecture<{ avoirs: Avoir[] }>('/api/avoirs')
  const commande = useSoumission()
  const [quantites, saisirQuantites] = useState<Record<number, string>>({})
  const [retours, confirmerRetours] = useState<Record<number, boolean>>({})
  const [traitement, choisirTraitement] = useState<Traitement>('credit_client')
  const [mode, choisirMode] = useState<Mode>('especes')
  const [references, definirReferences] = useState<References>(REFERENCES_VIDES)
  const [referencesVerifiees, definirReferencesVerifiees] = useState(false)
  const [motif, saisirMotif] = useState('')
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [erreur, definirErreur] = useState<string | null>(null)
  const [dernier, definirDernier] = useState<Avoir | null>(null)

  const emettre = async () => {
    if (commande.enCours) return
    const lignes = []
    for (const ligne of facture.lignes) {
      const brut = (quantites[ligne.id] ?? '').trim()
      if (!brut) continue
      const quantite = uniteExacte(brut, enKg(ligne) ? 3 : 0)
      if (quantite === null || quantite <= 0 || quantite > ligne.reste_quantite) {
        definirErreur(t.quantiteInvalide.replace('{libelle}', ligne.libelle)); return
      }
      lignes.push({ ligne_facture_id: ligne.id, quantite, retour_stock_confirme: retours[ligne.id] ?? false })
    }
    if (!lignes.length || !motif.trim() || validation === null) {
      definirErreur(t.erreurAvoir); return
    }
    const rembourse = traitement === 'remboursement'
    if (rembourse && !referencesCompletes(mode, references)) { definirReferencesVerifiees(true); return }
    const reponse = await commande.soumettre<{ avoir: Avoir }>('/api/avoirs', {
      facture_id: facture.id, lignes, traitement,
      mode: rembourse ? mode : null,
      ...(rembourse ? corpsReferences(mode, references) : {}),
      motif: motif.trim(), validation,
    })
    if (reponse === null) return
    definirDernier(reponse.avoir)
    saisirQuantites({})
    confirmerRetours({})
    saisirMotif('')
    definirReferences(REFERENCES_VIDES)
    definirReferencesVerifiees(false)
    definirValidation(null)
    definirErreur(null)
    commande.reinitialiser()
    await Promise.all([liste.recharger(), surEmission()])
  }

  const avoirs = liste.donnees === null ? null : liste.donnees.avoirs.filter((avoir) => avoir.facture_id === facture.id)
  const colonnes: Colonne<Avoir>[] = [
    { cle: 'numero', titre: t.colonnes.numero, rendu: (a) => a.numero, nombre: true },
    { cle: 'montant', titre: t.colonnes.ttc, rendu: (a) => afficherMillimes(a.montant_ttc_millimes), nombre: true },
    { cle: 'choix', titre: t.traitement, rendu: (a) => libelleChoix(a.choix) },
    { cle: 'pdf', titre: t.pdf, rendu: (a) => <a href={`/api/avoirs/${a.id}/pdf`} target="_blank" rel="noreferrer">{t.pdf}</a> },
  ]
  const lignesOuvertes = facture.lignes.filter((ligne) => ligne.reste_quantite > 0)

  return (
    <form onSubmit={(e) => { e.preventDefault(); void emettre() }} aria-label={t.avoirs} noValidate>
      <Panneau titre={t.avoirs} icone="file-text">
        <div className="bureau-formulaire">
          {(erreur ?? commande.erreur) !== null && <Note ton="erreur">{erreur ?? commande.erreur}</Note>}
          {facture.redevance_decompte_emis && <Note ton="alerte">{t.avoirDecompte}</Note>}
          {!facture.redevance_decompte_emis && lignesOuvertes.length > 0 && <>
            <Note>{t.avoirAide}</Note>
            {lignesOuvertes.map((ligne) => (
              <div key={ligne.id} className="bureau-formulaire">
                <Champ
                  id={`avoir-ligne-${ligne.id}`}
                  libelle={ligne.libelle}
                  aide={t.avoirReste.replace('{libelle}', ligne.libelle).replace('{reste}', enKg(ligne) ? `${grammesVersKg(ligne.reste_quantite)} kg` : String(ligne.reste_quantite))}
                  valeur={quantites[ligne.id] ?? ''}
                  surChangement={(v) => { saisirQuantites({ ...quantites, [ligne.id]: v }); definirErreur(null); commande.reinitialiser() }}
                  placeholder={enKg(ligne) ? 'kg' : t.unites}
                  inputMode="decimal"
                  chiffres
                />
                {ligne.type_article === 'contenant' && (
                  <label className="mes-case">
                    <input type="checkbox" checked={retours[ligne.id] ?? false} onChange={(e) => { confirmerRetours({ ...retours, [ligne.id]: e.target.checked }); commande.reinitialiser() }} />
                    {t.retourContenant}
                  </label>
                )}
              </div>
            ))}
            <Champ id="motif-avoir" libelle={t.motif} valeur={motif} surChangement={(v) => { saisirMotif(v); definirErreur(null); commande.reinitialiser() }} />
            <ChoixBoutons libelle={t.traitement} options={TRAITEMENTS.map((v) => ({ valeur: v, libelle: t.traitements[v] }))} valeur={traitement} surChoisir={(v) => { choisirTraitement(v); commande.reinitialiser() }} />
            {traitement === 'remboursement' && (
              <>
                <ChoixBoutons libelle={t.modeRemboursement} options={MODES.map((m) => ({ valeur: m, libelle: t.modes[m] }))} valeur={mode} surChoisir={(m) => { choisirMode(m); definirReferencesVerifiees(false); commande.reinitialiser() }} />
                <ChampsReferences id="avoir" mode={mode} valeur={references} surChangement={(v) => { definirReferences(v); commande.reinitialiser() }} verifier={referencesVerifiees} />
              </>
            )}
            <ValidationPin surValidation={(valeur) => { definirValidation(valeur); commande.reinitialiser() }} />
            <div className="bureau-actions">
              <button type="submit" className="bouton-secondaire" disabled={commande.enCours}>{t.emettreAvoir}</button>
            </div>
          </>}
          {dernier !== null && (
            <Note ton="ok" vivante>
              <p>{t.avoir.replace('{numero}', String(dernier.numero)).replace('{montant}', afficherMillimes(dernier.montant_ttc_millimes)).replace('{choix}', libelleChoix(dernier.choix))}</p>
              <p className="bureau-actions">
                <a href={`/api/avoirs/${dernier.id}/pdf`} target="_blank" rel="noreferrer">{t.ouvrirAvoir}</a>
                {dernier.recu_id != null && <a href={`/api/reglements/${dernier.recu_id}/pdf`} target="_blank" rel="noreferrer">{t.ouvrirRemboursement}</a>}
              </p>
            </Note>
          )}
        </div>
        {avoirs !== null && avoirs.length > 0 && (
          <TableauDonnees legende={t.avoirsFacture} legendeVisible colonnes={colonnes} lignes={avoirs} cleLigne={(a) => a.id} vide="" erreur={liste.erreur} />
        )}
      </Panneau>
    </form>
  )
}
