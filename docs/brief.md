## Brief — Salon Élégance

**Contexte et objectif**
- Permettre aux clients de prendre RDV en ligne 24h/24 sans appel téléphonique.
- Offrir au coiffeur (et désormais au gérant de salon) une vue en temps réel sur son agenda.
- Réduire les absences et les no-shows.
- Étendre l'application à une logique **multi-salons / multi-coiffeurs**, avec une administration centralisée des salons et de leurs gérants.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Node.js + Express 4 |
| Base de données | MariaDB 12 (mysql2) |
| Authentification | JWT (jsonwebtoken) + bcrypt |
| Frontend | HTML/CSS/JS vanilla (sans framework) |
| Cartographie | Leaflet 1.9.4 (CDN unpkg) |
| Anti-abus | express-rate-limit |
| Tests | Jest + Supertest |
| Typographies | Cormorant Garamond + DM Sans (Google Fonts) |

---

## Périmètre — État d'avancement (08 août 2026)

| Fonctionnalité | Statut |
|----------------|--------|
| Inscription et authentification (client + admin + manager) | ✅ Livré |
| Vérification d'e-mail à l'inscription | ✅ Livré |
| Catalogue de prestations (lecture publique) | ✅ Livré |
| CRUD prestations depuis le dashboard admin | ✅ Livré |
| Calendrier de disponibilités et créneaux en temps réel | ✅ Livré |
| Réservation en parcours multi-étapes (salon → coiffeur → prestation → date → créneau) | ✅ Livré |
| Détection et blocage des conflits de créneaux (par coiffeur) | ✅ Livré |
| Annulation de rendez-vous (client et admin) | ✅ Livré |
| Espace client — liste et filtrage de ses RDV | ✅ Livré |
| Dashboard admin — agenda journalier + navigation | ✅ Livré |
| Dashboard admin — liste globale des RDV avec filtre date | ✅ Livré |
| Métriques dashboard | ✅ Livré |
| Interface responsive mobile-first | ✅ Livré |
| Gestion des horaires d'ouverture, scopée par coiffeur | ✅ Livré |
| Blocage de dates exceptionnelles | ✅ Livré |
| Profil client — modification des informations | ✅ Livré |
| Rappels automatiques par e-mail (cron) | ✅ Livré |
| Avis clients (dépôt, affichage, note moyenne) | ✅ Livré |
| **Multi-salons / multi-coiffeurs** (backend + frontend) | ✅ Livré |
| Rôle **manager** scopé par salon | ✅ Livré |
| Administration des salons (création, suspension, archivage, suppression) | ✅ Livré |
| Invitations manager par e-mail (jeton à usage unique) | ✅ Livré |
| Page de définition de mot de passe (via invitation) | ✅ Livré |
| Carte interactive Leaflet dans le parcours de réservation | ✅ Livré |
| Anti-abus : rate-limiting (login/register/RDV) | ✅ Livré |
| Anti-abus : limite de rendez-vous actifs par client | ✅ Livré |
| Tests automatisés Jest/Supertest (182 tests) | ✅ Livré |
| Déploiement des évolutions post-soutenance en production (alwaysdata) | ⏳ En attente |

---

## Pages de l'application

| URL | Rôle | Accès |
|-----|------|-------|
| `index.html` | Landing page (vitrine + catalogue + avis) | Public |
| `pages/login.html` | Connexion + inscription | Public |
| `pages/definir-mot-de-passe.html` | Définition du mot de passe (invitation manager) | Public (avec jeton) |
| `pages/reserver.html` | Parcours de réservation (salon → coiffeur → service → date → créneau), carte Leaflet | Client connecté |
| `pages/mes-rdv.html` | Liste et gestion de ses rendez-vous, dépôt d'avis | Client connecté |
| `pages/profil.html` | Modification du profil client | Client connecté |
| `pages/dashboard.html` | Tableau de bord administrateur / manager, gestion des salons | Admin / Manager |

---

## API REST — Routes principales

| Méthode | Route | Accès |
|---------|-------|-------|
| POST | `/api/auth/register` | Public (rate-limité) |
| POST | `/api/auth/login` | Public (rate-limité) |
| GET | `/api/auth/verify` | Public |
| POST | `/api/auth/resend-verification` | Public (rate-limité) |
| POST | `/api/auth/invite-manager` | Admin |
| POST | `/api/auth/set-password` | Public (jeton) |
| GET / PUT | `/api/auth/me` | Client |
| GET | `/api/salons` | Public |
| GET | `/api/salons/:id` | Public |
| GET | `/api/salons/:id/stylists` | Public |
| GET | `/api/salons/admin` | Admin |
| POST / PUT | `/api/salons` / `/api/salons/:id` | Admin |
| POST | `/api/salons/:id/status` | Admin |
| POST | `/api/salons/:id/archive` | Admin |
| DELETE | `/api/salons/:id` | Admin |
| GET | `/api/services` | Public (scopé salon) |
| POST/PUT/DELETE | `/api/services/:id` | Admin / Manager |
| GET | `/api/availabilities` | Public (scopé coiffeur) |
| GET | `/api/availabilities/day?date=` | Public (scopé coiffeur) |
| PUT | `/api/availabilities/:dayOfWeek` | Admin / Manager |
| POST | `/api/availabilities/block` | Admin / Manager |
| DELETE | `/api/availabilities/block/:date` | Admin / Manager |
| GET | `/api/appointments/slots?date=&serviceId=` | Authentifié |
| POST | `/api/appointments` | Client (rate-limité, limite 5 actifs) |
| GET | `/api/appointments/me` | Client |
| GET | `/api/appointments` | Admin / Manager (scopé salon) |
| DELETE | `/api/appointments/:id` | Client (le sien) / Admin / Manager |
| POST | `/api/reviews` | Client |
| GET | `/api/reviews` | Public |
| GET | `/api/reviews/reviewable` | Client |
| GET | `/api/reviews/stats` | Public |

---

## Hors périmètre (évolutions futures)

- Paiement en ligne
- Notifications SMS (rappel e-mail déjà livré)
- Application mobile native

---

## Contraintes identifiées

- Interface responsive — mobile-first
- Authentification sécurisée JWT + bcrypt + vérification e-mail
- Gestion des conflits de créneaux côté serveur, scopée par coiffeur
- Soft delete des prestations (`is_active = 0`) pour préserver l'historique des RDV
- Salons : trois états (Actif / Suspendu / Archivé terminal), pas de suppression physique si le salon a des dépendances
- mysql2 renvoie les colonnes `DECIMAL` (latitude/longitude) en chaînes de caractères — conversion `parseFloat()` obligatoire avant tout usage cartographique
- Anti-abus : rate-limiting sur les routes sensibles + plafond de rendez-vous actifs par client, nécessaire avant mise en production