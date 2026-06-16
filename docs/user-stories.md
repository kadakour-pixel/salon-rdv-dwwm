# User Stories — Salon Élégance

**Version :** 1.1  
**Date :** 16 juin 2026  
**Projet :** DWWM — Application de prise de rendez-vous

---

## Statut d'implémentation

| Statut | Signification |
|--------|---------------|
| ✅ Implémenté | Fonctionnalité complète, testée et validée |
| ⚠️ Partiel | Backend (API) prêt, interface utilisateur à développer |
| ❌ Non implémenté | Non développé |

| ID | Description | Statut |
|----|-------------|--------|
| US01 | Inscription | ✅ Implémenté |
| US02 | Connexion | ✅ Implémenté |
| US03 | Déconnexion | ✅ Implémenté |
| US04 | Protection des pages authentifiées | ✅ Implémenté |
| US05 | Consulter le catalogue | ✅ Implémenté |
| US06 | Choisir une prestation | ✅ Implémenté |
| US07 | Choisir une date | ✅ Implémenté |
| US08 | Choisir un créneau horaire | ✅ Implémenté |
| US09 | Confirmer la réservation | ✅ Implémenté |
| US10 | Voir mes rendez-vous | ✅ Implémenté |
| US11 | Filtrer mes rendez-vous | ✅ Implémenté |
| US12 | Annuler un rendez-vous (client) | ✅ Implémenté |
| US13 | Voir les métriques du jour | ✅ Implémenté |
| US14 | Gérer l'agenda journalier | ✅ Implémenté |
| US15 | Voir tous les rendez-vous | ✅ Implémenté |
| US16 | Annuler un rendez-vous (admin) | ✅ Implémenté |
| US17 | Voir la liste des prestations | ✅ Implémenté |
| US18 | Ajouter une prestation | ✅ Implémenté |
| US19 | Modifier une prestation | ✅ Implémenté |
| US20 | Désactiver une prestation | ✅ Implémenté |
| US21 | Modifier les horaires d'ouverture | ⚠️ Partiel |
| US22 | Bloquer une date exceptionnelle | ⚠️ Partiel |
| US23 | Consulter les mentions légales | ❌ Non implémenté |

**Bilan :** 20 US complètes · 2 partielles (API prête, UI manquante) · 1 non implémentée

---

## Rôles

| Rôle | Description |
|------|-------------|
| **Visiteur** | Utilisateur non connecté |
| **Client** | Utilisateur connecté avec le rôle `client` |
| **Admin** | Utilisateur connecté avec le rôle `admin` (le coiffeur / gérant) |

---

## 1. Authentification

### US01 — Inscription ✅
**En tant que** visiteur,  
**je veux** créer un compte avec mon prénom, nom, email et mot de passe,  
**afin de** pouvoir réserver des rendez-vous en ligne.

**Critères d'acceptation :**
- L'email doit avoir un format valide (regex côté serveur)
- Le mot de passe doit faire au moins 8 caractères
- Un email déjà utilisé retourne une erreur 409
- À la création, un JWT est retourné et l'utilisateur est redirigé vers la page de réservation
- Le rôle attribué par défaut est `client`

---

### US02 — Connexion ✅
**En tant que** visiteur,  
**je veux** me connecter avec mon email et mon mot de passe,  
**afin d'** accéder à mon espace personnel.

**Critères d'acceptation :**
- Des identifiants incorrects retournent une erreur 401 sans préciser lequel est faux
- Un JWT valide est stocké dans le `localStorage`
- Un client est redirigé vers `mes-rdv.html`, un admin vers `dashboard.html`

---

### US03 — Déconnexion ✅
**En tant que** client ou admin,  
**je veux** me déconnecter depuis la navbar,  
**afin de** sécuriser mon session sur un appareil partagé.

**Critères d'acceptation :**
- Le token est supprimé du `localStorage`
- L'utilisateur est redirigé vers la page d'accueil

---

### US04 — Protection des pages authentifiées ✅
**En tant que** visiteur,  
**je veux** être redirigé vers la page de connexion si j'essaie d'accéder à une page protégée,  
**afin que** les données des clients soient sécurisées.

**Critères d'acceptation :**
- `reserver.html`, `mes-rdv.html` et `dashboard.html` redirigent vers `login.html` si aucun token valide n'est présent
- `dashboard.html` redirige un client (rôle `client`) vers `login.html`

---

## 2. Catalogue de prestations (visiteur / client)

