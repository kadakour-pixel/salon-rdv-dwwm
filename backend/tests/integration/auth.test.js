const request = require('supertest');
const app     = require('../../server');
const db      = require('../../src/config/db');
const bcrypt  = require('bcrypt');

// Données du compte test — créé avant les tests, supprimé après
const TEST_USER = {
  email:      'test-jest@salon.fr',
  password:   'password123',
  first_name: 'Test',
  last_name:  'Jest',
};

describe('POST /api/auth/login', () => {

  // Avant tous les tests de ce fichier : insérer un utilisateur en BDD de test
  beforeAll(async () => {
    const hash = await bcrypt.hash(TEST_USER.password, 10);
    await db.execute(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
      [TEST_USER.email, hash, TEST_USER.first_name, TEST_USER.last_name]
    );
  });

  // Après tous les tests : supprimer l'utilisateur de test (nettoyage)
  afterAll(async () => {
    await db.execute('DELETE FROM users WHERE email = ?', [TEST_USER.email]);
  });

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
