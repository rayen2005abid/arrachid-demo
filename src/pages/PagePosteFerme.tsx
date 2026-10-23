import { Icone } from '../composants/Icone'
import { rouvrirLePoste, type PosteFerme } from '../contextes/fermeture'
import { libelles } from '../libelles'

const q = libelles.quitter

/** Écran affiché après « Quitter » : l'application est fermée sur ce poste, le serveur continue. */
export function PagePosteFerme({ ferme }: { ferme: PosteFerme }) {
  const f = q.ferme
  const etats = [
    [q.serveur, q.continue],
    [q.autresPostes, q.continuent],
    [q.enregistre, q.conserve],
  ] as const
  return (
    <main className="mes-ferme">
      <p className="mes-ferme-marque">
        <span className="mes-logo" aria-hidden="true"><span /><span /><span /><span /></span>
        <span className="mes-nom"><span>{libelles.coquille.module}</span>{libelles.application.nom}</span>
      </p>
      <section className="mes-ferme-carte" aria-labelledby="titre-poste-ferme">
        <span className="mes-ferme-pictogramme" aria-hidden="true"><Icone nom="power" /></span>
        <h1 id="titre-poste-ferme">{f.titre}</h1>
        <p className="mes-ferme-heure chiffres">{f.detail.replace('{heure}', ferme.heure).replace('{nom}', ferme.par)}</p>
        <dl className="mes-ferme-etats">
          {etats.map(([sujet, etat]) => (
            <div key={sujet}>
              <dt>{sujet}</dt>
              <dd><Icone nom="circle-check" />{etat}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className="mes-ferme-rouvrir" onClick={rouvrirLePoste}><Icone nom="rotate-ccw" />{f.rouvrir}</button>
        <p className="mes-ferme-aide">{f.aide}</p>
      </section>
    </main>
  )
}
