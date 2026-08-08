// tests/integration/rate-limit.test.js
const request = require('supertest');
const app = require('../../server');

// Ce test doit contourner le skip: isTestEnv du middleware, qui repose sur
// JEST_WORKER_ID. On le retire temporairement pour la durée de ce fichier
// uniquement, et on le restaure ensuite pour ne pas casser le skip des
// autres suites de tests (exécutées dans le même process via --runInBand).
const originalWorkerId = process.env.JEST_WORKER_ID;

beforeAll(() => {
  delete process.env.JEST_WORKER_ID;
});

afterAll(() => {
  process.env.JEST_WORKER_ID = originalWorkerId;
});

describe('Rate limiting sur POST /api/auth/login', () => {

  // ── Cas unique : blocage après 10 tentatives dans la fenêtre ────
  it('bloque avec 429 à partir de la 11e tentative', async () => {
    const attempt = () =>
      request(app)
        .post('/api/auth/login')
        .send({ email: 'inconnu@test.fr', password: 'mauvaismdp' });

    // Les 10 premières passent le rate-limiter (401 attendu : identifiants inconnus,
    // pas de lien avec le rate-limiting lui-même)
    for (let i = 0; i < 10; i++) {
      const res = await attempt();
      expect(res.status).toBe(401);
    }

    // La 11e est bloquée par authLimiter
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('Trop de tentatives, réessayez dans quelques minutes');
  });

});