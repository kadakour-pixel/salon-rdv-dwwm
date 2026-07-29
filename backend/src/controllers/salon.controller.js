// src/controllers/salon.controller.js — Consultation publique des salons et coiffeurs
const db = require('../config/db');

// GET /api/salons — public
async function getAllSalons(req, res) {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, address, phone FROM salons WHERE is_active = 1 ORDER BY name ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// GET /api/salons/:id — public
async function getSalonById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID invalide' });
  }

  try {
    const [[salon]] = await db.execute(
      'SELECT id, name, address, phone FROM salons WHERE id = ? AND is_active = 1',
      [id]
    );
    if (!salon) return res.status(404).json({ error: 'Salon introuvable' });
    res.json(salon);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// GET /api/salons/:id/stylists — public
async function getSalonStylists(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID invalide' });
  }

  try {
    const [[salon]] = await db.execute(
      'SELECT id FROM salons WHERE id = ? AND is_active = 1',
      [id]
    );
    if (!salon) return res.status(404).json({ error: 'Salon introuvable' });

    const [rows] = await db.execute(
      `SELECT id, first_name, last_name FROM stylists
       WHERE salon_id = ? AND is_active = 1
       ORDER BY last_name ASC, first_name ASC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { getAllSalons, getSalonById, getSalonStylists };
