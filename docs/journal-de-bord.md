# Journal de bord — Salon Élégance

**Projet :** Application de prise de rendez-vous en ligne  
**Candidat :** Kadour Amini  
**Formation :** DWWM — MolenGeek Roubaix

---

## Entrée 1 — Lancement du projet
**Date :** avant le 11 juin 2026

Mise en place complète de l'application :

**Backend (Node.js + Express)**
- Initialisation du projet avec `npm init` et installation des dépendances (`express`, `mysql2`, `jsonwebtoken`, `bcrypt`, `cors`, `dotenv`)
- Création du schéma de base de données MariaDB : tables `users`, `services`, `appointments`, `availabilities`
- Architecture MVC : dossiers `controllers/`, `routes/`, `middleware/`
- Authentification JWT avec hashage bcrypt des mots de passe
- Routes REST : `/api/auth`, `/api/services`, `/api/appointments`, `/api/availabilities`
- Middleware `authMiddleware.js` pour la vérification du token et du rôle
- Logique de génération de créneaux horaires (`generateSlots()`) selon les disponibilités et les RDV existants

**Frontend (HTML/CSS/JS vanilla)**
- Page d'accueil `index.html` avec section hero, services, formulaire de contact
- Pages d'authentification : `inscription.html`, `connexion.html`
- Page de réservation : `reserver.html` (sélection service > date > créneau)
- Espace client : `mes-rdv.html` (liste et annulation des rendez-vous)
- Espace admin : `dashboard.html` (gestion des services et vue agenda)
- Module JavaScript partagé `app.js` avec la fonction `apiRequest()` pour les appels API
- Design responsive, typographies Google Fonts (Cormorant Garamond + DM Sans)

---

## Entrée 2 — Suppression du dossier parasite et corrections
**Date :** 11 juin 2026

