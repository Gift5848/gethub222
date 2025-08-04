const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
  auth: {
    user: process.env.NOTIFY_EMAIL_USER,
    pass: process.env.NOTIFY_EMAIL_PASS
  }
});

async function sendOrderNotification({ to, subject, text }) {
  await transporter.sendMail({
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject,
    text
  });
}

module.exports = { sendOrderNotification };
