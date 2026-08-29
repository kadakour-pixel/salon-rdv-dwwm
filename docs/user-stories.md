# User Stories — Salon Élégance

**Version :** 2.0
**Date :** 08 août 2026 (fonctionnalités) — déploiement en production confirmé le 29 août 2026
**Projet :** Application de prise de rendez-vous multi-salons (portfolio, ex-capstone DWWM RNCP 37674)

> Les 36 user stories ci-dessous sont implémentées et testées en développement depuis
> le 8 août 2026. Elles sont désormais également **vérifiées en production** sur
> `https://kadakour.alwaysdata.net` (voir `README.md` § État du déploiement et
> `journal-de-bord.md` pour le détail des sessions de déploiement).

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
| US21 | Modifier les horaires d'ouverture | ✅ Implémenté |
| US22 | Bloquer une date exceptionnelle | ✅ Implémenté |
| US23 | Modifier son profil | ✅ Implémenté |
| US24 | Vérifier son e-mail à l'inscription | ✅ Implémenté |
| US25 | Recevoir un rappel automatique par e-mail | ✅ Implémenté |
| US26 | Laisser un avis après un rendez-vous honoré | ✅ Implémenté |
| US27 | Consulter les avis et la note moyenne | ✅ Implémenté |
| US28 | Choisir un salon | ✅ Implémenté |
| US29 | Choisir un coiffeur au sein d'un salon | ✅ Implémenté |
| US30 | Visualiser les salons sur une carte | ✅ Implémenté |
| US31 | Administrer les salons (créer, modifier, suspendre, archiver, supprimer) | ✅ Implémenté |
| US32 | Inviter un manager par e-mail | ✅ Implémenté |
| US33 | Définir son mot de passe via une invitation | ✅ Implémenté |
| US34 | Gérer un salon en tant que manager (accès scopé) | ✅ Implémenté |
| US35 | Être protégé contre les abus (rate-limiting) | ✅ Implémenté |
| US36 | Être limité en nombre de rendez-vous actifs simultanés | ✅ Implémenté |

**Bilan :** 36 US complètes · 0 partielles

---

## Rôles

| Rôle | Description |
|------|-------------|
| **Visiteur** | Utilisateur non connecté |
| **Client** | Utilisateur connecté avec le rôle `client` |
| **Manager** | Utilisateur connecté avec le rôle `manager`, scopé à un salon unique (`users.salon_id`) |
| **Admin** | Utilisateur connecté avec le rôle `admin`, accès à tous les salons |

---

## 1. Authentification

### US01 — Inscription ✅
**En tant que** visiteur, **je veux** créer un compte, **afin de** réserver en ligne.
- Email valide (regex serveur), mot de passe ≥ 8 caractères, email dupliqué → 409, rôle par défaut `client`.

### US02 — Connexion ✅
**En tant que** visiteur, **je veux** me connecter, **afin d'** accéder à mon espace.
- Identifiants incorrects → 401 générique. JWT stocké côté client. Redirection selon le rôle (client / manager / admin).

### US03 — Déconnexion ✅
Token supprimé du `localStorage`, redirection vers l'accueil.

### US04 — Protection des pages authentifiées ✅
Pages protégées redirigées vers `login.html` sans token valide ; `dashboard.html` réservé à `admin`/`manager`.

### US24 — Vérifier son e-mail à l'inscription ✅
**En tant que** client, **je veux** confirmer mon adresse e-mail après inscription, **afin de** garantir la fiabilité des rappels et communications.
- `register` ne renvoie pas de JWT tant que le compte n'est pas vérifié.
- `login` renvoie 403 si `email_verified = 0`.
- Cooldown de 5 minutes sur le renvoi (`verification_sent_at`).

---

## 2. Salons et catalogue

### US05 — Consulter le catalogue ✅
Prestations actives affichées, chargées depuis `GET /api/services`, scopées par salon.

### US28 — Choisir un salon ✅
**En tant que** client, **je veux** choisir le salon où je souhaite être reçu, **afin de** réserver au bon endroit.
- Étape auto-masquée si un seul salon actif existe (auto-sélection).
- Liste des salons actifs uniquement (les salons suspendus ou archivés sont exclus des parcours publics).

### US29 — Choisir un coiffeur au sein d'un salon ✅
**En tant que** client, **je veux** choisir mon coiffeur, **afin de** réserver avec la personne de mon choix.
- Étape auto-masquée si un seul coiffeur actif dans le salon.
- Les créneaux et disponibilités sont scopés par coiffeur (chevauchement autorisé entre coiffeurs différents).

