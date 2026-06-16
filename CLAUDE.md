# Contexte du projet

## Formation

**École :** MolenGeek Roubaix  
**Formation :** Développeur Web et Web Mobile (DWWM) — titre professionnel de niveau 5  
**Durée :** 6 mois  
**Candidat :** Kadour Amini

## Nature du projet

Ce projet est le dossier de projet de fin de formation, présenté devant un jury dans le cadre du passage du titre professionnel DWWM. Il doit démontrer la maîtrise des compétences du référentiel, regroupées en deux activités types :

- **AT1 — Développer la partie front-end d'une application web ou web mobile**
  - Maquetter une application
  - Réaliser une interface utilisateur web statique et adaptable (responsive)
  - Développer une interface utilisateur web dynamique
  - Réaliser une interface utilisateur avec une solution de gestion de contenu

- **AT2 — Développer la partie back-end d'une application web ou web mobile**
  - Créer une base de données
  - Développer les composants d'accès aux données
  - Développer la partie back-end d'une application web ou web mobile
  - Elaborer et mettre en œuvre des composants dans une application de gestion de contenu

## Utilisation de l'IA

L'IA (Claude Code) a été utilisée comme outil d'assistance tout au long du projet. Ce choix sera déclaré au jury.

**Ce que l'IA a aidé à faire :**
- Générer des structures de code de base
- Proposer des approches techniques
- Rédiger de la documentation

**Ce qui reste de la responsabilité du candidat :**
- Comprendre et être capable d'expliquer chaque ligne de code
- Prendre les décisions d'architecture (stack, structure des routes, schéma BDD)
- Valider ou rejeter les suggestions de l'IA
- Tester manuellement l'application (plan de tests T01–T27)
- Corriger les bugs détectés lors des tests

## Ligne directrice technique

Le niveau de complexité du code doit rester dans les capacités d'un développeur junior en fin de formation DWWM :

- **Pas de framework front-end** (pas de React, Vue, Angular) — HTML/CSS/JS vanilla uniquement
- **Pas de TypeScript** — JavaScript ES6+ suffit
- **Pas d'ORM** — Requêtes SQL directes avec `mysql2`
- **Architecture simple** — MVC basique côté backend, sans over-engineering
- **Tout ce qui est implémenté doit pouvoir être expliqué et défendu à l'oral devant un jury**

---

## État de la session (16 juin 2026)

**MVP complet — 27/27 tests passés.**

### Prochaines tâches (dans l'ordre)

#### Priorité 1 — À faire avant la présentation

1. **UI admin — Gestion des horaires d'ouverture (US21)**
   - Ajouter un onglet "Horaires" dans `frontend/pages/dashboard.html`
   - Afficher les 7 jours avec les plages `open_time` / `close_time`
   - Permettre la modification via `PUT /api/availabilities/:dayOfWeek` (backend déjà prêt)
   - Permettre de marquer un jour comme fermé

2. **UI admin — Fermetures exceptionnelles (US22)**
   - Dans le même onglet "Horaires", ajouter un sélecteur de date
   - Bloquer une date via `POST /api/availabilities/block`
   - Débloquer via `DELETE /api/availabilities/block/:date`
   - Afficher la liste des dates bloquées

3. **Profil client**
   - Créer `frontend/pages/profil.html` avec formulaire (prénom, nom, email)
   - Créer l'endpoint `PUT /api/auth/me` côté backend

#### Priorité 2 — Optionnel

- Validation des entrées backend (`duration_minutes`, `price`, format dates)
- Gestion expiration JWT côté frontend : détecter les 401 dans `app.js` et rediriger vers login
- Remplacer le placeholder SVG hero dans `index.html` par une vraie photo
