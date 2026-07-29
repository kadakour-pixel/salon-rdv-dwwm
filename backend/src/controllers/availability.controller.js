// src/controllers/availability.controller.js — Horaires d'ouverture + jours bloqués
const db = require('../config/db');

// Format HH:MM ou HH:MM:SS (l'input type="time" du front envoie HH:MM)
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

// Normalise et valide stylist_id : absent → repli 1 sans requête (comportement
// mono-coiffeur inchangé, zéro coût) ; fourni → doit être un entier positif
// correspondant à un coiffeur actif, sinon 400/404.
async function resolveStylistId(raw) {
  if (raw === undefined) return { stylistId: 1 };

  const stylistId = Number(raw);
  if (!Number.isInteger(stylistId) || stylistId <= 0) {
    return { error: { status: 400, body: { error: 'stylist_id invalide' } } };
  }

  const [[stylist]] = await db.execute(
    'SELECT id FROM stylists WHERE id = ? AND is_active = 1',
    [stylistId]
  );
  if (!stylist) {
    return { error: { status: 404, body: { error: 'Coiffeur introuvable' } } };
  }

  return { stylistId };
}

// Manager : le coiffeur visé (résolu, repli 1 inclus) doit appartenir à son
// salon — pas de repli "premier coiffeur du salon" : un manager hors salon 1
// doit expliciter stylist_id. Admin (req.salonScope === null) : aucun changement.
async function checkStylistSalonScope(req, stylistId) {
  if (req.salonScope === null) return null;

  const [[stylistRow]] = await db.execute('SELECT salon_id FROM stylists WHERE id = ?', [stylistId]);
  if (!stylistRow || stylistRow.salon_id !== req.salonScope) {
    return { status: 403, body: { error: 'Accès limité à votre salon' } };
  }
  return null;
}

