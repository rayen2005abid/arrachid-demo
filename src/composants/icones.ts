// Icônes de l'interface (refonte UI, Session 2) : formes SVG copiées de Lucide (lucide-static 0.460.0, la version de
// prototype/arrachid-mes.html), licence ISC dans LICENSE-Lucide.txt, à côté de ce fichier. Rien n'est chargé par Internet.
//
// Seulement les icônes des onglets approuvés (T-164), de leurs sous-onglets, et des composants :
// - modules : scale (Réception), flask-conical (Laboratoire), factory (Production), briefcase (Bureau),
//   settings (Administration) ;
// - Réception : scale (Pont-bascule), grid-3x3 (Bacs), contact (Apporteurs), ticket (Tickets), truck (Chargements),
//   weight (Pesée directe du Pont-bascule) ;
// - Laboratoire : flask-conical (Analyses d'olives ; list pour la file du labo tant que la fusion n'est pas faite),
//   test-tube (Échantillons) ;
// - Production : calendar-clock (Planification), factory (Trituration › list-ordered Passages, weight Pesées d'huile),
//   droplets (Remise d'huile), gauge (Rendement), cylinder (Cuves › cylinder Cuves, flask-round Analyses d'huile) ;
// - Bureau : wallet (Caisse), users (Décomptes › file-text Décomptes et paiements, scroll-text Comptes), shopping-bag
//   (Ventes › shopping-bag Comptoir, contact Clients, handshake Contrats, receipt Factures), tag (Prix), folder-open
//   (Documents › folder-open Pièces et registres, chart-column Rapports, message-square Journal SMS), notebook-pen
//   (Rattrapage : scale, flask-conical, factory, droplet, cylinder, hand-coins et shopping-bag pour les fiches PAP-01 à
//   PAP-07, file-pen pour Corrections, arrow-left pour « Toutes les fiches ») ;
// - Administration : sliders-horizontal (Paramètres › percent Profils fiscaux, package Articles), user-cog
//   (Utilisateurs), monitor (Postes), activity (Diagnostic), clipboard-list (Données manquantes), printer (Équipements),
//   plug (Adresses des équipements), database (Référentiels), history (Historique) ;
// - Tableau de bord : layout-dashboard (onglet), chevron-down, chevron-left et chevron-right (groupes de la barre,
//   calendrier et agenda), pin et pin-off (boutons épinglés), calendar-plus (nouveau rendez-vous) ;
// - coquille : power (Quitter, écran « fermé sur ce poste »), rotate-ccw (Rouvrir) ;
// - composants : x (fermer le tiroir), info, triangle-alert, octagon-alert et circle-check (notes), check (étape
//   faite), search et printer (Tickets) ; pencil, key-round et link (actions d'administration) ;
// - Laboratoire et Production (Session 5) : arrow-up et arrow-down (ordre de passage), play (démarrer un passage),
//   square (fin de production), arrow-right (destination de l'huile), trash-2 (noter un échantillon détruit).
//
// Ajouter une icône : la copier de lucide-static 0.460.0 (même version), formes seulement, et dire ci-dessus où elle sert.

type Balise = 'path' | 'circle' | 'rect' | 'line' | 'polyline' | 'polygon' | 'ellipse'

interface Attributs {
  d?: string
  cx?: string
  cy?: string
  r?: string
  x?: string
  y?: string
  width?: string
  height?: string
  rx?: string
  ry?: string
  x1?: string
  y1?: string
  x2?: string
  y2?: string
  points?: string
  /** Point plein (« tag ») : peint avec la couleur du texte. */
  fill?: 'currentColor'
}

export type Forme = readonly [Balise, Attributs]

