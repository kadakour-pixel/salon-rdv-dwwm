# Préparation à la soutenance — Salon Élégance (DWWM / RNCP 37674)

> Carnet de suivi **vivant** de la préparation à la soutenance.
> À mettre à jour à chaque session. Complémentaire de `presentation.md`
> (qui, lui, décrit le projet). Candidat : Kadour AMINI — MolenGeek Roubaix.

---

## 0. Informations soutenance

| Élément | Valeur |
|---|---|
| Titre visé | Développeur Web et Web Mobile — RNCP 37674 |
| Date de la soutenance | _à compléter_ |
| Durée de présentation | **35 min** de présentation + **15–20 min** de questions |
| Pré-lecture du jury | **Le jury a lu le DP au préalable** → la présentation synthétise, illustre et approfondit ; elle ne relit pas le DP |
| Format | Présentation orale + diaporama + démo |
| Démo | En ligne : https://kadakour.alwaysdata.net (admin : `admin@salon.fr` / `Admin1234!`) |
| Support | Diaporama (à produire) |

---

## 1. Checklist d'avancement

### Dossier & dépôt
- [x] Dossier Professionnel finalisé (Word + PDF), aligné RNCP 37674, A4
- [x] Dépôt GitHub propre (`.env` non versionné, `.env.example`, historique nettoyé)
- [x] Bug `auth.routes.js` corrigé (`authenticate`) + Helmet ajouté
- [x] Application déployée et **testée en production**
- [ ] **Dater la signature** de la déclaration sur l'honneur (jour de la remise) + réexport PDF
- [ ] Vérifier le **nouveau `JWT_SECRET`** sur alwaysdata

### Support de présentation
- [x] Plan des diapos validé (voir §3)
- [x] Diaporama produit (Soutenance_Salon_Elegance.pptx, 18 slides, sobre/pro)
- [x] Captures / visuels intégrés (accueil, réservation, dashboard, MCD, wireframes)
- [ ] Relecture orthographe / lisibilité des diapos

### Démo
- [ ] Scénario de démo répété (parcours client + admin)
- [ ] Jeu de données de démo prêt (seed) pour un agenda parlant
- [ ] **Plan B** prêt : captures + courte vidéo de démo enregistrée

### Oral
- [~] Fil conducteur rédigé (§4) — reste à chronométrer à l'entraînement
- [ ] Entraînement aux questions du jury (voir §2)
- [ ] Discours sur l'usage de l'IA maîtrisé (assistant : compris / adapté / testé / validé)

---

## 2. Questions probables du jury & réponses

> Format : Q (question) → R (réponse à préparer/dire). À enrichir après chaque répétition.

### Choix techniques
- **Q : Pourquoi du JavaScript vanilla et pas un framework (React, Vue) ?**
  R : Pour maîtriser les fondamentaux (DOM, fetch, événements) attendus au niveau DWWM,
  garder un projet léger et sans dépendance lourde, et bien comprendre ce que ferait un
  framework en sous-jacent.
- **Q : Pourquoi Node/Express + MySQL plutôt que PHP, etc. ?**
  R : _à compléter (cohérence stack JS front/back, API REST, écosystème npm)._
- **Q : Pourquoi une base relationnelle et pas du NoSQL ?**
  R : Données fortement structurées et reliées (utilisateurs ↔ rendez-vous ↔ prestations),
  besoin d'intégrité référentielle (clés étrangères) et de requêtes relationnelles.
- **Q : Ton API est-elle en MVC ?**
  R : Pas un MVC strict. Une API REST ne génère pas de vues côté serveur — la « vue » est
  la réponse JSON consommée par le front-end. J'ai organisé le serveur **en couches** :
  routes (routage), contrôleurs (logique métier + accès aux données), middlewares
  (authentification, transverse), configuration (pool de connexions). L'accès aux données
  se fait dans les contrôleurs via des requêtes paramétrées ; une évolution propre serait
  d'extraire une couche « modèle » dédiée.

### Base de données
- **Q : Combien de clients la base peut-elle gérer ?**
  R : Clés primaires en `INT UNSIGNED` → ~4,29 milliards d'enregistrements ; la vraie
  limite est le quota de l'hébergement, et les index assurent les performances.
