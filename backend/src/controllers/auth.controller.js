// src/controllers/auth.controller.js
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

// Coût du hashage bcrypt : 10 = bon compromis sécurité/performance (~100ms par hash)
const SALT_ROUNDS = 10;

// Regex de validation du format email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
async function register(req, res) {
  const { email, password, first_name, last_name } = req.body;

  // Vérification des champs obligatoires
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
  }

  // Validation du format email côté serveur
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Format d\'email invalide' });
  }

  // Validation de la longueur du mot de passe côté serveur
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
  }

  try {
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await db.execute(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
      [email, password_hash, first_name, last_name]
    );

    const token = signToken({ id: result.insertId, email, role: 'client' });
    return res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, email, password_hash, role FROM users WHERE email = ?', [email]
    );
    // Même message vague pour email inconnu ET mauvais mot de passe → ne révèle pas si l'email existe (sécurité)
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.json({ token, role: user.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// GET /api/auth/me — client connecté
async function getMe(req, res) {
  try {
    const [[user]] = await db.execute(
      'SELECT id, first_name, last_name, email, role FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// PUT /api/auth/me — client connecté
async function updateMe(req, res) {
  const { first_name, last_name, email } = req.body;

  if (!first_name || !last_name || !email) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Format d'email invalide" });
  }

  try {
    // Vérifier qu'un autre utilisateur n'utilise pas déjà ce nouvel email
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    await db.execute(
      'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
      [first_name, last_name, email, req.user.id]
    );
    res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Génération du token JWT
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

module.exports = { register, login, getMe, updateMe };