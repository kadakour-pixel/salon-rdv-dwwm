# Todo — Salon Élégance

**Dernière mise à jour :** 08 août 2026
**État :** 182 tests automatisés verts · 36/36 user stories · titre DWWM obtenu (soutenance
réussie le 29/07/2026) · projet poursuivi comme portfolio · déployé sur alwaysdata mais
**évolutions post-soutenance pas encore poussées en production**

---

## Priorité 1 — Déploiement (bloquant avant la prochaine démo/usage réel)

### [ ] Déploiement alwaysdata des évolutions post-soutenance
Plan en 8 phases (identifié en session antérieure, détail complet à reconstituer) :
- [ ] Phase 1 — à préciser
- [ ] Phase 2 — à préciser
- [x] Phase 3 — migrations 001→007 (prêtes, jouées en dev uniquement)
- [x] Phase 4 — `FRONTEND_URL=https://kadakour.alwaysdata.net` + vrai SMTP en remplacement d'Ethereal (config identifiée, pas encore appliquée)
- [ ] Phase 5 — à préciser
- [ ] Phase 6 — vérifications post-déploiement (salon/invitation/set-password/login manager/suspension/archivage)
- [ ] Phase 7 — à préciser
- [ ] Phase 8 — à préciser

### [ ] Vérifier qu'aucun mécanisme équivalent à `JEST_WORKER_ID` n'est actif en prod
Le rate-limiting est désactivé en test via `process.env.JEST_WORKER_ID !== undefined`.
Confirmer que `NODE_ENV` réel sur alwaysdata n'offre pas d'échappatoire similaire.

---

## Priorité 2 — Fonctionnalités livrées depuis la soutenance (pour référence)

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
182 tests, exécutés à chaque évolution.

---

## Priorité 3 — Dette technique et backlog notés en route

- [ ] Coordonnées de "Salon Élégance" (salon 1) à affiner — actuellement approximatives (proches de Roubaix, pas sur l'adresse réelle)
- [ ] Atomicité de certains doubles UPDATE (ex. archivage + set-password)
- [ ] Rôle admin lu depuis le JWT dans `authenticate` (pas rejoué en base, contrairement au manager via `resolveSalonScope`) — à harmoniser si un changement de rôle à effet immédiat devient nécessaire
- [ ] Dette UTC résiduelle sur `getForDay` (`new Date(date).getDay()`)
- [ ] Retrait des `DEFAULT 1` (migration 005) une fois le frontend historique définitivement abandonné
- [ ] Endpoints admin-only pour gérer les coiffeurs (`stylists`) directement
- [ ] `node_modules` présent dans l'historique Git (cosmétique)
- [ ] `archived_by === 1` en dur dans un test (à généraliser)
- [ ] README des migrations à tenir à jour (colonne prod)

---

## Priorité 4 — Évolutions futures

- [ ] Plage de dates pour congés (bloquer une période plutôt que jour par jour)
- [ ] Paiement en ligne
- [ ] Notifications SMS (le rappel e-mail est déjà livré)
- [ ] Application mobile native

---

## Hors périmètre (décision assumée)

- Mentions légales / politique de confidentialité — non évalué par le jury DWWM
- Documentation Swagger/OpenAPI
- Pagination de la liste admin
- Internationalisation des dates (`Intl.DateTimeFormat`)