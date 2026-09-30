const nodemailer = require('nodemailer');
require('dotenv').config();

const EMAIL_PORT = Number(process.env.EMAIL_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Senza questi, una connessione che non si completa resta appesa senza mai
  // produrre un errore: gli invii falliscono in silenzio e i log restano muti.
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

// Verifica la configurazione all'avvio, cosi' un problema di credenziali o di
// rete si vede subito nei log invece di emergere solo quando qualcuno prenota.
const missing = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'].filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`📧 Email NON configurata — variabili mancanti: ${missing.join(', ')}`);
} else {
  transporter.verify()
    .then(() => console.log(`📧 Email pronta: ${process.env.EMAIL_HOST}:${EMAIL_PORT} come ${process.env.EMAIL_USER}`))
    .catch(err => console.error(`📧 Email NON funzionante (${process.env.EMAIL_HOST}:${EMAIL_PORT}): ${err.message}`));
}

const sendEmail = async (to, subject, text, html = null) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return info;
  } catch (err) {
    console.error(`Email sending error (to ${to}): ${err.message}`);
    // Don't throw, just log to avoid blocking the response
    return null;
  }
};

const sendReminderEmail = async (user_email, user_name, shift_location, shift_start) => {
  const subject = '📢 Reminder: Your shift is coming up!';
  const text = `Hi ${user_name},\n\nYou have a shift scheduled!\n\nLocation: ${shift_location}\nStart Time: ${new Date(shift_start).toLocaleString()}\n\nSee you soon!`;

  return sendEmail(user_email, subject, text);
};

module.exports = { sendEmail, sendReminderEmail };
