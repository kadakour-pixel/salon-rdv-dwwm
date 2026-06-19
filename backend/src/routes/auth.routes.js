// src/routes/auth.routes.js
const express = require('express');
const router  = express.Router();
const { register, login, getMe, updateMe } = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// POST /api/auth/register
router.post('/register', register);
// POST /api/auth/login
router.post('/login', login);
// GET /api/auth/me
router.get('/me', verifyToken, getMe);
// PUT /api/auth/me
router.put('/me', verifyToken, updateMe);

module.exports = router;