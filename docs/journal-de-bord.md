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