// GET /api/availabilities?stylist_id= — public
// Retourne les horaires hebdomadaires et les dates bloquées d'un coiffeur (1 par défaut)
async function getAll(req, res) {
  try {
    const { stylistId, error } = await resolveStylistId(req.query.stylist_id);
    if (error) return res.status(error.status).json(error.body);

    const [rows] = await db.execute(
      `SELECT id, day_of_week, open_time, close_time, is_blocked, blocked_date
       FROM availabilities
       WHERE stylist_id = ? AND (blocked_date IS NULL OR blocked_date >= CURDATE())
       ORDER BY day_of_week ASC, blocked_date ASC`,
      [stylistId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// GET /api/availabilities/day?date=YYYY-MM-DD&stylist_id= — public
// Retourne les horaires effectifs pour une date donnée et un coiffeur (1 par défaut)
// Priorité : fermeture exceptionnelle > horaire hebdomadaire
async function getForDay(req, res) {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Paramètre date requis (YYYY-MM-DD)' });

  try {
    const { stylistId, error } = await resolveStylistId(req.query.stylist_id);
    if (error) return res.status(error.status).json(error.body);

    const dayOfWeek = new Date(date).getDay();

    // Une seule requête : remonte la fermeture exceptionnelle en premier (blocked_date non null)
    const [[avail]] = await db.execute(
      `SELECT open_time, close_time, is_blocked
       FROM availabilities
       WHERE stylist_id = ?
         AND ((day_of_week = ? AND blocked_date IS NULL)
              OR (blocked_date = ? AND is_blocked = 1))
       ORDER BY blocked_date DESC
       LIMIT 1`,
      [stylistId, dayOfWeek, date]
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

// PUT /api/availabilities/:dayOfWeek — admin (stylist_id en body, ?? 1)
// Met à jour les horaires d'un jour de la semaine (0=Dim … 6=Sam) pour un coiffeur
async function updateDay(req, res) {
  const { open_time, close_time } = req.body;
  const dayOfWeek = parseInt(req.params.dayOfWeek, 10);

  if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ error: 'Jour invalide (0–6)' });
  }
  if (!open_time || !close_time) {
    return res.status(400).json({ error: 'Champs open_time et close_time requis' });
  }
  if (!TIME_REGEX.test(open_time) || !TIME_REGEX.test(close_time)) {
    return res.status(400).json({ error: 'Format d\'horaire invalide (attendu : HH:MM)' });
  }

  try {
    const { stylistId, error } = await resolveStylistId(req.body.stylist_id);
    if (error) return res.status(error.status).json(error.body);

    const scopeError = await checkStylistSalonScope(req, stylistId);
    if (scopeError) return res.status(scopeError.status).json(scopeError.body);

    // Upsert (INSERT + UPDATE en une seule requête) : crée le jour s'il n'existe pas, sinon met à jour
    // stylist_id fait partie des colonnes insérées : c'est lui qui pilote quelle
    // ligne l'index UNIQUE uq_avail_stylist_day (stylist_id, day_of_week) cible.
    await db.execute(
      `INSERT INTO availabilities (stylist_id, day_of_week, open_time, close_time, is_blocked)
       VALUES (?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE open_time = VALUES(open_time), close_time = VALUES(close_time), is_blocked = 0`,
      [stylistId, dayOfWeek, open_time, close_time]
    );
    res.json({ message: 'Horaires mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// POST /api/availabilities/block — admin (stylist_id en body, ?? 1)
// Bloque une date précise (fermeture exceptionnelle) pour un coiffeur
async function blockDate(req, res) {
  const { blocked_date } = req.body;
  if (!blocked_date) return res.status(400).json({ error: 'Champ blocked_date requis (YYYY-MM-DD)' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(blocked_date)) {
    return res.status(400).json({ error: 'Format de date invalide (attendu : YYYY-MM-DD)' });
  }

  try {
    const { stylistId, error } = await resolveStylistId(req.body.stylist_id);
    if (error) return res.status(error.status).json(error.body);

    const scopeError = await checkStylistSalonScope(req, stylistId);
    if (scopeError) return res.status(scopeError.status).json(scopeError.body);

    // stylist_id fait partie des colonnes insérées : c'est lui qui pilote quelle
    // ligne l'index UNIQUE uq_avail_stylist_blocked (stylist_id, blocked_date) cible.
    await db.execute(
      `INSERT INTO availabilities (stylist_id, day_of_week, is_blocked, blocked_date)
       VALUES (?, NULL, 1, ?)
       ON DUPLICATE KEY UPDATE is_blocked = 1`,
      [stylistId, blocked_date]
    );
    res.status(201).json({ message: 'Date bloquée', blocked_date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// DELETE /api/availabilities/block/:date?stylist_id= — admin
// Débloque une date précise pour un coiffeur
async function unblockDate(req, res) {
  try {
    const { stylistId, error } = await resolveStylistId(req.query.stylist_id);
    if (error) return res.status(error.status).json(error.body);

    const scopeError = await checkStylistSalonScope(req, stylistId);
    if (scopeError) return res.status(scopeError.status).json(scopeError.body);

    // Scope par stylist_id : sans ce filtre, débloquer une date supprimerait la
    // ligne de TOUS les coiffeurs qui l'avaient bloquée (l'index est désormais
    // composite, plusieurs lignes peuvent exister pour la même blocked_date).
    const [result] = await db.execute(
      'DELETE FROM availabilities WHERE blocked_date = ? AND is_blocked = 1 AND stylist_id = ?',
      [req.params.date, stylistId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Date bloquée introuvable' });
    res.json({ message: 'Date débloquée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// DELETE /api/availabilities/:dayOfWeek?stylist_id= — admin
// Supprime les horaires d'un jour pour un coiffeur (le jour devient fermé)
async function deleteDay(req, res) {
  const dayOfWeek = parseInt(req.params.dayOfWeek, 10);
  if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)
    return res.status(400).json({ error: 'Jour invalide (0–6)' });

  try {
    const { stylistId, error } = await resolveStylistId(req.query.stylist_id);
    if (error) return res.status(error.status).json(error.body);

    const scopeError = await checkStylistSalonScope(req, stylistId);
    if (scopeError) return res.status(scopeError.status).json(scopeError.body);

    // Scope par stylist_id : sans ce filtre, fermer un jour le fermerait pour
    // TOUS les coiffeurs (même raison que unblockDate ci-dessus).
    await db.execute(
      'DELETE FROM availabilities WHERE day_of_week = ? AND blocked_date IS NULL AND stylist_id = ?',
      [dayOfWeek, stylistId]
    );
    res.json({ message: 'Jour marqué comme fermé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { getAll, getForDay, updateDay, blockDate, unblockDate, deleteDay };
