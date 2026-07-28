# Migrations

Ordre d'application : `001` → `002` → `003`.

| # | Fichier | Description |
|---|---|---|
| 001 | `001_email_verification.sql` | Ajoute la vérification d'e-mail à l'inscription (`email_verified`, `verification_token`, `token_expires`). |
| 002 | `002_reminders.sql` | Ajoute les rappels automatiques par e-mail (`reminder_sent` sur `appointments`). |
| 003 | `003_verification_resend_cooldown.sql` | Ajoute une colonne dédiée pour le cooldown de renvoi de vérification (`verification_sent_at`). |

## Statut

| # | Appliquée en dev | Appliquée en prod |
|---|---|---|
| 001 | Oui | Non |
| 002 | Oui | Non |
| 003 | Oui | Non |
