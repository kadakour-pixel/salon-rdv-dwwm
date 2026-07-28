// Aucun mail réel ne doit partir pendant npm test — on mocke tout le module mailer
jest.mock('../src/utils/mailer', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendReminderEmail:     jest.fn().mockResolvedValue(undefined),
}));

const db     = require('../src/config/db');
const mailer = require('../src/utils/mailer');
const { sendDueReminders } = require('../scripts/send-reminders');

let userId, serviceId;

beforeEach(async () => {
  jest.clearAllMocks();

  await db.execute('SET FOREIGN_KEY_CHECKS = 0');
  await db.execute('TRUNCATE TABLE appointments');
  await db.execute('TRUNCATE TABLE availabilities');
  await db.execute('TRUNCATE TABLE services');
  await db.execute('TRUNCATE TABLE users');
  await db.execute('SET FOREIGN_KEY_CHECKS = 1');

  const [userResult] = await db.execute(
    'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
    ['reminders-jest@salon.fr', 'x', 'Camille', 'Test']
  );
  userId = userResult.insertId;

  const [svcResult] = await db.execute(
    'INSERT INTO services (name, duration_minutes, price) VALUES (?, ?, ?)',
    ['Coupe test', 30, 25.00]
  );
  serviceId = svcResult.insertId;
});

// Crée un RDV dont l'heure de début est calculée côté SQL (NOW() + décalage),
// jamais avec new Date() côté JS, pour rester cohérent avec le script testé.
async function createAppointment({ hoursFromNow, status = 'confirmed', reminderSent = 0 }) {
  const [result] = await db.execute(
    `INSERT INTO appointments (user_id, service_id, start_at, end_at, status, reminder_sent)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), DATE_ADD(NOW(), INTERVAL ? HOUR), ?, ?)`,
    [userId, serviceId, hoursFromNow, hoursFromNow, status, reminderSent]
  );
  return result.insertId;
}

async function getReminderSent(id) {
  const [[row]] = await db.execute('SELECT reminder_sent FROM appointments WHERE id = ?', [id]);
  return row.reminder_sent;
}

describe('sendDueReminders', () => {

  it('envoie le rappel et flag le RDV pour un RDV confirmé dans 12h', async () => {
    const id = await createAppointment({ hoursFromNow: 12 });

    const result = await sendDueReminders();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(mailer.sendReminderEmail).toHaveBeenCalledTimes(1);
    expect(mailer.sendReminderEmail).toHaveBeenCalledWith(
      'reminders-jest@salon.fr',
      expect.objectContaining({ firstName: 'Camille', serviceName: 'Coupe test' })
    );
    expect(await getReminderSent(id)).toBe(1);
  });

  it('ignore un RDV confirmé dans 48h (hors fenêtre des 24h)', async () => {
    const id = await createAppointment({ hoursFromNow: 48 });

    const result = await sendDueReminders();

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(mailer.sendReminderEmail).not.toHaveBeenCalled();
    expect(await getReminderSent(id)).toBe(0);
  });

  it('ignore un RDV déjà passé', async () => {
    const id = await createAppointment({ hoursFromNow: -2 });

    const result = await sendDueReminders();

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(mailer.sendReminderEmail).not.toHaveBeenCalled();
    expect(await getReminderSent(id)).toBe(0);
  });

  it('ignore un RDV annulé', async () => {
    const id = await createAppointment({ hoursFromNow: 12, status: 'cancelled' });

    const result = await sendDueReminders();

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(mailer.sendReminderEmail).not.toHaveBeenCalled();
    expect(await getReminderSent(id)).toBe(0);
  });

  it('ignore un RDV dont le rappel a déjà été envoyé', async () => {
    const id = await createAppointment({ hoursFromNow: 12, reminderSent: 1 });

    const result = await sendDueReminders();

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(mailer.sendReminderEmail).not.toHaveBeenCalled();
    expect(await getReminderSent(id)).toBe(1);
  });

  it("laisse reminder_sent à 0 et continue avec les suivants quand l'envoi échoue", async () => {
    const failingId = await createAppointment({ hoursFromNow: 12 });
    const okId       = await createAppointment({ hoursFromNow: 13 });

    mailer.sendReminderEmail
      .mockRejectedValueOnce(new Error('SMTP indisponible'))
      .mockResolvedValueOnce(undefined);

    const result = await sendDueReminders();

    expect(result).toEqual({ sent: 1, failed: 1 });
    expect(mailer.sendReminderEmail).toHaveBeenCalledTimes(2);
    expect(await getReminderSent(failingId)).toBe(0);
    expect(await getReminderSent(okId)).toBe(1);
  });

});
