// ============================================================
// server.js — Point d'entrée de l'application Express
// ============================================================
require('dotenv').config();

// Capture des exceptions non gérées pour le débogage
process.on('uncaughtException', (err) => {
  console.error('❌ Exception non catchée :', err);
});

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

// ── Import des routes ─────────────────────────────────────────
const authRoutes         = require('./src/routes/auth.routes');
const serviceRoutes      = require('./src/routes/service.routes');
const appointmentRoutes  = require('./src/routes/appointment.routes');
const availabilityRoutes = require('./src/routes/availability.routes');
const reviewRoutes       = require('./src/routes/review.routes');
const salonRoutes        = require('./src/routes/salon.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globaux ───────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// Authentification par JWT en header (pas de cookies) : le risque CSRF est
// faible ici, mais une liste blanche d'origines reste une bonne pratique de
// défense en profondeur plutôt qu'un cors() ouvert à toutes origines.
const allowedOrigins = [
  'https://kadakour.alwaysdata.net',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];
app.use(cors({
  origin(origin, callback) {
    // origin est undefined pour les requêtes sans header Origin (curl, tests
    // Supertest, health checks) — on les accepte.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origine non autorisée par CORS'));
  },
}));

app.use(express.json());

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/services',       serviceRoutes);
app.use('/api/appointments',   appointmentRoutes);
app.use('/api/availabilities', availabilityRoutes);
app.use('/api/reviews',        reviewRoutes);
app.use('/api/salons',         salonRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'OK' }));

// ── Gestion des erreurs 404 ───────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route introuvable' }));

// ── Gestion des erreurs globales ─────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ── Démarrage du serveur (pas lancé quand importé par les tests) ──
if (require.main === module) {
  console.log('🔄 Tentative de démarrage sur le port', PORT);
  app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
  }).on('error', (err) => {
    console.error('❌ Erreur démarrage serveur :', err.message);
  });
}

module.exports = app;