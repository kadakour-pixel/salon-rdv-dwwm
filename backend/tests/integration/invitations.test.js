const request = require('supertest');

// Aucun mail réel ne doit partir pendant npm test — on mocke tout le module mailer
jest.mock('../../src/utils/mailer', () => ({
  sendInvitationEmail: jest.fn().mockResolvedValue(undefined),
}));

const app     = require('../../server');
const db      = require('../../src/config/db');
const jwt     = require('jsonwebtoken');
const mailer  = require('../../src/utils/mailer');

// L'authenticate ne vérifie que la signature du JWT (pas d'existence en BDD) —
// cette route n'utilise pas resolveSalonScope, donc des tokens signés à la
// main suffisent pour admin/manager/client (modèle services.test.js).
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

// Fixtures persistantes (jamais de TRUNCATE sur salons/users : partagées avec
// les autres suites). Nettoyage ciblé par ids mémorisés en afterAll.
let activeSalonId, inactiveSalonId;
const createdUserIds = [];

beforeAll(async () => {
  const [activeSalon] = await db.execute(
    'INSERT INTO salons (name, address, phone) VALUES (?, ?, ?)',
    ['Salon Test Invitations', '11 rue du Test', '0600000011']
  );
  activeSalonId = activeSalon.insertId;

  const [inactiveSalon] = await db.execute(
    'INSERT INTO salons (name, address, phone, is_active) VALUES (?, ?, ?, 0)',
    ['Salon Test Invitations Inactif', '12 rue du Test', '0600000012']
  );
  inactiveSalonId = inactiveSalon.insertId;
});

afterAll(async () => {
  // CASCADE purge déjà action_tokens à la suppression des users, mais un
  // DELETE explicite avant reste accepté (idempotent, ordre FK respecté).
  if (createdUserIds.length > 0) {
    const placeholders = createdUserIds.map(() => '?').join(',');
    await db.execute(`DELETE FROM action_tokens WHERE user_id IN (${placeholders})`, createdUserIds);
    await db.execute(`DELETE FROM users WHERE id IN (${placeholders})`, createdUserIds);
  }
  await db.execute('DELETE FROM salons WHERE id IN (?, ?)', [activeSalonId, inactiveSalonId]);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/invite-manager', () => {

  // ── Création nominale ────────────────────────────────────────
  it('crée un compte manager et une invitation, retourne 201', async () => {
    const res = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'invite-jest@salon.fr',
        first_name: 'Invite',
        last_name: 'Jest',
        salon_id: activeSalonId,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'invite-jest@salon.fr', salon_id: activeSalonId });
    expect(res.body).toHaveProperty('id');
    createdUserIds.push(res.body.id);

    const [[user]] = await db.execute(
      'SELECT role, salon_id, email_verified FROM users WHERE id = ?',
      [res.body.id]
    );
    expect(user).toMatchObject({ role: 'manager', salon_id: activeSalonId, email_verified: 1 });

    const [tokens] = await db.execute(
      `SELECT token_hash, used_at, expires_at FROM action_tokens WHERE user_id = ? AND type = 'invite_manager'`,
      [res.body.id]
    );
    expect(tokens).toHaveLength(1);
    expect(tokens[0].used_at).toBeNull();
    expect(tokens[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokens[0].expires_at.getTime()).toBeGreaterThan(Date.now());

    expect(mailer.sendInvitationEmail).toHaveBeenCalledTimes(1);
    const [to, token] = mailer.sendInvitationEmail.mock.calls[0];
    expect(to).toBe('invite-jest@salon.fr');
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  // ── Validation ───────────────────────────────────────────────
  it('retourne 400 si salon_id est manquant', async () => {
    const res = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'incomplet-jest@salon.fr', first_name: 'X', last_name: 'Y' });

    expect(res.status).toBe(400);
  });

  it('retourne 400 si le format email est invalide', async () => {
    const res = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'pas-un-email', first_name: 'X', last_name: 'Y', salon_id: activeSalonId });

    expect(res.status).toBe(400);
  });

  // ── Salon ────────────────────────────────────────────────────
  it('retourne 404 si le salon est inexistant', async () => {
    const res = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'salon-inexistant-jest@salon.fr', first_name: 'X', last_name: 'Y', salon_id: 999999 });

    expect(res.status).toBe(404);
  });

  it('retourne 404 si le salon est inactif', async () => {
    const res = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'salon-inactif-jest@salon.fr', first_name: 'X', last_name: 'Y', salon_id: inactiveSalonId });

    expect(res.status).toBe(404);
  });

  // ── Conflit avec un compte existant non manager ────────────────
  it('retourne 409 si l\'email est déjà utilisé par un compte client', async () => {
    const [result] = await db.execute(
      "INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified) VALUES (?, ?, ?, ?, 'client', 1)",
      ['client-existant-jest@salon.fr', 'x', 'Client', 'Existant']
    );
    createdUserIds.push(result.insertId);

    const res = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'client-existant-jest@salon.fr', first_name: 'X', last_name: 'Y', salon_id: activeSalonId });

    expect(res.status).toBe(409);
  });

  // ── Auth ─────────────────────────────────────────────────────
  it('retourne 401 sans token', async () => {
    const res = await request(app)
      .post('/api/auth/invite-manager')
      .send({ email: 'sans-token-jest@salon.fr', first_name: 'X', last_name: 'Y', salon_id: activeSalonId });

    expect(res.status).toBe(401);
  });

  it('retourne 403 avec un token client', async () => {
    const res = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ email: 'token-client-jest@salon.fr', first_name: 'X', last_name: 'Y', salon_id: activeSalonId });

    expect(res.status).toBe(403);
  });

  it('retourne 403 avec un token manager', async () => {
    const res = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ email: 'token-manager-jest@salon.fr', first_name: 'X', last_name: 'Y', salon_id: activeSalonId });

    expect(res.status).toBe(403);
  });

});

