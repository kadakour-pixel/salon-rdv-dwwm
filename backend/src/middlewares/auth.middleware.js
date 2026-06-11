// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

/**
 * Vérifie le token JWT dans le header Authorization.
 * Injecte req.user = { id, email, role } si valide.
 */
function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expiré ou invalide' });
  }
}

/**
 * Usine de middleware de rôle.
 * Exemple : requireRole('admin')
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };