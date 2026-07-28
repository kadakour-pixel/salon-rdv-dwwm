// src/utils/mailer.js — Envoi d'e-mails via SMTP (compatible alwaysdata)
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Échappe les caractères spéciaux HTML pour éviter l'injection de balises
// dans les templates de mail (pendant côté mail du fix XSS DOM en 2e6eff5).
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Envoie le mail de confirmation d'adresse à l'inscription (ou lors d'un renvoi)
async function sendVerificationEmail(to, token) {
  const link = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
  const safeLink = escapeHtml(link);
  await transporter.sendMail({
    from:    process.env.SMTP_USER,
    to,
    subject: 'Confirmez votre adresse email — Salon Élégance',
    html: `
      <p>Bonjour,</p>
      <p>Merci de votre inscription. Confirmez votre adresse email en cliquant sur le lien ci-dessous :</p>
      <p><a href="${safeLink}">${safeLink}</a></p>
      <p>Ce lien expire dans 24 heures.</p>
    `,
  });
}

// Envoie le mail de rappel 24h avant un RDV confirmé
async function sendReminderEmail(to, { firstName, serviceName, startAtFr }) {
  await transporter.sendMail({
    from:    process.env.SMTP_USER,
    to,
    subject: 'Rappel de votre rendez-vous — Salon Élégance',
    html: `
      <p>Bonjour ${escapeHtml(firstName)},</p>
      <p>Nous vous rappelons votre rendez-vous pour <strong>${escapeHtml(serviceName)}</strong> le <strong>${escapeHtml(startAtFr)}</strong>.</p>
      <p>À bientôt !</p>
    `,
  });
}

module.exports = { sendVerificationEmail, sendReminderEmail };
