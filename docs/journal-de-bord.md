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
