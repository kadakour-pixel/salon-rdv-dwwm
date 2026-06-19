# 💇 Salon Élégance — Application de prise de rendez-vous

> Projet de fin de formation **DWWM (Développeur Web et Web Mobile)**  
> Application web full-stack de réservation en ligne pour un salon de coiffure.

---

## 📋 Présentation

Salon Élégance permet aux clients de réserver un rendez-vous en ligne 24h/24, sans appel téléphonique. Le coiffeur dispose d'un dashboard administrateur pour gérer son agenda, ses prestations et ses disponibilités en temps réel.

### Fonctionnalités principales

**Côté client**
- Inscription et connexion sécurisées
- Catalogue des prestations (nom, durée, prix)
- Réservation en 3 étapes : prestation → créneau → confirmation
- Consultation et annulation des rendez-vous depuis l'espace client
- Modification du profil (prénom, nom, email)

**Côté administrateur**
- Agenda du jour navigable (vue par date)
- Gestion complète des prestations (CRUD)
- Gestion des horaires d'ouverture et fermetures exceptionnelles
- Vue globale de tous les rendez-vous avec filtre par date
- Métriques en temps réel (RDV du jour, de la semaine, annulations)

---

## 🛠 Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML / CSS / JavaScript vanilla |
| Backend | Node.js + Express |
| Base de données | MySQL |
| Authentification | JWT (JSON Web Tokens) |
| Hashage des mots de passe | bcrypt |

---

## 📁 Structure du projet

```
salon-rdv/
├── backend/
│   ├── server.js                        # Point d'entrée Express
│   ├── package.json
│   ├── .env.example                     # Variables d'environnement
│   ├── database/
│   │   └── schema.sql                   # Schéma BDD + données de seed
│   └── src/
│       ├── config/
│       │   └── db.js                    # Pool de connexions MySQL
│       ├── middlewares/
│       │   └── auth.middleware.js       # JWT + contrôle des rôles
│       ├── controllers/
│       │   ├── auth.controller.js       # Inscription / connexion / profil
│       │   ├── service.controller.js    # CRUD prestations
│       │   ├── appointment.controller.js # Créneaux + RDV
│       │   └── availability.controller.js # Horaires
│       └── routes/
│           ├── auth.routes.js
│           ├── service.routes.js
│           ├── appointment.routes.js
│           └── availability.routes.js
│
└── frontend/
    ├── index.html                       # Page d'accueil
    ├── css/
    │   ├── style.css                    # Styles globaux + variables CSS
    │   ├── home.css                     # Styles page d'accueil
    │   ├── pages.css                    # Styles communs pages internes
    │   ├── login.css                    # Styles page connexion
    │   ├── reserver.css                 # Styles page réservation
    │   ├── mes-rdv.css                  # Styles espace client
    │   └── dashboard.css               # Styles dashboard admin
    ├── js/
    │   ├── app.js                       # Utilitaires partagés (Auth, apiRequest, toast)
    │   ├── home.js                      # Logique page d'accueil
    │   ├── login.js                     # Logique connexion / inscription
    │   ├── reserver.js                  # Logique réservation (stepper + calendrier)
    │   ├── mes-rdv.js                   # Logique espace client
    │   ├── profil.js                    # Logique page profil client
    │   └── dashboard.js                # Logique dashboard admin
    └── pages/
        ├── login.html                   # Connexion / inscription
        ├── reserver.html               # Réservation en 3 étapes
        ├── mes-rdv.html                # Mes rendez-vous
        ├── profil.html                 # Profil client
        └── dashboard.html              # Dashboard administrateur
```

---

## 🚀 Installation et démarrage

### Prérequis

