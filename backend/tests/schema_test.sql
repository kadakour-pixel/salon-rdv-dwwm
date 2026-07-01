-- Base de données de test — même schéma que salon_rdv, données isolées
CREATE DATABASE IF NOT EXISTS salon_rdv_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE salon_rdv_test;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS availabilities;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

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

CREATE TABLE services (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(150) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  price            DECIMAL(6,2) NOT NULL,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE availabilities (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  day_of_week  TINYINT UNSIGNED NULL,
  open_time    TIME NULL,
  close_time   TIME NULL,
  is_blocked   TINYINT(1) NOT NULL DEFAULT 0,
  blocked_date DATE NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
