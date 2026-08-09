# Plan de tests — Salon Élégance

**Version :** 6.0
**Date :** 08 août 2026
**Résultat global : 44 tests manuels (base mono-salon, historique) + 182 tests automatisés (Jest/Supertest, état actuel) ✅**

> À partir de l'introduction de Jest/Supertest (1er juillet 2026), la couverture de
> non-régression est assurée par les tests automatisés, rejoués à chaque évolution.
> Les tests manuels T01–T44 ci-dessous restent comme trace historique de la phase
> pré-automatisation et de la validation de production initiale (juin 2026).

---

## 1. Tests manuels historiques (T01–T44)

### 1.1 Authentification (T01–T06)

| ID | Description | Résultat |
|----|-------------|----------|
| T01 | Inscription avec email valide | ✅ PASS |
| T02 | Inscription avec email déjà utilisé | ✅ PASS |
| T03 | Inscription avec mot de passe < 8 caractères | ✅ PASS |
| T04 | Connexion avec bons identifiants | ✅ PASS |
| T05 | Connexion avec mauvais identifiants | ✅ PASS |
| T06 | Accès à une page protégée sans être connecté | ✅ PASS |

### 1.2 Réservation (T07–T13)

| ID | Description | Résultat |
|----|-------------|----------|
| T07 | Sélectionner une prestation et avancer | ✅ PASS |
| T08 | Sélectionner une date passée | ✅ PASS |
| T09 | Sélectionner une date valide et voir les créneaux | ✅ PASS |
| T10 | Réserver un créneau disponible | ✅ PASS |
| T11 | Réserver un créneau déjà pris | ✅ PASS |
| T12 | Annuler un RDV à venir | ✅ PASS |
| T13 | Filtrer ses RDV par statut | ✅ PASS |

### 1.3 Parcours admin (T14–T20)

| ID | Description | Résultat |
|----|-------------|----------|
| T14–T20 | Connexion admin, protection dashboard, agenda, CRUD prestations, filtre RDV | ✅ PASS (7/7) |

### 1.4 Sécurité API (T21–T24), Responsive (T25–T27), Horaires (T28–T30), Profil (T31), Validation (T32–T34), Revue de code (T35–T38), Déploiement initial (T39–T44)

Détail conservé de la version précédente du plan de tests. **44/44 PASS.**

---

## 2. Tests automatisés (Jest + Supertest) — progression

Exécution : `npx jest --runInBand --forceExit` depuis `backend/`, base isolée
`salon_rdv_test` (`backend/.env.test` chargé par `tests/setup.js` — mécanisme à ne
jamais modifier). Après chaque migration : rejouer `tests/schema_test.sql`.

| Étape | Fonctionnalité couverte | Total tests |
|-------|--------------------------|--------------|
| 1 juillet 2026 | Mise en place (unitaires `generateSlots` + intégration login/RDV/auth) | 12 |
| Juillet 2026 | + Avis clients (`POST/GET/reviewable/stats`, XSS, conflits) | 56 |
| 29 juillet 2026 | + Multi-salons backend (salons, coiffeurs, disponibilités, RDV, services, rôle manager) | 95 |
| 01–02 août 2026 | + `salon_name` enrichi, invitations manager (`action_tokens`, `set-password`) | 131 |
| 03 août 2026 | + Administration des salons (états, migration 007, faille suspension corrigée) | 179 |
| 08 août 2026 | + Rate-limiting, limite de RDV actifs par client | **182** |

**État actuel : 182/182 tests verts.**

### 2.1 Catégories couvertes en détail

| Catégorie | Exemples de cas couverts |
|-----------|---------------------------|
| Unitaires `generateSlots` | Créneaux normaux, limite de fermeture, débordement, chevauchement total/partiel |
| Auth | Login succès/échec, inscription, vérification e-mail, cooldown resend, token invalide |
| RDV | Création succès/conflit, cohérences croisées salon/coiffeur/service (400), chevauchement scopé par coiffeur, limite de 5 RDV actifs (blocage + libération par annulation) |
| Salons | CRUD, états (actif/suspendu/archivé), coordonnées (validation bornes, coordonnée partielle → 400), `can_delete`, suppression sur salon peuplé (409) vs vierge |
| Manager | Login réel, scope base (`resolveSalonScope`), 403 hors salon, listes filtrées |
| Avis | Éligibilité SQL, conflit `ER_DUP_ENTRY`, minimisation RGPD, stats vide |
| Invitations | Génération jeton, expiration, `set-password`, invalidation lors de l'archivage |
| Rate-limiting | Activation forcée hors `JEST_WORKER_ID` le temps du test, désactivation restaurée après |
| Sécurité transverse | Routes protégées sans token (401), routes admin avec token client (403) |

---

## 3. Bugs détectés et corrigés (chronologique)

| Bug | Description | Correction |
|-----|-------------|------------|
| T03 | `minlength="8"` bloquait la validation JS | Suppression de l'attribut |
| T10/T11 | `end_at` calculé en UTC → décalage d'1h | Calcul sans `toISOString()` |
| T12 | Bouton "Annuler" absent pour les RDV passés dans la journée | Condition `isFuture` assouplie |
| Navbar | Lien Dashboard mal construit | Fonction `pagesPrefix()` |
| Dashboard | Spinner infini onglet Horaires | Centralisation dans `switchTab()` |
| T37–T38 | Décalage UTC dans les métriques et le calendrier | Date locale au lieu de `toISOString()` |
| Dates bloquées | Dates passées persistantes | Filtre SQL `blocked_date >= CURDATE()` |
| `availabilities` | Doublons silencieux (absence d'index UNIQUE) | Dédoublonnage + index composites (migration 005) |
| RDV | Salon suspendu restait réservable par défaut | Vérification systématique salon + coiffeur actifs |
| CSS | `.form-error` écrasé par `.login-form-panel p` | Sélecteur `:not(.form-error)` |
| `blocked_date` | Décalage UTC (objet Date mysql2) | `DATE_FORMAT` en SELECT pour renvoyer une chaîne |

---

## 4. Résumé

| Catégorie | Résultat |
|-----------|----------|
| Tests manuels historiques (T01–T44) | 44/44 ✅ |
| Tests automatisés (état actuel) | 182/182 ✅ |

> Application testée en continu à chaque évolution, base de non-régression
> automatisée. Reste à valider : vérifications manuelles post-déploiement une fois
> les évolutions poussées sur alwaysdata (salon/invitation/set-password/login
> manager/suspension/archivage).