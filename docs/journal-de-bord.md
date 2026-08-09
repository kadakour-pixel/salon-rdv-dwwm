# Journal de bord — Salon Élégance

**Projet :** Application de prise de rendez-vous en ligne (multi-salons)
**Candidat :** Kadour Amini
**Formation :** DWWM — MolenGeek Roubaix (titre RNCP 37674 obtenu, soutenance réussie le 29/07/2026)

---

## Entrée 1 — Lancement du projet
**Date :** avant le 11 juin 2026

Mise en place complète de l'application (backend Node/Express en couches, JWT/bcrypt,
routes REST `/api/auth`, `/api/services`, `/api/appointments`, `/api/availabilities`,
génération de créneaux `generateSlots()` ; frontend HTML/CSS/JS vanilla, pages
inscription/connexion/réservation/mes-rdv/dashboard).

## Entrée 2 — Suppression du dossier parasite et corrections
**Date :** 11 juin 2026

Nettoyage d'un dossier parasite, correction de la validation email et de la longueur
du mot de passe côté backend.

## Entrée 3 — Plan de tests T01–T27
**Date :** 11 juin 2026

27/27 tests manuels passés (parcours client + admin).

## Entrée 4 — Réorganisation de la documentation
**Date :** 16 juin 2026

Création du dossier `docs/` (`brief.md`, `user-stories.md`, `todo.md`,
`journal-de-bord.md`) et de `CLAUDE.md` à la racine.

## Entrée 5 — Finalisation des fonctionnalités admin et profil client
**Date :** 17 juin 2026

US21 (horaires), US22 (fermetures exceptionnelles), US23 (profil client) livrées.
Corrections de bugs (spinner Horaires, alertes de formulaire). 34/34 tests passés.

## Entrée 6 — Revue de code, commentaires et corrections
**Date :** 18 juin 2026

Commentaires en français sur les fichiers clés. Corrections : try/catch manquant sur
la désactivation de prestation, redirection admin incorrecte sur le profil, bug UTC
sur les dates (dashboard + réservation). 38/38 tests passés.

## Entrée 7 — Déploiement en production sur alwaysdata
**Date :** 19 juin 2026

Premier déploiement complet sur `https://kadakour.alwaysdata.net`. Correction de
`API_BASE`, ajout des routes profil. 38/38 tests validés en production.

## Entrée 8 — Sécurisation et corrections responsive
**Date :** 21 juin 2026

Ajout de Helmet, correction responsive de l'illustration hero, filtre SQL sur les
dates bloquées expirées.

## Entrée 9 — Tests automatisés Jest + Supertest
**Date :** 1 juillet 2026

