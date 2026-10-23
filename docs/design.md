# Démo de consultation et d'essai — Propriétaire

Date : 23 octobre 2026. Statut : approuvé par la demande « go with the plan » ; dossier autonome demandé par l’utilisateur.

## Objectif et périmètre

Créer une copie autonome de la plateforme actuelle pour présenter et essayer les écrans accessibles au rôle `proprietaire`. L'utilisateur demande une démo « view and test », sans connexion ni base de données, prête à héberger sur Vercel.

Conserver les écrans, la navigation, les textes français et l'apparence existants. L'ouverture donne directement accès au tableau de bord du propriétaire. Ni appairage du poste, ni mise en service, ni authentification, ni verrouillage après inactivité ne doivent interrompre la visite.

## Approches

1. Copie interactive autonome : réutiliser le client React/Vite dans un dossier `Arrachid-Demo/`, remplacer les appels au serveur par un moteur de démonstration dans le navigateur et fournir des données fictives. C'est l'approche recommandée et retenue à la suite de la demande « view and test ».
2. Copie en consultation seule : moins de simulation à maintenir, mais ne permet pas d'essayer les opérations. Écartée par la demande de l'utilisateur.
3. Mode de démonstration dans le client principal : limite la duplication des écrans, mais mélange le contournement des accès avec l'application métier. Choix du concepteur : préférer la copie autonome pour répondre à la demande d'une copie et garder une livraison distincte.

## Comportement proposé

- Identité fictive « Propriétaire Démo », avec les permissions réelles de ce rôle et un poste bureau fictif.
- Données fictives cohérentes pour le tableau de bord, les apporteurs, réceptions, analyses, bacs, production, cuves, prix, décomptes, caisse, clients, ventes et administration accessibles au propriétaire.
- Formulaires, recherches, filtres et détails utilisables. Les opérations simulées modifient réellement l'état de démonstration et les écrans concernés le relisent ; ne jamais afficher une réussite pour une opération sans effet.
- Parcours prioritaires vérifiés : créer un apporteur et une réception, consulter et saisir une analyse, consulter la production et les cuves, essayer une opération de bureau et modifier un référentiel ou paramètre de démonstration.
- Pas de PIN à saisir pour les validations : les écrans de confirmation restent utiles mais la validation s'effectue au nom du propriétaire fictif.
- État conservé dans le stockage local du navigateur entre deux visites. Bouton « Réinitialiser la démo » avec confirmation, restaurant les données d'exemple et les brouillons initiaux. Chaque navigateur dispose de sa propre copie ; pas de synchronisation entre visiteurs.
- Bandeau visible « Démonstration — données fictives ».
- Matériel, SMS, sauvegardes et services fiscaux externes simulés et clairement identifiés. Aucun envoi, aucune impression matérielle et aucun appel à ces services. Les aperçus documentaires disponibles sont marqués comme démonstration ; les fonctions impossibles à simuler correctement affichent une explication explicite.

## Architecture et contraintes

Le dossier `Arrachid-Demo/` contient une application React/Vite autonome, ses dépendances verrouillées, ses sources, sa configuration Vercel et un guide de démarrage. Aucun serveur Python, fichier SQLite, secret, compte réel ou export de données métier n'entre dans ce dossier ni dans le résultat compilé.

Réutiliser les dépendances déjà autorisées du client. Le moteur de simulation fournit les contrats attendus par les écrans, avec des routes explicites et des erreurs explicites pour toute opération non prise en charge. Garder les identifiants français et les unités entières du projet. Les calculs et validations servent à illustrer le logiciel ; cette copie ne constitue pas le système métier faisant autorité.

Le client de production et le serveur conservent leurs mécanismes d'accès et leur comportement. Seuls la documentation de suivi et le nouveau dossier de démo sont modifiés.

Vercel sert les fichiers statiques et renvoie les routes de navigation vers `index.html`. La racine du projet Vercel sera la racine du dépôt autonome, la compilation `npm run build`, la sortie `dist`. La livraison prépare l'hébergement et documente la procédure ; elle ne présume pas d'un compte Vercel connecté ni d'une publication déjà autorisée.

## Vérification et critères d'acceptation

- Compilation et vérification TypeScript réussies pour la copie.
- Tests ciblés du moteur : chargement des données, mutations et relecture, réinitialisation, absence de connexion et de requêtes métier vers un serveur.
- Vérification navigateur : arrivée directe sur le tableau de bord, navigation des écrans du propriétaire sans erreur, parcours prioritaires et réinitialisation fonctionnels, rechargement d'une route profonde.
- Vérification du livrable : aucun secret, aucune base métier et aucun besoin de backend ; configuration Vercel présente.
- Mettre à jour `AVANCEMENT.md` avec la portée réalisée, les vérifications et toute limite restante.

## Choix laissés à la réalisation

Organisation des modules du simulateur, nombre précis d'exemples, noms fictifs et stratégie de versionnement du stockage local. Ajuster la couverture des interactions après inventaire des contrats existants, tout en gardant les limites visibles et en signalant les parcours non simulés dans le guide livré.

## Livraison

Le dossier final est situé à côté d’Arrachid-Software, et non à l’intérieur : `../Arrachid-Demo`. Ses dépendances sont installées indépendamment et un dépôt Git local distinct a été initialisé. Aucune publication externe n’a été effectuée. Les fonctions réellement simulées et les limites figurent dans README.md.
