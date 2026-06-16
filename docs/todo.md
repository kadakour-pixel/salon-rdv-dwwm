# Todo — Salon Élégance

**Dernière mise à jour :** 16 juin 2026  
**État du MVP :** 27/27 tests passés — fonctionnalités core livrées

---

## Priorité 1 — Fonctionnalités à compléter pour la présentation

### [x] UI admin — Gestion des horaires d'ouverture (US21)
- Ajouter un onglet "Horaires" dans `dashboard.html`
- Afficher les 7 jours avec les plages actuelles
- Permettre la modification de `open_time` / `close_time` pour chaque jour
- Appeler `PUT /api/availabilities/:dayOfWeek` (backend déjà prêt)
- Permettre de marquer un jour comme fermé (supprimer ou laisser vide)

### [ ] UI admin — Gestion des fermetures exceptionnelles (US22)
- Ajouter un sélecteur de date dans le même onglet "Horaires"
- Appeler `POST /api/availabilities/block` pour bloquer une date
- Appeler `DELETE /api/availabilities/block/:date` pour débloquer
- Afficher la liste des dates actuellement bloquées

### [ ] Profil client — modification des informations
- Page `pages/profil.html` avec formulaire de modification (prénom, nom, email)
- Endpoint `PUT /api/auth/me` côté backend

---

## Priorité 2 — Améliorations optionnelles

### [ ] Photo réelle du salon
- Remplacer le placeholder SVG dans la section hero de `index.html`
- Ajouter une vraie image optimisée (format WebP recommandé)

### [ ] Validation des entrées (backend)
- Valider que `duration_minutes` est un entier positif dans `service.controller.js`
- Valider que `price` est un nombre positif
- Valider le format `YYYY-MM-DD` pour les dates dans les endpoints availabilities

### [ ] Vérification de l'expiration JWT côté frontend
- Détecter les réponses 401 dans `apiRequest()` (app.js) et rediriger vers login
- Actuellement, un token expiré laisse l'utilisateur sur la page avec un état cassé

---

## Hors périmètre (ne pas implémenter)

- Mentions légales / politique de confidentialité — non évalué par le jury DWWM
- Tests automatisés Jest / Supertest — le plan de tests manuel T01–T27 suffit
- Documentation Swagger/OpenAPI — non requise pour le titre professionnel
- CORS restrictif / rate limiting — préoccupations de mise en production, hors scope
- Pagination de la liste admin
- Internationalisation des dates (Intl.DateTimeFormat)
- Paiement en ligne (Stripe, etc.)
- Notifications email/SMS de rappel
- Multi-salon
- Application mobile native
