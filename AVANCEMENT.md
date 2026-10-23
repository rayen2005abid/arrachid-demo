# Avancement — Démo Propriétaire

Livrée le 23 octobre 2026 dans un dossier et un dépôt Git autonomes `Arrachid-Demo`.

## Réalisé

- Interface copiée, accès direct Propriétaire, aucune authentification ni base de données à l’exécution.
- Données fictives, simulateur local, persistance navigateur et réinitialisation avec confirmation.
- Parcours testables et limites détaillés dans README.md ; aucune réussite fictive pour une commande non prise en charge.
- Configuration Vercel et aperçu local de la compilation prêts.

## Vérifications du dossier autonome

- `npm ci` : 216 dépendances installées selon le verrouillage, sans lien vers le projet d’origine.
- `npm test` : **15 tests réussis**.
- `npm run e2e` : **6 scénarios réussis**, dont la visite de tous les écrans du propriétaire sans requête métier réseau, création/rechargement/réinitialisation, mobile, analyse et caisse sans PIN, paramètres et vente, réception directe jusqu’au laboratoire.
- `npm run lint` : aucune erreur ; un avertissement hérité de rafraîchissement de développement dans IconesAcces.tsx.
- `npm run build` : TypeScript et Vite réussis ; avertissement de taille de paquet (environ 289 ko gzip) lié à la copie de l’interface complète et des exemples.
- Aperçu de production : tableau de bord, fiche lot n° 12, rechargement du lien documentaire et capture visuelle vérifiés.
- Revue indépendante réalisée ; corrections du catalogue d’articles et de la synchronisation des nouveaux bacs couvertes par des tests de régression.
- Aucun fichier de base de données ni de configuration secrète dans les sources livrées.

## Limites et état de publication

Les opérations avancées non listées dans les parcours testables sont en consultation et les commandes non simulées sont signalées explicitement. SMS, matériel, sauvegardes et services fiscaux ne sont jamais contactés. Aucun PDF fiscal officiel n’est généré. Le stockage est propre au navigateur et fonctionne en mémoire si la persistance est bloquée.

Vercel n’a pas été publié ; le dépôt Git est initialisé, sans commit ni remote, pour que l’utilisateur puisse le pousser ensuite.

Les sources applicatives du projet Arrachid-Software n’ont pas été modifiées. Les contrôles Python initiaux (ruff, format et mypy) étaient verts ; la première tentative pytest a rencontré des erreurs d’accès au dossier temporaire Windows (notamment le setup `modele_base` dans tests/conftest.py). Une seconde tentative sur un dossier temporaire distinct a été interrompue à environ 20 % pour garder la validation centrée sur la copie autonome. La suite serveur d’origine n’est donc pas déclarée entièrement validée.
