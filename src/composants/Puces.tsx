// Filtres en puces (maquette MES) : un choix à la fois. Le nombre d'un filtre, s'il est montré, compte exactement les
// lignes renvoyées par le serveur (audit §4.4). Remplace au fil de la refonte les filtres en listes déroulantes.
export interface Puce<V extends string> {
  valeur: V
  libelle: string
  nombre?: number
}

interface Props<V extends string> {
  libelle: string
  puces: readonly Puce<V>[]
  valeur: V
  surChoisir: (valeur: V) => void
}

export function Puces<V extends string>({ libelle, puces, valeur, surChoisir }: Props<V>) {
  return (
    <div className="mes-puces" role="group" aria-label={libelle}>
      {puces.map((puce) => (
        <button key={puce.valeur} type="button" className="mes-puce" aria-pressed={puce.valeur === valeur} onClick={() => surChoisir(puce.valeur)}>
          {puce.libelle}
          {puce.nombre !== undefined && <span className="mes-puce-nombre">{puce.nombre}</span>}
        </button>
      ))}
    </div>
  )
}
