# 💇 Salon Élégance — Application de prise de rendez-vous multi-salons

> Projet initialement réalisé dans le cadre du titre **DWWM (RNCP 37674)**, titre obtenu
> (soutenance réussie le 29/07/2026). Poursuivi depuis comme **projet de portfolio**.
> Application web full-stack de réservation en ligne pour un réseau de salons de coiffure.

---

## 📋 Présentation

Salon Élégance permet aux clients de réserver un rendez-vous en ligne 24h/24, sans appel
téléphonique, dans le salon et avec le coiffeur de leur choix parmi un réseau de salons.
Chaque gérant de salon (manager) dispose d'un dashboard scopé à son propre salon ; un
administrateur pilote l'ensemble du réseau.

### Fonctionnalités principales

**Côté client**
- Inscription avec vérification d'e-mail, connexion sécurisée
- Choix du salon (avec carte interactive Leaflet) et du coiffeur
- Catalogue des prestations scopé au salon choisi
- Réservation en plusieurs étapes : salon → coiffeur → prestation → date → créneau
- Consultation, filtrage et annulation des rendez-vous
- Dépôt d'un avis après un rendez-vous honoré
- Modification du profil (prénom, nom, email)
- Rappels automatiques par e-mail avant le rendez-vous

**Côté manager (gérant d'un salon)**
- Agenda du jour navigable, scopé à son salon
- Gestion des prestations et des horaires de son salon
- Vue des rendez-vous de son salon uniquement

**Côté administrateur**
- Toutes les capacités manager, sur tous les salons
- Administration des salons : création, modification, suspension, réactivation,
  archivage, suppression (salons vierges uniquement)
- Invitation de managers par e-mail (jeton à usage unique)
- Métriques en temps réel

### Rôles utilisateurs

- **Client** — réserve et gère ses propres rendez-vous, laisse des avis.
- **Manager** — gère un salon précis (`salon_id` porté par son compte, relu en base à
  chaque requête). Accès strictement limité à son salon.
- **Admin** — gère l'application dans son ensemble, tous salons confondus.

---

## 🛠 Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML / CSS / JavaScript vanilla, mobile-first |
| Cartographie | Leaflet 1.9.4 (CDN unpkg) |
| Backend | Node.js + Express, architecture en couches |
| Base de données | MariaDB via `mysql2` (pool, requêtes paramétrées) |
| Authentification | JWT (JSON Web Tokens) + rôles |
| Hashage des mots de passe | bcrypt |
| E-mails | Nodemailer — Ethereal en dev, Brevo (SMTP transactionnel) en production |
| Sécurité HTTP | Helmet, CORS (liste blanche) |
| Anti-abus | express-rate-limit |
| Tests | Jest + Supertest (182 tests) |

---

## 📁 Structure du projet

```
salon-rdv-dwwm/
├── backend/
│   ├── server.js                            # Point d'entrée Express
│   ├── package.json
│   ├── .env.example
│   ├── database/
│   │   └── schema.sql                       # Schéma BDD à jour
│   ├── migrations/                          # Migrations incrémentales 001 → 007
│   ├── tests/
│   │   ├── schema_test.sql
│   │   ├── setup.js
│   │   ├── unit/
│   │   └── integration/
│   ├── scripts/
│   │   └── send-reminders.js                # Rappels automatiques (cron)
│   └── src/
│       ├── config/
│       │   └── db.js                        # Pool de connexions MariaDB
│       ├── middlewares/
│       │   ├── auth.middleware.js           # JWT + contrôle des rôles
│       │   └── rate-limit.middleware.js     # authLimiter, appointmentLimiter
│       ├── controllers/
│       │   ├── auth.controller.js           # Inscription/connexion/profil/invitations
│       │   ├── salon.controller.js          # CRUD salons, états
│       │   ├── service.controller.js        # CRUD prestations (scopé salon)
│       │   ├── appointment.controller.js    # Créneaux + RDV (scopé salon/coiffeur)
│       │   ├── availability.controller.js   # Horaires (scopé coiffeur)
│       │   └── review.controller.js         # Avis clients
│       ├── utils/
│       │   └── mailer.js                    # Templates e-mail (escapeHtml)
│       └── routes/
│           ├── auth.routes.js
│           ├── salon.routes.js
│           ├── service.routes.js
│           ├── appointment.routes.js
│           ├── availability.routes.js
│           └── review.routes.js
│
└── frontend/
    ├── index.html                           # Accueil (catalogue, avis)
    ├── css/
    ├── js/
    │   ├── app.js                           # Auth, apiRequest, toast, API_BASE dynamique
    │   ├── reserver.js                      # Stepper salon → coiffeur → service → créneau
    │   ├── mes-rdv.js
    │   ├── profil.js
    │   ├── dashboard.js                     # Dashboard admin/manager + gestion salons
    │   └── definir-mot-de-passe.js
    └── pages/
        ├── login.html
        ├── definir-mot-de-passe.html        # Activation de compte manager (invitation)
        ├── reserver.html
        ├── mes-rdv.html
        ├── profil.html
        └── dashboard.html
```

---

## 🚀 Installation et démarrage

### Prérequis

- [Node.js](https://nodejs.org) v18+
- [MariaDB](https://mariadb.org) 10.6+ (développé et testé sur 11.4)
- Un terminal

### 1. Cloner le projet

```bash
git clone https://github.com/kadakour-pixel/salon-rdv-dwwm.git
cd salon-rdv-dwwm
git checkout evolution-v2
```

### 2. Configurer et démarrer le backend

```bash
cd backend
npm install
cp .env.example .env
```

Éditer le fichier `.env` (voir `.env.example` pour la liste complète des variables,
notamment `APP_URL`, `FRONTEND_URL`, les identifiants SMTP, `JWT_SECRET`).

```bash
# Créer la base de données et appliquer le schéma + les migrations 001 → 007
mysql -u root -p < database/schema.sql

# Démarrer le serveur (mode développement)
npm run dev
```

Le backend est accessible sur `http://localhost:3000`.

### 3. Démarrer le frontend

```bash
cd frontend
# Live Server (VS Code) recommandé, une seule origine, ex. 127.0.0.1:5500
```

> ⚠️ Ne pas ouvrir les fichiers HTML directement avec `file://` — les appels API seront
> bloqués par les restrictions CORS.

### 4. Lancer les tests

```bash
cd backend
npx jest --runInBand --forceExit
```

`--forceExit` est requis (pools `mysql2`). Base de test dédiée `salon_rdv_test` via
`backend/.env.test`, chargée par `tests/setup.js`.

---

## 🔌 API REST

Base URL : `http://localhost:3000/api` (dev) ou `https://kadakour.alwaysdata.net/api`
(prod — un nom de domaine dédié, `salon-elegance.fr`, a été acheté mais n'est pas
rattaché : le forfait alwaysdata Free ne permet pas de domaine personnalisé, y
compris via une simple redirection HTTP ; décision assumée de rester sur ce forfait
tant qu'aucun salon n'est réellement client).

### Authentification

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| POST | `/auth/register` | Public | Créer un compte client |
| POST | `/auth/login` | Public | Connexion → JWT (403 si e-mail non vérifié) |
| GET | `/auth/verify` | Public | Vérification d'e-mail |
| POST | `/auth/resend-verification` | Public | Renvoyer le lien (cooldown 5 min) |
| GET / PUT | `/auth/me` | Client | Profil |
| POST | `/auth/invite-manager` | Admin | Inviter un manager pour un salon |
| POST | `/auth/set-password` | Public (jeton) | Activer un compte manager invité |

### Salons

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| GET | `/salons` | Public | Salons actifs |
| GET | `/salons/:id` | Public | Détail d'un salon |
| GET | `/salons/:id/stylists` | Public | Coiffeurs d'un salon |
| GET | `/salons/admin` | Admin | Tous les salons + `can_delete` |
| POST / PUT | `/salons` / `/salons/:id` | Admin | Créer/modifier un salon |
| POST | `/salons/:id/status` | Admin | Suspendre/réactiver (`force` si RDV futurs) |
| POST | `/salons/:id/archive` | Admin | Archiver (terminal) |
| DELETE | `/salons/:id` | Admin | Supprimer (salon vierge uniquement) |

### Prestations

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| GET | `/services` | Public | Prestations actives, scopées par salon |
| POST | `/services` | Admin / Manager | Créer une prestation |
| PUT | `/services/:id` | Admin / Manager | Modifier (salon immuable) |
| DELETE | `/services/:id` | Admin / Manager | Désactiver |

### Rendez-vous

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| GET | `/appointments/slots?date=&serviceId=` | Authentifié | Créneaux disponibles |
| POST | `/appointments` | Client (rate-limité, max 5 actifs) | Réserver un créneau |
| GET | `/appointments/me` | Client | Mes rendez-vous |
| GET | `/appointments?date=` | Admin / Manager | RDV (scopés par salon si manager) |
| DELETE | `/appointments/:id` | Client (le sien) / Admin / Manager | Annuler |

### Disponibilités

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| GET | `/availabilities` | Public | Horaires, scopés par coiffeur |
| GET | `/availabilities/day?date=` | Public | Horaires d'un jour précis |
| PUT | `/availabilities/:dayOfWeek` | Admin / Manager | Modifier les horaires |
| POST | `/availabilities/block` | Admin / Manager | Bloquer une date |
| DELETE | `/availabilities/block/:date` | Admin / Manager | Débloquer une date |

### Avis

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| POST | `/reviews` | Client | Déposer un avis (RDV honoré uniquement) |
| GET | `/reviews` | Public | Avis (prénom seul, RGPD) |
| GET | `/reviews/reviewable` | Client | RDV éligibles sans avis |
| GET | `/reviews/stats` | Public | Note moyenne + nombre d'avis |

### Format du token JWT

```
Authorization: Bearer <token>
```

---

## 🗄 Base de données

8 tables : `users`, `salons`, `stylists`, `services`, `availabilities`, `appointments`,
`reviews`, `action_tokens`. Migrations incrémentales 001 → 007 dans `backend/migrations/`,
détail dans le README de ce dossier.

### Compte admin par défaut (dev)

```
Email    : admin@salon.fr
Password : AdminDev123   ← à changer impérativement en production
```

---

## 🔒 Sécurité

- Mots de passe hashés avec **bcrypt**
- Authentification **JWT** signés, contrôle de rôle (`client`, `manager`, `admin`)
- Vérification d'e-mail obligatoire à l'inscription
- **Rate-limiting** (`express-rate-limit`) sur les routes sensibles (login, register,
  resend-verification, création de RDV) — le mécanisme de désactivation en test
  (`JEST_WORKER_ID`) a été audité et confirmé sûr par conception : cette variable
  n'est jamais définie hors d'une exécution Jest
- **Plafond de rendez-vous actifs** par client (5, tous salons confondus)
- Prestations supprimées **désactivées logiquement** (`is_active = 0`)
- Salons : suppression réservée aux salons vierges, archivage = défense en profondeur
- Détection des conflits de créneaux côté serveur, scopée par coiffeur
- Requêtes SQL systématiquement paramétrées (protection injection)
- **Helmet** (en-têtes HTTP) + **CORS** en liste blanche d'origines — les deux
  vérifiés directement en production (HSTS, `nosniff`, `SAMEORIGIN`, origine non
  autorisée rejetée)

---

## 📐 Choix techniques

| Décision | Justification |
|----------|---------------|
| JS vanilla (sans framework) | Maîtrise des fondamentaux, pas de dépendance de build |
| Suppression logique des prestations | Préserve l'intégrité des données historiques |
| Créneaux générés à la volée, scopés par coiffeur | Pas de stockage redondant, chevauchement autorisé entre coiffeurs différents |
| Rôle manager relu en base à chaque requête | Un changement d'affectation de salon est immédiat, pas besoin de reconnexion |
| Suspension réversible / archivage terminal | Distingue une fermeture temporaire d'une fermeture définitive |
| JWT stateless | Pas de session côté serveur, adapté à une future API mobile |

---

## 🚧 État du déploiement

Le code de ce dépôt (branche `evolution-v2`, fusionnée dans `main`) est **déployé et
actif en production** sur `https://kadakour.alwaysdata.net` — backend et frontend
inclus, avec toutes les évolutions post-soutenance (multi-salons, anti-abus, avis
clients, invitations manager, carte Leaflet). **Les 8 phases du plan de déploiement
sont terminées, à l'exception de la documentation finale (Phase 7, en cours) et de
la Phase 8 (contenu jamais précisé, à considérer comme close).**

**Ce qui est en place en production, entièrement vérifié :**
- 8 tables, migrations 001 → 007 jouées.
- SMTP réel via **Brevo** (délivrabilité Hotmail/Outlook confirmée — le SMTP natif
  alwaysdata était filtré par Microsoft).
- Sauvegardes automatiques quotidiennes de la base (script dédié en complément de la
  rétention limitée de l'offre Free) et deux tâches planifiées actives (rappels
  horaires + backup quotidien), toutes deux retestées sans erreur.
- HTTPS, en-têtes de sécurité Helmet et CORS en liste blanche vérifiés directement en
  production.
- Parcours **client** complet (inscription, vérification d'e-mail, réservation,
  annulation), dashboard **admin** et dashboard **manager** (accès correctement
  scopé à son salon) testés de bout en bout en conditions réelles.

**Points encore ouverts :**
- Un nom de domaine dédié (`salon-elegance.fr`) a été acheté et configuré côté DNS,
  mais n'est pas rattaché au site — le forfait alwaysdata Free ne permet pas de
  domaine personnalisé, quel que soit le type de site (application ou simple
  redirection). Décision assumée de rester sur ce forfait tant qu'aucun salon n'est
  réellement intéressé ; l'application reste accessible sur `kadakour.alwaysdata.net`.
- Les pages légales (mentions légales, CGU, politique de confidentialité) sont en
  ligne mais contiennent encore des informations à compléter (raison sociale,
  adresse) — le projet n'ayant pas de statut de société à ce jour.
- Les coordonnées GPS du salon principal ne sont pas encore renseignées en
  production (utilisées uniquement pour l'affichage sur la carte Leaflet).

---

## 📄 Licence

Projet initialement réalisé dans le cadre de la certification **DWWM (RNCP 37674)**,
poursuivi comme projet de portfolio — usage pédagogique et démonstratif.