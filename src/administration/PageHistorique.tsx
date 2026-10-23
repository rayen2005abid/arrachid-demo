import { useState, type FormEvent } from 'react'
import { useLecture } from '../api/useLecture'
import { AfficheErreur } from '../composants/AfficheErreur'
import { useSessionOuverte } from '../contextes/session'
import { libelles } from '../libelles'
import { Champ, Choix, Chronologie } from './composants'
import { tablesLisibles, type TableHistorique } from './logique'
import { lireEntier } from './unites'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { Panneau } from '../composants/Panneau'

const a = libelles.administration
const h = a.historiqueVue

/** Visionneuse d'historique : type de fiche, puis la fiche, puis sa chronologie. */
export function PageHistorique() {
  const { permissions } = useSessionOuverte()
  const tables = tablesLisibles(permissions)
  const [table, definirTable] = useState('')
  const choisie = tables.find((t) => t.table === table) ?? null
  return (
    <section>
      <EnTeteEcran titre={libelles.ecrans.historique} />
      <div className="mes-page">
      <Panneau titre={h.ficheConsulter}>
      <Choix
        id="table"
        libelle={h.table}
        valeur={table}
        surChangement={definirTable}
        options={tables.map((t) => ({ valeur: t.table, libelle: h.tables[t.table as keyof typeof h.tables] }))}
      />
      {choisie !== null && <ChoixFiche key={choisie.table} table={choisie} />}
      </Panneau>
    </div>
    </section>
  )
}

function ChoixFiche({ table }: { table: TableHistorique }) {
  const { donnees, erreur } = useLecture<Record<string, unknown>[]>(table.liste?.chemin ?? null)
  const [saisie, definirSaisie] = useState('')
  const [affichee, definirAffichee] = useState<number | null>(null)

  const afficher = (e: FormEvent) => {
    e.preventDefault()
    definirAffichee(lireEntier(saisie))
  }

  return (
    <>
      <AfficheErreur erreur={erreur} />
      <form onSubmit={afficher} className="actions-ligne">
        {table.liste !== undefined ? (
          <Choix
            id="fiche"
            libelle={h.fiche}
            valeur={saisie}
            surChangement={(v) => { definirSaisie(v); definirAffichee(lireEntier(v)) }}
            options={(donnees ?? []).map((f) => ({ valeur: String(f.id), libelle: table.liste?.libelle(f) ?? String(f.id) }))}
          />
        ) : (
          <>
            <Champ id="fiche" libelle={h.numeroFiche} inputMode="numeric" valeur={saisie} surChangement={definirSaisie} autoFocus />
            <button type="submit" className="bouton-principal">{h.afficher}</button>
          </>
        )}
      </form>
      {affichee !== null && <Chronologie key={affichee} table={table.table} ligneId={affichee} />}
    </>
  )
}
