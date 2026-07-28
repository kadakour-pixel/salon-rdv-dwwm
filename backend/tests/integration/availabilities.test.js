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
