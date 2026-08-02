// src/routes/auth.routes.js
const express = require('express');
const router  = express.Router();
const { register, login, getMe, updateMe, verifyEmail, resendVerification, inviteManager, setPassword } = require('../controllers/auth.controller');
// ⚠️ Le middleware exporté par auth.middleware.js s'appelle "authenticate"
//    (et non "verifyToken", qui était undefined → plantage au démarrage).
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

// POST /api/auth/register
router.post('/register', register);
// POST /api/auth/login
router.post('/login', login);
// GET /api/auth/verify  — clic sur le lien reçu par mail
router.get('/verify', verifyEmail);
// POST /api/auth/resend-verification — renvoyer le mail de vérification
router.post('/resend-verification', resendVerification);
// GET /api/auth/me  — profil du client connecté
router.get('/me', authenticate, getMe);
// PUT /api/auth/me  — modification du profil
router.put('/me', authenticate, updateMe);
// POST /api/auth/invite-manager — admin : invite un manager sur un salon
router.post('/invite-manager', authenticate, requireRole('admin'), inviteManager);
// POST /api/auth/set-password — public : le token d'invitation authentifie
router.post('/set-password', setPassword);

module.exports = router;