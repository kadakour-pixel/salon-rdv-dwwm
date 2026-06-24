# Salon Élégance — Dossier de présentation du projet (DWWM)

> Fichier de référence récapitulant l'état du projet et le travail réalisé.
> À placer dans `docs/presentation.md` du dépôt. Sert de base au dossier
> professionnel, au diaporama de soutenance et à la préparation de l'oral.

---

## 1. Identité du projet

- **Nom :** Salon Élégance
- **Type :** application web de prise de rendez-vous pour un salon de coiffure (mono-salon)
- **Candidat :** Kadour AMINI — formation DWWM, MolenGeek Roubaix
- **Titre visé :** Développeur Web et Web Mobile — **RNCP 37674** (niveau 5)
- **En ligne :** https://kadakour.alwaysdata.net
- **Dépôt :** https://github.com/kadakour-pixel/salon-rdv-dwwm

### Objectif métier
Permettre aux clients de réserver une prestation **24h/24** sans téléphoner, offrir au
coiffeur (administrateur) une **vue temps réel** sur son agenda, et **réduire les no-shows**.

### Périmètre (MVP)
Inscription/authentification, catalogue de prestations, calendrier de disponibilités,
réservation, annulation, dashboard administrateur, gestion des horaires et fermetures.
**Hors périmètre (évolutions futures) :** vérification e-mail à l'inscription, notifications
de rappel (e-mail/SMS), paiement en ligne, multi-salon.

---

## 2. Stack technique

| Couche | Technologies |
|---|---|
| Front-end | HTML5, CSS3 (Flexbox, Grid, variables CSS), JavaScript vanilla (ES6+), responsive **mobile-first** |
| Back-end | Node.js, Express (API REST), architecture en couches |
| Base de données | MariaDB / MySQL (relationnelle), accès via **mysql2** (pool, requêtes préparées) |
| Authentification | **JWT** (jsonwebtoken) + **bcrypt** |
| Sécurité | **Helmet** (en-têtes HTTP), CORS, validations serveur, `.env` (dotenv) |
| Outils | VS Code, Git/GitHub, npm, nodemon ; déploiement alwaysdata via FTP (FileZilla) |

---

## 3. Architecture

```
salon-rdv-dwwm/
├── backend/
│   ├── src/  (config/ · controllers/ · middlewares/ · routes/)
│   ├── database/schema.sql
│   ├── server.js · package.json · .env (non versionné) · .env.example
├── frontend/  (index.html · css/ · js/ · pages/)
├── docs/ · README.md · .gitignore
```

- **Front** : pages statiques + JS qui consomme l'API REST. Tous les appels passent par
  une fonction `apiRequest()` (fetch) qui ajoute le token JWT et gère les erreurs (401 →
  déconnexion/redirection).
- **Back** : `server.js` monte les middlewares globaux (Helmet, CORS, JSON) puis les
  routeurs par ressource (`/api/auth`, `/api/services`, `/api/appointments`,
  `/api/availabilities`), avec gestion 404 + handler d'erreur global.
- **`API_BASE`** (front) pointe sur la production : `https://kadakour.alwaysdata.net/api`.

---

## 4. Base de données (relationnelle)

4 tables : **users**, **services**, **availabilities**, **appointments**.

- Un **utilisateur** passe 0..N **rendez-vous** ; un rendez-vous appartient à 1 utilisateur.
- Un **rendez-vous** porte sur 1 **prestation** ; une prestation concerne 0..N rendez-vous.
- **availabilities** = table de configuration (horaires hebdo + fermetures exceptionnelles).

Choix notables : clés étrangères (CASCADE / RESTRICT), index (`idx_start_at`, `idx_user_id`,
email unique), **suppression logique** des prestations (`is_active = 0`) pour préserver
l'historique, `status` en ENUM (`pending`/`confirmed`/`cancelled`).
Clés primaires en `INT UNSIGNED` → capacité ~4,29 milliards d'enregistrements.

---

## 5. Fonctionnalités clés

- **Réservation en 3 étapes (stepper)** : prestation → calendrier (dates passées
  non cliquables) → créneaux chargés dynamiquement → confirmation.
- **Génération des créneaux à la volée** (`generateSlots()`) selon horaires + durée de la
  prestation, avec **détection de chevauchement** (anti double-réservation).
- **Espace client** : liste des RDV, filtres, annulation avec confirmation ; profil
  (affichage + modification via `/api/auth/me`).
- **Dashboard admin** : métriques, agenda du jour avec navigation, liste filtrable, CRUD
  prestations, gestion des horaires et fermetures exceptionnelles.

---

## 6. Sécurité

