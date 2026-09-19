const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
    console.error('Email sending error:', err);
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
