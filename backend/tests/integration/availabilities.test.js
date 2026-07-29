const request = require('supertest');
const app     = require('../../server');
const db      = require('../../src/config/db');
const jwt     = require('jsonwebtoken');

const adminToken = jwt.sign(
  { id: 1, email: 'admin-jest@salon.fr', role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// 2026-07-14 est un mardi (day_of_week = 2)
const DAY_OF_WEEK = 2;
const TUESDAY     = '2026-07-14';

// Repart d'une table availabilities vide avant chaque test
beforeEach(async () => {
  await db.execute('TRUNCATE TABLE availabilities');
});

describe('PUT /api/availabilities/:dayOfWeek', () => {

  // ── Mise à jour réussie ──────────────────────────────────────
  it('met à jour les horaires du jour et retourne 200', async () => {
    const res = await request(app)
      .put(`/api/availabilities/${DAY_OF_WEEK}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ open_time: '09:00', close_time: '19:00' });

    expect(res.status).toBe(200);

    const day = await request(app).get(`/api/availabilities/day?date=${TUESDAY}`);
    expect(day.body).toEqual({ open: true, open_time: '09:00:00', close_time: '19:00:00' });
  });

  // ── Format d'horaire invalide (regex) ────────────────────────
  it('retourne 400 pour un horaire au mauvais format', async () => {
    const res = await request(app)
      .put(`/api/availabilities/${DAY_OF_WEEK}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ open_time: '9h00', close_time: '19:00' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/format/i);
  });

  // ── Jour invalide ─────────────────────────────────────────────
  it('retourne 400 pour un jour hors de 0–6', async () => {
    const res = await request(app)
      .put('/api/availabilities/7')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ open_time: '09:00', close_time: '19:00' });

    expect(res.status).toBe(400);
  });

});

describe('DELETE /api/availabilities/:dayOfWeek', () => {

  it('supprime les horaires du jour, qui devient fermé', async () => {
    await db.execute(
      'INSERT INTO availabilities (day_of_week, open_time, close_time) VALUES (?, ?, ?)',
      [DAY_OF_WEEK, '09:00:00', '18:00:00']
    );

    const res = await request(app)
      .delete(`/api/availabilities/${DAY_OF_WEEK}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const day = await request(app).get(`/api/availabilities/day?date=${TUESDAY}`);
    expect(day.body).toEqual({ open: false });
  });

});

describe('POST /api/availabilities/block + DELETE /block/:date', () => {

  const BLOCKED_DATE = '2026-08-01';

  it('bloque puis débloque une date exceptionnelle', async () => {
    const blockRes = await request(app)
      .post('/api/availabilities/block')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ blocked_date: BLOCKED_DATE });

    expect(blockRes.status).toBe(201);

    const dayBlocked = await request(app).get(`/api/availabilities/day?date=${BLOCKED_DATE}`);
    expect(dayBlocked.body).toEqual({ open: false });

    const unblockRes = await request(app)
      .delete(`/api/availabilities/block/${BLOCKED_DATE}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(unblockRes.status).toBe(200);
  });

  it('retourne 400 pour une date de blocage au mauvais format', async () => {
    const res = await request(app)
      .post('/api/availabilities/block')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ blocked_date: '01/08/2026' });

    expect(res.status).toBe(400);
  });

});

// ── Multi-coiffeur (stylist_id) ──────────────────────────────────────────
// Un second stylist de test, rattaché au salon 1 seedé. Jamais de TRUNCATE sur
// salons/stylists : le stylist 1 seedé est la cible du DEFAULT 1 des autres
// tables (services, appointments, availabilities).
let secondStylistId, testServiceId;

beforeAll(async () => {
  const [stylistResult] = await db.execute(
    'INSERT INTO stylists (salon_id, first_name, last_name) VALUES (1, ?, ?)',
    ['Second', 'Testeur']
  );
  secondStylistId = stylistResult.insertId;

  const [serviceResult] = await db.execute(
    'INSERT INTO services (name, duration_minutes, price) VALUES (?, ?, ?)',
    ['Service test créneaux', 60, 20.00]
  );
  testServiceId = serviceResult.insertId;
});

afterAll(async () => {
  await db.execute('DELETE FROM services WHERE id = ?', [testServiceId]);
  await db.execute('DELETE FROM stylists WHERE id = ?', [secondStylistId]);
});