- Suppression d'un dossier `confirmation/` créé par erreur lors du développement
- Correction de la validation email côté backend (ajout d'un test regex dans `auth.controller.js`)
- Correction de la validation de longueur de mot de passe côté backend (minimum 8 caractères vérifié au niveau de l'API, en plus de la validation frontend)

---

## Entrée 3 — Plan de tests T01–T27
**Date :** 11 juin 2026

Rédaction et exécution du plan de tests couvrant les 27 cas de test :

- **T01–T13 :** Parcours client (inscription, connexion, réservation, annulation, déconnexion)
- **T14–T27 :** Parcours admin (connexion, gestion des services, vue agenda, annulation admin)

**Résultat :** 27/27 tests passés ✅

---

## Entrée 4 — Réorganisation de la documentation
**Date :** 16 juin 2026

Restructuration des fichiers de documentation dans un dossier `docs/` dédié :

- **Déplacement** de `plan_de_tests.md` de la racine vers `docs/plan_de_tests.md`
- **Ajout** de `docs/brief.md` : contexte métier, objectifs et stack technique
- **Ajout** de `docs/user-stories.md` : 23 user stories couvrant les rôles visiteur, client et admin (US01–US23)
- **Ajout** de `docs/todo.md` : liste priorisée des améliorations post-MVP (fonctionnalités manquantes, sécurité, qualité)
- **Ajout** de `docs/journal-de-bord.md` (ce fichier)
- **Ajout** de `CLAUDE.md` à la racine : contexte de formation et directives techniques pour l'assistant IA (utilisation déclarée devant le jury)

---

## Entrée 5 — Finalisation des fonctionnalités admin et profil client
**Date :** 17 juin 2026

**Corrections de bugs**
- Correction du spinner bloqué dans l'onglet "Horaires" du dashboard admin : le chargement des données n'était déclenché que par les onglets (boutons), pas par la navigation latérale. Centralisation des appels dans `switchTab()`.
- Correction de l'affichage des noms de clients dans l'agenda admin (diagnostic : les données étaient bien présentes côté API).
- Correction des alertes de formulaire sur la page profil : la classe CSS `.form-alert` était définie uniquement dans `login.css`. Déplacement dans `pages.css` pour la rendre disponible sur toutes les pages.

**US21 — Horaires d'ouverture (interface admin)**
- L'onglet "Horaires" du dashboard affiche les 7 jours avec ouverture/fermeture modifiables via modal.
- Bouton "✕ Fermer" pour marquer un jour comme fermé, bouton "+ Ouvrir" pour le réouvrir.

**US22 — Fermetures exceptionnelles (interface admin)**
- Ajout d'une section "Fermetures exceptionnelles" dans l'onglet "Horaires".
- Sélecteur de date + bouton "Bloquer ce jour" → appelle `POST /api/availabilities/block`.
- Liste des dates bloquées avec bouton "✕ Débloquer" → appelle `DELETE /api/availabilities/block/:date`.

**US23 — Profil client**
- Nouveaux endpoints : `GET /api/auth/me` et `PUT /api/auth/me` (auth.controller.js, auth.routes.js).
- Nouvelle page `pages/profil.html` + script `js/profil.js` : formulaire pré-rempli, validation, message de confirmation.
- Lien "Mon profil" ajouté dans la navbar pour les clients connectés.

**Améliorations de sécurité et robustesse**
- Validation des entrées backend : `duration_minutes` (entier positif), `price` (nombre positif) dans `service.controller.js`, format `YYYY-MM-DD` pour `blocked_date` dans `availability.controller.js`.
- Détection des réponses 401 dans `apiRequest()` : si le token JWT est expiré ou invalide, le localStorage est vidé et l'utilisateur est redirigé vers la page de connexion.
- Illustration SVG animée dans la section hero de la page d'accueil (keyframes CSS : flottement, scintillement, mouvement des ciseaux).
- Bouton "✕ Annuler" ajouté dans l'agenda et dans "Tous les RDV" du dashboard admin (confirmation avant annulation, mise à jour des métriques).
- Responsive dashboard : onglets en retour à la ligne sur mobile (flex-wrap), métriques adaptées petit écran.
- Taille de police globale augmentée (16px → 17px) pour une meilleure lisibilité.
- Plan de tests mis à jour : 34/34 tests passés (T28–T34 couvrant US21, US22, US23, validation, sécurité).

---

## Entrée 6 — Revue de code, commentaires et corrections
**Date :** 18 juin 2026

**Commentaires ajoutés dans le code**
- Ajout de commentaires en français sur les points clés du backend et du frontend, pour aider à la défense devant le jury.
- Fichiers commentés : `db.js`, `auth.controller.js`, `service.controller.js`, `appointment.controller.js`, `availability.controller.js`, `app.js`, `reserver.js`, `profil.js`, `dashboard.js`.
- Principes suivis : expliquer le POURQUOI (pas le QUOI), une ligne max, uniquement là où c'est non évident.

**Corrections de bugs détectés lors de la revue**
- `dashboard.js` : ajout d'un try/catch autour de la désactivation de prestation (erreur non gérée → crash silencieux).
- `profil.js` : un admin accédant à la page profil était redirigé vers `login.html` au lieu de `dashboard.html`.
- `dashboard.js` : remplacement de `toISOString().slice(0,10)` par une date locale dans les métriques et l'agenda (décalage UTC possible entre minuit et 2h).
- `reserver.js` : même correction pour la date du calendrier de réservation.

**Résultat :** 38/38 tests passés (T35–T38 ajoutés).

---

## Entrée 7 — Déploiement en production sur alwaysdata
**Date :** 19 juin 2026

**Déploiement complet**
- Hébergement sur alwaysdata : `https://kadakour.alwaysdata.net`
- Configuration du site Node.js sur alwaysdata avec le répertoire de travail `/home/kadakour/backend`
- Synchronisation de tous les fichiers frontend et backend via FTP

**Correction de l'URL API**
- Remplacement de `http://localhost:3000` par `https://kadakour.alwaysdata.net` dans `app.js` pour que les appels API fonctionnent en production.

**Ajout des routes profil**
- Restructuration de `auth.routes.js` : import des fonctions `getMe` et `updateMe` depuis le controller, déclaration des routes `GET /api/auth/me` et `PUT /api/auth/me` avec le middleware `authenticate`.

**Tests de validation en production (38/38 ✅)**
- Inscription / Connexion client ✅
- Réservation en 3 étapes ✅
- Mes RDV + Annulation ✅
- Dashboard admin (agenda, métriques, prestations, tous les RDV) ✅
- Horaires + fermetures exceptionnelles ✅
- Profil client (affichage + modification) ✅

**Résultat :** Application fonctionnelle en production, repo GitHub synchronisé.

---

## Entrée 8 — Sécurisation et corrections responsive
**Date :** 21 juin 2026

**Sécurisation des en-têtes HTTP**
- Installation de `helmet` dans le backend (`npm install helmet`).
- Activation dans `server.js` avec CSP désactivé pour ne pas bloquer Google Fonts.
- En-têtes ajoutés : X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.

**Correction responsive**
- Suppression de `display: none` sur `.hero__visual` en mobile (`home.css`) : l'illustration SVG animée est désormais visible sur tous les écrans.

**Correction bug dates bloquées**
- Les dates bloquées passées persistaient dans le dashboard admin après expiration.
- Ajout d'un filtre SQL `WHERE blocked_date IS NULL OR blocked_date >= CURDATE()` dans `availability.controller.js` : seules les dates futures ou du jour sont désormais affichées.

---

## Entrée 9 — Tests automatisés Jest + Supertest
**Date :** 1 juillet 2026

**Contexte**
Ajout de tests automatisés en complément des 44 tests manuels existants, pour renforcer la fiabilité et démontrer une démarche qualité à la soutenance.

**Installation et configuration**
- Installation de `jest` et `supertest` en devDependencies.
- Script `"test": "jest --runInBand --forceExit"` dans `package.json` (`--runInBand` : exécution sérielle pour éviter les conflits BDD, `--forceExit` : fermeture du pool MySQL en fin de tests).
- Fichier `tests/setup.js` : charge `.env.test` avant chaque suite pour pointer vers la BDD de test.
- Fichier `.env.test` : même credentials que `.env` mais `DB_NAME=salon_rdv_test` (ajouté au `.gitignore`).
- Base de données `salon_rdv_test` créée via `tests/schema_test.sql` (même schéma que prod, sans seed).

**Modifications du code existant**
- `server.js` : `app.listen()` rendu conditionnel avec `require.main === module` + `module.exports = app` pour que Supertest puisse importer l'app sans démarrer un vrai serveur.
- `appointment.controller.js` : `generateSlots` ajouté aux exports pour permettre les tests unitaires en isolation.

**Tests unitaires — `generateSlots` (5 cas)**
- Journée normale : 18 créneaux générés de 9h à 18h (pas de 30 min, durée 30 min)
- Créneau à la limite exacte de fermeture : inclus
- Créneau qui déborde après fermeture : exclu
- Créneau déjà réservé (chevauchement exact) : exclu
- Chevauchement partiel (RDV à cheval sur deux créneaux) : les deux créneaux exclus

**Tests d'intégration — 7 cas**
- `POST /api/auth/login` : succès (200 + token), mauvais MDP (401), email inconnu (401 même message)
- `POST /api/appointments` : réservation réussie (201), conflit sur créneau pris (409)
- Route protégée sans token : 401
- Route admin avec token client : 403

**Résultat : 12/12 tests automatisés passés ✅**
