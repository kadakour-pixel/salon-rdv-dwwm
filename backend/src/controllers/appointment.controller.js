// src/controllers/appointment.controller.js
const db = require('../config/db');

// GET /api/appointments/slots?date=YYYY-MM-DD&serviceId=X&stylist_id= — client
async function getAvailableSlots(req, res) {
  const { date, serviceId } = req.query;
  if (!date || !serviceId) {
    return res.status(400).json({ error: 'Paramètres date et serviceId requis' });
  }

  try {
    // stylist_id : absent → repli 1 sans requête (rétrocompat mono-coiffeur) ;
    // fourni → doit être un entier positif correspondant à un coiffeur actif.
    let stylistId = 1;
    if (req.query.stylist_id !== undefined) {
      stylistId = Number(req.query.stylist_id);
      if (!Number.isInteger(stylistId) || stylistId <= 0) {
        return res.status(400).json({ error: 'stylist_id invalide' });
      }
      const [[stylist]] = await db.execute(
        'SELECT id FROM stylists WHERE id = ? AND is_active = 1',
        [stylistId]
      );
      if (!stylist) return res.status(404).json({ error: 'Coiffeur introuvable' });
    }

    // 1. Récupérer la durée du service
    const [[service]] = await db.execute(
      'SELECT duration_minutes FROM services WHERE id = ? AND is_active = 1',
      [serviceId]
    );
    if (!service) return res.status(404).json({ error: 'Prestation introuvable' });

    // 2. Récupérer les horaires d'ouverture pour ce jour et ce coiffeur
    const dayOfWeek = new Date(date).getDay();
    const [[avail]] = await db.execute(
      `SELECT open_time, close_time FROM availabilities
       WHERE day_of_week = ? AND is_blocked = 0 AND stylist_id = ?`,
      [dayOfWeek, stylistId]
    );
    if (!avail) return res.json({ slots: [] }); // fermé ce jour

    // 3. Vérifier si la date est bloquée pour ce coiffeur
    const [[blocked]] = await db.execute(
      'SELECT id FROM availabilities WHERE blocked_date = ? AND is_blocked = 1 AND stylist_id = ?',
      [date, stylistId]
    );
    if (blocked) return res.json({ slots: [] });

    // 4. Récupérer les RDV déjà pris ce jour-là pour ce coiffeur
    // NB : create() (POST /api/appointments) n'écrit pas encore stylist_id (prévu
    // en 5b-2) — tous les RDV existants sont donc stylist_id = 1. Filtrer ici par
    // un autre coiffeur renvoie temporairement une liste sans RDV bloquants, ce
    // qui est correct en l'état : aucun RDV n'est encore rattaché à ce coiffeur.
    const [booked] = await db.execute(
      `SELECT start_at, end_at FROM appointments
       WHERE DATE(start_at) = ? AND status != 'cancelled' AND stylist_id = ?`,
      [date, stylistId]
    );

    // 5. Générer les créneaux disponibles (pas à pas de 30 min)
    const slots = generateSlots(date, avail, service.duration_minutes, booked);
    res.json({ slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Génère les créneaux à la volée (pas stockés en BDD) → toujours à jour avec les horaires et les RDV existants
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

    // Détection de chevauchement : un créneau est pris si son début < fin d'un RDV ET sa fin > début d'un RDV
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

// POST /api/appointments — client (salon_id / stylist_id optionnels en body, repli 1/1)
async function create(req, res) {
  const { service_id, start_at } = req.body;
  const user_id = req.user.id;

  if (!service_id || !start_at) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    // salon_id : absent → repli 1 sans requête (rétrocompat) ; fourni → entier
    // positif correspondant à un salon actif.
    let salonId = 1;
    if (req.body.salon_id !== undefined) {
      salonId = Number(req.body.salon_id);
      if (!Number.isInteger(salonId) || salonId <= 0) {
        return res.status(400).json({ error: 'salon_id invalide' });
      }
      const [[salon]] = await db.execute(
        'SELECT id FROM salons WHERE id = ? AND is_active = 1',
        [salonId]
      );
      if (!salon) return res.status(404).json({ error: 'Salon introuvable' });
    }

    // stylist_id : absent → repli 1 sans requête ; fourni → entier positif
    // correspondant à un coiffeur actif. salon_id du coiffeur ramené dans la
    // même requête (pas de requête supplémentaire) pour la cohérence ci-dessous ;
    // par défaut (stylist_id absent) le coiffeur 1 appartient toujours au salon 1
    // (seed de la migration 005, jamais modifié ailleurs dans l'app).
    let stylistId = 1;
    let stylistSalonId = 1;
    if (req.body.stylist_id !== undefined) {
      stylistId = Number(req.body.stylist_id);
      if (!Number.isInteger(stylistId) || stylistId <= 0) {
        return res.status(400).json({ error: 'stylist_id invalide' });
      }
      const [[stylist]] = await db.execute(
        'SELECT id, salon_id FROM stylists WHERE id = ? AND is_active = 1',
        [stylistId]
      );
      if (!stylist) return res.status(404).json({ error: 'Coiffeur introuvable' });
      stylistSalonId = stylist.salon_id;
    }

    // Cohérence stylist ↔ salon : les deux ressources existent séparément, mais la
    // combinaison est invalide si le coiffeur n'appartient pas au salon demandé
    // → 400 (pas 404, aucune des deux ressources n'est introuvable).
    if (stylistSalonId !== salonId) {
      return res.status(400).json({ error: 'Ce coiffeur n\'appartient pas à ce salon' });
    }

    // salon_id ramené ici (pas de AND salon_id dans le WHERE) pour distinguer
    // "service inexistant" (404) de "service existant mais hors de ce salon" (400).
    const [[service]] = await db.execute(
      'SELECT duration_minutes, salon_id FROM services WHERE id = ? AND is_active = 1',
      [service_id]
    );
    if (!service) return res.status(404).json({ error: 'Prestation introuvable' });
    if (service.salon_id !== salonId) {
      return res.status(400).json({ error: 'Cette prestation n\'appartient pas à ce salon' });
    }

    // Calcul de end_at avec des chaînes (pas new Date) pour éviter les décalages de fuseau horaire UTC
    const [datePart, timePart] = start_at.split(' ');
    const [hh, mm, ss] = timePart.split(':').map(Number);
    const totalMin = hh * 60 + mm + service.duration_minutes;
    const endHH    = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const endMM    = String(totalMin % 60).padStart(2, '0');
    const end_at   = `${datePart} ${endHH}:${endMM}:${String(ss).padStart(2, '0')}`;

    // Vérifier conflit — scopé par coiffeur : avant le multi-coiffeur, un seul RDV
    // pouvait occuper un créneau donné dans tout le salon ; désormais deux RDV
    // simultanés sont valides dès lors qu'ils concernent deux coiffeurs différents.
    const [conflict] = await db.execute(
      `SELECT id FROM appointments
       WHERE status != 'cancelled' AND start_at < ? AND end_at > ? AND stylist_id = ?`,
      [end_at, start_at, stylistId]
    );
    if (conflict.length > 0) {
      return res.status(409).json({ error: 'Créneau déjà pris' });
    }

    const [result] = await db.execute(
      `INSERT INTO appointments (user_id, service_id, salon_id, stylist_id, start_at, end_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, service_id, salonId, stylistId, start_at, end_at]
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

// GET /api/appointments — admin + manager (manager limité aux RDV de son salon)
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
    const conditions = [];
    const params = [];
    if (date) {
      conditions.push('DATE(a.start_at) = ?');
      params.push(date);
    }
    // Manager : ne voit que les RDV de son salon ; admin (req.salonScope === null) : inchangé.
    if (req.salonScope !== null) {
      conditions.push('a.salon_id = ?');
      params.push(req.salonScope);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
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

module.exports = { getAvailableSlots, create, getMine, getAll, cancel, generateSlots };