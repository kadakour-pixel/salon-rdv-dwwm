// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const db  = require('../config/db');

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
 * Usine de middleware de rôle, variadique.
 * Exemple : requireRole('admin', 'manager')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    next();
  };
}

/**
 * À placer APRÈS authenticate + requireRole sur les routes ouvertes aux
 * managers. Résout le périmètre salon de l'appelant :
 * - admin   → req.salonScope = null (aucune restriction, comportement actuel)
 * - manager → req.salonScope = son salon_id
 * Toujours une lecture fraîche en base (jamais le JWT, qui ne contient pas
 * salon_id et vit jusqu'à 7 jours) : si l'affectation d'un manager change,
 * l'effet est immédiat sans attendre l'expiration du token.
 */
async function resolveSalonScope(req, res, next) {
  if (req.user.role === 'admin') {
    req.salonScope = null;
    return next();
  }

  try {
    const [[user]] = await db.execute('SELECT salon_id FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.salon_id === null) {
      return res.status(403).json({ error: 'Manager sans salon affecté' });
    }
    req.salonScope = user.salon_id;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { authenticate, requireRole, resolveSalonScope };