- **Q : Pourquoi une suppression logique des prestations ?**
  R : `is_active = 0` pour préserver l'historique des rendez-vous liés.

### Logique métier
- **Q : Comment évites-tu les doubles réservations ?**
  R : `generateSlots()` génère les créneaux selon horaires + durée, en excluant les
  chevauchements ; à la création, vérification serveur du conflit (`start < end existant
  ET end > start existant`).
- **Q : Que se passe-t-il si deux clients réservent en même temps ?**
  R : _à préparer (vérification côté serveur au moment de l'INSERT ; piste d'amélioration :
  contrainte/transaction)._

### Sécurité
- **Q : Comment sont protégés les mots de passe ?** R : hachage **bcrypt**, jamais en clair.
- **Q : Comment gères-tu l'authentification et les droits ?** R : **JWT** (Bearer) +
  middleware `authenticate`, contrôle de rôle `requireRole('admin')`.
- **Q : Comment évites-tu les injections SQL ?** R : **requêtes préparées paramétrées**
  (placeholders `?`), aucune concaténation de valeurs utilisateur.
- **Q : Autres mesures de sécurité ?** R : **Helmet** (en-têtes HTTP), CORS, validations
  serveur, secrets dans un `.env` non versionné (+ `.env.example` comme modèle).

### Déploiement / qualité
- **Q : Comment as-tu déployé l'application ?** R : site Node.js + base MariaDB sur
  alwaysdata, fichiers via FTP, `.env` de prod, redémarrage via le panneau ; documenté
  dans le README.
- **Q : Comment as-tu testé ?** R : plan de tests manuel **44/44** (client, admin,
  sécurité, responsive, déploiement) + journal des bugs corrigés.

### IA & méthode
- **Q : Comment as-tu utilisé l'IA ?**
  R : comme **assistant** (pistes de solution, documentation, aide au débogage). J'ai
  **compris, adapté, testé et validé** chaque partie ; les décisions et corrections sont
  les miennes.

### Questions « pièges » / amélioration
- **Q : Que ferais-tu évoluer ?** R : vérification e-mail à l'inscription (lien + jeton),
  rappels e-mail/SMS, paiement en ligne, multi-salon.
- **Q : Faut-il vérifier l'e-mail des clients ?** R : pas nécessaire au MVP (pas d'envoi
  d'e-mail dans le périmètre) ; pertinent dès qu'on enverra des rappels → perspective.
- **Q : Points faibles du projet ?** R : _à préparer honnêtement (ex. pas de paiement,
  mono-salon, tests manuels et non automatisés)._

---

## 3. Plan du diaporama (proposition)

1. Page de titre — projet, nom, titre visé
2. Présentation personnelle (courte)
3. Contexte & problème résolu
4. Cahier des charges (user stories, périmètre MVP)
5. Maquettes / wireframes
6. Architecture technique (front / API / BDD)
7. Modèle de données (MCD)
8. Fonctionnalité clé : réservation + gestion des conflits
9. Dashboard administrateur
10. Sécurité (bcrypt, JWT, requêtes paramétrées, Helmet)
11. Tests (44/44) & bugs corrigés
12. Déploiement (alwaysdata)
13. Démo live
14. Difficultés rencontrées & solutions
15. Perspectives d'évolution
16. Conclusion / bilan de compétences (les 8 du référentiel)

> Décisions diapo : style _à choisir (sobre-pro / visuel mauve appli)_ ·
> nombre de diapos cible _à caler selon la durée_.

---

## 4. Texte / fil conducteur de l'oral

> Guide de prise de parole calibré sur **35 min** (≈ 18–20 min de slides + ≈ 15 min de démo).
> Ce n'est pas un texte à lire mot à mot : ce sont les **points clés et transitions** par
> slide. S'entraîner à voix haute et chronométrer. Repères de temps cumulés à droite.

