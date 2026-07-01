const request = require('supertest');
const app     = require('../../server');
const db      = require('../../src/config/db');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

// IDs insérés en BDD lors du setup — récupérés dans les tests
let userId, serviceId, token;

describe('POST /api/appointments', () => {

  // ── Setup : créer utilisateur + service + horaires ──────────────
  beforeAll(async () => {
    // 1. Utilisateur client de test
    const hash = await bcrypt.hash('password123', 10);
    const [userResult] = await db.execute(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
      ['rdv-jest@salon.fr', hash, 'RDV', 'Test']
    );
    userId = userResult.insertId;

    // 2. Générer un vrai token JWT pour cet utilisateur
    token = jwt.sign(
      { id: userId, email: 'rdv-jest@salon.fr', role: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Prestation de test (30 min)
    const [svcResult] = await db.execute(
      'INSERT INTO services (name, duration_minutes, price) VALUES (?, ?, ?)',
      ['Coupe test', 30, 25.00]
    );
    serviceId = svcResult.insertId;

    // 4. Horaires d'ouverture pour le jour du test (mercredi = 3)
    // On utilise une date fixe connue un mercredi
    await db.execute(
      'INSERT INTO availabilities (day_of_week, open_time, close_time) VALUES (?, ?, ?)',
      [3, '09:00:00', '18:00:00']
    );
  });

  // ── Teardown : supprimer toutes les données de test ─────────────
  afterAll(async () => {
    await db.execute('DELETE FROM appointments WHERE user_id = ?', [userId]);
    await db.execute('DELETE FROM availabilities WHERE open_time = ?', ['09:00:00']);
    await db.execute('DELETE FROM services WHERE id = ?', [serviceId]);
    await db.execute('DELETE FROM users WHERE id = ?', [userId]);
  });

  // ── Cas 1 : réservation réussie ─────────────────────────────────
  it('retourne 201 et crée le RDV avec un créneau libre', async () => {
    // 2026-07-15 est un mercredi
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: '2026-07-15 10:00:00' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.start_at).toBe('2026-07-15 10:00:00');
    expect(res.body.end_at).toBe('2026-07-15 10:30:00');
  });

  // ── Cas 2 : créneau déjà pris → conflit ─────────────────────────
  it('retourne 409 si le créneau est déjà pris', async () => {
    // Tente de réserver le même créneau que le test précédent
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: '2026-07-15 10:00:00' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Créneau déjà pris');
  });

  // ── Cas 3 : sans token → 401 ────────────────────────────────────
  it('retourne 401 sans token JWT', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({ service_id: serviceId, start_at: '2026-07-15 11:00:00' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token manquant ou invalide');
  });

  // ── Cas 4 : token client sur route admin → 403 ──────────────────
  it('retourne 403 quand un client accède à une route admin', async () => {
    // POST /api/services est réservé aux admins
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hack', duration_minutes: 30, price: 0 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Accès interdit');
  });

});