### US05 — Consulter le catalogue ✅
**En tant que** visiteur,  
**je veux** voir la liste des prestations disponibles sur la page d'accueil,  
**afin de** connaître les services proposés, leur durée et leur prix avant de m'inscrire.

**Critères d'acceptation :**
- Les prestations sont chargées dynamiquement depuis `GET /api/services`
- Seules les prestations actives (`is_active = 1`) sont affichées
- Chaque carte affiche : nom, durée (en minutes) et prix (en €)

---

## 3. Réservation

### US06 — Choisir une prestation ✅
**En tant que** client,  
**je veux** sélectionner une prestation dans un catalogue interactif,  
**afin de** commencer mon parcours de réservation.

**Critères d'acceptation :**
- Les prestations sont affichées sous forme de cartes sélectionnables
- Une seule prestation peut être sélectionnée à la fois
- Le bouton "Continuer" est désactivé tant qu'aucune prestation n'est sélectionnée

---

### US07 — Choisir une date ✅
**En tant que** client,  
**je veux** naviguer dans un calendrier et sélectionner une date disponible,  
**afin de** voir les créneaux horaires de cette journée.

**Critères d'acceptation :**
- Les dates passées ne sont pas cliquables
- Le calendrier permet de naviguer entre les mois
- La date sélectionnée est mise en évidence

---

### US08 — Choisir un créneau horaire ✅
**En tant que** client,  
**je veux** voir les créneaux disponibles pour la date choisie,  
**afin de** sélectionner l'heure qui me convient.

**Critères d'acceptation :**
- Les créneaux sont calculés par pas de 30 minutes, dans la plage d'ouverture du salon
- Les créneaux déjà pris (hors `cancelled`) ne sont pas proposés
- Si le salon est fermé ce jour-là (jour non ouvré ou fermeture exceptionnelle), aucun créneau n'est affiché
- Chaque créneau affiche l'heure de début et de fin

---

### US09 — Confirmer la réservation ✅
**En tant que** client,  
**je veux** voir un récapitulatif de ma réservation avant de confirmer,  
**afin de** valider ma prestation, ma date et mon heure.

**Critères d'acceptation :**
- Le récapitulatif affiche : prestation, durée, prix, date, heure de début et de fin
- Si le créneau est pris entre-temps, une erreur 409 est affichée
- En cas de succès, l'utilisateur est redirigé vers `mes-rdv.html`

---

## 4. Gestion des rendez-vous (client)

### US10 — Voir mes rendez-vous ✅
**En tant que** client,  
**je veux** consulter la liste de tous mes rendez-vous,  
**afin de** suivre mes réservations passées et à venir.

**Critères d'acceptation :**
- Les RDV sont triés par date décroissante (le plus récent en haut)
- Chaque carte affiche : prestation, prix, date, heure et statut
- Les RDV sont chargés depuis `GET /api/appointments/me`

---

### US11 — Filtrer mes rendez-vous ✅
**En tant que** client,  
**je veux** filtrer mes rendez-vous par statut (tous / à venir / annulés),  
**afin de** retrouver rapidement ce que je cherche.

**Critères d'acceptation :**
- Trois boutons de filtre : "Tous", "À venir" (statut `confirmed`), "Annulés" (statut `cancelled`)
- Le filtre actif est mis en évidence
- Le filtrage s'effectue côté client (sans requête supplémentaire)

---

### US12 — Annuler un rendez-vous ✅
**En tant que** client,  
**je veux** annuler un de mes rendez-vous à venir,  
**afin de** libérer le créneau si je ne peux pas me présenter.

**Critères d'acceptation :**
- Une modal de confirmation est affichée avant l'annulation
- Seul le propriétaire du RDV peut l'annuler (vérification `user_id` côté serveur)
- Le statut passe à `cancelled` et le créneau est immédiatement libéré
- Le bouton "Annuler" n'est pas affiché pour les RDV déjà annulés

---

## 5. Dashboard administrateur

### US13 — Voir les métriques du jour ✅
**En tant qu'** admin,  
**je veux** voir en un coup d'œil les chiffres clés du salon,  
**afin de** piloter mon activité quotidiennement.

**Critères d'acceptation :**
- 4 métriques affichées : RDV aujourd'hui, RDV cette semaine, prestations actives, annulations totales
- Les métriques sont calculées dynamiquement depuis l'API

---

### US14 — Gérer l'agenda journalier ✅
**En tant qu'** admin,  
**je veux** visualiser les rendez-vous du jour sous forme de liste chronologique,  
**afin de** organiser ma journée de travail.

