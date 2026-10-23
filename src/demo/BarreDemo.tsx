import { useState } from 'react'
import { Link } from 'react-router-dom'
import { moteur } from './moteur'
import './demo.css'

export function BarreDemo() {
  const [guide, montrerGuide] = useState(false)
  const reinitialiser = () => {
    if (!window.confirm('Réinitialiser la démo ? Vos essais et rendez-vous seront effacés dans ce navigateur.')) return
    moteur.reinitialiser()
    try { for (const cle of ['arrachid.tableau.agenda', 'arrachid.tableau.epingles']) localStorage.removeItem(cle) } catch { /* Stockage facultatif. */ }
    window.location.assign('/tableau-de-bord')
  }
  return <>
    <aside className="demo-bandeau" aria-label="Mode démonstration">
      <span><strong>DÉMONSTRATION</strong> · Données fictives · Propriétaire · Vos essais restent dans ce navigateur</span>
      <div><button type="button" onClick={() => montrerGuide(true)}>Guide démo</button><button type="button" onClick={reinitialiser}>Réinitialiser la démo</button></div>
    </aside>
    {guide && <div className="demo-voile"><section className="demo-guide" role="dialog" aria-modal="true" aria-label="Guide démo" onKeyDown={e => { if (e.key === 'Escape') montrerGuide(false) }}>
      <h1>Explorer et tester la plateforme</h1>
      <p>Vous êtes Propriétaire. Aucun compte ni code PIN n’est nécessaire. Les exemples sont fictifs ; chaque visiteur dispose de ses propres essais.</p>
      <ol>
        <li><Link to="/apporteurs" onClick={() => montrerGuide(false)}>Apporteurs</Link> : créez une fiche puis modifiez-la.</li>
        <li><Link to="/receptions" onClick={() => montrerGuide(false)}>Réception</Link> : essayez une arrivée, un déchargement et une tare, ou une pesée directe de petit lot.</li>
        <li><Link to="/laboratoire/analyses" onClick={() => montrerGuide(false)}>Laboratoire</Link> : sélectionnez un lot en attente puis saisissez son analyse.</li>
        <li><Link to="/bureau/clients" onClick={() => montrerGuide(false)}>Clients</Link>, <Link to="/bureau/caisse" onClick={() => montrerGuide(false)}>caisse</Link> et <Link to="/administration/referentiels" onClick={() => montrerGuide(false)}>référentiels</Link> : créez ou modifiez une fiche et essayez un apport de fonds.</li>
        <li><Link to="/administration/parametres" onClick={() => montrerGuide(false)}>Paramètres</Link> : changez une valeur de démonstration sans PIN.</li>
      </ol>
      <p>Les autres écrans présentent la campagne d’exemple. Les opérations non simulées affichent une explication. Les imprimantes, SMS, sauvegardes, services fiscaux et documents PDF officiels restent simulés ou en aperçu. Aucun envoi réel n’a lieu.</p>
      <p>Les modifications sont conservées localement si votre navigateur l’autorise. « Réinitialiser la démo » restaure les exemples.</p>
      <button type="button" className="bouton-principal" autoFocus onClick={() => montrerGuide(false)}>Commencer la visite</button>
    </section></div>}
  </>
}
