// src/controllers/appointment.controller.js
const db = require('../config/db');

// GET /api/appointments/slots?date=YYYY-MM-DD&serviceId=X — client
async function getAvailableSlots(req, res) {
  const { date, serviceId } = req.query;
  if (!date || !serviceId) {
    return res.status(400).json({ error: 'Paramètres date et serviceId requis' });
  }

  try {
    // 1. Récupérer la durée du service
    const [[service]] = await db.execute(
      'SELECT duration_minutes FROM services WHERE id = ? AND is_active = 1',
      [serviceId]
    );
    if (!service) return res.status(404).json({ error: 'Prestation introuvable' });

    // 2. Récupérer les horaires d'ouverture pour ce jour
    const dayOfWeek = new Date(date).getDay();
    const [[avail]] = await db.execute(
      `SELECT open_time, close_time FROM availabilities
       WHERE day_of_week = ? AND is_blocked = 0`,
      [dayOfWeek]
    );
    if (!avail) return res.json({ slots: [] }); // fermé ce jour

    // 3. Vérifier si la date est bloquée
    const [[blocked]] = await db.execute(
      'SELECT id FROM availabilities WHERE blocked_date = ? AND is_blocked = 1',
      [date]
    );
    if (blocked) return res.json({ slots: [] });

    // 4. Récupérer les RDV déjà pris ce jour-là
    const [booked] = await db.execute(
      `SELECT start_at, end_at FROM appointments
       WHERE DATE(start_at) = ? AND status != 'cancelled'`,
      [date]
    );

    // 5. Générer les créneaux disponibles (pas à pas de 30 min)
    const slots = generateSlots(date, avail, service.duration_minutes, booked);
    res.json({ slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

function generateSlots(date, avail, duration, booked) {
  const slots = [];
  const [oh, om] = avail.open_time.split(':').map(Number);
  const [ch, cm] = avail.close_time.split(':').map(Number);

  let current = oh * 60 + om;
  const closeMin = ch * 60 + cm;

  while (current + duration <= closeMin) {
    const startStr = `${date} ${String(Math.floor(current / 60)).padStart(2,'0')}:${String(current % 60).padStart(2,'0')}:00`;
    const endMin   = current + duration;
    const endStr   = `${date} ${String(Math.floor(endMin / 60)).padStart(2,'0')}:${String(endMin % 60).padStart(2,'0')}:00`;

    const overlap = booked.some(b => {
      const bStart = new Date(b.start_at).getTime();
      const bEnd   = new Date(b.end_at).getTime();
      const sStart = new Date(startStr).getTime();
      const sEnd   = new Date(endStr).getTime();
      return sStart < bEnd && sEnd > bStart;
    });

    if (!overlap) slots.push({ start: startStr, end: endStr });
    current += 30; // pas de 30 minutes
  }
  return slots;
}

// POST /api/appointments — client
async function create(req, res) {
  const { service_id, start_at } = req.body;
  const user_id = req.user.id;

  if (!service_id || !start_at) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    const [[service]] = await db.execute(
      'SELECT duration_minutes FROM services WHERE id = ? AND is_active = 1',
      [service_id]
    );
    if (!service) return res.status(404).json({ error: 'Prestation introuvable' });

    // Calcul de end_at sans conversion UTC pour éviter le décalage de fuseau horaire
    // On parse start_at comme chaîne locale et on ajoute la durée en minutes
    const [datePart, timePart] = start_at.split(' ');
    const [hh, mm, ss] = timePart.split(':').map(Number);
    const totalMin = hh * 60 + mm + service.duration_minutes;
    const endHH    = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const endMM    = String(totalMin % 60).padStart(2, '0');
    const end_at   = `${datePart} ${endHH}:${endMM}:${String(ss).padStart(2, '0')}`;

    // Vérifier conflit
    const [conflict] = await db.execute(
      `SELECT id FROM appointments
       WHERE status != 'cancelled' AND start_at < ? AND end_at > ?`,
      [end_at, start_at]
    );
    if (conflict.length > 0) {
      return res.status(409).json({ error: 'Créneau déjà pris' });
    }

    const [result] = await db.execute(
      'INSERT INTO appointments (user_id, service_id, start_at, end_at) VALUES (?, ?, ?, ?)',
      [user_id, service_id, start_at, end_at]
    );
    res.status(201).json({ id: result.insertId, start_at, end_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// GET /api/appointments/me — client
async function getMine(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT a.id, a.start_at, a.end_at, a.status,
              s.name AS service_name, s.price
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       WHERE a.user_id = ?
       ORDER BY a.start_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// GET /api/appointments — admin
async function getAll(req, res) {
  const { date } = req.query;
  try {
    let query = `
      SELECT a.id, a.start_at, a.end_at, a.status,
             u.first_name, u.last_name, u.email,
             s.name AS service_name, s.duration_minutes
      FROM appointments a
      JOIN users    u ON u.id = a.user_id
      JOIN services s ON s.id = a.service_id
    `;
    const params = [];
    if (date) {
      query += ' WHERE DATE(a.start_at) = ?';
      params.push(date);
    }
    query += ' ORDER BY a.start_at ASC';

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// DELETE /api/appointments/:id — client ou admin
async function cancel(req, res) {
  try {
    const [rows] = await db.execute(
      'SELECT id, user_id, status FROM appointments WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'RDV introuvable' });

    const appt = rows[0];
    if (req.user.role === 'client' && appt.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    if (appt.status === 'cancelled') {
      return res.status(400).json({ error: 'RDV déjà annulé' });
    }

    await db.execute(
      "UPDATE appointments SET status = 'cancelled' WHERE id = ?",
      [req.params.id]
    );
    res.json({ message: 'RDV annulé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { getAvailableSlots, create, getMine, getAll, cancel };