### Ouverture (Slide 1 — Titre) — ~1 min
- « Bonjour, je suis Kadour AMINI. Je vais vous présenter **Salon Élégance**, une application
  web de prise de rendez-vous pour un salon de coiffure, que j'ai développée de bout en bout
  dans le cadre du titre Développeur Web et Web Mobile. »
- Annoncer le format : « Je vais d'abord présenter le projet pendant une vingtaine de minutes,
  puis je vous ferai une **démonstration en direct** d'une quinzaine de minutes. »

### Plan (Slide 2 — Déroulé) — ~0,5 min  ·  ⏱ ~1:30
- « Voici comment je vais procéder : le contexte, la conception, l'architecture technique,
  la sécurité et les tests, puis la démonstration, et enfin le bilan. »

### Contexte & problème (Slide 3) — ~1,5 min  ·  ⏱ ~3:00
- Raconter le besoin : « Un salon gère ses RDV par téléphone : impossible de réserver le soir,
  des oublis, pas de vue claire sur la journée. »
- Poser l'objectif : « L'idée : permettre au client de réserver **24h/24** en autonomie, et
  au coiffeur de **piloter son agenda en temps réel**. »

### Périmètre (Slide 4) — ~1 min  ·  ⏱ ~4:00
- « J'ai défini un périmètre MVP réaliste, que j'ai entièrement livré : authentification,
  catalogue, réservation, espace client, dashboard admin, gestion des horaires. »
- « J'ai volontairement laissé de côté certaines fonctions — paiement, rappels e-mail — qui
  constituent mes perspectives d'évolution. »

### Conception (Slide 5) — ~1,5 min  ·  ⏱ ~5:30
- « Je n'ai pas codé tête baissée : j'ai rédigé un brief, **23 user stories**, puis des
  **wireframes en mobile-first**, car les clients réservent surtout depuis leur téléphone. »
- Transition : « Une fois le besoin cadré, voyons les choix techniques. »

### Stack technique (Slide 6) — ~1,5 min  ·  ⏱ ~7:00
- Parcourir : front en **JavaScript vanilla** (« pour maîtriser les fondamentaux, sans
  framework »), back **Node.js / Express**, base **MariaDB**, sécurité **JWT, bcrypt, Helmet**.

### Architecture (Slide 7) — ~1,5 min  ·  ⏱ ~8:30
- « Mon application suit une **architecture en couches** : le navigateur appelle l'API REST en
  HTTP/JSON, et l'API dialogue avec la base en SQL. »
- Préciser (anticipe la question MVC) : « Côté serveur, je sépare les responsabilités : routes,
  contrôleurs, middlewares, configuration. Ce n'est pas un MVC strict — une API REST ne produit
  pas de vues, la "vue" est la réponse JSON consommée par le front. »
- « La sécurité est transversale : token JWT et requêtes paramétrées. »

### Modèle de données (Slide 8) — ~1,5 min  ·  ⏱ ~10:00
- « J'ai suivi la démarche Merise : voici le MCD. Quatre entités. Un utilisateur a plusieurs
  rendez-vous ; un rendez-vous porte sur une prestation. »
- Citer un choix : « J'ai opté pour une **suppression logique** des prestations afin de
  préserver l'historique des rendez-vous. »

### Réservation & conflits (Slide 9) — ~2 min  ·  ⏱ ~12:00
- « Le cœur métier, c'est la réservation : un parcours en 3 étapes, avec des **créneaux générés
  à la volée** selon les horaires et la durée de la prestation. »
- Insister : « Le point délicat, c'est la **gestion des conflits** : à la création, le serveur
  vérifie qu'aucun rendez-vous ne chevauche le créneau — ce qui empêche toute double
  réservation. »

### Dashboard admin (Slide 10) — ~1 min  ·  ⏱ ~13:00
- « Côté coiffeur, un tableau de bord : métriques, agenda du jour, gestion des prestations et
  des horaires. L'accès est **réservé au rôle admin**. Je vous le montrerai en direct. »

### Sécurité (Slide 11) — ~2 min  ·  ⏱ ~15:00
- « La sécurité a été traitée de bout en bout — c'est d'ailleurs dans l'intitulé du titre. »
- Dérouler : mots de passe **bcrypt**, **JWT** + rôles, **requêtes paramétrées** (anti-injection),
  **Helmet**, secrets dans un **`.env` non versionné**.

