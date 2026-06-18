// src/config/db.js — Pool de connexion MySQL
const mysql = require('mysql2/promise');

// Pool = ensemble de connexions réutilisables (évite d'ouvrir/fermer une connexion à chaque requête)
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'salon_rdv',
  waitForConnections: true,
  connectionLimit:    10,   // max 10 connexions simultanées, suffisant pour un petit salon
  queueLimit:         0,    // 0 = pas de limite de file d'attente
});

module.exports = pool;
