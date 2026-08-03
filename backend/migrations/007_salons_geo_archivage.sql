-- ============================================================
-- Migration 007 — Géolocalisation et archivage des salons
-- Prérequis : à exécuter après 006_action_tokens.sql
-- À exécuter sur la base de production alwaysdata (contient des
-- données réelles) : uniquement des ajouts, aucun DROP.
-- ============================================================

-- latitude/longitude nullables : un salon sans coordonnées reste
-- réservable normalement, seule la carte n'affiche que les salons
-- géolocalisés. archived_at NULL = salon non archivé.
-- archived_by en INT UNSIGNED (et non INT) : une FK exige des types
-- identiques signe compris, or users.id est int(10) unsigned.
ALTER TABLE salons
  ADD COLUMN latitude    DECIMAL(10,8) NULL,
  ADD COLUMN longitude   DECIMAL(11,8) NULL,
  ADD COLUMN archived_at DATETIME NULL,
  ADD COLUMN archived_by INT UNSIGNED NULL;

-- ON DELETE SET NULL : on garde la trace de l'archivage (archived_at)
-- même si le compte admin qui l'a effectué disparaît par la suite.
ALTER TABLE salons
  ADD CONSTRAINT fk_salons_archived_by
    FOREIGN KEY (archived_by) REFERENCES users(id)
    ON DELETE SET NULL;