- [Node.js](https://nodejs.org) v18+
- [MySQL](https://www.mysql.com) 8+
- Un terminal

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd salon-rdv
```

### 2. Configurer et démarrer le backend

```bash
cd backend

# Installer les dépendances
npm install

# Créer le fichier de configuration
cp .env.example .env
```

Éditer le fichier `.env` :

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=salon_rdv

JWT_SECRET=remplacer_par_une_chaine_longue_et_aleatoire
JWT_EXPIRES_IN=7d
```

```bash
# Créer la base de données et insérer les données de test
mysql -u root -p < database/schema.sql

# Démarrer le serveur (mode développement)
npm run dev
```

Le backend est accessible sur `http://localhost:3000`

### 3. Démarrer le frontend

Le frontend est en HTML/CSS/JS vanilla — aucune installation nécessaire.

```bash
cd frontend

# Option A : avec Node.js
npx serve .

# Option B : avec Python
python3 -m http.server 8080
```

Ouvrir `http://localhost:8080` dans le navigateur.

> ⚠️ Ne pas ouvrir les fichiers HTML directement avec `file://` — les appels API seront bloqués par les restrictions CORS du navigateur.

---

## 🔌 API REST

Base URL : `http://localhost:3000/api`

### Authentification

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| POST | `/auth/register` | Public | Créer un compte client |
| POST | `/auth/login` | Public | Connexion → retourne un JWT |
| GET | `/auth/me` | Client | Récupérer son profil |
| PUT | `/auth/me` | Client | Modifier son profil |

### Prestations

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| GET | `/services` | Public | Liste des prestations actives |
| POST | `/services` | Admin | Créer une prestation |
| PUT | `/services/:id` | Admin | Modifier une prestation |
| DELETE | `/services/:id` | Admin | Désactiver une prestation |

### Rendez-vous

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| GET | `/appointments/slots?date=&serviceId=` | Client | Créneaux disponibles |
| POST | `/appointments` | Client | Réserver un créneau |
| GET | `/appointments/me` | Client | Mes rendez-vous |
| GET | `/appointments?date=` | Admin | Tous les rendez-vous |
| DELETE | `/appointments/:id` | Client/Admin | Annuler un rendez-vous |

### Disponibilités

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| GET | `/availabilities` | Public | Horaires d'ouverture |
| GET | `/availabilities/day?date=` | Public | Horaires d'un jour précis |
| PUT | `/availabilities/:dayOfWeek` | Admin | Modifier les horaires d'un jour |
| POST | `/availabilities/block` | Admin | Bloquer une date |
| DELETE | `/availabilities/block/:date` | Admin | Débloquer une date |

### Format du token JWT

Toutes les routes protégées nécessitent le header :
```
Authorization: Bearer <token>
```

---

## 🗄 Base de données

### Schéma

```
users
  id | email | password_hash | first_name | last_name | role | created_at

services
  id | name | duration_minutes | price | is_active

availabilities
  id | day_of_week | open_time | close_time | is_blocked | blocked_date

appointments
  id | user_id (FK) | service_id (FK) | start_at | end_at | status | created_at
```

### Compte admin par défaut

Après l'exécution du `schema.sql`, un compte admin est créé :

```
Email    : admin@salon.fr
Password : Admin1234!   ← À changer impérativement en production
```

> Le hash bcrypt du mot de passe dans le seed est un placeholder — remplacer la ligne dans `schema.sql` par un vrai hash généré avec bcrypt avant la mise en production.

---

## 🔒 Sécurité

- Les mots de passe sont hashés avec **bcrypt** (coût 10)
- L'authentification repose sur des **JWT** signés, expirés après 7 jours
- Le middleware vérifie le rôle (`client` ou `admin`) sur chaque route protégée
- Les prestations supprimées sont **désactivées logiquement** (`is_active = 0`) pour préserver l'historique des RDV
- La détection des conflits de créneaux est effectuée côté serveur avant chaque réservation

---

## 📐 Choix techniques

| Décision | Justification |
|----------|---------------|
| JS vanilla (sans framework) | Maîtrise des fondamentaux, pas de dépendance de build |
| Suppression logique des prestations | Préserve l'intégrité des données historiques |
| Créneaux générés à la volée | Pas de stockage redondant, toujours à jour |
| Pas de 30 min configurable | Le pas de génération est modifiable dans `appointment.controller.js` |
| JWT stateless | Pas de session côté serveur, adapté à une future API mobile |

---

## 📄 Licence

Projet réalisé dans le cadre de la certification **DWWM** — usage pédagogique.
