// src/routes/salon.routes.js
// Routes publiques de consultation des salons et de leurs coiffeurs
const router = require('express').Router();
const ctrl   = require('../controllers/salon.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

// Routes publiques
router.get('/',             ctrl.getAllSalons);     // Liste des salons actifs

// /admin DOIT être déclarée avant /:id : sinon Express fait matcher /:id en
// premier (ordre de déclaration) et "admin" serait capturé comme un id de salon.
router.get('/admin', authenticate, requireRole('admin'), ctrl.getAllSalonsAdmin); // Tous les salons (admin)

router.get('/:id',          ctrl.getSalonById);      // Détail d'un salon
router.get('/:id/stylists', ctrl.getSalonStylists);  // Coiffeurs actifs d'un salon

// Routes admin (gestion des salons, pas d'accès manager)
router.post('/',  authenticate, requireRole('admin'), ctrl.createSalon);  // Créer un salon
router.put('/:id', authenticate, requireRole('admin'), ctrl.updateSalon); // Modifier un salon
router.post('/:id/status', authenticate, requireRole('admin'), ctrl.setSalonStatus); // Activer/désactiver un salon

module.exports = router;
