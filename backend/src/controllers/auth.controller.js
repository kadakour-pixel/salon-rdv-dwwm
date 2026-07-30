// src/controllers/auth.controller.js
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const db     = require('../config/db');
const mailer = require('../utils/mailer');

// Durée de validité du token de vérification d'email
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// Délai minimum entre deux renvois du mail de vérification
const RESEND_COOLDOWN_MS = 5 * 60 * 1000; // 5 min

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
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
    const verificationSentAt = new Date();

    const [result] = await db.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, verification_token, token_expires, verification_sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, password_hash, first_name, last_name, verificationToken, tokenExpires, verificationSentAt]
    );

    // L'échec d'envoi du mail ne doit pas empêcher l'inscription : l'utilisateur
    // pourra toujours redemander l'email via /api/auth/resend-verification
    try {
      await mailer.sendVerificationEmail(email, verificationToken);
    } catch (mailErr) {
      console.error('Échec envoi mail de vérification :', mailErr);
    }

    // Pas de JWT ici : le compte n'est pas encore vérifié, l'utilisateur doit
    // d'abord cliquer sur le lien reçu par mail avant de pouvoir se connecter.
    return res.status(201).json({
      message: 'Compte créé. Vérifiez votre boîte mail pour activer votre compte avant de vous connecter.',
    });
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
      'SELECT id, email, password_hash, role, email_verified FROM users WHERE email = ?', [email]
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

    if (!user.email_verified) {
      return res.status(403).json({ error: 'Adresse email non vérifiée. Consultez votre boîte mail.' });
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
      'SELECT id, first_name, last_name, email, role, salon_id FROM users WHERE id = ?',
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

// GET /api/auth/verify?token=... — clic sur le lien reçu par mail
async function verifyEmail(req, res) {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token manquant' });
  }

  try {
    const [[user]] = await db.execute(
      'SELECT id FROM users WHERE verification_token = ? AND token_expires > NOW()',
      [token]
    );
    if (!user) {
      return res.status(400).json({ error: 'Lien de vérification invalide ou expiré' });
    }

    await db.execute(
      'UPDATE users SET email_verified = 1, verification_token = NULL, token_expires = NULL WHERE id = ?',
      [user.id]
    );

    return res.redirect(`${process.env.APP_URL}/pages/login.html?verified=1`);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// POST /api/auth/resend-verification — renvoie le mail (limité à 1 par 5 min)
async function resendVerification(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  // Message générique : ne révèle pas si le compte existe ou est déjà vérifié
  const genericResponse = () =>
    res.json({ message: "Si un compte existe et n'est pas encore vérifié, un email vient d'être envoyé." });

  try {
    const [[user]] = await db.execute(
      'SELECT id, email_verified, verification_sent_at FROM users WHERE email = ?',
      [email]
    );
    if (!user || user.email_verified) {
      return genericResponse();
    }

    if (user.verification_sent_at) {
      const elapsedSinceLastSend = Date.now() - user.verification_sent_at.getTime();
      if (elapsedSinceLastSend < RESEND_COOLDOWN_MS) {
        return res.status(429).json({ error: 'Merci de patienter avant de redemander un email de vérification' });
      }
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
    const verificationSentAt = new Date();
    await db.execute(
      'UPDATE users SET verification_token = ?, token_expires = ?, verification_sent_at = ? WHERE id = ?',
      [verificationToken, tokenExpires, verificationSentAt, user.id]
    );

    try {
      await mailer.sendVerificationEmail(email, verificationToken);
    } catch (mailErr) {
      console.error('Échec envoi mail de vérification :', mailErr);
    }

    return genericResponse();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Génération du token JWT
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

module.exports = { register, login, getMe, updateMe, verifyEmail, resendVerification };