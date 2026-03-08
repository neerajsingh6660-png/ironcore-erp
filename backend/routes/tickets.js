// routes/tickets.js
const express = require('express');
const router  = express.Router();
const db      = require('../database/connection');

// ── GET ALL TICKETS ─────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { status, gym_id } = req.query;
    let query = `SELECT t.*, g.name as gym_name, g.owner as gym_owner, g.email as gym_email, g.plan as gym_plan
                 FROM tickets t LEFT JOIN gyms g ON t.gym_id = g.id WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND t.status = ?'; params.push(status); }
    if (gym_id) { query += ' AND t.gym_id = ?'; params.push(gym_id); }
    query += ' ORDER BY t.created_at DESC';
    res.json({ success: true, data: db.prepare(query).all(...params) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET SINGLE TICKET ───────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const ticket = db.prepare(`SELECT t.*, g.name as gym_name, g.owner as gym_owner, g.email as gym_email, g.plan as gym_plan, g.city as gym_city
                               FROM tickets t LEFT JOIN gyms g ON t.gym_id = g.id WHERE t.id = ?`).get(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    // Get gym modules for context
    if (ticket.gym_id) {
      const mods = db.prepare('SELECT module_key FROM gym_modules WHERE gym_id = ? AND enabled = 1').all(ticket.gym_id);
      ticket.gym_modules = mods.map(m => m.module_key);
    }

    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── CREATE TICKET ───────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { subject, description, gym_id, priority } = req.body;
    if (!subject) return res.status(400).json({ success: false, error: 'Subject is required' });

    const id = 'TK' + String(Date.now()).slice(-4);
    db.prepare(`INSERT INTO tickets (id, subject, description, gym_id, priority, status, opened_date) VALUES (?,?,?,?,?,?,?)`)
      .run(id, subject, description||'', gym_id||null, priority||'medium', 'open', new Date().toISOString().slice(0,10));

    db.prepare('INSERT INTO activity_log (icon, message, gym_id) VALUES (?,?,?)').run('🎫', `New ticket: ${subject}`, gym_id||null);

    res.json({ success: true, data: { id }, message: 'Ticket created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── UPDATE TICKET ───────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    const { status, assignee, last_reply } = req.body;
    db.prepare(`UPDATE tickets SET status=COALESCE(?,status), assignee=COALESCE(?,assignee), last_reply=COALESCE(?,last_reply), updated_at=datetime('now') WHERE id=?`)
      .run(status||null, assignee||null, last_reply||null, req.params.id);
    res.json({ success: true, message: 'Ticket updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── TICKET STATS ────────────────────────────────────
router.get('/stats/summary', (req, res) => {
  try {
    const open       = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status='open'").get().c;
    const inProgress = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status='in-progress'").get().c;
    const resolved   = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status='resolved'").get().c;
    res.json({ success: true, data: { open, inProgress, resolved, total: open + inProgress + resolved } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
