require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const axios = require('axios');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // allow large image uploads (base64)
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const SMS_GATEWAY_URL = process.env.SMS_GATEWAY_URL;
const SMS_GATEWAY_API_KEY = process.env.SMS_GATEWAY_API_KEY;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // In production, hash this! We'll hash on start for demo.

// Temporary token store (in production, use JWT or sessions)
let adminToken = null;

// In-memory data
const volunteers = [];
const donations = [];
const events = [
  { id: 1, title: 'Campaign Launch Rally', date: '2026-09-15', location: 'Siorngiroi Grounds' },
  { id: 2, title: "Women's Forum", date: '2026-09-22', location: 'Chepalungu Hall' },
  { id: 3, title: 'Youth Town Hall', date: '2026-10-01', location: 'Siorngiroi Market' }
];
const news = [
  { id: 1, title: 'Campaign Launch', caption: 'We are ready to serve Siorngiroi!', imageUrl: 'https://via.placeholder.com/300' }
];
let nextEventId = 4;
let nextNewsId = 2;
let totalRaised = 0;
const FUNDRAISING_GOAL = 500000;

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text })
    });
  } catch (e) { console.error('Telegram error:', e); }
}

async function sendSms(to, text) {
  if (!SMS_GATEWAY_URL || !SMS_GATEWAY_API_KEY) return;
  try {
    await axios.post(`${SMS_GATEWAY_URL}/sms`, { to, text }, {
      headers: { 'Content-Type': 'application/json', 'x-api-key': SMS_GATEWAY_API_KEY }
    });
  } catch (e) { console.error('SMS error:', e); }
}

// Middleware to check admin token
function requireAdmin(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (token !== adminToken) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  next();
}

// Routes

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Public routes
app.get('/api/events', (req, res) => res.json({ ok: true, events }));
app.get('/api/news', (req, res) => res.json({ ok: true, news }));
app.get('/api/fundraising', (req, res) => {
  res.json({
    ok: true,
    totalRaised,
    goal: FUNDRAISING_GOAL,
    percentage: Math.min(100, Math.round((totalRaised / FUNDRAISING_GOAL) * 100))
  });
});

app.post('/api/volunteers', async (req, res) => {
  const { name, phone, location } = req.body;
  if (!name || !phone || !location) return res.status(400).json({ ok: false, message: 'Missing fields' });
  const volunteer = { id: Date.now(), name, phone, location, createdAt: new Date().toISOString() };
  volunteers.push(volunteer);
  await sendTelegramMessage(`🟠 New Volunteer: ${name}, ${phone}, ${location}`);
  await sendSms(`+254${phone}`, `Thank you ${name} for volunteering!`);
  res.json({ ok: true, volunteer });
});

app.post('/api/donations', async (req, res) => {
  const { name, amount, phone } = req.body;
  const amt = parseFloat(amount);
  if (!name || !amt || amt <= 0) return res.status(400).json({ ok: false, message: 'Invalid donation' });
  const donation = { id: Date.now(), name, amount: amt, phone: phone || '' };
  donations.push(donation);
  totalRaised += amt;
  await sendTelegramMessage(`💰 Donation: ${name} - KSH ${amt.toLocaleString()}`);
  res.json({ ok: true, totalRaised });
});

app.post('/api/rsvp', async (req, res) => {
  const { eventId, name, phone } = req.body;
  const event = events.find(e => e.id === parseInt(eventId));
  if (!event) return res.status(404).json({ ok: false, message: 'Event not found' });
  await sendSms(`+254${phone}`, `You're registered for ${event.title} on ${event.date}!`);
  await sendTelegramMessage(`📅 RSVP: ${name} for ${event.title}`);
  res.json({ ok: true });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Generate a simple token (in production use JWT)
    adminToken = 'admin-' + Date.now();
    res.json({ ok: true, token: adminToken });
  } else {
    res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }
});

// Admin: create event
app.post('/api/admin/events', requireAdmin, (req, res) => {
  const { title, date, location } = req.body;
  if (!title || !date || !location) return res.status(400).json({ ok: false, message: 'Missing fields' });
  const event = { id: nextEventId++, title, date, location };
  events.push(event);
  res.json({ ok: true, event });
});

// Admin: create news
app.post('/api/admin/news', requireAdmin, (req, res) => {
  const { title, caption, imageUrl } = req.body;
  if (!title || !caption) return res.status(400).json({ ok: false, message: 'Missing title/caption' });
  const newsItem = {
    id: nextNewsId++,
    title,
    caption,
    imageUrl: imageUrl || 'https://via.placeholder.com/300'
  };
  news.unshift(newsItem); // newest first
  res.json({ ok: true, newsItem });
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'admin.html'));
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Campaign server running on port ${PORT}`);
});