- Mots de passe **hachés (bcrypt)**, jamais stockés en clair.
- **JWT** (Bearer) + middleware `authenticate` ; contrôle de rôle `requireRole('admin')`.
- **Requêtes préparées paramétrées** partout → protection contre les **injections SQL**.
- Message d'erreur volontairement vague au login (ne révèle pas si l'email existe).
- **Helmet** : en-têtes HTTP protecteurs (X-Content-Type-Options, X-Frame-Options,
  Strict-Transport-Security…).
- **Secrets non versionnés** : `.env` ignoré par Git ; `.env.example` fourni comme modèle.

---

## 7. Tests

Plan de tests manuel structuré — **44/44 cas passés (T01–T44)** :
parcours client, parcours admin, sécurité API (401/403/jeton falsifié), responsive,
horaires/fermetures, profil, validations, **déploiement en production (T39–T44)**.

Exemples de bugs détectés et corrigés :
- décalage d'horaire lié au fuseau **UTC** → calcul des dates en heure locale ;
- dates de fermeture passées qui persistaient dans le dashboard → filtre SQL
  `WHERE blocked_date IS NULL OR blocked_date >= CURDATE()`.

---

## 8. Déploiement (alwaysdata)

- Site **Node.js** sur alwaysdata (répertoire `/home/kadakour/backend`), serveur Express
  lancé au démarrage.
- Base **MariaDB** hébergée, alimentée par `schema.sql`.
- Variables d'environnement de prod dans `.env` (non versionné).
- Fichiers synchronisés par **FTP (FileZilla)**.
- Bascule de `API_BASE` (front) vers l'URL de production ; redémarrage via le panneau
  alwaysdata ; vérification en conditions réelles (T39–T44).
- **Procédure d'installation/déploiement documentée dans le README.**

---

## 9. Couverture des 8 compétences (RNCP 37674)

**Bloc 1 — Front-end**
1. Installer et configurer son environnement de travail → VS Code, Node/npm, dépendances, structure, `.env`, Git/GitHub
2. Maquetter des interfaces → brief, 23 user stories, 5 wireframes mobile-first
3. Réaliser des interfaces statiques → HTML sémantique + CSS responsive
4. Développer la partie dynamique → JS vanilla, `apiRequest`, stepper, dashboard

**Bloc 2 — Back-end**
5. Mettre en place une base de données relationnelle → MCD/MLD/dictionnaire, `schema.sql`
6. Composants d'accès aux données SQL et NoSQL → mysql2, pool, requêtes paramétrées (projet **SQL**; NoSQL non requis mais maîtrisé)
7. Composants métier côté serveur → Express en couches, JWT/rôles, `generateSlots()`, tests 44/44
8. Documenter le déploiement → README + mise en production alwaysdata

> Remarque : le titre **37674** ne comporte plus de compétence CMS/e-commerce
> (contrairement à l'ancien **31114**) — aucun livrable WordPress requis.

---

## 10. État des livrables

- ✅ **Dossier Professionnel** finalisé (Word + PDF), aligné 37674, format A4 — intègre
  captures réelles, MCD, wireframes, extraits de code, grille de couverture, déclaration.
- ✅ **Dépôt GitHub propre** : `.env` non versionné, `.env.example` fourni, historique
  nettoyé, bug `auth.routes.js` corrigé (`authenticate`), Helmet ajouté.
- ✅ **Application déployée et testée en production**.
- ⏳ **Reste :** dater la signature de la déclaration sur l'honneur le jour de la remise
  (puis réexport PDF) ; reporter le **nouveau `JWT_SECRET`** sur alwaysdata si ce n'est
  pas déjà fait.

---

## 11. Démonstration (jour J)

- Démo **sur la production** : https://kadakour.alwaysdata.net
- Compte admin de test : `admin@salon.fr` / `Admin1234!`
- Parcours à montrer : inscription/connexion client → réservation 3 étapes → Mes RDV /
  annulation → connexion admin → dashboard (métriques, agenda, prestations, horaires).
- **Plan B** recommandé : captures d'écran (déjà dans le DP) + courte vidéo de démo
  enregistrée à l'avance, au cas où le réseau/l'hébergeur flancherait.

---

## 12. Pistes de questions du jury (préparation oral)

- Pourquoi du JavaScript vanilla plutôt qu'un framework ? (maîtrise des fondamentaux)
- Comment éviter les doubles réservations ? (`generateSlots()` + détection de chevauchement)
- Comment sont protégées les données ? (bcrypt, JWT, requêtes paramétrées, Helmet)
- Différence SQL / NoSQL et pourquoi un relationnel ici ? (données structurées et reliées)
- Combien de clients la base peut-elle gérer ? (`INT UNSIGNED`, limite réelle = hébergement)
- Comment fiabiliser l'inscription à l'avenir ? (vérification e-mail — perspective)
- Comment as-tu utilisé l'IA ? (assistant : pistes/doc, code compris/adapté/testé/validé)
