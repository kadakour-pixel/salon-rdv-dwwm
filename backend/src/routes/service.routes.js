// src/routes/service.routes.js
// Routes CRUD pour les prestations du salon
const router = require('express').Router();
const ctrl   = require('../controllers/service.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

// Routes publiques
router.get('/',       ctrl.getAll);         // Liste toutes les prestations actives
router.get('/:id',    ctrl.getOne);         // Détail d'une prestation

// Routes admin uniquement
router.post('/',      authenticate, requireRole('admin'), ctrl.create);   // Créer une prestation
router.put('/:id',    authenticate, requireRole('admin'), ctrl.update);   // Modifier une prestation
router.delete('/:id', authenticate, requireRole('admin'), ctrl.remove);   // Désactiver une prestation

module.exports = router;