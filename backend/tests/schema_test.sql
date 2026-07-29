-- Base de données de test — même schéma que salon_rdv, données isolées
CREATE DATABASE IF NOT EXISTS salon_rdv_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE salon_rdv_test;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS availabilities;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS stylists;
DROP TABLE IF EXISTS salons;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE salons (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  address    VARCHAR(255),
  phone      VARCHAR(20),
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stylists (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_id   INT UNSIGNED NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name  VARCHAR(50) NOT NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salon_id) REFERENCES salons(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  role          ENUM('client', 'admin', 'manager') NOT NULL DEFAULT 'client',
  salon_id      INT UNSIGNED NULL,
  email_verified     TINYINT(1) NOT NULL DEFAULT 0,
  verification_token VARCHAR(64) NULL,
  token_expires      DATETIME NULL,
  verification_sent_at DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (salon_id) REFERENCES salons(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE services (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_id         INT UNSIGNED NOT NULL DEFAULT 1,
  name             VARCHAR(150) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  price            DECIMAL(6,2) NOT NULL,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salon_id) REFERENCES salons(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE availabilities (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  stylist_id   INT UNSIGNED NOT NULL DEFAULT 1,
  day_of_week  TINYINT UNSIGNED NULL,
  open_time    TIME NULL,
  close_time   TIME NULL,
  is_blocked   TINYINT(1) NOT NULL DEFAULT 0,
  blocked_date DATE NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stylist_id) REFERENCES stylists(id),
  UNIQUE KEY uq_avail_stylist_day (stylist_id, day_of_week),
  UNIQUE KEY uq_avail_stylist_blocked (stylist_id, blocked_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE appointments (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  salon_id   INT UNSIGNED NOT NULL DEFAULT 1,
  stylist_id INT UNSIGNED NOT NULL DEFAULT 1,
  start_at   DATETIME NOT NULL,
  end_at     DATETIME NOT NULL,
  status     ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  reminder_sent TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  FOREIGN KEY (salon_id)   REFERENCES salons(id),
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

INSERT INTO salons (id, name, address, phone) VALUES
  (1, 'Salon Élégance', '1 rue de la République, 59100 Roubaix', '0300000000');

INSERT INTO stylists (id, salon_id, first_name, last_name) VALUES
  (1, 1, 'Équipe', 'Salon Élégance');
