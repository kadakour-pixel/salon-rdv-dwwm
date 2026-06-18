# Plan de tests — Salon Élégance
## Projet DWWM — Application de prise de rendez-vous

**Version :** 3.0  
**Date :** 18 juin 2026  
**Résultat global : 38/38 tests passés ✅**

---

## 1. Parcours client (T01–T13)

### 1.1 Authentification

| ID | Description | Données de test | Résultat attendu | Résultat obtenu |
|----|-------------|-----------------|------------------|-----------------|
| T01 | Inscription avec email valide | Prénom: Test, Nom: Client, Email: test@client.fr, MDP: password123 | Compte créé, JWT retourné, redirection vers reserver.html | ✅ PASS |
| T02 | Inscription avec email déjà utilisé | Email: test@client.fr (déjà enregistré) | Message "Email déjà utilisé" (409) | ✅ PASS |
| T03 | Inscription avec mot de passe < 8 caractères | MDP: abc | Message "8 caractères minimum" côté client | ✅ PASS |
| T04 | Connexion avec bons identifiants | Email: test@client.fr, MDP: password123 | JWT stocké, redirection vers mes-rdv.html | ✅ PASS |
| T05 | Connexion avec mauvais identifiants | Email: test@client.fr, MDP: mauvaismdp | Message "Identifiants incorrects" (401) | ✅ PASS |
| T06 | Accès à mes-rdv.html sans être connecté | Accès direct URL sans token | Redirection vers login.html | ✅ PASS |

### 1.2 Réservation

| ID | Description | Données de test | Résultat attendu | Résultat obtenu |
|----|-------------|-----------------|------------------|-----------------|
| T07 | Sélectionner une prestation et avancer | Clic sur "Coupe femme" | Étape 2 activée, prestation mémorisée | ✅ PASS |
| T08 | Sélectionner une date passée | Clic sur date antérieure à aujourd'hui | Date non cliquable | ✅ PASS |
| T09 | Sélectionner une date valide et voir les créneaux | Date future (jour ouvré) | Créneaux disponibles chargés depuis l'API | ✅ PASS |
| T10 | Réserver un créneau disponible | Créneau 11:30, Coupe femme | RDV enregistré en BDD, redirection mes-rdv.html | ✅ PASS |
| T11 | Réserver un créneau déjà pris | Même créneau que T10 | Créneau absent de la liste (non proposé) | ✅ PASS |
| T12 | Annuler un RDV à venir | Clic "Annuler" + confirmation modal | Statut passe à "cancelled", créneau libéré | ✅ PASS |
| T13 | Filtrer ses RDV par statut | Filtres "À venir" / "Annulés" | Liste filtrée correctement | ✅ PASS |

---

## 2. Parcours administrateur (T14–T20)

| ID | Description | Données de test | Résultat attendu | Résultat obtenu |
|----|-------------|-----------------|------------------|-----------------|
| T14 | Connexion avec le compte admin | Email: admin@salon.fr, MDP: Admin1234! | Redirection vers dashboard.html | ✅ PASS |
| T15 | Accès dashboard avec un compte client | Connexion client + accès URL dashboard | Redirection vers login.html | ✅ PASS |
| T16 | Navigation agenda jour suivant/précédent | Clic ‹ et › sur l'agenda | RDV du jour concerné chargés | ✅ PASS |
| T17 | Ajouter une prestation | Nom: Lissage, Durée: 90min, Prix: 85€ | Apparaît dans le tableau et dans /api/services | ✅ PASS |
| T18 | Modifier une prestation | Prix Lissage → 90€ | Changements enregistrés en BDD | ✅ PASS |
| T19 | Désactiver une prestation | Clic "Désactiver" sur Lissage | Disparaît du catalogue client (is_active = 0) | ✅ PASS |
| T20 | Filtrer les RDV par date | Date: 2026-06-11 | Seuls les RDV de cette date s'affichent | ✅ PASS |

---

## 3. Sécurité API (T21–T24)

| ID | Description | Méthode de test | Résultat attendu | Résultat obtenu |
|----|-------------|-----------------|------------------|-----------------|
| T21 | Appel POST /api/appointments sans token | Console navigateur — fetch sans Authorization | 401 Unauthorized + "Token manquant ou invalide" | ✅ PASS |
| T22 | Appel POST /api/services avec token client | Console navigateur — fetch avec token client | 403 Forbidden + "Accès interdit" | ✅ PASS |
| T23 | Annuler le RDV d'un autre client | Revue de code appointment.controller.js | 403 Forbidden (vérification user_id) | ✅ PASS |
| T24 | Token falsifié ou expiré | Console navigateur — fetch avec "tokenbidonXXX" | 401 Unauthorized + "Token expiré ou invalide" | ✅ PASS |

---

## 4. Tests responsive (T25–T27)

| ID | Description | Outil | Résultat attendu | Résultat obtenu |
|----|-------------|-------|------------------|-----------------|
| T25 | Page d'accueil sur mobile (< 768px) | Chrome DevTools — iPhone SE | Burger menu, hero sans image, CTA pleine largeur | ✅ PASS |
| T26 | Page réservation sur mobile | Chrome DevTools — iPhone SE | Stepper visible, calendrier et créneaux lisibles | ✅ PASS |
| T27 | Dashboard admin sur mobile | Chrome DevTools — iPhone SE | Sidebar masquée, métriques et contenu lisibles | ✅ PASS |

