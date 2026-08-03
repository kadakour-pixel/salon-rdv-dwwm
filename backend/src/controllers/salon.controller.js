// src/controllers/salon.controller.js — Consultation publique des salons et coiffeurs
const db = require('../config/db');

// GET /api/salons — public
async function getAllSalons(req, res) {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, address, phone, latitude, longitude FROM salons WHERE is_active = 1 ORDER BY name ASC'
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
      'SELECT id, name, address, phone, latitude, longitude FROM salons WHERE id = ? AND is_active = 1',
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

// GET /api/salons/admin — admin (tous les salons : actifs, inactifs, archivés)
// can_delete : aucune dépendance (stylists/services/users/action_tokens/appointments
// du salon) — seul cas où un DELETE physique sera autorisé. Le serveur revérifiera
// de toute façon ces mêmes conditions au moment du DELETE (ce calcul n'est qu'informatif
// pour l'affichage).
async function getAllSalonsAdmin(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT
         s.id, s.name, s.address, s.phone, s.is_active,
         s.latitude, s.longitude, s.archived_at, s.archived_by,
         (
           NOT EXISTS (SELECT 1 FROM stylists      st  WHERE st.salon_id  = s.id) AND
           NOT EXISTS (SELECT 1 FROM services      sv  WHERE sv.salon_id  = s.id) AND
           NOT EXISTS (SELECT 1 FROM users         u   WHERE u.salon_id   = s.id) AND
           NOT EXISTS (SELECT 1 FROM action_tokens atk WHERE atk.salon_id = s.id) AND
           NOT EXISTS (
             SELECT 1 FROM appointments a
             JOIN stylists ast ON ast.id = a.stylist_id
             WHERE ast.salon_id = s.id
           )
         ) AS can_delete
       FROM salons s
       ORDER BY s.name ASC`
    );
    // MariaDB renvoie les expressions booléennes en 1/0 : on expose un vrai
    // booléen JSON pour ce champ calculé plutôt que de laisser fuir le 1/0 SQL.
    const salons = rows.map((row) => ({ ...row, can_delete: Boolean(row.can_delete) }));
    res.json(salons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Valide latitude/longitude — même forme que resolveSalonId (service.controller.js).
// Les bornes sont validées ici pour renvoyer un 400 propre : sans ce contrôle,
// la colonne DECIMAL(10,8) lèverait une erreur SQL que le catch transformerait
// en 500, alors que la faute est côté client.
function resolveCoordinates(body) {
  // Le front envoie `null` ou `''` pour un champ vide, pas seulement `undefined` —
  // et Number(null) comme Number('') valent 0 (une coordonnée valide), donc les
  // trois formes d'absence doivent être traitées identiquement, avant toute
  // conversion Number().
  const isAbsent = (v) => v === undefined || v === null || v === '';

  if (isAbsent(body.latitude) && isAbsent(body.longitude)) {
    return { latitude: null, longitude: null };
  }
  if (isAbsent(body.latitude) || isAbsent(body.longitude)) {
    return { error: { status: 400, body: { error: 'latitude et longitude doivent etre fournies ensemble' } } };
  }

  const latitude = Number(body.latitude);
  if (isNaN(latitude)) {
    return { error: { status: 400, body: { error: 'latitude invalide' } } };
  }
  if (latitude < -90 || latitude > 90) {
    return { error: { status: 400, body: { error: 'latitude hors bornes (-90 a 90)' } } };
  }

  const longitude = Number(body.longitude);
  if (isNaN(longitude)) {
    return { error: { status: 400, body: { error: 'longitude invalide' } } };
  }
  if (longitude < -180 || longitude > 180) {
    return { error: { status: 400, body: { error: 'longitude hors bornes (-180 a 180)' } } };
  }

  return { latitude, longitude };
}

// POST /api/salons — admin
async function createSalon(req, res) {
  const name = (req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Champ obligatoire : name' });
  }

  const address = req.body.address || null;
  const phone = req.body.phone || null;

  let isActive = 1;
  if (req.body.is_active !== undefined) {
    isActive = Number(req.body.is_active);
    if (isActive !== 0 && isActive !== 1) {
      return res.status(400).json({ error: 'is_active doit valoir 0 ou 1' });
    }
  }

  const { latitude, longitude, error: coordsError } = resolveCoordinates(req.body);
  if (coordsError) return res.status(coordsError.status).json(coordsError.body);

  try {
    const [result] = await db.execute(
      'INSERT INTO salons (name, address, phone, is_active, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
      [name, address, phone, isActive, latitude, longitude]
    );
    res.status(201).json({ id: result.insertId, name, address, phone, is_active: isActive, latitude, longitude });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// PUT /api/salons/:id — admin
// Remplacement complet (sémantique PUT stricte, pas un PATCH) : tout champ
// optionnel absent du body (address, phone, latitude, longitude) est remis à
// NULL. Le formulaire d'édition du front doit donc toujours envoyer l'objet complet.
async function updateSalon(req, res) {
  const name = (req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Champ obligatoire : name' });
  }

  const address = req.body.address || null;
  const phone = req.body.phone || null;

  let isActive = 1;
  if (req.body.is_active !== undefined) {
    isActive = Number(req.body.is_active);
    if (isActive !== 0 && isActive !== 1) {
      return res.status(400).json({ error: 'is_active doit valoir 0 ou 1' });
    }
  }

  const { latitude, longitude, error: coordsError } = resolveCoordinates(req.body);
  if (coordsError) return res.status(coordsError.status).json(coordsError.body);

  try {
    const [result] = await db.execute(
      'UPDATE salons SET name = ?, address = ?, phone = ?, is_active = ?, latitude = ?, longitude = ? WHERE id = ?',
      [name, address, phone, isActive, latitude, longitude, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Salon introuvable' });
    res.json({ id: Number(req.params.id), name, address, phone, is_active: isActive, latitude, longitude });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { getAllSalons, getSalonById, getSalonStylists, getAllSalonsAdmin, createSalon, updateSalon };
