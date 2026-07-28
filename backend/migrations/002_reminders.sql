-- ============================================================
-- Migration 002 — Rappels automatiques par e-mail
-- Prérequis : à exécuter après 001_email_verification.sql
-- À exécuter sur la base de production alwaysdata (contient des
-- données réelles) : uniquement des ajouts, aucun DROP.
-- ============================================================

ALTER TABLE appointments
  ADD COLUMN reminder_sent TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1 = e-mail de rappel déjà envoyé pour ce RDV' AFTER status;
