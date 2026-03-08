// routes/billing.js
const express = require('express');
const router  = express.Router();
const db      = require('../database/connection');

router.get('/invoices', (req, res) => {
  try {
    const invoices = db.prepare(`SELECT i.*, g.name as gym_name FROM invoices i LEFT JOIN gyms g ON i.gym_id = g.id ORDER BY i.created_at DESC`).all();
    res.json({ success: true, data: invoices });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/invoices', (req, res) => {
  try {
    const { gym_id, description, amount, due_date } = req.body;
    if (!gym_id || !amount) return res.status(400).json({ success: false, error: 'Gym and amount required' });
    const id = 'INV' + String(Date.now()).slice(-4);
    db.prepare('INSERT INTO invoices (id, gym_id, description, amount, due_date, status) VALUES (?,?,?,?,?,?)')
      .run(id, gym_id, description||'Subscription', amount, due_date||'', 'pending');
    db.prepare('INSERT INTO activity_log (icon, message, gym_id) VALUES (?,?,?)').run('🧾', `Invoice ${id} created`, gym_id);
    res.json({ success: true, data: { id }, message: 'Invoice created' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/invoices/:id/pay', (req, res) => {
  try {
    db.prepare("UPDATE invoices SET status='paid' WHERE id=?").run(req.params.id);
    db.prepare('INSERT INTO activity_log (icon, message, gym_id) SELECT ?, ?, gym_id FROM invoices WHERE id=?').run('💰', `Invoice ${req.params.id} paid`, req.params.id);
    res.json({ success: true, message: 'Invoice marked as paid' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/summary', (req, res) => {
  try {
    const mrr     = db.prepare("SELECT COALESCE(SUM(mrr),0) as total FROM gyms WHERE status='active'").get().total;
    const paid    = db.prepare("SELECT COUNT(*) as c FROM invoices WHERE status='paid'").get().c;
    const overdue = db.prepare("SELECT COUNT(*) as c FROM invoices WHERE status='overdue'").get().c;
    res.json({ success: true, data: { mrr, arr: mrr * 12, paid, overdue } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
