## Brief — Salon Élégance

**Contexte et objectif**
- Permettre aux clients de prendre RDV en ligne 24h/24 sans appel téléphonique.
- Offrir au coiffeur une vue en temps réel sur son agenda.
- Réduire les absences et les no-shows.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Node.js + Express 4 |
| Base de données | MariaDB 12 (mysql2) |
| Authentification | JWT (jsonwebtoken) + bcrypt |
| Frontend | HTML/CSS/JS vanilla (sans framework) |
| Typographies | Cormorant Garamond + DM Sans (Google Fonts) |

---

## Périmètre MVP — État d'avancement (juin 2026)

| Fonctionnalité | Statut |
|----------------|--------|
| Inscription et authentification (client + admin) | ✅ Livré |
| Catalogue de prestations (lecture publique) | ✅ Livré |
| CRUD prestations depuis le dashboard admin | ✅ Livré |
| Calendrier de disponibilités et créneaux en temps réel | ✅ Livré |
| Réservation en 3 étapes (stepper) | ✅ Livré |
| Détection et blocage des conflits de créneaux | ✅ Livré |
| Annulation de rendez-vous (client et admin) | ✅ Livré |
| Espace client — liste et filtrage de ses RDV | ✅ Livré |
| Dashboard admin — agenda journalier + navigation | ✅ Livré |
| Dashboard admin — liste globale des RDV avec filtre date | ✅ Livré |
| Métriques dashboard (RDV jour, semaine, services actifs, annulations) | ✅ Livré |
| Interface responsive mobile-first | ✅ Livré |
| Gestion des horaires d'ouverture (API + UI admin) | ✅ Livré |
| Blocage de dates exceptionnelles (API + UI admin) | ✅ Livré |
| Profil client — modification des informations | ✅ Livré |
| Déploiement en production (alwaysdata) | ✅ Livré |

---

## Pages de l'application

| URL | Rôle | Accès |
|-----|------|-------|
| `index.html` | Landing page (vitrine + catalogue) | Public |
| `pages/login.html` | Connexion + inscription | Public |
| `pages/reserver.html` | Parcours de réservation (3 étapes) | Client connecté |
| `pages/mes-rdv.html` | Liste et gestion de ses rendez-vous | Client connecté |
| `pages/profil.html` | Modification du profil client | Client connecté |
| `pages/dashboard.html` | Tableau de bord administrateur | Admin uniquement |

---

## API REST — Routes principales

| Méthode | Route | Accès |
|---------|-------|-------|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Client |
| PUT | `/api/auth/me` | Client |
| GET | `/api/services` | Public |
| POST/PUT/DELETE | `/api/services/:id` | Admin |
| GET | `/api/availabilities` | Public |
| GET | `/api/availabilities/day?date=` | Public |
| PUT | `/api/availabilities/:dayOfWeek` | Admin |
| POST | `/api/availabilities/block` | Admin |
| DELETE | `/api/availabilities/block/:date` | Admin |
| GET | `/api/appointments/slots?date=&serviceId=` | Authentifié |
| POST | `/api/appointments` | Client |
| GET | `/api/appointments/me` | Client |
| GET | `/api/appointments` | Admin |
| DELETE | `/api/appointments/:id` | Client (le sien) / Admin |

---

## Hors périmètre (évolutions futures)

- Paiement en ligne
- Notifications SMS / Email de rappel
- Multi-salon / marketplace
- Application mobile native
- Tests automatisés (Jest / Supertest)

---

## Contraintes identifiées

- Interface responsive — mobile-first (validé T25–T27)
- Authentification sécurisée JWT + bcrypt (validé T21–T24)
- Gestion des conflits de créneaux côté serveur (validé T10–T11)
- Soft delete des prestations (is_active = 0) pour préserver l'historique des RDV
