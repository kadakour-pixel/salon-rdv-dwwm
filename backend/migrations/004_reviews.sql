-- ============================================================
-- Migration 004 — Avis clients (table reviews)
-- Prérequis : à exécuter après 003_verification_resend_cooldown.sql
-- À exécuter sur la base de production alwaysdata (contient des
-- données réelles) : uniquement des ajouts, aucun DROP.
-- ============================================================

CREATE TABLE reviews (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT UNSIGNED NOT NULL UNIQUE,
  user_id        INT UNSIGNED NOT NULL,
  rating         TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_appointment FOREIGN KEY (appointment_id)
    REFERENCES appointments(id),
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
