// Cuve choisie dans la cave à huile (CUV-01, d'après prototype/prototype-huilerie-v3.html) : ses chiffres, son dernier
// contrôle à la réglette et ses derniers mouvements ; la fiche complète (CUV-02) garde les opérations et tout l'historique.
import { Link } from 'react-router-dom'
import { useLecture } from '../api/useLecture'
import { Chiffres } from '../composants/Chiffres'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { formaterHorodatage } from '../format/dates'
import { afficherCentiemes } from '../laboratoire/analyse'
import { libelles } from '../libelles'
import { Acidite, Jauge, Qualite } from './composants'
import { afficherAciditePortee, afficherKg, cheminMouvements, decrireApporteurs, decrireOrigine, marque, poidsSigne, type Cuve, type DetailCuve, type MouvementCuve } from './logique'

const t = libelles.cuves
const PERIODE_MS = 5000
const MOUVEMENTS_MONTRES = 6

const colonnes: Colonne<MouvementCuve>[] = [
  { cle: 'date', titre: t.mouvement.date, rendu: (m) => formaterHorodatage(m.horodatage), nombre: true },
  { cle: 'type', titre: t.mouvement.type, rendu: (m) => t.types[m.type] },
  { cle: 'origine', titre: t.mouvement.origine, rendu: (m) => decrireOrigine(m.origine) },
  { cle: 'apporteur', titre: t.mouvement.apporteur, rendu: (m) => decrireApporteurs(m.origine) || '—' },
  { cle: 'poids', titre: t.mouvement.poids, rendu: (m) => <span className={m.sens === 'entree' ? 'prod-entree' : 'prod-sortie'}>{poidsSigne(m)}</span>, nombre: true },
  { cle: 'acidite', titre: t.mouvement.acidite, rendu: (m) => afficherAciditePortee(m), nombre: true },
]

export function CuveChoisie({ cuve }: { cuve: Cuve }) {
  const chemin = cheminMouvements(cuve.id)
  const detail = useLecture<DetailCuve>(chemin, PERIODE_MS)
  // Juste après un changement de cuve, les données lues sont encore celles de la précédente : on ne les montre pas.
  const lu = detail.cheminLu === chemin ? detail.donnees : null
  const mouvements = lu?.mouvements ?? []
  const controle = lu?.inventaires?.[0]
  const etat = t.cave.etat
    .replace('{stock}', afficherKg(cuve.stock_calcule_g))
    .replace('{capacite}', afficherKg(cuve.capacite_g))
    .replace('{remplissage}', afficherCentiemes(cuve.remplissage_centiemes))

  return (
    <Panneau
      titre={t.titreDetail.replace('{code}', cuve.code)}
      icone="cylinder"
      compte={<span className="prod-chiffres-texte">{etat}</span>}
      className="cuve-choisie"
      actions={
        <Link className="bouton-secondaire bouton-petit" to={`?cuve=${cuve.id}`} aria-label={t.ouvrirCuve.replace('{code}', cuve.code)}>
          {t.ouvrir}
        </Link>
      }
    >
      <div className="cave-choisie">
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
        {cuve.etat_acidite === 'inconnue' && <Note ton="alerte">{t.aideInconnue}</Note>}
        {cuve.etat_acidite === 'a_verifier' && <Note ton="alerte">{t.aideAVerifier}</Note>}
        {lu !== null && (
          <p className="prod-discret">
            {controle === undefined
              ? t.cave.aucunControle
              : t.cave.reglette
                  .replace('{date}', formaterHorodatage(controle.horodatage))
                  .replace('{mesure}', afficherKg(controle.mesure_physique_g))
                  .replace('{calcule}', afficherKg(controle.stock_calcule_g))
                  .replace('{ecart}', afficherKg(controle.ecart_g))}
          </p>
        )}
        <TableauDonnees
          legende={t.cave.derniersMouvements}
          legendeVisible
          colonnes={colonnes}
          lignes={lu === null ? null : mouvements.slice(0, MOUVEMENTS_MONTRES)}
          cleLigne={(m) => m.id}
          vide={t.aucunMouvement}
          erreur={detail.erreur}
          className="cave-mouvements"
          classeLigne={(m) => (marque(m) === null ? undefined : 'prod-corrige')}
        />
        {mouvements.length > MOUVEMENTS_MONTRES && <p className="prod-discret">{t.cave.autresMouvements.replace('{nombre}', String(mouvements.length))}</p>}
      </div>
    </Panneau>
  )
}
