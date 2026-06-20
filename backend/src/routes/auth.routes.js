// src/routes/auth.routes.js
const express = require('express');
const router  = express.Router();
const { register, login, getMe, updateMe } = require('../controllers/auth.controller');
// ⚠️ Le middleware exporté par auth.middleware.js s'appelle "authenticate"
//    (et non "verifyToken", qui était undefined → plantage au démarrage).
const { authenticate } = require('../middlewares/auth.middleware');

// POST /api/auth/register
router.post('/register', register);
// POST /api/auth/login
router.post('/login', login);
// GET /api/auth/me  — profil du client connecté
router.get('/me', authenticate, getMe);
// PUT /api/auth/me  — modification du profil
router.put('/me', authenticate, updateMe);

module.exports = router;