-- ============================================================
-- Migration 001 — Vérification d'e-mail à l'inscription
-- Prérequis : aucun (première migration du projet)
-- À exécuter sur la base de production alwaysdata (contient des
-- données réelles) : uniquement des ajouts, aucun DROP.
-- ============================================================

ALTER TABLE users
  ADD COLUMN email_verified      TINYINT(1) NOT NULL DEFAULT 0 AFTER role,
  ADD COLUMN verification_token  VARCHAR(64) NULL AFTER email_verified,
  ADD COLUMN token_expires       DATETIME NULL AFTER verification_token;

-- Rétrocompatibilité : les comptes déjà existants avant cette migration
-- ont été créés sans flux de vérification — on les considère vérifiés
-- pour ne pas bloquer leur connexion au prochain login.
UPDATE users SET email_verified = 1 WHERE email_verified = 0;
