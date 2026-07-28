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
