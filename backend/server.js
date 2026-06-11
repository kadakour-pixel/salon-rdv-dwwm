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

// ── Import des routes ─────────────────────────────────────────
const authRoutes         = require('./src/routes/auth.routes');
const serviceRoutes      = require('./src/routes/service.routes');
const appointmentRoutes  = require('./src/routes/appointment.routes');
const availabilityRoutes = require('./src/routes/availability.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globaux ───────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/services',       serviceRoutes);
app.use('/api/appointments',   appointmentRoutes);
app.use('/api/availabilities', availabilityRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'OK' }));

// ── Gestion des erreurs 404 ───────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route introuvable' }));

// ── Gestion des erreurs globales ─────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ── Démarrage du serveur ──────────────────────────────────────
console.log('🔄 Tentative de démarrage sur le port', PORT);

app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
}).on('error', (err) => {
  console.error('❌ Erreur démarrage serveur :', err.message);
});