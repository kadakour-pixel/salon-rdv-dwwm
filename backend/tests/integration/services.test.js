const request = require('supertest');
const app     = require('../../server');
const db      = require('../../src/config/db');
const jwt     = require('jsonwebtoken');

// L'authenticate ne vérifie que la signature du JWT (pas d'existence en BDD) —
// un token signé avec role: 'admin' suffit donc pour les routes admin.
const adminToken = jwt.sign(
  { id: 1, email: 'admin-jest@salon.fr', role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

let serviceId;

// Repart d'une table services vide + une prestation connue avant chaque test
beforeEach(async () => {
  await db.execute('SET FOREIGN_KEY_CHECKS = 0');
  await db.execute('TRUNCATE TABLE services');
  await db.execute('SET FOREIGN_KEY_CHECKS = 1');

  const [result] = await db.execute(
    'INSERT INTO services (name, duration_minutes, price) VALUES (?, ?, ?)',
    ['Coupe test', 30, 25.00]
  );
  serviceId = result.insertId;
});

describe('CRUD /api/services', () => {

  // ── Création ─────────────────────────────────────────────────
  it('POST crée une prestation et retourne 201', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Brushing', duration_minutes: 20, price: 15 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Brushing');
  });

  // ── Lecture ──────────────────────────────────────────────────
  it('GET / retourne la liste des prestations actives', async () => {
    const res = await request(app).get('/api/services');

    expect(res.status).toBe(200);
    expect(res.body.some(s => s.id === serviceId)).toBe(true);
  });

  // ── Mise à jour ──────────────────────────────────────────────
  it('PUT /:id modifie la prestation', async () => {
    const res = await request(app)
      .put(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Coupe modifiée', duration_minutes: 45, price: 30 });

    expect(res.status).toBe(200);

    const [[row]] = await db.execute('SELECT name, duration_minutes, price FROM services WHERE id = ?', [serviceId]);
    expect(row.name).toBe('Coupe modifiée');
    expect(row.duration_minutes).toBe(45);
  });

  // ── Suppression (soft delete) ───────────────────────────────
  it('DELETE /:id désactive la prestation (is_active = 0) au lieu de la supprimer', async () => {
    const res = await request(app)
      .delete(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    // La ligne existe toujours en BDD, seulement désactivée
    const [[row]] = await db.execute('SELECT is_active FROM services WHERE id = ?', [serviceId]);
    expect(row.is_active).toBe(0);

    // Et elle disparaît des endpoints publics (filtrés sur is_active = 1)
    const list = await request(app).get('/api/services');
    expect(list.body.some(s => s.id === serviceId)).toBe(false);

    const detail = await request(app).get(`/api/services/${serviceId}`);
    expect(detail.status).toBe(404);
  });

});

// ── Services par salon (salon_id) ────────────────────────────────────────
// Un salon de fixture, créé une seule fois (JAMAIS de TRUNCATE sur salons :
// le salon 1 seedé est la cible du DEFAULT 1 des autres tables). Les services
// rattachés à ce salon sont recréés dans chaque test qui en a besoin, car le
// beforeEach ci-dessus fait TRUNCATE TABLE services avant chaque test — une
// fixture service créée en beforeAll serait détruite avant le premier test.
let otherSalonId;

beforeAll(async () => {
  const [result] = await db.execute(
    'INSERT INTO salons (name, address, phone) VALUES (?, ?, ?)',
    ['Salon Test Services', '3 rue du Test', '0600000003']
  );
  otherSalonId = result.insertId;
});

afterAll(async () => {
  await db.execute('DELETE FROM salons WHERE id = ?', [otherSalonId]);
});

describe('Prestations par salon (salon_id)', () => {

  it('GET / sans salon_id retourne uniquement les prestations du salon 1 (comportement inchangé)', async () => {
    const res = await request(app).get('/api/services');

    expect(res.status).toBe(200);
    expect(res.body.some(s => s.id === serviceId)).toBe(true);
  });

  it('GET /?salon_id= retourne uniquement les prestations du salon demandé', async () => {
    const [otherService] = await db.execute(
      'INSERT INTO services (name, duration_minutes, price, salon_id) VALUES (?, ?, ?, ?)',
      ['Coupe autre salon', 30, 25.00, otherSalonId]
    );
    const otherServiceId = otherService.insertId;

    const res = await request(app).get(`/api/services?salon_id=${otherSalonId}`);

    expect(res.status).toBe(200);
    expect(res.body.some(s => s.id === otherServiceId)).toBe(true);
    expect(res.body.some(s => s.id === serviceId)).toBe(false);
  });

  it("GET /?salon_id=abc retourne 400", async () => {
    const res = await request(app).get('/api/services?salon_id=abc');
    expect(res.status).toBe(400);
  });

  it('GET /?salon_id=999999 retourne 404', async () => {
    const res = await request(app).get('/api/services?salon_id=999999');
    expect(res.status).toBe(404);
  });

  it('POST avec salon_id explicite rattache la prestation au bon salon', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Coupe autre salon', duration_minutes: 30, price: 25, salon_id: otherSalonId });

    expect(res.status).toBe(201);

    const [[row]] = await db.execute('SELECT salon_id FROM services WHERE id = ?', [res.body.id]);
    expect(row.salon_id).toBe(otherSalonId);
  });

  it('PUT /:id contenant salon_id retourne 400 (salon_id non modifiable)', async () => {
    const res = await request(app)
      .put(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Coupe modifiée', duration_minutes: 45, price: 30, salon_id: otherSalonId });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('salon_id non modifiable');
  });

});
