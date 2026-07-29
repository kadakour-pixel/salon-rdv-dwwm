// src/routes/availability.routes.js
// Routes pour la gestion des horaires d'ouverture et des jours bloqués
const router = require('express').Router();
const ctrl   = require('../controllers/availability.controller');
const { authenticate, requireRole, resolveSalonScope } = require('../middlewares/auth.middleware');

// Routes publiques
router.get('/',               ctrl.getAll);      // Tous les horaires + jours bloqués
router.get('/day',            ctrl.getForDay);   // Horaires effectifs pour une date donnée (?date=YYYY-MM-DD)

// Routes admin + manager (manager limité au coiffeur de son salon via resolveSalonScope)
router.put('/:dayOfWeek',     authenticate, requireRole('admin', 'manager'), resolveSalonScope, ctrl.updateDay);    // Mettre à jour un jour (0–6)
router.delete('/:dayOfWeek', authenticate, requireRole('admin', 'manager'), resolveSalonScope, ctrl.deleteDay);    // Supprimer les horaires d'un jour (fermer)
router.post('/block',         authenticate, requireRole('admin', 'manager'), resolveSalonScope, ctrl.blockDate);    // Bloquer une date exceptionnelle
router.delete('/block/:date', authenticate, requireRole('admin', 'manager'), resolveSalonScope, ctrl.unblockDate); // Débloquer une date

module.exports = router;