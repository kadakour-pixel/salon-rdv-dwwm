# Plan de tests — Salon Élégance
## Projet DWWM — Application de prise de rendez-vous

**Version :** 1.0  
**Date :** 11 juin 2026  
**Résultat global : 27/27 tests passés ✅**

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

## 5. Bugs détectés et corrigés

| Bug | Description | Correction apportée |
|-----|-------------|---------------------|
| T03 | Attribut `minlength="8"` bloquait la validation JS | Suppression de `minlength` dans `login.html` |
| T10/T11 | `end_at` calculé en UTC → décalage d'1h | Calcul sans `toISOString()` dans `appointment.controller.js` |
| T12 | Bouton "Annuler" absent pour les RDV passés dans la journée | Condition `isFuture` assouplie dans `mes-rdv.js` |
| T14 | Hash bcrypt générique incompatible avec la version Node locale | Hash régénéré localement et mis à jour en BDD et `schema.sql` |
| Navbar | Lien Dashboard pointait vers `pages/pages/dashboard.html` | Fonction `pagesPrefix()` ajoutée dans `app.js` |
| Mobile | Burger menu n'affichait pas les liens après connexion | Initialisation du burger après injection dynamique dans `app.js` |

---

## 6. Résumé

| Catégorie | Tests | Passés | Échoués |
|-----------|-------|--------|---------|
| Parcours client | 13 | 13 | 0 |
| Parcours admin | 7 | 7 | 0 |
| Sécurité API | 4 | 4 | 0 |
| Responsive | 3 | 3 | 0 |
| **Total** | **27** | **27** | **0** |

> **Taux de réussite : 100%** — Application validée et prête pour la soutenance.
