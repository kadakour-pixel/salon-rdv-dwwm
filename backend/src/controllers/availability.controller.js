// src/controllers/availability.controller.js — Horaires d'ouverture + jours bloqués
const db = require('../config/db');

// GET /api/availabilities — public
// Retourne les horaires hebdomadaires et les dates bloquées
async function getAll(req, res) {
  try {
    const [rows] = await db.execute(
      'SELECT id, day_of_week, open_time, close_time, is_blocked, blocked_date FROM availabilities ORDER BY day_of_week ASC, blocked_date ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// GET /api/availabilities/day?date=YYYY-MM-DD — public
// Retourne les horaires effectifs pour une date donnée
// Priorité : fermeture exceptionnelle > horaire hebdomadaire
async function getForDay(req, res) {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Paramètre date requis (YYYY-MM-DD)' });

  try {
    const dayOfWeek = new Date(date).getDay();

    // Une seule requête : remonte la fermeture exceptionnelle en premier (blocked_date non null)
    const [[avail]] = await db.execute(
      `SELECT open_time, close_time, is_blocked
       FROM availabilities
       WHERE (day_of_week = ? AND blocked_date IS NULL)
          OR (blocked_date = ? AND is_blocked = 1)
       ORDER BY blocked_date DESC
       LIMIT 1`,
      [dayOfWeek, date]
    );

    if (!avail || avail.is_blocked) {
      return res.json({ open: false });
    }

    res.json({ open: true, open_time: avail.open_time, close_time: avail.close_time });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// PUT /api/availabilities/:dayOfWeek — admin
// Met à jour les horaires d'un jour de la semaine (0=Dim … 6=Sam)
async function updateDay(req, res) {
  const { open_time, close_time } = req.body;
  const dayOfWeek = parseInt(req.params.dayOfWeek, 10);

  if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ error: 'Jour invalide (0–6)' });
  }
  if (!open_time || !close_time) {
    return res.status(400).json({ error: 'Champs open_time et close_time requis' });
  }

  try {
    // Upsert : met à jour si existe, insère sinon
    await db.execute(
      `INSERT INTO availabilities (day_of_week, open_time, close_time, is_blocked)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE open_time = VALUES(open_time), close_time = VALUES(close_time), is_blocked = 0`,
      [dayOfWeek, open_time, close_time]
    );
    res.json({ message: 'Horaires mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// POST /api/availabilities/block — admin
// Bloque une date précise (fermeture exceptionnelle)
async function blockDate(req, res) {
  const { blocked_date } = req.body;
  if (!blocked_date) return res.status(400).json({ error: 'Champ blocked_date requis (YYYY-MM-DD)' });

  try {
    await db.execute(
      `INSERT INTO availabilities (day_of_week, is_blocked, blocked_date)
       VALUES (NULL, 1, ?)
       ON DUPLICATE KEY UPDATE is_blocked = 1`,
      [blocked_date]
    );
    res.status(201).json({ message: 'Date bloquée', blocked_date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// DELETE /api/availabilities/block/:date — admin
// Débloque une date précise
async function unblockDate(req, res) {
  try {
    const [result] = await db.execute(
      'DELETE FROM availabilities WHERE blocked_date = ? AND is_blocked = 1',
      [req.params.date]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Date bloquée introuvable' });
    res.json({ message: 'Date débloquée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { getAll, getForDay, updateDay, blockDate, unblockDate };
