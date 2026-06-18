// src/controllers/service.controller.js — CRUD prestations (admin)
const db = require('../config/db');

// GET /api/services — public
async function getAll(req, res) {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, duration_minutes, price FROM services WHERE is_active = 1 ORDER BY name ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// GET /api/services/:id — public
async function getOne(req, res) {
  try {
    const [[service]] = await db.execute(
      'SELECT id, name, duration_minutes, price FROM services WHERE id = ? AND is_active = 1',
      [req.params.id]
    );
    if (!service) return res.status(404).json({ error: 'Prestation introuvable' });
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// POST /api/services — admin
async function create(req, res) {
  const { name, duration_minutes, price } = req.body;
  if (!name || !duration_minutes || price === undefined) {
    return res.status(400).json({ error: 'Champs obligatoires : name, duration_minutes, price' });
  }
  if (!Number.isInteger(Number(duration_minutes)) || Number(duration_minutes) <= 0) {
    return res.status(400).json({ error: 'La durée doit être un entier positif' });
  }
  if (isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ error: 'Le prix doit être un nombre positif' });
  }
  try {
    const [result] = await db.execute(
      'INSERT INTO services (name, duration_minutes, price) VALUES (?, ?, ?)',
      [name, duration_minutes, price]
    );
    res.status(201).json({ id: result.insertId, name, duration_minutes, price });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// PUT /api/services/:id — admin
async function update(req, res) {
  const { name, duration_minutes, price } = req.body;
  if (!name || !duration_minutes || price === undefined) {
    return res.status(400).json({ error: 'Champs obligatoires : name, duration_minutes, price' });
  }
  if (!Number.isInteger(Number(duration_minutes)) || Number(duration_minutes) <= 0) {
    return res.status(400).json({ error: 'La durée doit être un entier positif' });
  }
  if (isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ error: 'Le prix doit être un nombre positif' });
  }
  try {
    const [result] = await db.execute(
      'UPDATE services SET name = ?, duration_minutes = ?, price = ? WHERE id = ?',
      [name, duration_minutes, price, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Prestation introuvable' });
    res.json({ message: 'Prestation mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// DELETE /api/services/:id — admin (soft delete)
// Suppression logique : on met is_active = 0 au lieu de DELETE pour garder l'historique des RDV passés
async function remove(req, res) {
  try {
    const [result] = await db.execute(
      'UPDATE services SET is_active = 0 WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Prestation introuvable' });
    res.json({ message: 'Prestation désactivée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { getAll, getOne, create, update, remove };
