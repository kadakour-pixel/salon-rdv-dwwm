// src/routes/appointment.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/appointment.controller');
const { authenticate, requireRole, resolveSalonScope } = require('../middlewares/auth.middleware');
const { appointmentLimiter } = require('../middlewares/rate-limit.middleware');

// GET /api/appointments/slots?date=YYYY-MM-DD&serviceId=X — public
router.get('/slots', ctrl.getAvailableSlots);

// GET /api/appointments/me — client connecté
router.get('/me', authenticate, ctrl.getMine);

// GET /api/appointments — admin + manager (manager limité aux RDV de son salon)
router.get('/', authenticate, requireRole('admin', 'manager'), resolveSalonScope, ctrl.getAll);

// POST /api/appointments — client connecté
router.post('/', authenticate, appointmentLimiter, ctrl.create);

// DELETE /api/appointments/:id — client (le sien) ou admin
router.delete('/:id', authenticate, ctrl.cancel);

module.exports = router;