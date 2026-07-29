# Migrations

Ordre d'application : `001` → `002` → `003` → `004` → `005`.

| # | Fichier | Description |
|---|---|---|
| 001 | `001_email_verification.sql` | Ajoute la vérification d'e-mail à l'inscription (`email_verified`, `verification_token`, `token_expires`). |
| 002 | `002_reminders.sql` | Ajoute les rappels automatiques par e-mail (`reminder_sent` sur `appointments`). |
| 003 | `003_verification_resend_cooldown.sql` | Ajoute une colonne dédiée pour le cooldown de renvoi de vérification (`verification_sent_at`). |
| 004 | `004_reviews.sql` | Ajoute la table `reviews` pour les avis clients (note + commentaire, liés à un RDV). |
| 005 | `005_multi_salons.sql` | Ajoute `salons` et `stylists`, rattache `services`/`appointments`/`availabilities`/`users` (colonnes `DEFAULT 1` rétrocompatibles), ajoute le rôle `manager`. Corrige au passage un bug latent : `availabilities` n'avait jamais eu d'index UNIQUE alors que le controller fait un `ON DUPLICATE KEY UPDATE` dessus, ce qui créait des doublons silencieux (5 doublons constatés et supprimés en dev). Ajout de `uq_avail_stylist_day` et `uq_avail_stylist_blocked`. |

## Statut

| # | Appliquée en dev | Appliquée en prod |
|---|---|---|
| 001 | Oui | Non |
| 002 | Oui | Non |
| 003 | Oui | Non |
| 004 | Oui | Non |
| 005 | Oui (29/07/2026) | Non |

## Note

Après application d'une migration en dev, rejouer `backend/tests/schema_test.sql` sur `salon_rdv_test` : la base de test n'est pas recréée automatiquement et un schéma en retard fait échouer les suites qui touchent les nouvelles tables. (Constaté lors de la migration 005 : `salon_rdv_test` était restée au schéma pré-005.)
