import { useLocation, Link } from 'react-router-dom'
import { moteur } from './moteur'
import { VueDocument } from '../documents/VueDocument'
import type { Ligne } from './modele'

export function ApercuDemo() {
  const { pathname, search } = useLocation()
  let valeur: Ligne | null = null
  try { valeur = moteur.executer('GET', pathname.replace(/\/pdf$|\.pdf$/, '') + search) as Ligne } catch { /* Aperçu indisponible indiqué ci-dessous. */ }
  return <main className="demo-document">
    <h1>Aperçu de démonstration</h1>
    <p>Données fictives — ce document n’a aucune valeur comptable ou fiscale.</p>
    {valeur?.sections ? <VueDocument document={valeur as never} pdf={null} /> : <p>Le document officiel est produit par le serveur de la plateforme complète. Cette démo sans serveur permet de consulter les informations dans les écrans correspondants.</p>}
    <Link to="/tableau-de-bord">Retour au tableau de bord</Link>
  </main>
}
