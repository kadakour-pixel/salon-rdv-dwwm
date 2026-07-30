const request = require('supertest');
const app     = require('../../server');
const db      = require('../../src/config/db');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

// L'authenticate ne vérifie que la signature du JWT (pas d'existence en BDD) —
// un token signé avec role: 'admin' suffit donc pour les routes admin (comme
// dans les autres suites). Un manager, en revanche, DOIT correspondre à une
// vraie ligne users : resolveSalonScope relit son salon_id en base à chaque
// requête (jamais le JWT), donc le token manager est obtenu par un vrai
// POST /api/auth/login sur un compte réel.
const adminToken = jwt.sign(
  { id: 1, email: 'admin-jest@salon.fr', role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Fixtures persistantes (jamais de TRUNCATE sur salons/stylists/users : le
// salon 1 / stylist 1 seedés sont la cible du DEFAULT 1 des autres tables,
// et le compte admin seedé sert aux autres suites).
let salon2Id, stylist2Id, service1Id, managerUserId, managerNoSalonUserId;
let managerToken, managerNoSalonToken;
let appt1Id, appt2Id;

beforeAll(async () => {
  // Salon et coiffeur d'un AUTRE salon que le salon 1
  const [salon2] = await db.execute(
    'INSERT INTO salons (name, address, phone) VALUES (?, ?, ?)',
    ['Salon Test Manager', '7 rue du Manager', '0600000007']
  );
  salon2Id = salon2.insertId;

  const [stylist2] = await db.execute(
    'INSERT INTO stylists (salon_id, first_name, last_name) VALUES (?, ?, ?)',
    [salon2Id, 'Coiffeur', 'DuManager']
  );
  stylist2Id = stylist2.insertId;

  // Service rattaché au salon 1 (par défaut), utilisé pour les tests de
  // mismatch (le manager du salon 2 ne doit pas pouvoir le toucher)
  const [service1] = await db.execute(
    'INSERT INTO services (name, duration_minutes, price) VALUES (?, ?, ?)',
    ['Service salon 1', 30, 20.00]
  );
  service1Id = service1.insertId;

  // Compte manager, rattaché au salon 2, email vérifié pour pouvoir se logger
  const password = 'password123';
  const hash = await bcrypt.hash(password, 10);

  const [managerUser] = await db.execute(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, salon_id, email_verified)
     VALUES (?, ?, ?, ?, 'manager', ?, 1)`,
    ['manager-jest@salon.fr', hash, 'Manager', 'Test', salon2Id]
  );
  managerUserId = managerUser.insertId;

  const managerLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'manager-jest@salon.fr', password });
  managerToken = managerLogin.body.token;

  // Second manager, sans salon affecté (mal configuré)
  const [managerNoSalonUser] = await db.execute(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, salon_id, email_verified)
     VALUES (?, ?, ?, ?, 'manager', NULL, 1)`,
    ['manager-no-salon-jest@salon.fr', hash, 'Manager', 'SansSalon']
  );
  managerNoSalonUserId = managerNoSalonUser.insertId;

  const managerNoSalonLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'manager-no-salon-jest@salon.fr', password });
  managerNoSalonToken = managerNoSalonLogin.body.token;

  // Deux RDV, un par salon, pour vérifier le filtrage de getAll
  const [appt1] = await db.execute(
    `INSERT INTO appointments (user_id, service_id, salon_id, stylist_id, start_at, end_at)
     VALUES (?, ?, 1, 1, '2026-09-01 10:00:00', '2026-09-01 10:30:00')`,
    [managerUserId, service1Id]
  );
  appt1Id = appt1.insertId;

  const [appt2] = await db.execute(
    `INSERT INTO appointments (user_id, service_id, salon_id, stylist_id, start_at, end_at)
     VALUES (?, ?, ?, ?, '2026-09-01 11:00:00', '2026-09-01 11:30:00')`,
    [managerUserId, service1Id, salon2Id, stylist2Id]
  );
  appt2Id = appt2.insertId;
});

afterAll(async () => {
  // Défense contre des reviews orphelines d'un run interrompu (FK RESTRICT sur fk_reviews_appointment)
  await db.execute('DELETE FROM reviews WHERE appointment_id IN (?, ?)', [appt1Id, appt2Id]);
  await db.execute('DELETE FROM appointments WHERE id IN (?, ?)', [appt1Id, appt2Id]);
  await db.execute('DELETE FROM availabilities WHERE stylist_id = ?', [stylist2Id]);
  await db.execute('DELETE FROM services WHERE id = ?', [service1Id]);
  await db.execute('DELETE FROM users WHERE id IN (?, ?)', [managerUserId, managerNoSalonUserId]);
  await db.execute('DELETE FROM stylists WHERE id = ?', [stylist2Id]);
  await db.execute('DELETE FROM salons WHERE id = ?', [salon2Id]);
});

describe('Rôle manager — services', () => {

  it('crée un service sans salon_id : rattaché à son propre salon', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Service manager', duration_minutes: 30, price: 20 });

    expect(res.status).toBe(201);
    const [[row]] = await db.execute('SELECT salon_id FROM services WHERE id = ?', [res.body.id]);
    expect(row.salon_id).toBe(salon2Id);

    await db.execute('DELETE FROM services WHERE id = ?', [res.body.id]);
  });

  it("retourne 403 si le salon_id fourni n'est pas le sien", async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Hack', duration_minutes: 30, price: 20, salon_id: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Accès limité à votre salon');
  });

  it("retourne 403 en modifiant un service d'un autre salon", async () => {
    const res = await request(app)
      .put(`/api/services/${service1Id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Hack', duration_minutes: 30, price: 20 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Accès limité à votre salon');
  });

  it("retourne 403 en désactivant un service d'un autre salon", async () => {
    const res = await request(app)
      .delete(`/api/services/${service1Id}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Accès limité à votre salon');
  });

});

describe('Rôle manager — availabilities', () => {

  it("gère les horaires d'un coiffeur de son propre salon", async () => {
    const res = await request(app)
      .put('/api/availabilities/2')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ open_time: '09:00', close_time: '18:00', stylist_id: stylist2Id });

    expect(res.status).toBe(200);

    await db.execute('DELETE FROM availabilities WHERE stylist_id = ? AND day_of_week = 2', [stylist2Id]);
  });

  it("retourne 403 pour le coiffeur d'un autre salon", async () => {
    const res = await request(app)
      .put('/api/availabilities/2')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ open_time: '09:00', close_time: '18:00', stylist_id: 1 }); // stylist 1 = salon 1

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Accès limité à votre salon');
  });

  it('retourne 403 sans stylist_id (repli 1 = coiffeur du salon 1, pas le sien)', async () => {
    const res = await request(app)
      .put('/api/availabilities/2')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ open_time: '09:00', close_time: '18:00' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Accès limité à votre salon');
  });

});

describe('Rôle manager — liste des RDV (GET /api/appointments)', () => {

  it('un manager ne voit que les RDV de son salon', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some(a => a.id === appt2Id)).toBe(true);
    expect(res.body.some(a => a.id === appt1Id)).toBe(false);
  });

  it('un admin voit les RDV de tous les salons (comportement inchangé)', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some(a => a.id === appt1Id)).toBe(true);
    expect(res.body.some(a => a.id === appt2Id)).toBe(true);
  });

});

describe('Rôle manager — salon_id NULL', () => {

  it('retourne 403 pour un manager sans salon affecté', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${managerNoSalonToken}`)
      .send({ name: 'X', duration_minutes: 30, price: 10 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Manager sans salon affecté');
  });

});