**Critères d'acceptation :**
- L'agenda affiche les RDV du jour en cours par défaut
- Chaque entrée affiche : heure de début et de fin, prestation, nom et prénom du client
- La navigation ‹ / › permet de passer au jour précédent ou suivant
- Un bouton "Aujourd'hui" revient à la date du jour

---

### US15 — Voir tous les rendez-vous ✅
**En tant qu'** admin,  
**je veux** consulter l'ensemble des rendez-vous avec un filtre par date,  
**afin de** trouver un RDV spécifique ou suivre l'activité sur une période.

**Critères d'acceptation :**
- Sans filtre, tous les RDV sont affichés (triés chronologiquement)
- Le filtre par date restreint les résultats à la date sélectionnée
- Chaque ligne affiche : date/heure, prestation, nom du client, email et statut

---

### US16 — Annuler un rendez-vous (admin) ✅
**En tant qu'** admin,  
**je veux** annuler n'importe quel rendez-vous,  
**afin de** gérer les imprévus (fermeture, absence) sans intervention du client.

**Critères d'acceptation :**
- L'admin peut annuler tout RDV quel que soit son propriétaire
- L'annulation est irréversible (statut `cancelled`)

---

### US17 — Voir la liste des prestations (admin) ✅
**En tant qu'** admin,  
**je veux** voir toutes les prestations dans un tableau de bord,  
**afin de** les gérer facilement.

**Critères d'acceptation :**
- Le tableau affiche : nom, durée, prix et statut (actif / désactivé)
- Les prestations désactivées sont visibles dans le dashboard (contrairement au catalogue client)

---

### US18 — Ajouter une prestation ✅
**En tant qu'** admin,  
**je veux** créer une nouvelle prestation via un formulaire modal,  
**afin d'** enrichir le catalogue proposé aux clients.

**Critères d'acceptation :**
- Champs requis : nom, durée (en minutes, multiple de 15), prix (en €)
- La prestation est immédiatement visible dans le catalogue client

---

### US19 — Modifier une prestation ✅
**En tant qu'** admin,  
**je veux** modifier le nom, la durée ou le prix d'une prestation existante,  
**afin de** maintenir le catalogue à jour.

**Critères d'acceptation :**
- Un formulaire modal pré-rempli avec les valeurs actuelles
- La modification est répercutée immédiatement

---

### US20 — Désactiver une prestation ✅
**En tant qu'** admin,  
**je veux** désactiver une prestation sans la supprimer,  
**afin de** préserver l'historique des rendez-vous associés.

**Critères d'acceptation :**
- La prestation disparaît du catalogue client (`is_active = 0`)
- L'historique des RDV passés liés à cette prestation est conservé
- La prestation reste visible dans le dashboard admin

---

## 6. Gestion des horaires (admin) — API disponible, UI à faire

### US21 — Modifier les horaires d'ouverture ⚠️
> **API prête** (`PUT /api/availabilities/:dayOfWeek`) · **Interface admin non développée**

**En tant qu'** admin,  
**je veux** modifier les horaires d'ouverture de chaque jour de la semaine,  
**afin que** les créneaux proposés aux clients reflètent les heures réelles du salon.

**Critères d'acceptation :**
- L'admin peut définir une heure d'ouverture et de fermeture pour chaque jour (0–6)
- Un jour sans horaire configuré est considéré comme fermé
- Les créneaux existants sont recalculés à la prochaine consultation

---

### US22 — Bloquer une date exceptionnelle ⚠️
> **API prête** (`POST /api/availabilities/block`, `DELETE /api/availabilities/block/:date`) · **Interface admin non développée**

**En tant qu'** admin,  
**je veux** bloquer une date précise (congés, fermeture exceptionnelle),  
**afin qu'** aucun créneau ne soit proposé ce jour-là.

**Critères d'acceptation :**
- La date bloquée prend le dessus sur l'horaire hebdomadaire normal
- L'admin peut débloquer la date ultérieurement

---

## 7. Pages légales (à créer)

### US23 — Consulter les mentions légales ❌
> **Non implémentée** — pages `mentions-legales.html` et `politique-confidentialite.html` à créer

**En tant que** visiteur,  
**je veux** accéder aux mentions légales et à la politique de confidentialité,  
**afin de** connaître mes droits concernant mes données personnelles (RGPD).

**Critères d'acceptation :**
- Liens accessibles depuis le footer sur toutes les pages
- Contenu conforme aux exigences RGPD (responsable de traitement, finalités, durée de conservation, droits d'accès/rectification/suppression)
