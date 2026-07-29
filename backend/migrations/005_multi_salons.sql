-- ============================================================
-- Migration 005 — Multi-salons / multi-coiffeurs
-- Prérequis : à exécuter après 004_reviews.sql
-- À exécuter sur la base de production alwaysdata (contient des
-- données réelles) : uniquement des ajouts, aucun DROP.
--
-- Toutes les colonnes salon_id / stylist_id ajoutées ci-dessous
-- utilisent un DEFAULT 1 (salon et coiffeur créés au point 2) :
-- rétrocompatibilité volontaire pour que le backend actuel
-- (mono-salon, mono-coiffeur, ne connaissant pas ces colonnes)
-- continue de fonctionner sans modification. Le retrait de ces
-- DEFAULT (une fois le backend adapté pour exiger explicitement
-- salon_id / stylist_id) est prévu dans une migration future.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table : salons
-- ------------------------------------------------------------
CREATE TABLE salons (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  address    VARCHAR(255),
  phone      VARCHAR(20),
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Table : stylists
-- ------------------------------------------------------------
CREATE TABLE stylists (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_id   INT UNSIGNED NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name  VARCHAR(50) NOT NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salon_id) REFERENCES salons(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Données initiales : salon et coiffeur par défaut (id=1)
-- Cible des DEFAULT 1 ajoutés plus bas — permet à toutes les
-- données existantes (services, appointments, availabilities)
-- de rester valides vis-à-vis des nouvelles FK.
-- ------------------------------------------------------------
INSERT INTO salons (id, name, address, phone) VALUES
  (1, 'Salon Élégance', '1 rue de la République, 59100 Roubaix', '0300000000');

INSERT INTO stylists (id, salon_id, first_name, last_name) VALUES
  (1, 1, 'Équipe', 'Salon Élégance');

-- ------------------------------------------------------------
-- 4. services : rattachement au salon
-- ------------------------------------------------------------
ALTER TABLE services
  ADD COLUMN salon_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;

ALTER TABLE services
  ADD CONSTRAINT fk_services_salon FOREIGN KEY (salon_id) REFERENCES salons(id);

-- ------------------------------------------------------------
-- 5. appointments : rattachement au salon + au coiffeur
-- ------------------------------------------------------------
ALTER TABLE appointments
  ADD COLUMN salon_id   INT UNSIGNED NOT NULL DEFAULT 1 AFTER service_id,
  ADD COLUMN stylist_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER salon_id;

ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_salon   FOREIGN KEY (salon_id)   REFERENCES salons(id),
  ADD CONSTRAINT fk_appointments_stylist FOREIGN KEY (stylist_id) REFERENCES stylists(id);

-- ------------------------------------------------------------
-- 6. availabilities : rattachement au coiffeur + correction d'un
-- bug latent constaté en dev.
--
-- Bug latent : les deux upsert du controller (updateDay, blockDate)
-- utilisent ON DUPLICATE KEY UPDATE en s'appuyant respectivement sur
-- day_of_week et blocked_date, alors qu'AUCUN index UNIQUE n'a jamais
-- existé sur cette table (vérifié dans schema.sql/schema_test.sql et
-- les migrations 001 à 004). Conséquence : chaque appel qui aurait dû
-- être une mise à jour insère silencieusement une nouvelle ligne.
-- Constaté en base de dev le 2026-07-29 : 10 lignes pour 5 jours
-- ouverts (2 lignes identiques par jour). On corrige ici plutôt que
-- dans une migration dédiée car la table est de toute façon modifiée
-- pour le multi-coiffeurs.
-- ------------------------------------------------------------
ALTER TABLE availabilities
  ADD COLUMN stylist_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;

ALTER TABLE availabilities
  ADD CONSTRAINT fk_availabilities_stylist FOREIGN KEY (stylist_id) REFERENCES stylists(id);

-- Dédoublonnage défensif AVANT la création des index UNIQUE.
-- On conserve l'id le plus grand (les doublons connus sont des
-- copies identiques créées par l'upsert défaillant, aucune perte
-- d'information).
DELETE a FROM availabilities a
  JOIN availabilities b
    ON a.day_of_week = b.day_of_week
   AND a.stylist_id  = b.stylist_id
   AND a.id < b.id
WHERE a.day_of_week IS NOT NULL;

DELETE a FROM availabilities a
  JOIN availabilities b
    ON a.blocked_date = b.blocked_date
   AND a.stylist_id   = b.stylist_id
   AND a.id < b.id
WHERE a.blocked_date IS NOT NULL;

-- Deux index composites distincts (et non un seul sur les 3 colonnes) :
-- une ligne d'horaire hebdo a toujours blocked_date NULL, une ligne de
-- blocage a toujours day_of_week NULL. MariaDB autorise plusieurs NULL
-- dans une contrainte UNIQUE, donc les deux familles de lignes
-- cohabitent sans jamais se bloquer mutuellement via ces index.
ALTER TABLE availabilities
  ADD UNIQUE KEY uq_avail_stylist_day (stylist_id, day_of_week);

ALTER TABLE availabilities
  ADD UNIQUE KEY uq_avail_stylist_blocked (stylist_id, blocked_date);

-- ------------------------------------------------------------
-- 7. users : rôle manager + rattachement optionnel à un salon
-- ------------------------------------------------------------
ALTER TABLE users
  MODIFY COLUMN role ENUM('client', 'admin', 'manager') NOT NULL DEFAULT 'client';

ALTER TABLE users
  ADD COLUMN salon_id INT UNSIGNED NULL DEFAULT NULL AFTER role;

-- salon_id NULL = client ou admin global (non rattaché à un salon précis).
ALTER TABLE users
  ADD CONSTRAINT fk_users_salon FOREIGN KEY (salon_id) REFERENCES salons(id);
