// src/controllers/review.controller.js
const db = require('../config/db');

// POST /api/reviews — client connecté
async function createReview(req, res) {
  const { appointment_id, rating, comment } = req.body;
  const user_id = req.user.id;

  if (appointment_id === undefined) {
    return res.status(400).json({ error: 'appointment_id requis' });
  }
  if (rating === undefined || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'La note doit être un entier entre 1 et 5' });
  }
  const trimmedComment = typeof comment === 'string' ? comment.trim() : '';
  if (!trimmedComment) {
    return res.status(400).json({ error: 'Le commentaire est requis' });
  }
  if (trimmedComment.length > 1000) {
    return res.status(400).json({ error: 'Le commentaire est limité à 1000 caractères' });
  }

  try {
    // Éligibilité vérifiée côté SQL uniquement (NOW()), jamais avec new Date() en JS
    const [[appointment]] = await db.execute(
      `SELECT id, status, end_at,
              (status = 'confirmed' AND end_at < NOW()) AS is_reviewable
       FROM appointments
       WHERE id = ? AND user_id = ?`,
      [appointment_id, user_id]
    );
    if (!appointment) {
      return res.status(404).json({ error: 'Rendez-vous introuvable' });
    }
    if (!appointment.is_reviewable) {
      return res.status(400).json({ error: "Ce rendez-vous n'est pas encore éligible à un avis" });
    }

    const [result] = await db.execute(
      'INSERT INTO reviews (appointment_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [appointment_id, user_id, rating, trimmedComment]
    );
    res.status(201).json({ id: result.insertId, appointment_id, rating, comment: trimmedComment });
  } catch (err) {
    // Contrainte UNIQUE sur appointment_id = source de vérité anti-doublon (pas de SELECT préalable, évite la race condition)
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Un avis existe déjà pour ce rendez-vous' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// GET /api/reviews — public
async function getPublicReviews(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT r.rating, r.comment, r.created_at, u.first_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       ORDER BY r.created_at DESC
       LIMIT 20`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// GET /api/reviews/reviewable — client connecté
async function getMyReviewableAppointments(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT a.id, a.start_at, s.name AS service_name
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       LEFT JOIN reviews r ON r.appointment_id = a.id
       WHERE a.user_id = ?
         AND a.status = 'confirmed'
         AND a.end_at < NOW()
         AND r.id IS NULL
       ORDER BY a.start_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { createReview, getPublicReviews, getMyReviewableAppointments };
