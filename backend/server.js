require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const SMS_GATEWAY_URL = process.env.SMS_GATEWAY_URL;
const SMS_GATEWAY_API_KEY = process.env.SMS_GATEWAY_API_KEY;

const volunteers = [];
const donations = [];
const events = [
  { id: 1, title: 'Campaign Launch Rally', date: '2026-09-15', location: 'Siorngiroi Grounds' },
  { id: 2, title: 'Women's Forum', date: '2026-09-22', location: 'Chepalungu Hall' },
  { id: 3, title: 'Youth Town Hall', date: '2026-10-01', location: 'Siorngiroi Market' }
];

// Fundraising goal (KSH)
const FUNDRAISING_GOAL = 500000;
let totalRaised = 0;

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text })
    });
  } catch (e) {
    console.error('Telegram send error:', e);
  }
}

async function sendSms(to, text) {
  if (!SMS_GATEWAY_URL || !SMS_GATEWAY_API_KEY) {
    console.log(`[SIMULATED SMS] to ${to}: ${text}`);
    return;
  }
  try {
    await axios.post(`${SMS_GATEWAY_URL}/sms`, { to, text }, {
      headers: { 'Content-Type': 'application/json', 'x-api-key': SMS_GATEWAY_API_KEY }
    });
    console.log(`✅ SMS sent to ${to}`);
  } catch (e) {
    console.error('❌ SMS send failed:', e.message);
  }
}

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, message: 'Internal server error' });
});

// Routes

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Volunteer signup
app.post('/api/volunteers', async (req, res) => {
  try {
    const { name, phone, location } = req.body;
    if (!name || !phone || !location) {
      return res.status(400).json({ ok: false, message: 'Missing required fields' });
    }
    const volunteer = { id: Date.now(), name, phone, location, createdAt: new Date().toISOString() };
    volunteers.push(volunteer);

    // Notify admin via Telegram
    await sendTelegramMessage(`🟠 New Volunteer!\nName: ${name}\nPhone: ${phone}\nLocation: ${location}`);

    // Send SMS confirmation to volunteer (if gateway configured)
    await sendSms(`+254${phone}`, `Thank you ${name} for volunteering for Cornelius Rotich's campaign! We'll keep you updated.`);

    res.json({ ok: true, volunteer });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Donation
app.post('/api/donations', async (req, res) => {
  try {
    const { name, amount, phone } = req.body;
    const amt = parseFloat(amount);
    if (!name || !amt || amt <= 0) {
      return res.status(400).json({ ok: false, message: 'Invalid donation' });
    }
    const donation = { id: Date.now(), name, amount: amt, phone: phone || '', createdAt: new Date().toISOString() };
    donations.push(donation);
    totalRaised += amt;

    // Notify admin
    await sendTelegramMessage(`💰 Donation Received!\nName: ${name}\nAmount: KSH ${amt.toLocaleString()}`);

    res.json({ ok: true, totalRaised, goal: FUNDRAISING_GOAL });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get fundraising progress
app.get('/api/fundraising', (req, res) => {
  res.json({
    ok: true,
    totalRaised,
    goal: FUNDRAISING_GOAL,
    percentage: Math.min(100, Math.round((totalRaised / FUNDRAISING_GOAL) * 100))
  });
});

// Get events
app.get('/api/events', (req, res) => {
  res.json({ ok: true, events });
});

// RSVP to event
app.post('/api/rsvp', async (req, res) => {
  try {
    const { eventId, name, phone } = req.body;
    const event = events.find(e => e.id === parseInt(eventId));
    if (!event) return res.status(404).json({ ok: false, message: 'Event not found' });
    // Store RSVP (in memory)
    // In real app, store in DB and send SMS
    await sendSms(`+254${phone}`, `You're registered for ${event.title} on ${event.date}!`);
    await sendTelegramMessage(`📅 RSVP: ${name} for ${event.title} on ${event.date}`);
    res.json({ ok: true, message: 'RSVP confirmed' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Campaign server running on port ${PORT}`);
});
