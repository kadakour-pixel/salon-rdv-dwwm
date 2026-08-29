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
- **Lot D** : vue des rendez-vous enrichie (salon/coiffeur affichés), libellé
  sidebar « Mon salon » (manager) / « Administration » (admin).

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
Méthode adoptée depuis : le code est écrit et expliqué directement en conversation
(commande Claude, forfait Free, pas d'accès à Claude Code), après vérification
croisée stricte sur le contenu réel des fichiers.

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

Fusion `main` ← `evolution-v2` en fast-forward pur le 13/08 (voir Entrée 23) ; les
deux branches restent synchronisées à chaque déploiement notable depuis lors.

---

## Entrée 21 — Déploiement alwaysdata, Phase 0 (pré-vol) et incident FTP
**Date :** 12 août 2026

Reconstitution du plan de déploiement en 8 phases (0 à 7), le détail de plusieurs
phases ayant été perdu entre deux sessions. **Phase 0 terminée** : constat que la
prod tournait encore sur la version pré-évolutions (4 tables, aucune migration
jouée, structure backend ancienne). FTP/FTPS validé comme méthode de déploiement de
fichiers. SSH par mot de passe non fonctionnel à cette date (résolu plus tard).

**Incident** : une mauvaise manipulation FTP a écrasé le `.env` de production.
Fichier reconstruit en local (14 variables), envoyé et activé via renommage en deux
temps sur le serveur (`.env.corrompu-12-08` conservé comme trace). Service redémarré
et vérifié fonctionnel (`/api/health`, `/api/services` OK avec données réelles).

## Entrée 22 — Résolution incident FTP, Phase 2 (merge/push Git)
**Date :** 13 août 2026

Fausse alerte élucidée : le `server.js` en prod était resté la version
pré-certification (normal, l'incident FTP a été interrompu avant d'atteindre ces
fichiers alphabétiquement). `.gitignore` durci (`.env*`), fichiers sensibles sortis
du dépôt par précaution. **Phase 2 terminée** : `main` fusionnée avec `evolution-v2`
en fast-forward pur (56 commits, 69 fichiers, aucun conflit), poussée sur
`origin/main` (`537f66c`).

## Entrée 23 — Phase 4 (SMTP) : configuration du SMTP natif alwaysdata
**Date :** 19 août 2026

Diagnostic : le `.env` de prod utilisait encore Ethereal (aucune livraison réelle).
SMTP natif alwaysdata configuré (`smtp-kadakour.alwaysdata.net`, compte technique
`kadakour@alwaysdata.net`). Test d'envoi non concluant mais expliqué : le code en
prod était encore la version pré-certification (n'appelle pas
`mailer.sendVerificationEmail`) — comportement normal en attendant la Phase 4
(déploiement du code).

## Entrée 24 — Phase 4 (code) : déploiement du backend evolution-v2
**Date :** 21 août 2026

Version Node figée sur 24.14.0. Découverte que le code `evolution-v2` était déjà
présent à la racine du serveur (uploadé le 12/08, jamais activé). Réparation du
`node_modules` corrompu (`express-rate-limit`/`debug`, `iconv-lite` réparés via
`npm install --ignore-scripts` + recompilation isolée de `bcrypt` via
`node-pre-gyp`, pour éviter l'OOM d'un `npm install` classique sur l'offre Free).
`.env` de la racine resynchronisé avec les vraies valeurs de prod (DB, `APP_URL`,
`FRONTEND_URL`). Commande du site basculée vers `node ~/server.js`.
**Backend evolution-v2 actif en production**, vérifié (`/api/health`,
`/api/services`, `/api/salons`). Ancien code (`~/backend/`) conservé comme filet de
sécurité rollback.

## Entrée 25 — Bug cwd et blocage Hotmail/Outlook identifié
**Date :** 22 août 2026

Bug trouvé : le répertoire de travail du site était resté sur `~/backend` malgré la
bascule de commande — le serveur chargeait donc silencieusement l'ancien `.env`
(valeurs Ethereal). Corrigé (répertoire de travail → `/home/kadakour/`). Un email de
vérification part alors correctement via le SMTP alwaysdata, mais est
systématiquement rejeté (`Bounced`) pour les adresses Hotmail/Outlook — diagnostic
complet (blacklist, SPF, DMARC) éliminant toute cause technique côté projet ;
confirmé comme un filtrage propre à l'infrastructure Microsoft envers les domaines
mutualisés. Décision de proposer l'application à de vrais salons, ce qui rend ce
blocage bloquant (Hotmail très répandu en France).

## Entrée 26 — Migration SMTP vers Brevo, achat du nom de domaine
**Date :** 22 août 2026

Décision de migrer vers un service transactionnel tiers à meilleure réputation
Microsoft plutôt que de rester sur le SMTP alwaysdata. Compte Brevo créé (300
emails/jour gratuits). Blocage découvert : `kadakour.alwaysdata.net` est un
sous-domaine dont la zone DNS n'est pas éditable — achat du nom de domaine propre
**`salon-elegance.fr`** (1 an, revendeur Gandi via alwaysdata) pour lever ce
blocage. Authentification du domaine complétée côté Brevo (TXT de vérification, 2
CNAME DKIM, DMARC fusionné avec l'existant, SPF complété manuellement).

## Entrée 27 — Bug `.env` corrompu et blocage réseau Brevo
**Date :** 25-26 août 2026

Un `sed` mal ciblé pendant la migration Brevo du 24/08 avait écrasé `DB_HOST` et
`DB_USER` de prod avec des valeurs SMTP — corrigé (source du
`PROTOCOL_CONNECTION_LOST` intermittent observé). Blocage réseau distinct découvert :
connexions sortantes refusées (`ECONNREFUSED`) vers deux IPs Brevo précises,
indépendamment du reste de Brevo/du port 587 (testé sain via `nc`). Ticket support
alwaysdata ouvert.

## Entrée 28 — Résolution complète : inscription et délivrabilité Hotmail
**Date :** 27 août 2026

Deux causes racines supplémentaires trouvées et corrigées dans le `.env` de prod,
reliquats du même incident `sed` du 24/08 : `DB_PORT` valait le port SMTP (587) au
lieu de 3306 ; `DB_PASSWORD` était un doublon de la clé API Brevo (mot de passe
MySQL régénéré). Après ces correctifs, `register` fonctionne de bout en bout et
**l'email de vérification est bien reçu côté Hotmail** — premier succès complet
depuis le début de la migration Brevo. Le blocage réseau IP de l'Entrée 27 ne s'est
plus reproduit depuis.

## Entrée 29 — Sauvegardes automatiques et cron jobs (Phase 5)
**Date :** 27-28 août 2026

**Phase 5 terminée.** Script `scripts/backup-db.sh` créé (mysqldump + gzip + rotation
14 jours, en complément des sauvegardes automatiques alwaysdata limitées à 3 jours
glissants sur l'offre Free). Deux tâches cron configurées dans le panneau alwaysdata :
rappels RDV horaires (`send-reminders.js`) et backup DB quotidien (03:00). Pages
légales statiques créées (mentions légales, CGU, confidentialité), liées depuis le
footer, committées (`564f976`) — contenu laissé avec des placeholders
`[À COMPLÉTER]` (raison sociale, adresse) en l'absence de société/auto-entreprise.

## Entrée 30 — Correction du bug de chemin cron et reprise de la Phase 6
**Date :** 29 août 2026

**Bug découvert et corrigé** : les deux scripts cron avaient été déployés sous
`/home/kadakour/backend/scripts/` en prod (ancien dossier, filet de sécurité
rollback) au lieu de `/home/kadakour/scripts/` (racine du code actif) — la tâche de
rappels a échoué silencieusement toute la matinée. Fichiers déplacés, tâches
cron mises à jour, retestées manuellement avec succès.

**Phase 6 (vérifications post-déploiement) engagée** :
- Volet infrastructure validé : HTTPS/certificat OK, en-têtes de sécurité Helmet
  complets sur l'API (HSTS, `nosniff`, `SAMEORIGIN`…), CORS en liste blanche stricte
  confirmé (origine non autorisée rejetée, origine légitime acceptée avec
  `access-control-allow-origin` reflété).
- Tentative de rattacher le nom de domaine `salon-elegance.fr` au site : **bloquée
  par le forfait alwaysdata Free**, qui ne permet pas de domaine personnalisé
  (message d'erreur explicite du panneau). Décision : mettre ce point de côté et
  rester sur `kadakour.alwaysdata.net` pour l'instant, `salon-elegance.fr` conservé
  en réserve (DNS déjà prêt pour Brevo).
- **Bug de déploiement découvert** : le frontend statique en prod (site PHP distinct
  du site Node, servant `frontend/`) était resté figé sur la version
  pré-certification du 21 juin — la Phase 4 n'avait déployé/activé que le backend,
  jamais le frontend `evolution-v2`. Corrigé le jour même : dossier `frontend/`
  déployé en intégralité vers `/home/kadakour/www/` via FileZilla (`index.html`,
  `css/`, `js/`, `pages/`, hors `node_modules/` égaré par erreur dans
  `frontend/js/`).
- **Test de bout en bout réussi en production** après déploiement : connexion
  dashboard admin (menu multi-salons visible), puis parcours client complet
  (renvoi de vérification e-mail via Brevo, connexion, réservation d'un
  rendez-vous réel apparaissant correctement dans « Mes RDV »).

---

## Reste à faire

- Vérifier demain (30/08) qu'aucun nouvel échec cron n'est survenu depuis la
  correction de chemin du 29/08.
- Finaliser les 3 pages légales (email de contact, section cookies RGPD §8 —
  générées mais pas encore réintégrées au dépôt local ni committées) puis les
  redéployer en prod.
- Terminer la Phase 6 (parcours fonctionnel manager/admin complet restant à
  couvrir) et enchaîner sur la Phase 7 (mise à jour finale de cette documentation).
- Nom de domaine personnalisé `salon-elegance.fr` : en attente d'un éventuel
  passage à un forfait alwaysdata payant.
- Nettoyage mineur non bloquant : trois fichiers vides à la racine du serveur avec
  des identifiants Ethereal dans leur nom (créés par erreur le 21/08), `node_modules`
  égaré dans `frontend/js/` du dépôt local.