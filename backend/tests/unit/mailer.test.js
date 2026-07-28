// Contrairement à reminders.test.js et auth.test.js qui mockent tout le module
// mailer (pour ne jamais envoyer de vrai mail), ce fichier mocke uniquement le
// transporteur nodemailer afin de tester le VRAI code de mailer.js, notamment
// l'échappement HTML — un test qui mocke sendReminderEmail/sendVerificationEmail
// ne peut pas vérifier ce que ces fonctions produisent en interne.
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue(undefined) })),
}));

const nodemailer = require('nodemailer');
const { sendVerificationEmail, sendReminderEmail } = require('../../src/utils/mailer');

// mailer.js appelle createTransport() une seule fois au chargement du module :
// le mock à utiliser dans les tests est donc celui retourné par le premier appel.
const sendMailMock = nodemailer.createTransport.mock.results[0].value.sendMail;

const PRENOM_PIEGE = '<b>Test</b><img src=x onerror=alert(1)>';
const PRENOM_ECHAPPE = '&lt;b&gt;Test&lt;/b&gt;&lt;img src=x onerror=alert(1)&gt;';

beforeEach(() => {
  sendMailMock.mockClear();
});

describe('mailer — échappement HTML', () => {

  it('échappe un prénom piégé dans le mail de rappel', async () => {
    await sendReminderEmail('victime@salon.fr', {
      firstName:   PRENOM_PIEGE,
      serviceName: 'Coupe femme',
      startAtFr:   '29/07/2026 à 10h00',
    });

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain(PRENOM_ECHAPPE);
    expect(html).not.toContain(PRENOM_PIEGE);
  });

  it('échappe un nom de service piégé dans le mail de rappel', async () => {
    await sendReminderEmail('victime@salon.fr', {
      firstName:   'Camille',
      serviceName: '<script>alert(1)</script>',
      startAtFr:   '29/07/2026 à 10h00',
    });

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it("n'altère pas le lien de vérification (token hexadécimal, rien à échapper)", async () => {
    await sendVerificationEmail('victime@salon.fr', 'abcdef0123456789');

    const { html } = sendMailMock.mock.calls[0][0];
    expect(html).toContain('http://localhost:3001/api/auth/verify?token=abcdef0123456789');
  });

});
