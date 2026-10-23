import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLecture } from '../api/useLecture'
import { Chiffres } from '../composants/Chiffres'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { Jauge as JaugeNiveau } from '../composants/Jauge'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { CorrectionFait } from '../corrections/CorrectionFait'
import { correctionMouvement, correctionOuverte, type Correction } from '../corrections/huile'
import { formaterHorodatage } from '../format/dates'
import { afficherCentiemes } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import { afficherAciditePortee, afficherKg, cheminMouvements, decrireApporteurs, decrireOrigine, largeurJauge, marque, poidsSigne, type AnalyseCuve, type DetailCuve as Detail, type MouvementCuve } from './logique'
import { Acidite, Jauge, Qualite } from './composants'
import { PanneauOperations } from './OperationsCuve'
import { useOperationsCuve } from './useOperationsCuve'

const t = libelles.cuves
const PERIODE_MS = 5000
const CHEMIN_LISTE = '/production/cuves'

/** Détail d'une cuve (CONTEXTE §17.4, §18) : son état, ses opérations, ses analyses et ses mouvements avec leur origine. */
export function DetailCuve({ cuveId }: { cuveId: number }) {
  const naviguer = useNavigate()
  const detail = useLecture<Detail>(cheminMouvements(cuveId), PERIODE_MS)
  const cuve = detail.donnees?.cuve ?? null
  const analyses = detail.donnees?.analyses ?? []
  const mouvements = detail.donnees?.mouvements ?? []
  const operations = useOperationsCuve(detail.donnees, detail.recharger)
  const inactive = cuve !== null && !cuve.active
  // Mouvement manuel que le responsable est en train d'annuler ou de corriger (T4.10), dans un tiroir.
  const [demande, definirDemande] = useState<Correction | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const corrigeables = detail.donnees?.mouvements_corrigeables ?? []
  const ouverte = correctionOuverte(demande, corrigeables)
  const principal = operations.principal

  const colonnesAnalyses: Colonne<AnalyseCuve>[] = [
    { cle: 'reference', titre: t.analyse.reference, rendu: (a) => <span className="prod-chiffres-texte">{a.reference}</span> },
    { cle: 'preleve', titre: t.analyse.preleve, rendu: (a) => formaterHorodatage(a.preleve_le), nombre: true },
    { cle: 'acidite', titre: t.analyse.acidite, rendu: (a) => afficherCentiemes(a.acidite_centiemes), nombre: true },
    { cle: 'classement', titre: t.analyse.classement, rendu: (a) => t.qualites[a.classement] },
  ]

  const colonnesMouvements: Colonne<MouvementCuve>[] = [
    { cle: 'numero', titre: t.mouvement.numero, rendu: (m) => m.id, nombre: true },
    { cle: 'date', titre: t.mouvement.date, rendu: (m) => formaterHorodatage(m.horodatage), nombre: true },
    {
      cle: 'type',
      titre: t.mouvement.type,
      rendu: (m) => {
        const correction = marque(m)
        return (
          <span className="prod-actions">
            {t.types[m.type]}
            {correction === 'extourne' && (
              <>
                <Pastille ton="erreur">{t.extourne}</Pastille>
                {m.extourne_de_id !== null && <span className="aide">{t.extourneDe.replace('{id}', String(m.extourne_de_id))}</span>}
              </>
            )}
            {correction === 'annule' && <Pastille ton="erreur">{t.annule}</Pastille>}
          </span>
        )
      },
    },
    { cle: 'poids', titre: t.mouvement.poids, rendu: (m) => <span className={m.sens === 'entree' ? 'prod-entree' : 'prod-sortie'}>{poidsSigne(m)}</span>, nombre: true },
    { cle: 'acidite', titre: t.mouvement.acidite, rendu: (m) => afficherAciditePortee(m), nombre: true },
    {
      cle: 'campagne',
      titre: t.mouvement.campagne,
      rendu: (m) => <>{m.campagne_origine.libelle}{m.melange_autorise && <span className="aide"> ({t.melangeAutorise})</span>}</>,
    },
    { cle: 'origine', titre: t.mouvement.origine, rendu: (m) => decrireOrigine(m.origine) },
    { cle: 'apporteur', titre: t.mouvement.apporteur, rendu: (m) => decrireApporteurs(m.origine) || '—' },
    { cle: 'operateur', titre: t.mouvement.operateur, rendu: (m) => m.operateur },
    ...(corrigeables.length > 0
      ? [
          {
            cle: 'correction',
            titre: libelles.correctionsHuile.colonne,
            rendu: (m: MouvementCuve) =>
              corrigeables.includes(m.id) && m.id !== ouverte?.id && (
                <button type="button" className="bouton-secondaire bouton-petit" onClick={() => { operations.ouvrir(null); operations.definirMessage(null); definirMessage(null); definirDemande(correctionMouvement(m)) }}>
                  {m.type === 'purge' ? libelles.correctionsHuile.corriger : libelles.correctionsHuile.annulerMouvement}
                </button>
              ),
          },
        ]
      : []),
  ]

  return (
    <section>
      <EnTeteEcran
        code="CUV-02"
        titre={cuve === null ? libelles.ecrans.cuves : t.titreDetail.replace('{code}', cuve.code)}
        sousTitre={cuve?.libelle}
        message={inactive ? { texte: t.inactive, type: 'alerte' } : (operations.message ?? message)}
        principal={principal ?? { etiquette: t.retour, surClic: () => naviguer(CHEMIN_LISTE) }}
      >
        {principal !== null && <button type="button" className="bouton-secondaire" onClick={() => naviguer(CHEMIN_LISTE)}>{t.retour}</button>}
      </EnTeteEcran>
      <div className="mes-page prod-page">
        {detail.erreur !== null && <Note ton="erreur">{detail.erreur}</Note>}
        {cuve !== null && (
          <>
            <Panneau titre={t.titreDetail.replace('{code}', cuve.code)} icone="cylinder" compte={t.capacite.replace('{capacite}', afficherKg(cuve.capacite_g))}>
              <div className="cuve-detail">
                <JaugeNiveau niveau={largeurJauge(cuve.remplissage_centiemes)} sens="verticale" qualite={cuve.qualite_affectee} />
                <div className="cuve-chiffres">
                  <Chiffres
                    valeurs={[
                      { etiquette: t.chiffres.stock, valeur: t.kg.replace('{poids}', afficherKg(cuve.stock_calcule_g)) },
                      { etiquette: t.chiffres.remplissage, valeur: <Jauge cuve={cuve} /> },
                      { etiquette: t.chiffres.acidite, valeur: <Acidite cuve={cuve} /> },
                      { etiquette: t.chiffres.reserve, valeur: t.kg.replace('{poids}', afficherKg(cuve.stock_reserve_g)) },
                      { etiquette: t.chiffres.disponible, valeur: t.kg.replace('{poids}', afficherKg(cuve.stock_disponible_g)), ton: 'fort' },
                      { etiquette: t.chiffres.qualite, valeur: <Qualite cuve={cuve} />, texte: true },
                      { etiquette: t.chiffres.campagnes, valeur: cuve.campagnes_origine.length === 0 ? '—' : cuve.campagnes_origine.map((c) => c.libelle).join(', '), texte: true },
                    ]}
                  />
                </div>
              </div>
            </Panneau>

            <PanneauOperations operations={operations} />

            {analyses.length > 0 && (
              <Panneau titre={t.titreAnalyses} icone="flask-round" compte={analyses.length} serre>
                <TableauDonnees legende={t.titreAnalyses} colonnes={colonnesAnalyses} lignes={analyses} cleLigne={(a) => a.id} vide={t.aucunMouvement} className="tableau-cuves" />
              </Panneau>
            )}

            <Panneau titre={t.titreMouvements} icone="list" compte={mouvements.length} serre>
              <TableauDonnees
                legende={t.titreMouvements}
                colonnes={colonnesMouvements}
                lignes={mouvements}
                cleLigne={(m) => m.id}
                vide={t.aucunMouvement}
                className="tableau-cuves tableau-mouvements"
                classeLigne={(m) => (marque(m) === null ? undefined : 'prod-corrige')}
              />
            </Panneau>
          </>
        )}
      </div>

      {ouverte !== null && (
        <CorrectionFait
          key={ouverte.id}
          correction={ouverte}
          surSucces={async (texte) => { definirDemande(null); definirMessage({ texte, type: 'ok' }); await detail.recharger() }}
          surFermeture={() => definirDemande(null)}
        />
      )}
    </section>
  )
}
