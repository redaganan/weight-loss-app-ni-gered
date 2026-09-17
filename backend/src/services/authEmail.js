const crypto = require('crypto');
const nodemailer = require('nodemailer');

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD.');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE || '').toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD.replace(/\s+/g, '') },
  });
}

function createOtp() {
  return String(crypto.randomInt(1000, 10000));
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

async function sendOtpEmail(email, code, purpose) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: purpose === 'register' ? 'Verify your Weightloss account' : 'Your Weightloss sign-in code',
    text: `Your 4-digit verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
  });
}

module.exports = { createOtp, hashOtp, sendOtpEmail };
