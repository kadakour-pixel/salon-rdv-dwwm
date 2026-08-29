# Todo — Salon Élégance

**Dernière mise à jour :** 29 août 2026
**État :** 182 tests automatisés verts · 36/36 user stories · titre DWWM obtenu
(soutenance réussie le 29/07/2026) · projet poursuivi comme portfolio · **déploiement
alwaysdata des évolutions post-soutenance terminé** (backend + frontend + SMTP réel +
cron), objectif en cours : proposer l'application à de vrais salons

---

## Priorité 1 — Déploiement alwaysdata (état détaillé)

Plan en 8 phases. Détail des phases 1/2/7/8 reconstitué au fil des sessions ; les
phases 0/3/4/5/6 sont couvertes.

- [x] **Phase 0 — Pré-vol** : état des lieux de la prod avant modification.
- [x] **Phase 1 — Sauvegardes** : dump BDD initial (DBeaver), puis script
  `scripts/backup-db.sh` (mysqldump + gzip + rotation 14 jours) en complément des
  sauvegardes automatiques alwaysdata (3 jours glissants sur l'offre Free).
- [x] **Phase 2 — Merge/push Git** : `main` fusionnée avec `evolution-v2` (fast-forward
  pur), poussée sur `origin/main`.
- [x] **Phase 3 — Migrations 001→007** jouées en production (8 tables).
- [x] **Phase 4 — Fichiers + variables d'environnement** :
  - [x] Backend `evolution-v2` déployé et actif en prod (`node ~/server.js`,
    version Node figée 24.14.0).
  - [x] `.env` de prod resynchronisé (DB, `APP_URL`, `FRONTEND_URL`) après plusieurs
    incidents de configuration successifs (voir journal de bord, entrées 24-28).
  - [x] SMTP réel configuré — **Brevo** (300 emails/jour), après un premier essai
    infructueux avec le SMTP natif alwaysdata (filtrage Hotmail/Outlook). Domaine
    d'expédition authentifié (SPF/DKIM/DMARC).
  - [x] Frontend `evolution-v2` déployé en prod (`/home/kadakour/www/`) — était resté
    sur l'ancienne version pré-certification jusqu'au 29/08, corrigé ce jour-là.
- [x] **Phase 5 — Cron jobs** : rappels RDV horaires + backup DB quotidien, actifs
  dans le panneau alwaysdata. Un bug de chemin de déploiement (corrigé le 29/08,
  voir journal de bord) avait fait échouer silencieusement les rappels une matinée.
- [ ] **Phase 6 — Vérifications post-déploiement** :
  - [x] HTTPS/certificat SSL.
  - [x] En-têtes de sécurité Helmet (HSTS, `nosniff`, `SAMEORIGIN`…) sur l'API.
  - [x] CORS en liste blanche stricte.
  - [x] Parcours client complet (inscription → vérification email → connexion →
    réservation → annulation) validé de bout en bout en prod.
  - [x] Dashboard admin (connexion, menu multi-salons) validé en prod.
  - [ ] Vérifier qu'aucun nouvel échec cron n'est survenu depuis la correction du
    29/08 (à faire le 30/08).
  - [ ] Parcours manager (accès scopé à son salon) pas encore spécifiquement testé
    en prod.
  - [ ] Confirmer qu'aucun mécanisme équivalent à `JEST_WORKER_ID` n'est actif en
    prod (le rate-limiting est désactivé en test via cette variable — vérifier que
    `NODE_ENV` réel sur alwaysdata n'offre pas d'échappatoire similaire).
- [ ] **Phase 7 — Documentation** : mise à jour de `README.md`,
  `docs/journal-de-bord.md`, `docs/todo.md` en cours (cette mise à jour). Reste à
  actualiser le README des migrations (colonne prod) et à retirer la mention
  "production pas à jour" une fois tout confirmé stable.
- [ ] **Phase 8** — contenu jamais précisé dans les sessions antérieures, à définir
  ou à considérer comme clôturée si aucun point restant ne s'y rattache.

---

## Priorité 2 — Suite de l'objectif "proposer l'app à de vrais salons"

### [x] Nom de domaine propre acheté — `salon-elegance.fr`
Configuré côté DNS pour Brevo (SPF/DKIM/DMARC). **Non rattaché à un site alwaysdata**
pour l'instant : le forfait Free ne permet pas de domaine personnalisé (message
d'erreur explicite du panneau, découvert le 29/08). L'application reste accessible
sur `kadakour.alwaysdata.net` en attendant un éventuel changement de forfait.

### [x] Délivrabilité Hotmail/Outlook résolue
Migration SMTP alwaysdata → Brevo, plusieurs incidents de configuration `.env`
corrigés en cours de route (voir journal de bord). Confirmé fonctionnel de bout en
bout le 27/08 et retesté avec succès le 29/08.

### [x] Sauvegardes automatiques de la base de production
Voir Phase 1 ci-dessus.

### [ ] Aspects légaux — mentions légales / CGU / politique de confidentialité
Trois pages statiques créées, committées (`564f976`) et déployées en prod le 29/08.
**Contiennent encore des placeholders `[À COMPLÉTER]`** (raison sociale, adresse,
directeur de publication, durées de conservation précises RGPD §5) — pas de société
ni d'auto-entreprise à ce jour, projet perso/portfolio. Une version enrichie (email
de contact + section cookies RGPD §8) a été générée dans une session antérieure mais
**pas encore réintégrée dans le dépôt local ni committée** — à faire "en temps
voulu".

