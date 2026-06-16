# Todo — Salon Élégance

**Dernière mise à jour :** 16 juin 2026  
**État du MVP :** 27/27 tests passés — fonctionnalités core livrées

---

## Priorité 1 — Fonctionnalités manquantes (MVP incomplet)

### [ ] UI admin — Gestion des horaires d'ouverture (US21)
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

### [ ] Pages mentions légales (US23)
- Créer `frontend/pages/mentions-legales.html`
- Créer `frontend/pages/politique-confidentialite.html`
- Mettre à jour les liens `href="#"` dans le footer (`index.html`)
- Contenu minimum RGPD : responsable de traitement, données collectées, durée de conservation, droits utilisateurs (accès, rectification, suppression), contact

---

## Priorité 2 — Améliorations fonctionnelles

### [ ] Profil client — modification des informations
- Page `pages/profil.html` avec formulaire de modification (prénom, nom, email)
- Endpoint `PUT /api/auth/me` côté backend
- Optionnel : changement de mot de passe (avec confirmation de l'ancien)

### [ ] Photo réelle du salon
- Remplacer le placeholder SVG dans la section hero de `index.html`
- Ajouter une vraie image optimisée (format WebP recommandé)

### [ ] Statut `pending` exploité
- Le schéma prévoit un statut `pending` mais les réservations passent directement à `confirmed`
- Décider : supprimer `pending` du schéma ou implémenter une validation admin

---

## Priorité 3 — Sécurité et robustesse

### [ ] CORS restrictif en production
- `server.js` : remplacer `app.use(cors())` par une whitelist des origines autorisées
- Configurer via variable d'environnement `ALLOWED_ORIGIN`

### [ ] Rate limiting sur les routes sensibles
- Installer `express-rate-limit`
- Appliquer une limite sur `POST /api/auth/register` et `POST /api/auth/login` pour prévenir le brute-force

### [ ] Validation des entrées (backend)
- Valider que `duration_minutes` est un entier positif dans `service.controller.js`
- Valider que `price` est un nombre positif
- Valider le format `YYYY-MM-DD` pour les dates dans les endpoints availabilities

### [ ] Vérification de l'expiration JWT côté frontend
- Détecter les réponses 401 dans `apiRequest()` (app.js) et rediriger vers login
- Actuellement, un token expiré laisse l'utilisateur sur la page avec un état cassé

---

## Priorité 4 — Qualité et maintenabilité

### [ ] Tests automatisés (backend)
- Installer Jest + Supertest
- Écrire des tests unitaires pour `generateSlots()` (cas limites : durée > plage, conflit partiel)
- Écrire des tests d'intégration pour les routes principales (register, login, create appointment, cancel)

### [ ] Documentation API
- Générer une documentation Swagger/OpenAPI (`swagger-jsdoc` + `swagger-ui-express`)
- Documenter les routes, les paramètres, les codes de retour et les exemples

### [ ] Variables d'environnement — revue de production
- `.env` : s'assurer que `JWT_SECRET` est une valeur longue et aléatoire (min. 32 caractères)
- Documenter toutes les variables dans `.env.example` avec des valeurs d'exemple
- Ne jamais committer `.env` (vérifier `.gitignore`)

### [ ] Pagination de la liste admin
- `GET /api/appointments` sans filtre de date peut retourner des centaines de lignes
- Ajouter des paramètres `page` et `limit` pour paginer côté API
- Adapter l'UI du panel "Tous les RDV" avec une navigation de pages

### [ ] Internationalisation des dates
- Les dates sont actuellement formatées en dur en français dans le JS frontend
- Utiliser `Intl.DateTimeFormat` avec `locale: 'fr-FR'` de façon cohérente sur toutes les pages

---

## Hors périmètre (ne pas implémenter maintenant)

- Paiement en ligne (Stripe, etc.)
- Notifications email/SMS de rappel
- Multi-salon
- Application mobile native
