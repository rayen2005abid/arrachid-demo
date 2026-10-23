import { Panneau } from '../composants/Panneau'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'
import type { DocumentEdite, SectionDocument } from './documents'

const t = libelles.documents

/** Colonnes d'une section : le serveur envoie ses titres et des valeurs déjà mises en forme. */
function colonnes(section: SectionDocument): Colonne<{ rang: number; valeurs: string[] }>[] {
  return section.colonnes.map((titre, i) => ({ cle: `${i}`, titre, rendu: (ligne) => ligne.valeurs[i] }))
}

/** Aperçu à l'écran du document que le PDF imprime, section par section. */
export function VueDocument({ document, pdf }: { document: DocumentEdite; pdf: string | null }) {
  return (
    <Panneau
      titre={document.titre}
      icone="file-text"
      actions={pdf !== null ? <a href={pdf} target="_blank" rel="noreferrer">{t.ouvrirPdf}</a> : undefined}
      className="bureau-document"
    >
      <div className="bureau-formulaire">
        {document.entete.length > 0 && (
          <div className="bureau-entete-document">
            {document.entete.map((ligne, index) => <p key={index}>{ligne}</p>)}
          </div>
        )}
        <p className="bureau-aide">{t.edite.replace('{date}', formaterHorodatage(document.edite_le)).replace('{auteur}', document.edite_par)}</p>
        {document.sections.map((section) => (
          <TableauDonnees
            key={section.titre}
            legende={section.titre}
            legendeVisible
            colonnes={colonnes(section)}
            lignes={section.lignes.map((valeurs, rang) => ({ rang, valeurs }))}
            cleLigne={(ligne) => ligne.rang}
            vide={section.vide}
          />
        ))}
      </div>
    </Panneau>
  )
}
