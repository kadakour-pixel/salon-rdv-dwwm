const request = require('supertest');

// Aucun mail réel ne doit partir pendant npm test — on mocke tout le module mailer
jest.mock('../../src/utils/mailer', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const app     = require('../../server');
const db      = require('../../src/config/db');
const bcrypt  = require('bcrypt');
const mailer  = require('../../src/utils/mailer');

// Compte déjà existant en BDD avant chaque test — utilisé pour les scénarios de login
// et pour tester le conflit d'email à l'inscription. email_verified = 1 car ces tests
// portent sur le login/register, pas sur le flux de vérification lui-même.
const TEST_USER = {
  email:      'test-jest@salon.fr',
  password:   'password123',
  first_name: 'Test',
  last_name:  'Jest',
};

// Repart d'une table users vide + un seul utilisateur connu avant chaque test
beforeEach(async () => {
  jest.clearAllMocks();

  await db.execute('SET FOREIGN_KEY_CHECKS = 0');
  await db.execute('TRUNCATE TABLE users');
  await db.execute('SET FOREIGN_KEY_CHECKS = 1');

  const hash = await bcrypt.hash(TEST_USER.password, 10);
  await db.execute(
    'INSERT INTO users (email, password_hash, first_name, last_name, email_verified) VALUES (?, ?, ?, ?, 1)',
    [TEST_USER.email, hash, TEST_USER.first_name, TEST_USER.last_name]
  );
});

describe('POST /api/auth/register', () => {

  // ── Cas 1 : inscription réussie ─────────────────────────────────
  // Changement de contrat (Étape 3) : plus de JWT à l'inscription — le compte
  // doit d'abord être vérifié par email avant de pouvoir se connecter.
  it('retourne 201 + un message (pas de token) pour un nouvel email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email:      'nouveau-jest@salon.fr',
        password:   'password123',
        first_name: 'Nouveau',
        last_name:  'Client',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body).not.toHaveProperty('token');
  });

  // ── Cas : envoi du mail de vérification ─────────────────────────
  it('envoie un mail de vérification avec un token à l\'inscription', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email:      'verif-jest@salon.fr',
        password:   'password123',
        first_name: 'Verif',
        last_name:  'Jest',
      });

    expect(mailer.sendVerificationEmail).toHaveBeenCalledTimes(1);
    const [to, token] = mailer.sendVerificationEmail.mock.calls[0];
    expect(to).toBe('verif-jest@salon.fr');
    expect(token).toMatch(/^[0-9a-f]{64}$/); // crypto.randomBytes(32).toString('hex')
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

  // ── Cas 4 : email non vérifié ──────────────────────────────────
  it('retourne 403 si l\'email n\'est pas encore vérifié', async () => {
    await db.execute(
      'UPDATE users SET email_verified = 0 WHERE email = ?',
      [TEST_USER.email]
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(res.status).toBe(403);
  });

});

describe('GET /api/auth/verify', () => {

  // ── Cas 1 : token valide ────────────────────────────────────────
  it('valide l\'email et redirige vers la page de login si le token est valide', async () => {
    const token = 'a'.repeat(64);
    await db.execute(
      'UPDATE users SET email_verified = 0, verification_token = ?, token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE email = ?',
      [token, TEST_USER.email]
    );

    const res = await request(app).get(`/api/auth/verify?token=${token}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/pages/login.html');

    const [[user]] = await db.execute(
      'SELECT email_verified, verification_token FROM users WHERE email = ?',
      [TEST_USER.email]
    );
    expect(user.email_verified).toBe(1);
    expect(user.verification_token).toBeNull();
  });

  // ── Cas 2 : token inconnu ────────────────────────────────────────
  it('retourne 400 si le token est inconnu', async () => {
    const res = await request(app).get(`/api/auth/verify?token=${'b'.repeat(64)}`);
    expect(res.status).toBe(400);
  });

  // ── Cas 3 : token expiré ─────────────────────────────────────────
  it('retourne 400 si le token est expiré', async () => {
    const token = 'c'.repeat(64);
    await db.execute(
      'UPDATE users SET email_verified = 0, verification_token = ?, token_expires = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE email = ?',
      [token, TEST_USER.email]
    );

    const res = await request(app).get(`/api/auth/verify?token=${token}`);
    expect(res.status).toBe(400);
  });

});

describe('POST /api/auth/resend-verification', () => {

  // ── Cas 1 : renvoi accepté ───────────────────────────────────────
  it('renvoie un mail si le compte existe, n\'est pas encore vérifié et le dernier envoi date de plus de 5 min', async () => {
    await db.execute(
      'UPDATE users SET email_verified = 0, verification_token = ?, token_expires = DATE_ADD(NOW(), INTERVAL 1 DAY), verification_sent_at = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE email = ?',
      ['d'.repeat(64), TEST_USER.email]
    );

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: TEST_USER.email });

    expect(res.status).toBe(200);
    expect(mailer.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  // ── Cas 1bis : jamais encore envoyé (verification_sent_at NULL) → accepté ─
  it('renvoie un mail si aucun envoi précédent n\'est enregistré (verification_sent_at NULL)', async () => {
    await db.execute(
      'UPDATE users SET email_verified = 0, verification_token = ?, token_expires = DATE_ADD(NOW(), INTERVAL 1 DAY), verification_sent_at = NULL WHERE email = ?',
      ['f'.repeat(64), TEST_USER.email]
    );

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: TEST_USER.email });

    expect(res.status).toBe(200);
    expect(mailer.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  // ── Cas 2 : limitation à un renvoi par 5 minutes ─────────────────
  it('retourne 429 si un renvoi a déjà eu lieu il y a moins de 5 minutes', async () => {
    await db.execute(
      'UPDATE users SET email_verified = 0, verification_token = ?, token_expires = DATE_ADD(NOW(), INTERVAL 1 DAY), verification_sent_at = NOW() WHERE email = ?',
      ['e'.repeat(64), TEST_USER.email]
    );

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: TEST_USER.email });

    expect(res.status).toBe(429);
    expect(mailer.sendVerificationEmail).not.toHaveBeenCalled();
  });

  // ── Cas 2bis : le mail envoyé à l'inscription compte comme le premier envoi ─
  it('retourne 429 si on redemande un renvoi juste après l\'inscription', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email:      'juste-inscrit@salon.fr',
        password:   'password123',
        first_name: 'Juste',
        last_name:  'Inscrit',
      });
    mailer.sendVerificationEmail.mockClear();

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'juste-inscrit@salon.fr' });

    expect(res.status).toBe(429);
    expect(mailer.sendVerificationEmail).not.toHaveBeenCalled();
  });

  // ── Cas 3 : email inconnu → réponse générique 200 ────────────────
  it('retourne 200 (message générique) même si l\'email est inconnu', async () => {
    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'inconnu@test.fr' });

    expect(res.status).toBe(200);
    expect(mailer.sendVerificationEmail).not.toHaveBeenCalled();
  });

  // ── Cas 4 : email déjà vérifié → réponse générique 200 ───────────
  it('retourne 200 (message générique) si l\'email est déjà vérifié', async () => {
    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: TEST_USER.email }); // email_verified = 1 par défaut (beforeEach)

    expect(res.status).toBe(200);
    expect(mailer.sendVerificationEmail).not.toHaveBeenCalled();
  });

});
