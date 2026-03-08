// routes/users.js
const express = require('express');
const router  = express.Router();
const db      = require('../database/connection');

router.get('/', (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT u.*, g.name as gym_name FROM users u LEFT JOIN gyms g ON u.gym_id = g.id WHERE 1=1`;
    const params = [];
    if (search) { query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.role LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
    query += ' ORDER BY u.created_at DESC';
    res.json({ success: true, data: db.prepare(query).all(...params) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/', (req, res) => {
  try {
    const { name, email, role, gym_id } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, error: 'Name and email required' });
    const id = 'u' + Date.now();
    db.prepare('INSERT INTO users (id, name, email, role, gym_id, status) VALUES (?,?,?,?,?,?)')
      .run(id, name, email, role||'Gym Owner', gym_id||null, 'active');
    res.json({ success: true, data: { id }, message: 'User created' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'User removed' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
