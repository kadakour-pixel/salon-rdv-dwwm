const request = require('supertest');
const app     = require('../../server');
const db      = require('../../src/config/db');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

let userId, otherUserId, serviceId, token, otherToken;

beforeEach(async () => {
  await db.execute('SET FOREIGN_KEY_CHECKS = 0');
  await db.execute('TRUNCATE TABLE reviews');
  await db.execute('TRUNCATE TABLE appointments');
  await db.execute('TRUNCATE TABLE availabilities');
  await db.execute('TRUNCATE TABLE services');
  await db.execute('TRUNCATE TABLE users');
  await db.execute('SET FOREIGN_KEY_CHECKS = 1');

  const hash = await bcrypt.hash('password123', 10);

  const [userResult] = await db.execute(
    'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
    ['reviews-jest@salon.fr', hash, 'Camille', 'Test']
  );
  userId = userResult.insertId;
  token = jwt.sign(
    { id: userId, email: 'reviews-jest@salon.fr', role: 'client' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const [otherResult] = await db.execute(
    'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
    ['reviews-other-jest@salon.fr', hash, 'Autre', 'Client']
  );
  otherUserId = otherResult.insertId;
  otherToken = jwt.sign(
    { id: otherUserId, email: 'reviews-other-jest@salon.fr', role: 'client' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const [svcResult] = await db.execute(
    'INSERT INTO services (name, duration_minutes, price) VALUES (?, ?, ?)',
    ['Coupe test', 30, 25.00]
  );
  serviceId = svcResult.insertId;
});

// RDV créé avec des dates calculées côté SQL (NOW() + décalage), jamais avec
// new Date() côté JS — même convention que reminders.test.js.
async function createAppointment({ ownerId = userId, hoursFromNow, status = 'confirmed' }) {
  const [result] = await db.execute(
    `INSERT INTO appointments (user_id, service_id, start_at, end_at, status)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), DATE_ADD(NOW(), INTERVAL ? HOUR), ?)`,
    [ownerId, serviceId, hoursFromNow, hoursFromNow, status]
  );
  return result.insertId;
}

describe('POST /api/reviews', () => {

  it('retourne 401 sans token', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({ appointment_id: 1, rating: 5, comment: 'Top' });

    expect(res.status).toBe(401);
  });

  it('retourne 400 si la note est 0', async () => {
    const id = await createAppointment({ hoursFromNow: -2 });
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_id: id, rating: 0, comment: 'Top' });

    expect(res.status).toBe(400);
  });

  it('retourne 400 si la note est 6', async () => {
    const id = await createAppointment({ hoursFromNow: -2 });
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_id: id, rating: 6, comment: 'Top' });

    expect(res.status).toBe(400);
  });

  it('retourne 400 si la note est absente', async () => {
    const id = await createAppointment({ hoursFromNow: -2 });
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_id: id, comment: 'Top' });

    expect(res.status).toBe(400);
  });

  it('retourne 400 pour un RDV futur', async () => {
    const id = await createAppointment({ hoursFromNow: 5 });
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_id: id, rating: 5, comment: 'Top' });

    expect(res.status).toBe(400);
  });

  it('retourne 400 pour un RDV pending non confirmé', async () => {
    const id = await createAppointment({ hoursFromNow: -2, status: 'pending' });
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_id: id, rating: 5, comment: 'Top' });

    expect(res.status).toBe(400);
  });

  it("retourne 404 pour un RDV appartenant à un autre client", async () => {
    const id = await createAppointment({ ownerId: otherUserId, hoursFromNow: -2 });
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_id: id, rating: 5, comment: 'Top' });

    expect(res.status).toBe(404);
  });

  it('retourne 201 pour un avis valide', async () => {
    const id = await createAppointment({ hoursFromNow: -2 });
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_id: id, rating: 5, comment: 'Excellent accueil' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('retourne 409 en cas de doublon sur le même RDV', async () => {
    const id = await createAppointment({ hoursFromNow: -2 });
    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_id: id, rating: 5, comment: 'Excellent accueil' });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_id: id, rating: 4, comment: 'Deuxième tentative' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Un avis existe déjà pour ce rendez-vous');
  });

});

describe('GET /api/reviews', () => {

  it('retourne 200 sans token, avec le prénom mais sans e-mail', async () => {
    const id = await createAppointment({ hoursFromNow: -2 });
    await db.execute(
      'INSERT INTO reviews (appointment_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [id, userId, 5, 'Excellent accueil']
    );

    const res = await request(app).get('/api/reviews');

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].first_name).toBe('Camille');
    expect(res.body[0]).not.toHaveProperty('email');
    expect(JSON.stringify(res.body)).not.toContain('reviews-jest@salon.fr');
  });

});

describe('GET /api/reviews/stats', () => {

  it('retourne count: 0 et average: null quand la table est vide', async () => {
    const res = await request(app).get('/api/reviews/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 0, average: null });
  });

  it('retourne le nombre et la moyenne arrondie à 1 décimale pour 2 avis', async () => {
    const id1 = await createAppointment({ hoursFromNow: -2 });
    const id2 = await createAppointment({ hoursFromNow: -3 });
    await db.execute(
      'INSERT INTO reviews (appointment_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [id1, userId, 5, 'Top']
    );
    await db.execute(
      'INSERT INTO reviews (appointment_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [id2, userId, 4, 'Bien']
    );

    const res = await request(app).get('/api/reviews/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 2, average: 4.5 });
  });

});