### US30 — Visualiser les salons sur une carte ✅
**En tant que** client, **je veux** voir les salons sur une carte, **afin de** choisir le plus proche de chez moi.
- Carte Leaflet multi-marqueurs à l'étape salon (clic = sélection), carte mono-marqueur non interactive au récapitulatif.
- Coordonnées converties en nombre (`parseFloat`) avant tout usage, mysql2 renvoyant les `DECIMAL` en chaînes.
- Un salon sans coordonnées reste réservable (la carte n'est pas bloquante).
- La position GPS du client n'est jamais envoyée au serveur.

---

## 3. Réservation

### US06-09 — Choisir une prestation / date / créneau / confirmer ✅
Inchangées dans leur principe, désormais scopées par salon et par coiffeur. Le récapitulatif final affiche également le salon et le coiffeur choisis.

---

## 4. Gestion des rendez-vous (client)

### US10-12 — Voir / filtrer / annuler mes rendez-vous ✅
Inchangées ; chaque carte affiche désormais aussi le coiffeur et, indirectement, le salon.

### US36 — Être limité en nombre de rendez-vous actifs simultanés ✅
**En tant qu'** exploitant, **je veux** limiter le nombre de rendez-vous actifs qu'un même client peut cumuler, **afin d'** empêcher la monopolisation des créneaux d'un salon.
- Plafond global (tous salons confondus) : 5 rendez-vous actifs futurs par client.
- Vérification en tout début de la création de RDV, avant les autres validations.

---

## 5. Avis clients

### US26 — Laisser un avis ✅
**En tant que** client, **je veux** noter et commenter un rendez-vous honoré, **afin de** partager mon expérience.
- Éligibilité vérifiée en SQL (RDV du client, statut `confirmed`, terminé).
- Un seul avis par rendez-vous (contrainte UNIQUE, 409 si doublon).

### US27 — Consulter les avis et la note moyenne ✅
**En tant que** visiteur, **je veux** voir les avis des clients et la note moyenne, **afin d'** évaluer la qualité du salon avant réservation.
- Affichage public avec prénom uniquement (minimisation RGPD).
- Badge masqué si aucun avis.

---

## 6. Dashboard administrateur / manager

### US13-20 — Métriques, agenda, RDV, prestations ✅
Inchangées dans leur principe. Un **manager** ne voit que les données de son salon (`resolveSalonScope`, relu en base à chaque requête, jamais depuis le JWT).

### US34 — Gérer un salon en tant que manager ✅
**En tant que** manager, **je veux** avoir un accès complet à mon salon uniquement, **afin de** piloter mon activité sans voir les données des autres salons.
- Toute création est forcée sur le salon du manager.
- Tout accès à une ressource hors de son salon renvoie 403.

---

## 7. Horaires

### US21-22 — Horaires d'ouverture et fermetures exceptionnelles ✅
Inchangées, désormais scopées par coiffeur (sélecteur de coiffeur dans l'onglet Horaires si plusieurs coiffeurs).

---

## 8. Administration des salons (admin)

### US31 — Administrer les salons ✅
**En tant qu'** admin, **je veux** créer, modifier, suspendre, réactiver, archiver ou supprimer un salon, **afin de** piloter le réseau de salons.
- Trois états : Actif / Suspendu (réversible) / Archivé (terminal).
- Suspension avec rendez-vous futurs → 409 avec compte, confirmation `force: true` requise.
- Archivage = défense en profondeur (`is_active` forcé à 0), invalide les invitations manager non consommées du salon.
- Suppression réservée aux salons vierges (aucune dépendance) ; sinon 409 avec suggestion d'archivage.
- Coordonnées (latitude/longitude) saisissables, les deux ou aucune (400 sinon).

### US32 — Inviter un manager par e-mail ✅
**En tant qu'** admin, **je veux** inviter un gérant par e-mail pour un salon donné, **afin de** lui donner accès à son espace de gestion.
- Jeton à usage unique (table `action_tokens`, hashé SHA-256), envoyé par e-mail (Nodemailer/Ethereal en dev).

### US33 — Définir son mot de passe via une invitation ✅
**En tant que** manager invité, **je veux** définir mon mot de passe via le lien reçu, **afin d'** activer mon compte.
- Page dédiée lisant le jeton en query string, formulaire mot de passe + confirmation.

---

## 9. Profil client

### US23 — Modifier son profil ✅
Inchangée.

---

## 10. Anti-abus

### US35 — Être protégé contre les abus ✅
**En tant qu'** exploitant, **je veux** limiter le nombre de requêtes sur les routes sensibles, **afin de** me protéger contre les attaques par force brute ou la saturation du système de réservation.
- `authLimiter` : 10 requêtes / 15 min sur login, register, resend-verification.
- `appointmentLimiter` : 20 requêtes / 15 min sur la création de RDV.
- `trust proxy` activé (obligatoire derrière le proxy alwaysdata pour un comptage IP correct).