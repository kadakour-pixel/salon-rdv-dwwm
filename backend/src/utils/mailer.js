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

// Envoie le mail de confirmation d'adresse à l'inscription (ou lors d'un renvoi)
async function sendVerificationEmail(to, token) {
  const link = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
  await transporter.sendMail({
    from:    process.env.SMTP_USER,
    to,
    subject: 'Confirmez votre adresse email — Salon Élégance',
    html: `
      <p>Bonjour,</p>
      <p>Merci de votre inscription. Confirmez votre adresse email en cliquant sur le lien ci-dessous :</p>
      <p><a href="${link}">${link}</a></p>
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
      <p>Bonjour ${firstName},</p>
      <p>Nous vous rappelons votre rendez-vous pour <strong>${serviceName}</strong> le <strong>${startAtFr}</strong>.</p>
      <p>À bientôt !</p>
    `,
  });
}

module.exports = { sendVerificationEmail, sendReminderEmail };
