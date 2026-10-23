# Arrachid — Démo Propriétaire

Copie autonome de l’interface Arrachid pour **consulter et essayer** la plateforme. Accès direct au rôle Propriétaire, sans connexion, appairage, code PIN, serveur Python ni base de données.

## Démarrer

Prérequis : Node.js et npm.

```powershell
npm ci
npm run dev
```

Ouvrir l’adresse indiquée par Vite. « Guide démo » présente les parcours disponibles.

## Ce que vous pouvez tester

- Navigation des écrans du propriétaire, recherches, filtres, détails, agenda et raccourcis.
- Création et modification des apporteurs et clients.
- Arrivée d’une réception, déchargement, tare et pesée directe ; création du ticket fictif et apparition au laboratoire.
- Prélèvement d’échantillon, saisie d’une analyse et fixation d’un prix.
- Apport et sortie de fonds avec actualisation de la caisse et du journal.
- Vente au détail : aperçu du panier, encaissement fictif, stock et historique actualisés.
- Création et modification des référentiels et des valeurs de paramètres.

Les autres opérations, notamment les corrections financières, règlements, clôtures, transferts et la réalisation complète d’une trituration, sont présentées avec des exemples ; les commandes non simulées donnent un message explicite. Le simulateur illustre les parcours et ne remplace pas les contrôles métier du serveur de production.

Les imprimantes, SMS, sauvegardes et services fiscaux ne sont jamais contactés. Les liens vers les documents officiels ouvrent un aperçu de démonstration ou une explication. Les aperçus de tickets sont des illustrations signalées comme fictives. Aucun document fiscal officiel n’est généré.

## Données et réinitialisation

Toutes les données fournies sont fictives et proviennent d’une nouvelle campagne d’essai générée pour cette copie. Aucun fichier SQLite, secret, PIN réel ou export de production n’est fourni. `src/demo/donnees.json` contient uniquement les exemples JSON.

Les essais sont conservés dans le stockage local du navigateur sous `arrachid.demo.v1`. Ils ne sont partagés avec personne. Si ce stockage est indisponible, la visite fonctionne en mémoire et les essais disparaissent au rechargement. « Réinitialiser la démo » restaure les exemples et efface l’agenda et les raccourcis de cette démo après confirmation.

## Héberger sur Vercel

1. Pousser **ce dossier** dans un dépôt Git distinct.
2. Dans Vercel, importer ce dépôt et sélectionner **Vite**.
3. Utiliser la racine du dépôt, `npm run build` comme commande de compilation et `dist` comme dossier de sortie.

`vercel.json` contient ces réglages et le renvoi des routes vers `index.html`, pour permettre les liens directs et le rechargement de chaque écran. Aucune variable d’environnement et aucune base de données ne sont nécessaires.

Ce dossier est autonome : il n’utilise aucun fichier du projet Arrachid-Software voisin. `node_modules`, `dist`, les résultats de tests et `.vercel` sont exclus par `.gitignore`.

## Vérifier

```powershell
npm test
npm run lint
npm run build
npm run e2e
```

Les tests navigateur utilisent Google Chrome installé. Pour prévisualiser le résultat compilé : `npm run preview`.

## Organisation

- `src/` : copie des écrans existants et adaptations propres à cette démo.
- `src/demo/` : données fictives, simulateur local, accès direct, bandeau et guide.
- `e2e/` : vérification des écrans et parcours sans serveur métier.
- `docs/` : conception et plan de réalisation.

La plateforme d’origine reste un projet distinct, avec son authentification et son serveur métier.
