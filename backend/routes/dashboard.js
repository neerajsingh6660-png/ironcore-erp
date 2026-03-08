// routes/dashboard.js
const express = require('express');
const router  = express.Router();
const db      = require('../database/connection');

router.get('/stats', (req, res) => {
  try {
    const totalGyms  = db.prepare('SELECT COUNT(*) as c FROM gyms').get().c;
    const activeGyms = db.prepare("SELECT COUNT(*) as c FROM gyms WHERE status='active'").get().c;
    const trials     = db.prepare("SELECT COUNT(*) as c FROM gyms WHERE status='trial'").get().c;
    const suspended  = db.prepare("SELECT COUNT(*) as c FROM gyms WHERE status='suspended'").get().c;
    const mrr        = db.prepare("SELECT COALESCE(SUM(mrr),0) as t FROM gyms WHERE status='active'").get().t;
    const members    = db.prepare('SELECT COALESCE(SUM(members),0) as t FROM gyms').get().t;
    const openTkts   = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status='open'").get().c;

    const planDist = db.prepare("SELECT plan, COUNT(*) as count FROM gyms WHERE status != 'cancelled' GROUP BY plan").all();
    const recentGyms = db.prepare('SELECT id, name, city, plan, status, members FROM gyms ORDER BY created_at DESC LIMIT 5').all();
    const activity = db.prepare('SELECT icon, message, created_at FROM activity_log ORDER BY created_at DESC LIMIT 8').all();

    res.json({
      success: true,
      data: { totalGyms, activeGyms, trials, suspended, mrr, members, openAlerts: openTkts + suspended, planDist, recentGyms, activity }
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