describe('Ré-invitation d\'un manager déjà invité', () => {

  it('un 2e appel immédiat retourne 429 (cooldown)', async () => {
    const email = 'reinvite-jest@salon.fr';
    const first = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, first_name: 'Reinvite', last_name: 'Jest', salon_id: activeSalonId });

    expect(first.status).toBe(201);
    createdUserIds.push(first.body.id);

    const second = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, first_name: 'Reinvite', last_name: 'Jest', salon_id: activeSalonId });

    expect(second.status).toBe(429);
  });

  it('après le cooldown, ré-invite : ancien token supprimé, un seul token actif', async () => {
    const email = 'reinvite-cooldown-jest@salon.fr';
    const first = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, first_name: 'Reinvite', last_name: 'Cooldown', salon_id: activeSalonId });

    expect(first.status).toBe(201);
    const userId = first.body.id;
    createdUserIds.push(userId);

    // Antidate le token pour simuler l'écoulement du cooldown de 5 min
    await db.execute(
      `UPDATE action_tokens SET created_at = DATE_SUB(NOW(), INTERVAL 10 MINUTE) WHERE user_id = ? AND type = 'invite_manager'`,
      [userId]
    );

    const second = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, first_name: 'Reinvite', last_name: 'Cooldown', salon_id: activeSalonId });

    expect(second.status).toBe(201);

    const [tokens] = await db.execute(
      `SELECT id FROM action_tokens WHERE user_id = ? AND type = 'invite_manager' AND used_at IS NULL`,
      [userId]
    );
    expect(tokens).toHaveLength(1);
  });

  it('retourne 409 si l\'invitation a déjà été consommée', async () => {
    const email = 'invitation-consommee-jest@salon.fr';
    const first = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, first_name: 'Consommee', last_name: 'Jest', salon_id: activeSalonId });

    expect(first.status).toBe(201);
    const userId = first.body.id;
    createdUserIds.push(userId);

    await db.execute(
      `UPDATE action_tokens SET used_at = NOW() WHERE user_id = ? AND type = 'invite_manager'`,
      [userId]
    );

    const second = await request(app)
      .post('/api/auth/invite-manager')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, first_name: 'Consommee', last_name: 'Jest', salon_id: activeSalonId });

    expect(second.status).toBe(409);
  });

});