export const ICONES = {
  activity: [['path', { d: 'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2' }]],
  'arrow-down': [['path', { d: 'M12 5v14' }], ['path', { d: 'm19 12-7 7-7-7' }]],
  'arrow-left': [['path', { d: 'm12 19-7-7 7-7' }], ['path', { d: 'M19 12H5' }]],
  'arrow-right': [['path', { d: 'M5 12h14' }], ['path', { d: 'm12 5 7 7-7 7' }]],
  'arrow-up': [['path', { d: 'm5 12 7-7 7 7' }], ['path', { d: 'M12 19V5' }]],
  briefcase: [['path', { d: 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' }], ['rect', { width: '20', height: '14', x: '2', y: '6', rx: '2' }]],
  'calendar-plus': [['path', { d: 'M8 2v4' }], ['path', { d: 'M16 2v4' }], ['path', { d: 'M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8' }], ['path', { d: 'M3 10h18' }], ['path', { d: 'M16 19h6' }], ['path', { d: 'M19 16v6' }]],
  'chevron-down': [['path', { d: 'm6 9 6 6 6-6' }]],
  'chevron-left': [['path', { d: 'm15 18-6-6 6-6' }]],
  'chevron-right': [['path', { d: 'm9 18 6-6-6-6' }]],
  'layout-dashboard': [['rect', { width: '7', height: '9', x: '3', y: '3', rx: '1' }], ['rect', { width: '7', height: '5', x: '14', y: '3', rx: '1' }], ['rect', { width: '7', height: '9', x: '14', y: '12', rx: '1' }], ['rect', { width: '7', height: '5', x: '3', y: '16', rx: '1' }]],
  power: [['path', { d: 'M12 2v10' }], ['path', { d: 'M18.4 6.6a9 9 0 1 1-12.8 0' }]],
  'rotate-ccw': [['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }], ['path', { d: 'M3 3v5h5' }]],
  pin: [['path', { d: 'M12 17v5' }], ['path', { d: 'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z' }]],
  'pin-off': [['path', { d: 'M12 17v5' }], ['path', { d: 'M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89' }], ['path', { d: 'm2 2 20 20' }], ['path', { d: 'M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11' }]],
  'calendar-clock': [['path', { d: 'M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5' }], ['path', { d: 'M16 2v4' }], ['path', { d: 'M8 2v4' }], ['path', { d: 'M3 10h5' }], ['path', { d: 'M17.5 17.5 16 16.3V14' }], ['circle', { cx: '16', cy: '16', r: '6' }]],
  'chart-column': [['path', { d: 'M3 3v16a2 2 0 0 0 2 2h16' }], ['path', { d: 'M18 17V9' }], ['path', { d: 'M13 17V5' }], ['path', { d: 'M8 17v-3' }]],
  check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  'circle-check': [['circle', { cx: '12', cy: '12', r: '10' }], ['path', { d: 'm9 12 2 2 4-4' }]],
  'clipboard-list': [['rect', { width: '8', height: '4', x: '8', y: '2', rx: '1', ry: '1' }], ['path', { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' }], ['path', { d: 'M12 11h4' }], ['path', { d: 'M12 16h4' }], ['path', { d: 'M8 11h.01' }], ['path', { d: 'M8 16h.01' }]],
  contact: [['path', { d: 'M16 2v2' }], ['path', { d: 'M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2' }], ['path', { d: 'M8 2v2' }], ['circle', { cx: '12', cy: '11', r: '3' }], ['rect', { x: '3', y: '4', width: '18', height: '18', rx: '2' }]],
  cylinder: [['ellipse', { cx: '12', cy: '5', rx: '9', ry: '3' }], ['path', { d: 'M3 5v14a9 3 0 0 0 18 0V5' }]],
  database: [['ellipse', { cx: '12', cy: '5', rx: '9', ry: '3' }], ['path', { d: 'M3 5V19A9 3 0 0 0 21 19V5' }], ['path', { d: 'M3 12A9 3 0 0 0 21 12' }]],
  droplet: [['path', { d: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z' }]],
  droplets: [['path', { d: 'M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z' }], ['path', { d: 'M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97' }]],
  factory: [['path', { d: 'M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z' }], ['path', { d: 'M17 18h1' }], ['path', { d: 'M12 18h1' }], ['path', { d: 'M7 18h1' }]],
  'file-pen': [['path', { d: 'M12.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v9.5' }], ['path', { d: 'M14 2v4a2 2 0 0 0 2 2h4' }], ['path', { d: 'M13.378 15.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z' }]],
  'file-text': [['path', { d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' }], ['path', { d: 'M14 2v4a2 2 0 0 0 2 2h4' }], ['path', { d: 'M10 9H8' }], ['path', { d: 'M16 13H8' }], ['path', { d: 'M16 17H8' }]],
  'flask-conical': [['path', { d: 'M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2' }], ['path', { d: 'M8.5 2h7' }], ['path', { d: 'M7 16h10' }]],
  'flask-round': [['path', { d: 'M10 2v7.31' }], ['path', { d: 'M14 9.3V1.99' }], ['path', { d: 'M8.5 2h7' }], ['path', { d: 'M14 9.3a6.5 6.5 0 1 1-4 0' }], ['path', { d: 'M5.52 16h12.96' }]],
  'folder-open': [['path', { d: 'm6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2' }]],
  gauge: [['path', { d: 'm12 14 4-4' }], ['path', { d: 'M3.34 19a10 10 0 1 1 17.32 0' }]],
  'grid-3x3': [['rect', { width: '18', height: '18', x: '3', y: '3', rx: '2' }], ['path', { d: 'M3 9h18' }], ['path', { d: 'M3 15h18' }], ['path', { d: 'M9 3v18' }], ['path', { d: 'M15 3v18' }]],
  'hand-coins': [['path', { d: 'M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17' }], ['path', { d: 'm7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9' }], ['path', { d: 'm2 16 6 6' }], ['circle', { cx: '16', cy: '9', r: '2.9' }], ['circle', { cx: '6', cy: '5', r: '3' }]],
  handshake: [['path', { d: 'm11 17 2 2a1 1 0 1 0 3-3' }], ['path', { d: 'm14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4' }], ['path', { d: 'm21 3 1 11h-2' }], ['path', { d: 'M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3' }], ['path', { d: 'M3 4h8' }]],
  history: [['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }], ['path', { d: 'M3 3v5h5' }], ['path', { d: 'M12 7v5l4 2' }]],
  info: [['circle', { cx: '12', cy: '12', r: '10' }], ['path', { d: 'M12 16v-4' }], ['path', { d: 'M12 8h.01' }]],
  'key-round': [['path', { d: 'M2 18v3a1 1 0 0 0 1 1h4v-3h3v-3h2l1.4-1.4' }], ['circle', { cx: '16.5', cy: '7.5', r: '5.5' }]],
  link: [['path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }], ['path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }]],
  list: [['path', { d: 'M3 12h.01' }], ['path', { d: 'M3 18h.01' }], ['path', { d: 'M3 6h.01' }], ['path', { d: 'M8 12h13' }], ['path', { d: 'M8 18h13' }], ['path', { d: 'M8 6h13' }]],
  'list-ordered': [['path', { d: 'M10 12h11' }], ['path', { d: 'M10 18h11' }], ['path', { d: 'M10 6h11' }], ['path', { d: 'M4 10h2' }], ['path', { d: 'M4 6h1v4' }], ['path', { d: 'M6 18H4c0-1 2-2 2-3s-1-1.5-2-1' }]],
  'message-square': [['path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }]],
  monitor: [['rect', { width: '20', height: '14', x: '2', y: '3', rx: '2' }], ['line', { x1: '8', x2: '16', y1: '21', y2: '21' }], ['line', { x1: '12', x2: '12', y1: '17', y2: '21' }]],
  'notebook-pen': [['path', { d: 'M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4' }], ['path', { d: 'M2 6h4' }], ['path', { d: 'M2 10h4' }], ['path', { d: 'M2 14h4' }], ['path', { d: 'M2 18h4' }], ['path', { d: 'M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z' }]],
  'octagon-alert': [['path', { d: 'M12 16h.01' }], ['path', { d: 'M12 8v4' }], ['path', { d: 'M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z' }]],
  package: [['path', { d: 'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z' }], ['path', { d: 'M12 22V12' }], ['path', { d: 'm3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7' }], ['path', { d: 'm7.5 4.27 9 5.15' }]],
  pencil: [['path', { d: 'M21.174 6.812a1 1 0 0 0-3.986-3.986L3.84 16.174a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z' }], ['path', { d: 'm15 5 4 4' }]],
  percent: [['line', { x1: '19', x2: '5', y1: '5', y2: '19' }], ['circle', { cx: '6.5', cy: '6.5', r: '2.5' }], ['circle', { cx: '17.5', cy: '17.5', r: '2.5' }]],
  play: [['polygon', { points: '6 3 20 12 6 21 6 3' }]],
  plug: [['path', { d: 'M12 22v-5' }], ['path', { d: 'M9 8V2' }], ['path', { d: 'M15 8V2' }], ['path', { d: 'M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z' }]],
  printer: [['path', { d: 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' }], ['path', { d: 'M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6' }], ['rect', { x: '6', y: '14', width: '12', height: '8', rx: '1' }]],
  receipt: [['path', { d: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z' }], ['path', { d: 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8' }], ['path', { d: 'M12 17.5v-11' }]],
  scale: [['path', { d: 'm16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z' }], ['path', { d: 'm2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z' }], ['path', { d: 'M7 21h10' }], ['path', { d: 'M12 3v18' }], ['path', { d: 'M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2' }]],
  'scroll-text': [['path', { d: 'M15 12h-5' }], ['path', { d: 'M15 8h-5' }], ['path', { d: 'M19 17V5a2 2 0 0 0-2-2H4' }], ['path', { d: 'M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3' }]],
  search: [['circle', { cx: '11', cy: '11', r: '8' }], ['path', { d: 'm21 21-4.3-4.3' }]],
  settings: [['path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }], ['circle', { cx: '12', cy: '12', r: '3' }]],
  'shopping-bag': [['path', { d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z' }], ['path', { d: 'M3 6h18' }], ['path', { d: 'M16 10a4 4 0 0 1-8 0' }]],
  'sliders-horizontal': [['line', { x1: '21', x2: '14', y1: '4', y2: '4' }], ['line', { x1: '10', x2: '3', y1: '4', y2: '4' }], ['line', { x1: '21', x2: '12', y1: '12', y2: '12' }], ['line', { x1: '8', x2: '3', y1: '12', y2: '12' }], ['line', { x1: '21', x2: '16', y1: '20', y2: '20' }], ['line', { x1: '12', x2: '3', y1: '20', y2: '20' }], ['line', { x1: '14', x2: '14', y1: '2', y2: '6' }], ['line', { x1: '8', x2: '8', y1: '10', y2: '14' }], ['line', { x1: '16', x2: '16', y1: '18', y2: '22' }]],
  square: [['rect', { width: '18', height: '18', x: '3', y: '3', rx: '2' }]],
  tag: [['path', { d: 'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z' }], ['circle', { cx: '7.5', cy: '7.5', r: '.5', fill: 'currentColor' }]],
  'test-tube': [['path', { d: 'M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5c-1.4 0-2.5-1.1-2.5-2.5V2' }], ['path', { d: 'M8.5 2h7' }], ['path', { d: 'M14.5 16h-5' }]],
  ticket: [['path', { d: 'M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z' }], ['path', { d: 'M13 5v2' }], ['path', { d: 'M13 17v2' }], ['path', { d: 'M13 11v2' }]],
  'trash-2': [['path', { d: 'M3 6h18' }], ['path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' }], ['path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' }], ['line', { x1: '10', x2: '10', y1: '11', y2: '17' }], ['line', { x1: '14', x2: '14', y1: '11', y2: '17' }]],
  'triangle-alert': [['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' }], ['path', { d: 'M12 9v4' }], ['path', { d: 'M12 17h.01' }]],
  truck: [['path', { d: 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2' }], ['path', { d: 'M15 18H9' }], ['path', { d: 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14' }], ['circle', { cx: '17', cy: '18', r: '2' }], ['circle', { cx: '7', cy: '18', r: '2' }]],
  'user-cog': [['circle', { cx: '18', cy: '15', r: '3' }], ['circle', { cx: '9', cy: '7', r: '4' }], ['path', { d: 'M10 15H6a4 4 0 0 0-4 4v2' }], ['path', { d: 'm21.7 16.4-.9-.3' }], ['path', { d: 'm15.2 13.9-.9-.3' }], ['path', { d: 'm16.6 18.7.3-.9' }], ['path', { d: 'm19.1 12.2.3-.9' }], ['path', { d: 'm19.6 18.7-.4-1' }], ['path', { d: 'm16.8 12.3-.4-1' }], ['path', { d: 'm14.3 16.6 1-.4' }], ['path', { d: 'm20.7 13.8 1-.4' }]],
  users: [['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }], ['circle', { cx: '9', cy: '7', r: '4' }], ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }], ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }]],
  wallet: [['path', { d: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1' }], ['path', { d: 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4' }]],
  weight: [['circle', { cx: '12', cy: '5', r: '3' }], ['path', { d: 'M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z' }]],
  x: [['path', { d: 'M18 6 6 18' }], ['path', { d: 'm6 6 12 12' }]],
} satisfies Record<string, readonly Forme[]>

export type NomIcone = keyof typeof ICONES

export const NOMS_ICONES = Object.keys(ICONES) as NomIcone[]
