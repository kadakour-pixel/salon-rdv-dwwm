const request = require('supertest');
const app     = require('../../server');
const db      = require('../../src/config/db');
const jwt     = require('jsonwebtoken');

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

  it('expose latitude et longitude sur chaque salon', async () => {
    const res = await request(app).get('/api/salons');

    expect(res.status).toBe(200);
    res.body.forEach((salon) => {
      expect(salon).toHaveProperty('latitude');
      expect(salon).toHaveProperty('longitude');
    });
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

// ── Gestion des salons (admin) ───────────────────────────────────────────
// L'authenticate ne vérifie que la signature du JWT (pas d'existence en BDD) —
// un token signé avec role: 'admin' suffit donc pour les routes admin (comme
// dans les autres suites). Ces routes n'utilisent pas resolveSalonScope, donc
// un token manager/client signé à la main suffit aussi pour vérifier le 403.
const adminToken = jwt.sign(
  { id: 1, email: 'admin-jest@salon.fr', role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
const managerToken = jwt.sign(
  { id: 2, email: 'manager-jest@salon.fr', role: 'manager' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
const clientToken = jwt.sign(
  { id: 3, email: 'client-jest@salon.fr', role: 'client' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('POST et PUT /api/salons (admin)', () => {

  // Salons créés par ce describe, nettoyés en afterAll (aucun TRUNCATE).
  const createdSalonIds = [];

  afterAll(async () => {
    if (createdSalonIds.length > 0) {
      await db.execute(
        `DELETE FROM salons WHERE id IN (${createdSalonIds.map(() => '?').join(',')})`,
        createdSalonIds
      );
    }
  });

  // ── Création ─────────────────────────────────────────────────
  it('POST crée un salon avec name seul et retourne 201', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test POST Minimal' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Salon Test POST Minimal', address: null, is_active: 1 });
    expect(res.body).toHaveProperty('id');
    createdSalonIds.push(res.body.id);

    const [[row]] = await db.execute('SELECT name, address, phone, is_active FROM salons WHERE id = ?', [res.body.id]);
    expect(row).toMatchObject({ name: 'Salon Test POST Minimal', address: null, is_active: 1 });
  });

  it('POST crée un salon complet (name + address + phone)', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test POST Complet', address: '9 rue du Test', phone: '0600000009' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Salon Test POST Complet',
      address: '9 rue du Test',
      phone: '0600000009',
      is_active: 1,
    });
    createdSalonIds.push(res.body.id);
  });

  it('POST sans name retourne 400', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ address: '1 rue Sans Nom' });

    expect(res.status).toBe(400);
  });

  it('POST avec name vide après trim retourne 400', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '   ' });

    expect(res.status).toBe(400);
  });

  it('POST avec is_active=2 retourne 400', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test is_active Invalide', is_active: 2 });

    expect(res.status).toBe(400);
  });

  it('POST sans token retourne 401', async () => {
    const res = await request(app)
      .post('/api/salons')
      .send({ name: 'Salon Test Sans Token' });

    expect(res.status).toBe(401);
  });

  it('POST avec token client retourne 403', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ name: 'Salon Test Token Client' });

    expect(res.status).toBe(403);
  });

  it('POST avec token manager retourne 403', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Salon Test Token Manager' });

    expect(res.status).toBe(403);
  });

  // ── Mise à jour ──────────────────────────────────────────────
  it('PUT modifie un salon et le désactive (is_active=0), il disparaît alors du GET public', async () => {
    const created = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test PUT Avant' });
    const salonId = created.body.id;
    createdSalonIds.push(salonId);

    const res = await request(app)
      .put(`/api/salons/${salonId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test PUT Après', is_active: 0 });

    expect(res.status).toBe(200);

    const [[row]] = await db.execute('SELECT name, is_active FROM salons WHERE id = ?', [salonId]);
    expect(row).toMatchObject({ name: 'Salon Test PUT Après', is_active: 0 });

    const list = await request(app).get('/api/salons');
    expect(list.body.some(s => s.id === salonId)).toBe(false);
  });

  it('PUT remplace intégralement : les champs absents sont remis à NULL', async () => {
    const created = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test PUT Complet Avant', address: '5 rue du Remplacement', phone: '0600000005' });
    const salonId = created.body.id;
    createdSalonIds.push(salonId);

    const res = await request(app)
      .put(`/api/salons/${salonId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test PUT Complet Après', is_active: 1 });

    expect(res.status).toBe(200);

    const [[row]] = await db.execute('SELECT name, address, phone FROM salons WHERE id = ?', [salonId]);
    expect(row.name).toBe('Salon Test PUT Complet Après');
    expect(row.address).toBeNull();
    expect(row.phone).toBeNull();
  });

  it('PUT sur un id inexistant retourne 404', async () => {
    const res = await request(app)
      .put('/api/salons/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Fantôme' });

    expect(res.status).toBe(404);
  });

  it('PUT avec token manager retourne 403', async () => {
    const created = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test PUT Manager' });
    createdSalonIds.push(created.body.id);

    const res = await request(app)
      .put(`/api/salons/${created.body.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Salon Modifié Par Manager' });

    expect(res.status).toBe(403);
  });

  // ── Coordonnées (latitude/longitude) — POST ─────────────────────
  it('POST avec latitude/longitude valides : relues correctement (DECIMAL en chaîne via mysql2)', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test Coords Valides', latitude: 45.5, longitude: 4.85 });

    expect(res.status).toBe(201);
    createdSalonIds.push(res.body.id);
    expect(Number(res.body.latitude)).toBe(45.5);
    expect(Number(res.body.longitude)).toBe(4.85);

    const [[row]] = await db.execute('SELECT latitude, longitude FROM salons WHERE id = ?', [res.body.id]);
    expect(Number(row.latitude)).toBe(45.5);
    expect(Number(row.longitude)).toBe(4.85);
  });

  it('POST avec latitude 0 et longitude 0 : relues à 0, pas null', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test Coords Zero', latitude: 0, longitude: 0 });

    expect(res.status).toBe(201);
    createdSalonIds.push(res.body.id);
    expect(res.body.latitude).not.toBeNull();
    expect(res.body.longitude).not.toBeNull();
    expect(Number(res.body.latitude)).toBe(0);
    expect(Number(res.body.longitude)).toBe(0);

    const [[row]] = await db.execute('SELECT latitude, longitude FROM salons WHERE id = ?', [res.body.id]);
    expect(row.latitude).not.toBeNull();
    expect(row.longitude).not.toBeNull();
    expect(Number(row.latitude)).toBe(0);
    expect(Number(row.longitude)).toBe(0);
  });

  it('POST avec latitude seule retourne 400', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test Lat Seule', latitude: 45.5 });

    expect(res.status).toBe(400);
  });

  it('POST avec longitude seule retourne 400', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test Lng Seule', longitude: 4.85 });

    expect(res.status).toBe(400);
  });

  it('POST avec latitude 91 retourne 400', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test Lat Hors Bornes', latitude: 91, longitude: 0 });

    expect(res.status).toBe(400);
  });

  it('POST avec longitude -181 retourne 400', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test Lng Hors Bornes', latitude: 0, longitude: -181 });

    expect(res.status).toBe(400);
  });

  it("POST avec latitude 'abc' retourne 400", async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test Lat Invalide', latitude: 'abc', longitude: 0 });

    expect(res.status).toBe(400);
  });

  it('POST sans latitude ni longitude : les deux à null', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test Sans Coords' });

    expect(res.status).toBe(201);
    createdSalonIds.push(res.body.id);
    expect(res.body.latitude).toBeNull();
    expect(res.body.longitude).toBeNull();

    const [[row]] = await db.execute('SELECT latitude, longitude FROM salons WHERE id = ?', [res.body.id]);
    expect(row.latitude).toBeNull();
    expect(row.longitude).toBeNull();
  });

  it('POST avec latitude:null et longitude:null : les deux à null (pas 0)', async () => {
    const res = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test Coords Null Explicite', latitude: null, longitude: null });

    expect(res.status).toBe(201);
    createdSalonIds.push(res.body.id);
    expect(res.body.latitude).toBeNull();
    expect(res.body.longitude).toBeNull();
  });

  // ── Coordonnées (latitude/longitude) — PUT ──────────────────────
  it('PUT avec coordonnées : mises à jour', async () => {
    const created = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test PUT Coords Avant' });
    const salonId = created.body.id;
    createdSalonIds.push(salonId);

    const res = await request(app)
      .put(`/api/salons/${salonId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test PUT Coords Après', latitude: 45.5, longitude: 4.85 });

    expect(res.status).toBe(200);

    const [[row]] = await db.execute('SELECT latitude, longitude FROM salons WHERE id = ?', [salonId]);
    expect(Number(row.latitude)).toBe(45.5);
    expect(Number(row.longitude)).toBe(4.85);
  });

  it('PUT sans coordonnées sur un salon qui en avait : remises à NULL', async () => {
    const created = await request(app)
      .post('/api/salons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test PUT Coords Retrait Avant', latitude: 45.5, longitude: 4.85 });
    const salonId = created.body.id;
    createdSalonIds.push(salonId);

    const res = await request(app)
      .put(`/api/salons/${salonId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Salon Test PUT Coords Retrait Après' });

    expect(res.status).toBe(200);

    const [[row]] = await db.execute('SELECT latitude, longitude FROM salons WHERE id = ?', [salonId]);
    expect(row.latitude).toBeNull();
    expect(row.longitude).toBeNull();
  });

});

describe('GET /api/salons/admin', () => {

  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/api/salons/admin');

    expect(res.status).toBe(401);
  });

  it('retourne 403 avec un token client', async () => {
    const res = await request(app)
      .get('/api/salons/admin')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(403);
  });

  it('retourne 200 avec token admin et inclut le salon inactif', async () => {
    const res = await request(app)
      .get('/api/salons/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some(s => s.id === inactiveSalonId)).toBe(true);
  });

  it('chaque salon expose latitude, longitude, archived_at et can_delete (booléen)', async () => {
    const res = await request(app)
      .get('/api/salons/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((salon) => {
      expect(salon).toHaveProperty('latitude');
      expect(salon).toHaveProperty('longitude');
      expect(salon).toHaveProperty('archived_at');
      expect(typeof salon.can_delete).toBe('boolean');
    });
  });

  it('can_delete vaut true pour un salon sans dépendance, false pour le salon 1', async () => {
    const res = await request(app)
      .get('/api/salons/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    // inactiveSalonId : aucune fixture de ce fichier ne lui attache de
    // stylist/service/user/action_token/appointment → sans dépendance.
    const withoutDependency = res.body.find(s => s.id === inactiveSalonId);
    // salon 1 : le stylist 1 seedé par schema_test.sql (jamais truncaté) lui
    // reste toujours rattaché → dépendance garantie.
    const salon1 = res.body.find(s => s.id === 1);

    expect(withoutDependency.can_delete).toBe(true);
    expect(salon1.can_delete).toBe(false);
  });

});
