const request = require('supertest');
const app     = require('../../server');
const db      = require('../../src/config/db');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

// IDs recréés avant chaque test
let userId, serviceId, service2Id, token;

// 2026-07-15 est un mercredi (day_of_week = 3) — date de référence utilisée dans toute la suite
const DATE = '2026-07-15';

// Fixtures multi-salons persistantes (créées une fois, jamais de TRUNCATE sur
// salons/stylists : le salon 1 / stylist 1 seedés sont la cible du DEFAULT 1).
// - salon2Id / stylist2Id : un salon et un coiffeur d'un AUTRE salon, pour les
//   tests de cohérence stylist↔salon et service↔salon.
// - stylist3Id : un second coiffeur du salon 1, pour le test du créneau
//   partagé par deux coiffeurs différents.
let salon2Id, stylist2Id, stylist3Id;

beforeAll(async () => {
  const [salon2] = await db.execute(
    'INSERT INTO salons (name, address, phone) VALUES (?, ?, ?)',
    ['Salon Test Autre', '9 rue Autre', '0600000009']
  );
  salon2Id = salon2.insertId;

  const [stylist2] = await db.execute(
    'INSERT INTO stylists (salon_id, first_name, last_name) VALUES (?, ?, ?)',
    [salon2Id, 'Autre', 'Salon']
  );
  stylist2Id = stylist2.insertId;

  const [stylist3] = await db.execute(
    'INSERT INTO stylists (salon_id, first_name, last_name) VALUES (1, ?, ?)',
    ['Troisieme', 'Coiffeur']
  );
  stylist3Id = stylist3.insertId;
});

afterAll(async () => {
  // appointments et services ne sont pas vidées après le DERNIER test (seulement
  // avant chaque test) : on les retruncate ici pour lever les FK (service2Id →
  // salon2Id) avant de retirer les fixtures.
  await db.execute('SET FOREIGN_KEY_CHECKS = 0');
  await db.execute('TRUNCATE TABLE appointments');
  await db.execute('TRUNCATE TABLE services');
  await db.execute('SET FOREIGN_KEY_CHECKS = 1');
  await db.execute('DELETE FROM stylists WHERE id IN (?, ?)', [stylist2Id, stylist3Id]);
  await db.execute('DELETE FROM salons WHERE id = ?', [salon2Id]);
});

// Repart de tables vides + un client, une prestation et des horaires d'ouverture propres
beforeEach(async () => {
  await db.execute('SET FOREIGN_KEY_CHECKS = 0');
  await db.execute('TRUNCATE TABLE appointments');
  await db.execute('TRUNCATE TABLE availabilities');
  await db.execute('TRUNCATE TABLE services');
  await db.execute('TRUNCATE TABLE users');
  await db.execute('SET FOREIGN_KEY_CHECKS = 1');

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

  // 3. Prestation de test (30 min), salon 1 par défaut
  const [svcResult] = await db.execute(
    'INSERT INTO services (name, duration_minutes, price) VALUES (?, ?, ?)',
    ['Coupe test', 30, 25.00]
  );
  serviceId = svcResult.insertId;

  // 3bis. Prestation rattachée au salon 2, pour le test de cohérence service↔salon
  const [svc2Result] = await db.execute(
    'INSERT INTO services (name, duration_minutes, price, salon_id) VALUES (?, ?, ?, ?)',
    ['Coupe test autre salon', 30, 25.00, salon2Id]
  );
  service2Id = svc2Result.insertId;

  // 4. Horaires d'ouverture pour le jour du test
  await db.execute(
    'INSERT INTO availabilities (day_of_week, open_time, close_time) VALUES (?, ?, ?)',
    [3, '09:00:00', '18:00:00']
  );
});

describe('POST /api/appointments', () => {

  // ── Cas 1 : réservation réussie ─────────────────────────────────
  it('retourne 201 et crée le RDV avec un créneau libre', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: `${DATE} 10:00:00` });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.start_at).toBe(`${DATE} 10:00:00`);
    expect(res.body.end_at).toBe(`${DATE} 10:30:00`);
  });

  // ── Cas 2 : créneau déjà pris → conflit ─────────────────────────
  it('retourne 409 si le créneau est déjà pris', async () => {
    // Réserve d'abord le créneau...
    await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: `${DATE} 10:00:00` });

    // ...puis tente de le reprendre
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: `${DATE} 10:00:00` });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Créneau déjà pris');
  });

  // ── Cas 3 : sans token → 401 ────────────────────────────────────
  it('retourne 401 sans token JWT', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({ service_id: serviceId, start_at: `${DATE} 11:00:00` });

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

  // ── Cas 5 : repli 1/1 sans salon_id/stylist_id (rétrocompat) ────
  it('enregistre salon_id=1 et stylist_id=1 par défaut quand ils sont absents', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: `${DATE} 10:00:00` });

    expect(res.status).toBe(201);
    const [[row]] = await db.execute(
      'SELECT salon_id, stylist_id FROM appointments WHERE id = ?',
      [res.body.id]
    );
    expect(row.salon_id).toBe(1);
    expect(row.stylist_id).toBe(1);
  });

  // ── Cas 6 (vedette) : même créneau, deux coiffeurs différents → les deux passent ──
  it('accepte deux RDV sur le même créneau pour deux coiffeurs différents', async () => {
    const first = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: `${DATE} 10:00:00` }); // stylist 1 (repli)

    const second = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: `${DATE} 10:00:00`, stylist_id: stylist3Id });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
  });

  // ── Contre-test du cas 6 : même créneau, même coiffeur explicite → conflit ──
  it('retourne 409 pour le même créneau et le même coiffeur explicite', async () => {
    await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: `${DATE} 10:00:00`, stylist_id: stylist3Id });

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: `${DATE} 10:00:00`, stylist_id: stylist3Id });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Créneau déjà pris');
  });

  // ── Cas 7 : cohérence stylist ↔ salon ────────────────────────────
  it("retourne 400 si le coiffeur n'appartient pas au salon demandé", async () => {
    // stylist2Id appartient à salon2Id, mais salon_id retombe sur 1 (repli)
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: `${DATE} 10:00:00`, stylist_id: stylist2Id });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Ce coiffeur n\'appartient pas à ce salon');
  });

  // ── Cas 8 : cohérence service ↔ salon ────────────────────────────
  it("retourne 400 si la prestation n'appartient pas au salon demandé", async () => {
    // service2Id appartient à salon2Id, mais salon_id retombe sur 1 (repli)
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: service2Id, start_at: `${DATE} 10:00:00` });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cette prestation n\'appartient pas à ce salon');
  });

  // ── Cas 9 : validation de stylist_id ─────────────────────────────
  it('retourne 400 pour un stylist_id invalide et 404 pour un stylist_id inexistant', async () => {
    const invalid = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: `${DATE} 10:00:00`, stylist_id: 'abc' });
    expect(invalid.status).toBe(400);

    const missing = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: serviceId, start_at: `${DATE} 10:00:00`, stylist_id: 999999 });
    expect(missing.status).toBe(404);
  });

});
