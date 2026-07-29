// src/routes/salon.routes.js
// Routes publiques de consultation des salons et de leurs coiffeurs
const router = require('express').Router();
const ctrl   = require('../controllers/salon.controller');

router.get('/',             ctrl.getAllSalons);     // Liste des salons actifs
router.get('/:id',          ctrl.getSalonById);      // Détail d'un salon
router.get('/:id/stylists', ctrl.getSalonStylists);  // Coiffeurs actifs d'un salon

module.exports = router;