Mise en place de Jest/Supertest (`salon_rdv_test`, `.env.test`, `tests/setup.js`).
12 premiers tests automatisés (5 unitaires sur `generateSlots`, 7 d'intégration).
44 tests manuels + 12 automatisés au total.

---

## Entrée 10 — Évolution avis clients
**Date :** juillet 2026 (avant le 29/07)

**Fonctionnalité "avis clients" livrée en 6 commits atomiques** :
- Migration 004 : table `reviews` (`appointment_id` UNIQUE, `rating` 1-5, FK en
  `INT UNSIGNED`).
- API `/api/reviews` : `POST` avec éligibilité vérifiée 100% en SQL (RDV du client,
  statut `confirmed`, terminé), conflit détecté via `ER_DUP_ENTRY` sans SELECT
  préalable (évite la race condition) ; `GET` public avec prénom seul (minimisation
  RGPD), tri par date, `LIMIT 20` ; `GET /reviewable` ; `GET /stats` (COUNT + AVG,
  conversion en `Number` car mysql2 renvoie `AVG` en chaîne).
- Frontend : section avis sur l'accueil, badge de note moyenne (masqué si aucun avis),
  modale de dépôt d'avis dans `mes-rdv.html`. Tout le rendu passe par
  `createElement`/`textContent` — testé en conditions réelles avec une charge utile
  `<script>` affichée en texte brut (capture conservée).
- `API_BASE` rendu dynamique selon le hostname (dev local enfin possible sans coder
  l'URL de prod en dur).
- CORS durci en liste blanche d'origines.

**Résultat : 8 suites / 56 tests automatisés verts.**

---

## Entrée 11 — DWWM : soutenance et obtention du titre
**Date :** 29 juillet 2026

Soutenance passée avec succès, titre RNCP 37674 obtenu. Le projet devient une pièce
de **portfolio** et continue d'évoluer au-delà du périmètre initialement présenté au
jury.

## Entrée 12 — Multi-salons/multi-coiffeurs : backend
**Date :** 29 juillet 2026

**6 commits atomiques, 95 tests verts, rétrocompatibilité totale** (le frontend
mono-salon existant continue de fonctionner sans modification) :
- Migration 005 : tables `salons` et `stylists`, `salon_id`/`stylist_id` ajoutés en
  `DEFAULT 1` sur les tables existantes, rôle `manager`, `users.salon_id`.
- **Bug latent découvert et corrigé** : `availabilities` n'avait jamais eu d'index
  UNIQUE malgré des upserts `ON DUPLICATE KEY UPDATE` → doublons silencieux
  constatés en base (10 lignes pour 5 jours). Fix : dédoublonnage défensif + deux
  index composites.
- API publique salons/coiffeurs, disponibilités et créneaux scopés par coiffeur,
  création de RDV avec cohérences croisées salon/coiffeur/service (400 si invalide),
  chevauchement de créneaux scopé par coiffeur (deux RDV simultanés possibles avec
  des coiffeurs différents), services scopés par salon.
- Rôle **manager** : middleware `resolveSalonScope` qui relit `users.salon_id` en
  base à chaque requête (jamais depuis le JWT, pour qu'un changement d'affectation
  soit immédiat). Accès strictement limité à son salon (403 sinon).

## Entrée 13 — Multi-salons : parcours client (frontend)
**Date :** 30 juillet 2026

Refonte de `reserver.js` en stepper à étapes nommées (`STEPS[]`) : salon → coiffeur
→ prestation → date → créneau, avec auto-sélection et masquage de l'étape si un seul
salon ou coiffeur actif. Affichage du coiffeur dans `mes-rdv.html`. Bug CSS
préexistant (`.btn:disabled`) corrigé séparément.

## Entrée 14 — Multi-salons : dashboard admin/manager (Lots A-D)
**Date :** 31 juillet 2026

- **Lot A** : `Auth.isStaff()` (admin OU manager) sur navbar/redirections/dashboard.
- **Lot B** : sélecteur de coiffeur pour l'onglet Horaires (masqué si un seul
  coiffeur). Fix UTC séparé sur `blocked_date`.
- **Lot C** : services scopés par salon côté dashboard.
- **Lot D** : vue des rendez-vous enrichie (salon/coiffeur affichés).

---

## Entrée 15 — Chantier "Admin : salons et invitations manager" — backend
**Date :** 03 août 2026

**7 commits, 179 tests verts.** Trois états de salon : Actif / Suspendu
(`is_active = 0`, réversible) / Archivé (terminal). Migration 007 :
`latitude`/`longitude` (DECIMAL), `archived_at`, `archived_by`. Endpoints en `POST`
uniquement (aucun `PATCH` dans le projet). Archivage = défense en profondeur
(force `is_active = 0`, invalide les invitations non consommées). Suppression
réservée aux salons vierges (5 comptages de dépendances, 409 sinon avec suggestion
d'archivage). **Faille de sécurité corrigée dans le même chantier** : un salon
suspendu restait réservable si le salon/coiffeur n'était pas fourni explicitement à
la création de RDV.

## Entrée 16 — Invitations manager
**Date :** 02 août 2026

Migration 006 : table générique `action_tokens` (jetons hashés SHA-256,
extensible à d'autres usages). `POST /api/auth/invite-manager` (Nodemailer/Ethereal),
séparation de `FRONTEND_URL` et `APP_URL` (corrige un bug préexistant de port erroné
dans les liens d'e-mail). `POST /api/auth/set-password`. 100 → 131 tests.

## Entrée 17 — Page de définition de mot de passe + fix CSS
**Date :** 05 août 2026

`pages/definir-mot-de-passe.html` et `js/definir-mot-de-passe.js` créés, testés de
bout en bout avec un jeton d'invitation réel via Ethereal. Bug CSS préexistant
corrigé séparément : `.login-form-panel p` écrasait `.form-error` (spécificité CSS),
affectait aussi `login.html`.

## Entrée 18 — Dashboard admin salons (Lot C)
**Date :** 07 août 2026

Liste des salons avec badges d'état, actions conditionnelles selon l'état, formulaires
création/édition (avec coordonnées), formulaire d'invitation manager, confirmations
avant actions irréversibles. 179 tests, aucune régression backend.

**Changement méthodologique** : l'outil Codex (ChatGPT) a été testé puis abandonné
après avoir affirmé avoir vérifié des fichiers/routes sans l'avoir fait réellement.
Méthode adoptée depuis : le code est écrit et expliqué directement en conversation,
après vérification croisée stricte sur le contenu réel des fichiers.

## Entrée 19 — Carte Leaflet dans le parcours de réservation (E2)
**Date :** 08 août 2026

Intégration de Leaflet (CDN unpkg) dans `reserver.html` : carte multi-marqueurs à
l'étape salon (clic = sélection), carte mono-marqueur non interactive au
récapitulatif (`invalidateSize()` pour corriger l'initialisation sur un conteneur
caché). `parseFloat()` systématique sur les coordonnées (mysql2 renvoie les
colonnes `DECIMAL` en chaînes). Popups échappés via `escapeMapText()` par cohérence
avec la règle XSS du projet.

## Entrée 20 — Anti-abus en prévision de la mise en production
**Date :** 08 août 2026

Déclenché par une réflexion sur un scénario de client malveillant monopolisant les
créneaux d'un salon, motivé par la mise en production prochaine :
- `express-rate-limit` : `authLimiter` (10 req/15 min sur login/register/
  resend-verification), `appointmentLimiter` (20 req/15 min sur la création de RDV),
  `trust proxy 1` activé (obligatoire derrière le proxy alwaysdata), désactivé en
  environnement de test.
- `MAX_ACTIVE_APPOINTMENTS = 5` par client (portée globale, tous salons confondus),
  vérifié en tout début de la création de RDV.

**182/182 tests verts. Branche `evolution-v2`, HEAD `fd6340f`, poussée sur origin.**

---

## Reste à faire

Déploiement des évolutions post-soutenance sur alwaysdata (migrations 001→007,
`FRONTEND_URL` + SMTP réel en remplacement d'Ethereal, vérifications post-déploiement).