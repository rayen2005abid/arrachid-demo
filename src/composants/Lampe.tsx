// Voyant carré (maquette MES) et son texte : serveur, imprimante, caisse ouverte… Remplace `.voyant`.
// L'état vient du serveur ; `eteinte` quand il n'est pas encore connu.
export type EtatLampe = 'ok' | 'alerte' | 'erreur' | 'eteinte'

interface Props {
  etat: EtatLampe
  libelle: string
  /** Voyant seul à l'écran (dans un onglet) : le libellé reste lu par les lecteurs d'écran et en info-bulle. */
  libelleCache?: boolean
}

export function Lampe({ etat, libelle, libelleCache = false }: Props) {
  return (
    <span className={`mes-lampe mes-lampe-${etat}`} title={libelleCache ? libelle : undefined}>
      {libelleCache ? <span className="visuellement-cache">{libelle}</span> : libelle}
    </span>
  )
}
