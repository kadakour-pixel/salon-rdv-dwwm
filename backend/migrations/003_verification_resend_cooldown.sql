-- ============================================================
-- Migration 003 — Cooldown de renvoi de vérification (colonne dédiée)
-- Prérequis : à exécuter après 002_reminders.sql
-- À exécuter sur la base de production alwaysdata (contient des
-- données réelles) : uniquement des ajouts, aucun DROP.
-- ============================================================

-- Avant cette migration, le cooldown de resend-verification était déduit par
-- soustraction depuis token_expires (dernier envoi = token_expires - 24h).
-- Fragile : ne fonctionne que si la durée du token ne change jamais. On stocke
-- désormais explicitement la date du dernier envoi.
ALTER TABLE users
  ADD COLUMN verification_sent_at DATETIME NULL AFTER token_expires
    COMMENT 'Date du dernier envoi du mail de vérification (register ou resend)';