---

## 5. Horaires et fermetures exceptionnelles (T28–T30)

| ID | Description | Données de test | Résultat attendu | Résultat obtenu |
|----|-------------|-----------------|------------------|-----------------|
| T28 | Modifier les horaires d'un jour (US21) | Onglet Horaires → Modifier Lundi → 10:00–18:00 | Horaires mis à jour en BDD, tableau rafraîchi | ✅ PASS |
| T29 | Bloquer une date exceptionnelle (US22) | Onglet Horaires → Date: 2026-12-25 → "Bloquer ce jour" | Date ajoutée dans la liste bloquée, aucun créneau proposé ce jour | ✅ PASS |
| T30 | Débloquer une date (US22) | Clic "✕ Débloquer" sur 2026-12-25 | Date retirée, créneaux à nouveau proposés | ✅ PASS |

---

## 6. Profil client (T31)

| ID | Description | Données de test | Résultat attendu | Résultat obtenu |
|----|-------------|-----------------|------------------|-----------------|
| T31 | Modifier son profil (US23) | Page Mon profil → Prénom: Marie, Nom: Durand, Email: marie@test.fr | Message "Profil mis à jour", données modifiées en BDD | ✅ PASS |

---

## 7. Validation et sécurité (T32–T34)

| ID | Description | Données de test | Résultat attendu | Résultat obtenu |
|----|-------------|-----------------|------------------|-----------------|
| T32 | Créer prestation avec durée négative | POST /api/services avec duration_minutes: -30 | 400 + "La durée doit être un entier positif" | ✅ PASS |
| T33 | Créer prestation avec prix négatif | POST /api/services avec price: -10 | 400 + "Le prix doit être un nombre positif" | ✅ PASS |
| T34 | Redirection sur token expiré | Modifier le token dans localStorage + rafraîchir | Redirection vers login.html, localStorage vidé | ✅ PASS |

---

## 8. Revue de code et corrections (T35–T38)

| ID | Description | Données de test | Résultat attendu | Résultat obtenu |
|----|-------------|-----------------|------------------|-----------------|
| T35 | Erreur gérée lors de la désactivation d'une prestation | Couper le backend + clic "Désactiver" sur une prestation | Message d'erreur affiché (pas de crash silencieux) | ✅ PASS |
| T36 | Admin redirigé vers dashboard depuis la page profil | Connexion admin → accès direct `pages/profil.html` | Redirection vers `dashboard.html` (pas login) | ✅ PASS |
| T37 | Date correcte dans les métriques du dashboard | Vérification visuelle de la date affichée dans l'agenda | Date du jour affichée correctement | ✅ PASS |
| T38 | Date correcte dans le calendrier de réservation | Vérification visuelle de la date dans le calendrier | Jour actuel correctement mis en surbrillance | ✅ PASS |

---

## 9. Bugs détectés et corrigés

| Bug | Description | Correction apportée |
|-----|-------------|---------------------|
| T03 | Attribut `minlength="8"` bloquait la validation JS | Suppression de `minlength` dans `login.html` |
| T10/T11 | `end_at` calculé en UTC → décalage d'1h | Calcul sans `toISOString()` dans `appointment.controller.js` |
| T12 | Bouton "Annuler" absent pour les RDV passés dans la journée | Condition `isFuture` assouplie dans `mes-rdv.js` |
| T14 | Hash bcrypt générique incompatible avec la version Node locale | Hash régénéré localement et mis à jour en BDD et `schema.sql` |
| Navbar | Lien Dashboard pointait vers `pages/pages/dashboard.html` | Fonction `pagesPrefix()` ajoutée dans `app.js` |
| Mobile | Burger menu n'affichait pas les liens après connexion | Initialisation du burger après injection dynamique dans `app.js` |
| Dashboard | Spinner infini dans l'onglet Horaires via la nav latérale | Centralisation du chargement des données dans `switchTab()` |
| Profil | Message de confirmation invisible sur `profil.html` | Déplacement de `.form-alert` de `login.css` vers `pages.css` |
| T35 | Désactivation prestation sans try/catch → crash silencieux | Ajout de try/catch dans `dashboard.js` |
| T36 | Admin redirigé vers login au lieu de dashboard sur profil.html | Séparation des conditions dans `profil.js` |
| T37-T38 | `toISOString()` renvoie date UTC, décalage possible la nuit | Remplacement par date locale dans `dashboard.js` et `reserver.js` |

---

## 10. Résumé

| Catégorie | Tests | Passés | Échoués |
|-----------|-------|--------|---------|
| Parcours client | 13 | 13 | 0 |
| Parcours admin | 7 | 7 | 0 |
| Sécurité API | 4 | 4 | 0 |
| Responsive | 3 | 3 | 0 |
| Horaires et fermetures | 3 | 3 | 0 |
| Profil client | 1 | 1 | 0 |
| Validation et sécurité | 3 | 3 | 0 |
| Revue de code et corrections | 4 | 4 | 0 |
| **Total** | **38** | **38** | **0** |

> **Taux de réussite : 100%** — Application validée et prête pour la soustenance.
