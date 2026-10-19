const nodemailer = require('nodemailer');
const { numbersFor } = require('../controllers/paymentsController');

// Emails to customers. Set these in server/.env (see .env.example):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
// If they are missing the server still works: the email is skipped and a note is printed.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// the customer's email, or null when they signed up with a phone number only
const emailOf = (user) => {
  if (!user) return null;
  if (user.email && EMAIL_RE.test(user.email)) return user.email;
  if (user.identifier && EMAIL_RE.test(user.identifier)) return user.identifier;
  return null;
};

let transporter;
const getTransporter = () => {
  if (transporter !== undefined) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return null;
  }
  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  return transporter;
};

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const manila = (value, options) => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', ...options }).format(new Date(value));
const day = (d, withYear) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) }).format(new Date(`${d}T00:00:00Z`));
const time = (d) => manila(d, { hour: 'numeric', minute: '2-digit', hour12: true });
const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH')}`;

const stayText = (r) =>
  r.nights > 0
    ? `${day(r.startDate)} - ${day(r.endDate, true)} (${r.nights} ${r.nights === 1 ? 'night' : 'nights'})`
    : `${day(r.startDate, true)}, ${time(r.checkInAt)}${r.checkOutAt ? ` - ${time(r.checkOutAt)}` : ''} (${r.hours} hrs)`;

const STATUS_TEXT = { pending: 'Pending (waiting for the shop to confirm)', confirmed: 'Confirmed', checked_in: 'Checked in', completed: 'Completed', cancelled: 'Cancelled' };

const TEMPLATES = {
  booked: (name) => ({
    subject: 'My Pet Space: we got your hotel booking',
    heading: 'Your hotel booking has been made',
    intro: `Hi ${name}, thank you for booking with My Pet Space. Here are the details of the stay.`,
  }),
  completed: (name) => ({
    subject: 'My Pet Space: your pet\'s stay is complete',
    heading: 'Your pet\'s stay is complete',
    intro: `Hi ${name}, the stay below is now complete. Thank you for trusting us with your pet. We hope to see you again soon!`,
  }),
};

// kind: 'booked' | 'completed'.  Never throws: a failed email must not break a booking.
const sendHotelEmail = async (kind, reservation, customer) => {
  try {
    const to = emailOf(customer);
    if (!to) return; // phone-only account: nothing to send to
    const mail = getTransporter();
    if (!mail) {
      console.log(`Email to ${to} skipped: SMTP_HOST, SMTP_USER and SMTP_PASS are not set in server/.env`);
      return;
    }
    const r = reservation;
    const t = TEMPLATES[kind](esc(customer.firstName || r.customerName));
    const { bookingNo } = numbersFor(r._id);
    const rows = [
      ['Booking No.', bookingNo],
      ['Pet', `${r.petName}${r.petBreed ? ` (${r.petBreed})` : ''}`],
      ['Room', `${r.roomName} (Slot ${r.slot})`],
      ['Stay', stayText(r)],
      ['Total', r.total > 0 ? peso(r.total) : 'To be set by the shop'],
      ['Status', STATUS_TEXT[r.status] || r.status],
    ];
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#222">
  <h2 style="color:#7b1e3a">${t.heading}</h2><p>${t.intro}</p>
  <table style="width:100%;border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:6px 8px;font-weight:bold;border-bottom:1px solid #eee">${esc(k)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(v)}</td></tr>`).join('')}</table>
  <p style="color:#777;font-size:12px">My Pet Space. This is an automatic message.</p></div>`;
    const text = `${t.heading}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}`;
    await mail.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject: t.subject, text, html });
  } catch (err) {
    console.error('Email failed:', err.message);
  }
};

module.exports = { emailOf, sendHotelEmail };