### [ ] Question du support/maintenance pour un salon client réel
Pas encore abordée.

---

## Priorité 3 — Fonctionnalités livrées depuis la soutenance (pour référence)

### [x] Multi-salons / multi-coiffeurs (backend + frontend)
Tables `salons`/`stylists`, rôle `manager` scopé, parcours client en stepper,
dashboard admin/manager adapté.

### [x] Administration des salons
États (actif/suspendu/archivé), coordonnées, invitations manager par e-mail, page de
définition de mot de passe, dashboard admin dédié.

### [x] Carte Leaflet dans le parcours de réservation
Multi-marqueurs à l'étape salon, mono-marqueur au récapitulatif.

### [x] Anti-abus
Rate-limiting (login/register/RDV) + limite de 5 rendez-vous actifs par client.

### [x] Avis clients
Dépôt, affichage public, note moyenne.

### [x] Vérification e-mail + rappels automatiques

### [x] Tests automatisés Jest/Supertest
182 tests, exécutés à chaque évolution (base de dev/CI — pas rejoués contre la
production).

---

## Priorité 4 — Dette technique et backlog notés en route

- [ ] Coordonnées de "Salon Élégance" (salon 1) toujours à `null` en **production**
  (renseignées en dev uniquement lors du chantier Leaflet) — bloquant pour
  l'affichage correct de ce salon sur la carte en prod.
- [ ] Atomicité de certains doubles UPDATE (ex. archivage + set-password).
- [ ] Rôle admin lu depuis le JWT dans `authenticate` (pas rejoué en base,
  contrairement au manager via `resolveSalonScope`) — à harmoniser si un changement
  de rôle à effet immédiat devient nécessaire.
- [ ] Dette UTC résiduelle sur `getForDay` (`new Date(date).getDay()`).
- [ ] Retrait des `DEFAULT 1` (migration 005) une fois le frontend historique
  définitivement abandonné.
- [ ] Endpoints admin-only pour gérer les coiffeurs (`stylists`) directement.
- [ ] `node_modules` présent dans l'historique Git (cosmétique) — **et un second
  `node_modules` (dépendances backend) découvert par erreur dans `frontend/js/` en
  local le 29/08, jamais déployé mais à nettoyer côté dépôt.**
- [ ] `archived_by === 1` en dur dans un test (à généraliser).
- [ ] README des migrations à tenir à jour (colonne prod).
- [ ] Trois fichiers vides à la racine du serveur de prod, créés par erreur le
  21/08, dont le nom contient des identifiants Ethereal (test, non sensibles) — à
  supprimer.
- [ ] Encodage du sujet des emails à vérifier côté destinataire final (mal encodé
  dans les logs alwaysdata à une époque — probable souci UTF-8 sur l'en-tête
  `subject`, jamais reconfirmé depuis la migration Brevo).

---

## Priorité 5 — Évolutions futures

- [ ] Plage de dates pour congés (bloquer une période plutôt que jour par jour).
- [ ] Paiement en ligne.
- [ ] Notifications SMS (le rappel e-mail est déjà livré).
- [ ] Application mobile native.
- [ ] Passage à un forfait alwaysdata payant pour activer `salon-elegance.fr`.

---

## Hors périmètre (décision assumée)

- Documentation Swagger/OpenAPI
- Pagination de la liste admin
- Internationalisation des dates (`Intl.DateTimeFormat`)