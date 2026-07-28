const request = require('supertest');
const app     = require('../../server');
const db      = require('../../src/config/db');
const bcrypt  = require('bcrypt');

// Compte déjà existant en BDD avant chaque test — utilisé pour les scénarios de login
// et pour tester le conflit d'email à l'inscription
const TEST_USER = {
  email:      'test-jest@salon.fr',
  password:   'password123',
  first_name: 'Test',
  last_name:  'Jest',
};

// Repart d'une table users vide + un seul utilisateur connu avant chaque test
beforeEach(async () => {
  await db.execute('SET FOREIGN_KEY_CHECKS = 0');
  await db.execute('TRUNCATE TABLE users');
  await db.execute('SET FOREIGN_KEY_CHECKS = 1');

  const hash = await bcrypt.hash(TEST_USER.password, 10);
  await db.execute(
    'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
    [TEST_USER.email, hash, TEST_USER.first_name, TEST_USER.last_name]
  );
});

describe('POST /api/auth/register', () => {

  // ── Cas 1 : inscription réussie ─────────────────────────────────
  it('retourne 201 + un token JWT pour un nouvel email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email:      'nouveau-jest@salon.fr',
        password:   'password123',
        first_name: 'Nouveau',
        last_name:  'Client',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
  });

  // ── Cas 2 : email déjà utilisé ───────────────────────────────────
  it('retourne 409 si l\'email est déjà utilisé', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email:      TEST_USER.email, // déjà inséré par le beforeEach
        password:   'password123',
        first_name: 'Autre',
        last_name:  'Personne',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email déjà utilisé');
  });

});

describe('POST /api/auth/login', () => {

  // ── Cas 1 : connexion réussie ──────────────────────────────────
  it('retourne 200 + un token JWT avec de bons identifiants', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');  // la réponse contient bien "token"
    expect(res.body).toHaveProperty('role', 'client');
  });

  // ── Cas 2 : mauvais mot de passe ──────────────────────────────
  it('retourne 401 avec un mauvais mot de passe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'mauvaismdp' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Identifiants incorrects');
  });

  // ── Cas 3 : email inexistant ──────────────────────────────────
  it('retourne 401 avec un email inconnu (même message que mauvais MDP)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@test.fr', password: 'password123' });

    expect(res.status).toBe(401);
    // Même message — ne révèle pas si c'est l'email ou le MDP qui est faux
    expect(res.body.error).toBe('Identifiants incorrects');
  });

});
