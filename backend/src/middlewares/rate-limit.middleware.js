// src/middlewares/rate-limit.middleware.js
const rateLimit = require('express-rate-limit');

// JEST_WORKER_ID est défini automatiquement par Jest pour chaque worker de test,
// sans configuration manuelle — permet de désactiver le rate-limiting pendant
// npm test sans dépendre d'une variable à ajouter dans .env.test.
const isTestEnv = () => process.env.JEST_WORKER_ID !== undefined;

// Limiteur strict pour les routes d'authentification sensibles au bruteforce
// (login) et au spam (register, resend-verification). 10 tentatives / 15 min / IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestEnv,
  message: { error: 'Trop de tentatives, réessayez dans quelques minutes' },
});

// Limiteur pour la création de rendez-vous : complète MAX_ACTIVE_APPOINTMENTS
// (limite de volume par client) en bloquant aussi les scripts automatisés qui
// spammeraient des requêtes même en échec. 20 requêtes / 15 min / IP.
const appointmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestEnv,
  message: { error: 'Trop de requêtes, réessayez dans quelques minutes' },
});

module.exports = { authLimiter, appointmentLimiter };