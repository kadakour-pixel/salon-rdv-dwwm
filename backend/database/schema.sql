-- ============================================================
-- Salon de coiffure — Schéma de base de données
-- DWWM Projet fin de formation
-- Testé sur MariaDB 12.3.2
-- ============================================================

CREATE DATABASE IF NOT EXISTS salon_rdv
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE salon_rdv;

-- ------------------------------------------------------------
-- Suppression des tables existantes (ordre inverse des FK)
-- ------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS availabilities;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- Table : users
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  role          ENUM('client', 'admin') NOT NULL DEFAULT 'client',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : services
-- ------------------------------------------------------------
CREATE TABLE services (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(150) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL COMMENT 'Durée en minutes',
  price            DECIMAL(6,2) NOT NULL,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : availabilities
-- ------------------------------------------------------------
CREATE TABLE availabilities (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  day_of_week  TINYINT UNSIGNED NULL COMMENT '0=Dimanche … 6=Samedi (NULL si blocked_date)',
  open_time    TIME NULL,
  close_time   TIME NULL,
  is_blocked   TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = jour fermé exceptionnellement',
  blocked_date DATE NULL COMMENT 'Date précise pour fermeture exceptionnelle',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : appointments
-- ------------------------------------------------------------
CREATE TABLE appointments (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  start_at   DATETIME NOT NULL,
  end_at     DATETIME NOT NULL,
  status     ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  INDEX idx_start_at (start_at),
  INDEX idx_user_id  (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Données initiales (seed)
-- ============================================================

-- Compte admin par défaut
-- Mot de passe : Admin1234! (à changer en production !)
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
  'admin@salon.fr',
  '$2b$10$xJg1/JGeeDCcXORGeMq42uvv47/BYdB74N0V5r/aAjOpzO/MsorkK',
  'Admin',
  'Salon',
  'admin'
);

-- Horaires d'ouverture par défaut (Mardi–Samedi)
INSERT INTO availabilities (day_of_week, open_time, close_time) VALUES
  (2, '09:00:00', '19:00:00'),
  (3, '09:00:00', '19:00:00'),
  (4, '09:00:00', '19:00:00'),
  (5, '09:00:00', '19:00:00'),
  (6, '09:00:00', '18:00:00');

-- Prestations d'exemple
INSERT INTO services (name, duration_minutes, price) VALUES
  ('Coupe femme',      60, 45.00),
  ('Coupe homme',      30, 25.00),
  ('Coloration',       90, 75.00),
  ('Balayage',        120, 95.00),
  ('Brushing',         45, 35.00),
  ('Coupe + brushing', 90, 65.00);