describe('Horaires et créneaux par coiffeur (stylist_id)', () => {

  it('upsert avec stylist_id explicite : les horaires des deux coiffeurs coexistent pour le même jour', async () => {
    await request(app)
      .put(`/api/availabilities/${DAY_OF_WEEK}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ open_time: '09:00', close_time: '19:00' }); // repli stylist 1

    await request(app)
      .put(`/api/availabilities/${DAY_OF_WEEK}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ open_time: '10:00', close_time: '20:00', stylist_id: secondStylistId });

    const [rows] = await db.execute(
      'SELECT stylist_id, open_time FROM availabilities WHERE day_of_week = ? ORDER BY stylist_id',
      [DAY_OF_WEEK]
    );
    expect(rows.length).toBe(2);
    expect(rows.find(r => r.stylist_id === 1).open_time).toBe('09:00:00');
    expect(rows.find(r => r.stylist_id === secondStylistId).open_time).toBe('10:00:00');
  });

  it('upsert sans stylist_id retombe sur le coiffeur 1 (comportement inchangé)', async () => {
    const res = await request(app)
      .put(`/api/availabilities/${DAY_OF_WEEK}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ open_time: '09:00', close_time: '19:00' });

    expect(res.status).toBe(200);
    const [[row]] = await db.execute(
      'SELECT stylist_id FROM availabilities WHERE day_of_week = ?',
      [DAY_OF_WEEK]
    );
    expect(row.stylist_id).toBe(1);
  });

  it('getForDay est filtré par stylist_id', async () => {
    await request(app)
      .put(`/api/availabilities/${DAY_OF_WEEK}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ open_time: '10:00', close_time: '20:00', stylist_id: secondStylistId });

    // Le coiffeur 1 n'a aucun horaire ce jour (table vide via beforeEach)
    const dayDefault = await request(app).get(`/api/availabilities/day?date=${TUESDAY}`);
    expect(dayDefault.body).toEqual({ open: false });

    const daySecond = await request(app).get(`/api/availabilities/day?date=${TUESDAY}&stylist_id=${secondStylistId}`);
    expect(daySecond.body).toEqual({ open: true, open_time: '10:00:00', close_time: '20:00:00' });
  });

  it('GET /api/appointments/slots est filtré par stylist_id', async () => {
    await request(app)
      .put(`/api/availabilities/${DAY_OF_WEEK}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ open_time: '10:00', close_time: '12:00', stylist_id: secondStylistId });

    // Coiffeur 1 (repli) : pas d'horaire ce jour → aucun créneau
    const slotsDefault = await request(app)
      .get(`/api/appointments/slots?date=${TUESDAY}&serviceId=${testServiceId}`);
    expect(slotsDefault.body.slots).toEqual([]);

    // Coiffeur de test : horaire 10h-12h, service 60 min, pas de 30 min
    // → 3 créneaux possibles (10h00, 10h30, 11h00)
    const slotsSecond = await request(app)
      .get(`/api/appointments/slots?date=${TUESDAY}&serviceId=${testServiceId}&stylist_id=${secondStylistId}`);
    expect(slotsSecond.body.slots.length).toBe(3);
  });

  it('deleteDay scopé : fermer le jour du coiffeur de test ne supprime pas la ligne du coiffeur 1', async () => {
    await request(app)
      .put(`/api/availabilities/${DAY_OF_WEEK}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ open_time: '09:00', close_time: '19:00' }); // stylist 1

    await request(app)
      .put(`/api/availabilities/${DAY_OF_WEEK}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ open_time: '10:00', close_time: '20:00', stylist_id: secondStylistId });

    const delRes = await request(app)
      .delete(`/api/availabilities/${DAY_OF_WEEK}?stylist_id=${secondStylistId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);

    const [rows] = await db.execute('SELECT stylist_id FROM availabilities WHERE day_of_week = ?', [DAY_OF_WEEK]);
    expect(rows.length).toBe(1);
    expect(rows[0].stylist_id).toBe(1);
  });

  it('unblockDate scopé : débloquer une date pour le coiffeur de test ne débloque pas le coiffeur 1', async () => {
    const blockedDate = '2026-08-02';
    await request(app)
      .post('/api/availabilities/block')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ blocked_date: blockedDate }); // stylist 1

    await request(app)
      .post('/api/availabilities/block')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ blocked_date: blockedDate, stylist_id: secondStylistId });

    const unblockRes = await request(app)
      .delete(`/api/availabilities/block/${blockedDate}?stylist_id=${secondStylistId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(unblockRes.status).toBe(200);

    const [rows] = await db.execute(
      'SELECT stylist_id FROM availabilities WHERE blocked_date = ?',
      [blockedDate]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].stylist_id).toBe(1);
  });

  it('retourne 400 pour un stylist_id = 0', async () => {
    const res = await request(app).get(`/api/availabilities/day?date=${TUESDAY}&stylist_id=0`);
    expect(res.status).toBe(400);
  });

  it("retourne 400 pour un stylist_id = 'abc'", async () => {
    const res = await request(app).get(`/api/availabilities/day?date=${TUESDAY}&stylist_id=abc`);
    expect(res.status).toBe(400);
  });

  it('retourne 404 pour un stylist_id inexistant', async () => {
    const res = await request(app).get(`/api/availabilities/day?date=${TUESDAY}&stylist_id=999999`);
    expect(res.status).toBe(404);
  });

});
