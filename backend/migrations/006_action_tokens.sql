-- ============================================================
-- Migration 006 — Table générique de tokens d'action (invitation
-- manager, mot de passe oublié)
-- Prérequis : à exécuter après 005_multi_salons.sql
-- À exécuter sur la base de production alwaysdata (contient des
-- données réelles) : uniquement des ajouts, aucun DROP.
-- ============================================================

-- Table générique action_tokens (colonne type) plutôt qu'une table
-- dédiée par cas d'usage : extensible au « mot de passe oublié »
-- sans nouvelle migration, il suffira d'ajouter une valeur à l'ENUM.
CREATE TABLE action_tokens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  salon_id   INT UNSIGNED NULL,
  type       ENUM('invite_manager','password_reset') NOT NULL,
  -- SHA-256 du token : le token en clair ne transite que dans l'URL du
  -- mail. Contrairement à users.verification_token (choix antérieur
  -- conservé tel quel), un accès en lecture à la base ne permet donc
  -- pas à lui seul de consommer une invitation ou une réinitialisation.
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- La suppression d'un compte purge ses tokens.
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (salon_id) REFERENCES salons(id),
  UNIQUE KEY uq_token_hash (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- salon_id est nullable : renseigné pour type = invite_manager (le
-- salon proposé au manager invité), NULL pour type = password_reset
-- (qui ne concerne aucun salon en particulier). La cohérence entre
-- type et salon_id est garantie côté contrôleur, pas en base.
