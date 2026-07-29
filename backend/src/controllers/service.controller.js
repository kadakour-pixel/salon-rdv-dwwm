// src/controllers/service.controller.js — CRUD prestations (admin)
const db = require('../config/db');

// Normalise et valide salon_id : absent → repli 1 sans requête (rétrocompat
// mono-salon, zéro coût) ; fourni → doit être un entier positif correspondant
// à un salon actif.
async function resolveSalonId(raw) {
  if (raw === undefined) return { salonId: 1 };

  const salonId = Number(raw);
  if (!Number.isInteger(salonId) || salonId <= 0) {
    return { error: { status: 400, body: { error: 'salon_id invalide' } } };
  }

  const [[salon]] = await db.execute(
    'SELECT id FROM salons WHERE id = ? AND is_active = 1',
    [salonId]
  );
  if (!salon) {
    return { error: { status: 404, body: { error: 'Salon introuvable' } } };
  }

  return { salonId };
}

// GET /api/services?salon_id= — public
async function getAll(req, res) {
  try {
    const { salonId, error } = await resolveSalonId(req.query.salon_id);
    if (error) return res.status(error.status).json(error.body);

    const [rows] = await db.execute(
      'SELECT id, name, duration_minutes, price FROM services WHERE is_active = 1 AND salon_id = ? ORDER BY name ASC',
      [salonId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// GET /api/services/:id — public (salon_id exposé, aucun filtre : consultation par id)
async function getOne(req, res) {
  try {
    const [[service]] = await db.execute(
      'SELECT id, name, duration_minutes, price, salon_id FROM services WHERE id = ? AND is_active = 1',
      [req.params.id]
    );
    if (!service) return res.status(404).json({ error: 'Prestation introuvable' });
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// POST /api/services — admin (salon_id en body, ?? 1)
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
    // Manager : salon forcé au sien (req.salonScope) ; un salon_id explicite
    // différent du sien est refusé. Admin (req.salonScope === null) : comportement
    // inchangé depuis 5b-3 — salon_id optionnel en body, repli 1.
    let salonId;
    if (req.salonScope !== null) {
      if (req.body.salon_id !== undefined && Number(req.body.salon_id) !== req.salonScope) {
        return res.status(403).json({ error: 'Accès limité à votre salon' });
      }
      salonId = req.salonScope;
    } else {
      const resolved = await resolveSalonId(req.body.salon_id);
      if (resolved.error) return res.status(resolved.error.status).json(resolved.error.body);
      salonId = resolved.salonId;
    }

    const [result] = await db.execute(
      'INSERT INTO services (salon_id, name, duration_minutes, price) VALUES (?, ?, ?, ?)',
      [salonId, name, duration_minutes, price]
    );
    res.status(201).json({ id: result.insertId, name, duration_minutes, price });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// PUT /api/services/:id — admin
async function update(req, res) {
  // salon_id non modifiable : déplacer une prestation entre salons est exclu
  // car les RDV passés (appointments.service_id) restent rattachés au salon
  // d'origine de la prestation — un transfert casserait leur cohérence.
  if (req.body.salon_id !== undefined) {
    return res.status(400).json({ error: 'salon_id non modifiable' });
  }

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
    // Manager : la prestation visée doit appartenir à son salon (admin : aucun changement).
    if (req.salonScope !== null) {
      const [[svc]] = await db.execute('SELECT salon_id FROM services WHERE id = ?', [req.params.id]);
      if (!svc) return res.status(404).json({ error: 'Prestation introuvable' });
      if (svc.salon_id !== req.salonScope) return res.status(403).json({ error: 'Accès limité à votre salon' });
    }

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
    // Manager : la prestation visée doit appartenir à son salon (admin : aucun changement).
    if (req.salonScope !== null) {
      const [[svc]] = await db.execute('SELECT salon_id FROM services WHERE id = ?', [req.params.id]);
      if (!svc) return res.status(404).json({ error: 'Prestation introuvable' });
      if (svc.salon_id !== req.salonScope) return res.status(403).json({ error: 'Accès limité à votre salon' });
    }

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