### Tests (Slide 12) — ~1,5 min  ·  ⏱ ~16:30
- « J'ai écrit un plan de tests structuré : **44 cas, 44 réussis**, répartis par catégorie. »
- « J'y consigne aussi les bugs corrigés — par exemple un décalage horaire lié au fuseau UTC. »

### Déploiement (Slide 13) — ~1,5 min  ·  ⏱ ~18:00
- « Je n'ai pas seulement codé, j'ai **livré** : l'application est en ligne sur alwaysdata —
  site Node.js, base MariaDB, fichiers transférés par FTP, procédure documentée dans le README. »
- Transition vers la démo : « Et justement, je vous propose de la voir en conditions réelles. »

### DÉMONSTRATION (Slide 14) — ~15 min  ·  ⏱ ~33:00
> Suivre le scénario, parler en faisant, garder un rythme calme. Compte admin :
> `admin@salon.fr` / `Admin1234!`. **Plan B prêt** (captures + vidéo) si le réseau flanche.
1. **Côté client** : créer un compte, se connecter.
2. **Réserver** une prestation en 3 étapes — montrer les créneaux qui se chargent dynamiquement.
3. **Mes RDV** : afficher la réservation, puis **annuler** (le créneau se libère).
4. **Côté admin** : se déconnecter, se reconnecter en administrateur.
5. **Dashboard** : agenda du jour, **ajouter / modifier une prestation**, gérer un horaire ou
   une fermeture.
6. **Point sécurité** (si le temps le permet) : montrer qu'un accès non autorisé renvoie 401/403.
> Conseil : annoncer chaque étape (« je vais maintenant… ») et relier à une compétence.

### Difficultés & solutions (Slide 15) — ~1 min  ·  ⏱ ~34:00
- Choisir 2 récits : le **bug UTC** (diagnostic → correction → validation par test) et la
  **gestion des conflits**. « Ces situations m'ont appris à déboguer méthodiquement. »

### Perspectives (Slide 16) — ~0,5 min  ·  ⏱ ~34:30
- « Le projet est pensé pour évoluer : vérification e-mail, rappels automatiques, paiement,
  multi-salon. »

### Bilan compétences (Slide 17) — ~1 min  ·  ⏱ ~35:30
- « Pour conclure, ce projet couvre les **8 compétences du référentiel**, des deux blocs
  front-end et back-end. »

### Conclusion (Slide 18) — ~0,5 min
- « En résumé : une application complète, sécurisée, testée et déployée, du cadrage à la mise
  en ligne. Je vous remercie de votre attention et je suis prêt à répondre à vos questions. »

> ⚠️ Le total dépasse légèrement 35 min : à l'entraînement, **raccourcir les slides 8 à 12**
> si besoin pour protéger les 15 min de démo. Viser **18 min de slides** avant la démo.

---

## 5. Journal de préparation

| Date | Travail réalisé | Décisions / À faire ensuite |
|---|---|---|
| _à compléter_ | Création de ce carnet de suivi | Définir durée de présentation + style des diapos |
| 24/06/2026 | Diaporama produit (18 slides, sobre/pro) ; fil conducteur §4 rédigé ; correction « MVC » → « architecture en couches » (DP + slides) | S'entraîner à l'oral + chronométrer ; préparer le plan B démo |

---

## 6. Idées de modifications / améliorations (backlog)

> Pistes envisagées pour le projet ou la présentation. Statut : 💡 idée · 🔧 en cours · ✅ fait · ❌ écartée.

- 💡 Vérification e-mail à l'inscription (lien de confirmation + jeton) — perspective d'évolution
- 💡 Recapturer le dashboard via l'onglet « Tous les RDV » (agenda plus rempli pour la démo)
- 💡 Courte vidéo de démo en plan B
- 💡 Mentionner `.env.example` comme bon réflexe sécurité à l'oral
- ✅ Corrigé : « MVC » remplacé par « architecture en couches » (terme exact défendable)
- _à compléter au fil des sessions_
