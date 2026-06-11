// src/routes/availability.routes.js
// Routes pour la gestion des horaires d'ouverture et des jours bloqués
const router = require('express').Router();
const ctrl   = require('../controllers/availability.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

// Routes publiques
router.get('/',               ctrl.getAll);      // Tous les horaires + jours bloqués
router.get('/day',            ctrl.getForDay);   // Horaires effectifs pour une date donnée (?date=YYYY-MM-DD)

// Routes admin uniquement
router.put('/:dayOfWeek',     authenticate, requireRole('admin'), ctrl.updateDay);    // Mettre à jour un jour (0–6)
router.post('/block',         authenticate, requireRole('admin'), ctrl.blockDate);    // Bloquer une date exceptionnelle
router.delete('/block/:date', authenticate, requireRole('admin'), ctrl.unblockDate); // Débloquer une date

module.exports = router;