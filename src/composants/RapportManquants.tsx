import { useLecture } from '../api/useLecture'
import { libelles } from '../libelles'
import type { TypePoste } from '../types'
import { AfficheErreur } from './AfficheErreur'
import { CHEMIN_MANQUANTS, modulesIndisponibles, phraseModule, type ModuleManquants } from './manquants'
import { Note } from './Note'

const l = libelles.manquants
const b = libelles.bandeauModules

/** Liste des modules : prêt, ou ce qui manque (`GET /api/mise-en-service/manquants`). */
export function ListeManquants({ modules }: { modules: readonly ModuleManquants[] }) {
  return (
    <ul className="liste-modules">
      {[...modules].sort((a, b) => Number(a.pret) - Number(b.pret)).map((m) => (
        <li key={m.module} className={m.pret ? 'module module-pret' : 'module module-incomplet'}>
          <strong>{m.libelle}</strong> <span className="etat-module">{m.pret ? l.pret : l.incomplet}</span>
          {m.parametres_manquants.length > 0 && (
            <p>{l.parametres} : {m.parametres_manquants.map((p) => p.libelle).join(' ; ')}</p>
          )}
          {m.donnees_manquantes.length > 0 && <p>{l.donnees} : {m.donnees_manquantes.map((d) => d.libelle).join(' ; ')}</p>}
          {m.avertissements.length > 0 && <p>{l.avertissements} : {m.avertissements.map((d) => d.libelle).join(' ; ')}</p>}
        </li>
      ))}
    </ul>
  )
}

/** Section autonome : lit le rapport et l'affiche ; une nouvelle `key` React le relit (après une saisie). */
export function RapportManquants({ titreNiveau = 'h2' }: { titreNiveau?: 'h1' | 'h2' }) {
  const { donnees, erreur } = useLecture<{ modules: ModuleManquants[] }>(CHEMIN_MANQUANTS)
  const Titre = titreNiveau
  return (
    <section className="panneau" aria-label={l.titre}>
      <Titre>{l.titre}</Titre>
      <p className="aide">{l.aide}</p>
      <AfficheErreur erreur={erreur} />
      {donnees === null && erreur === null && <p className="aide">{libelles.commun.chargement}</p>}
      {donnees !== null && <ListeManquants modules={donnees.modules} />}
    </section>
  )
}

/** Le bandeau lui-même : rien quand tous les modules du poste sont prêts. */
export function ListeBandeau({ modules, typePoste }: { modules: readonly ModuleManquants[]; typePoste: TypePoste }) {
  const indisponibles = modulesIndisponibles(modules, typePoste)
  if (indisponibles.length === 0) return null
  return (
    <section className="mes-bandeau-modules" aria-label={b.nom}>
      <Note ton="alerte"><>{indisponibles.map((m) => <p key={m.module}>{phraseModule(m)}</p>)}</></Note>
    </section>
  )
}

/** EM-02 : tous les rôles voient, sur leur poste, pourquoi un de ses modules est indisponible ; relu chaque minute. */
export function BandeauModules({ typePoste, permissions }: { typePoste: TypePoste; permissions: readonly string[] }) {
  const lisible = permissions.includes('consulter_operations')
  const { donnees } = useLecture<{ modules?: unknown }>(lisible ? CHEMIN_MANQUANTS : null, 60_000)
  // Un bandeau ne casse jamais l'écran : une réponse inattendue ne montre rien.
  if (donnees === null || !Array.isArray(donnees.modules)) return null
  return <ListeBandeau modules={donnees.modules as ModuleManquants[]} typePoste={typePoste} />
}
