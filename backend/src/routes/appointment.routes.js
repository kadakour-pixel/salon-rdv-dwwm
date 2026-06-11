// src/routes/appointment.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/appointment.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

// GET /api/appointments/slots?date=YYYY-MM-DD&serviceId=X — public
router.get('/slots', ctrl.getAvailableSlots);

// GET /api/appointments/me — client connecté
router.get('/me', authenticate, ctrl.getMine);

// GET /api/appointments — admin uniquement
router.get('/', authenticate, requireRole('admin'), ctrl.getAll);

// POST /api/appointments — client connecté
router.post('/', authenticate, ctrl.create);

// DELETE /api/appointments/:id — client (le sien) ou admin
router.delete('/:id', authenticate, ctrl.cancel);

module.exports = router;