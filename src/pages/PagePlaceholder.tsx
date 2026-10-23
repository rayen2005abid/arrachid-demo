import { libelles } from '../libelles'
import { EnTeteEcran } from '../composants/EnTeteEcran'

/** Écran pas encore construit : à remplacer dans `src/pages/ecrans.tsx`. */
export function PagePlaceholder({ titre }: { titre: string }) {
  return (
    <section>
      <EnTeteEcran titre={titre} />
      <div className="mes-page">
      <p className="aide">{libelles.commun.prochainement}</p>
    </div>
    </section>
  )
}
