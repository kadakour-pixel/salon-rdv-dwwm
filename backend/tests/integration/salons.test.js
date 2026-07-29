const request = require('supertest');
const app     = require('../../server');
const db      = require('../../src/config/db');

// Ne JAMAIS truncate salons/stylists : le salon 1 / stylist 1 seedés par
// schema_test.sql sont la cible du DEFAULT 1 des autres tables (services,
// appointments, availabilities) — un TRUNCATE casserait les autres suites.
// On ajoute uniquement nos propres fixtures via insertId, nettoyées en
// afterAll par DELETE ciblé.

let activeSalonId, inactiveSalonId, activeStylistId, inactiveStylistId;

beforeAll(async () => {
  const [activeSalon] = await db.execute(
    'INSERT INTO salons (name, address, phone) VALUES (?, ?, ?)',
    ['Salon Test Actif', '1 rue du Test', '0600000000']
  );
  activeSalonId = activeSalon.insertId;

  const [inactiveSalon] = await db.execute(
    'INSERT INTO salons (name, address, phone, is_active) VALUES (?, ?, ?, 0)',
    ['Salon Test Inactif', '2 rue du Test', '0600000001']
  );
  inactiveSalonId = inactiveSalon.insertId;

  const [activeStylist] = await db.execute(
    'INSERT INTO stylists (salon_id, first_name, last_name) VALUES (?, ?, ?)',
    [activeSalonId, 'Alice', 'Testeuse']
  );
  activeStylistId = activeStylist.insertId;

  const [inactiveStylist] = await db.execute(
    'INSERT INTO stylists (salon_id, first_name, last_name, is_active) VALUES (?, ?, ?, 0)',
    [activeSalonId, 'Bob', 'Inactif']
  );
  inactiveStylistId = inactiveStylist.insertId;
});

afterAll(async () => {
  // Ordre FK : stylists avant salons
  await db.execute('DELETE FROM stylists WHERE id IN (?, ?)', [activeStylistId, inactiveStylistId]);
  await db.execute('DELETE FROM salons WHERE id IN (?, ?)', [activeSalonId, inactiveSalonId]);
});

describe('GET /api/salons', () => {

  it('retourne 200 avec le salon actif de test, sans le salon inactif', async () => {
    const res = await request(app).get('/api/salons');

    expect(res.status).toBe(200);
    expect(res.body.some(s => s.id === activeSalonId)).toBe(true);
    expect(res.body.some(s => s.id === inactiveSalonId)).toBe(false);
  });

});

describe('GET /api/salons/:id', () => {

  it('retourne 200 et le détail du salon actif', async () => {
    const res = await request(app).get(`/api/salons/${activeSalonId}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: activeSalonId, name: 'Salon Test Actif' });
  });

  it('retourne 404 pour un salon inexistant', async () => {
    const res = await request(app).get('/api/salons/999999');

    expect(res.status).toBe(404);
  });

  it('retourne 404 pour un salon inactif', async () => {
    const res = await request(app).get(`/api/salons/${inactiveSalonId}`);

    expect(res.status).toBe(404);
  });

  it('retourne 400 pour un id invalide', async () => {
    const res = await request(app).get('/api/salons/abc');

    expect(res.status).toBe(400);
  });

});

describe('GET /api/salons/:id/stylists', () => {

  it('retourne 200 avec le coiffeur actif, sans le coiffeur inactif', async () => {
    const res = await request(app).get(`/api/salons/${activeSalonId}/stylists`);

    expect(res.status).toBe(200);
    expect(res.body.some(s => s.id === activeStylistId)).toBe(true);
    expect(res.body.some(s => s.id === inactiveStylistId)).toBe(false);
  });

  it('retourne 404 si le salon est inactif', async () => {
    const res = await request(app).get(`/api/salons/${inactiveSalonId}/stylists`);

    expect(res.status).toBe(404);
  });

  it('retourne 400 pour un id invalide', async () => {
    const res = await request(app).get('/api/salons/abc/stylists');

    expect(res.status).toBe(400);
  });

});
