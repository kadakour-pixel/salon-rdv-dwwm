// backend/scripts/send-reminders.js
// Script autonome : envoie un e-mail de rappel pour chaque RDV confirmé
// dans les 24 prochaines heures et n'ayant pas encore reçu de rappel.
//
// Cron alwaysdata (Avancé → Tâches planifiées, toutes les heures) :
//   node /home/kadakour/backend/scripts/send-reminders.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool   = require('../src/config/db');
const mailer = require('../src/utils/mailer');

// Toutes les comparaisons de dates se font côté SQL (NOW(), DATE_ADD) : on ne
// construit jamais de Date() en JS, pour éviter les décalages de fuseau horaire
// entre le serveur Node et MariaDB.
const SELECT_DUE_REMINDERS = `
  SELECT a.id, u.email, u.first_name, s.name AS service_name,
         DATE_FORMAT(a.start_at, '%d/%m/%Y à %Hh%i') AS start_at_fr
  FROM appointments a
  JOIN users    u ON u.id = a.user_id
  JOIN services s ON s.id = a.service_id
  WHERE a.status = 'confirmed'
    AND a.reminder_sent = 0
    AND a.start_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
`;

// Logique métier, réutilisable par les tests (pas de pool.end() ici).
async function sendDueReminders() {
  let sent = 0;
  let failed = 0;

  const [rows] = await pool.execute(SELECT_DUE_REMINDERS);

  for (const appt of rows) {
    try {
      await mailer.sendReminderEmail(appt.email, {
        firstName:   appt.first_name,
        serviceName: appt.service_name,
        startAtFr:   appt.start_at_fr,
      });
      await pool.execute(
        'UPDATE appointments SET reminder_sent = 1 WHERE id = ?',
        [appt.id]
      );
      sent++;
    } catch (err) {
      // Envoi échoué : on ne flag pas reminder_sent, il sera retenté au prochain passage.
      console.error(`Échec de l'envoi du rappel pour le RDV #${appt.id} :`, err.message);
      failed++;
    }
  }

  console.log(`Rappels envoyés : ${sent} / échoués : ${failed}`);
  return { sent, failed };
}

// Point d'entrée CLI : ferme le pool proprement, y compris en cas d'erreur.
async function run() {
  try {
    return await sendDueReminders();
  } finally {
    await pool.end();
  }
}

// N'exécute le script que lorsqu'il est lancé directement (node send-reminders.js),
// pas lorsqu'il est importé par les tests.
if (require.main === module) {
  run().catch((err) => {
    console.error('Erreur du script de rappels :', err);
    process.exitCode = 1;
  });
}

module.exports = { sendDueReminders };
