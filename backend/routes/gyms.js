// routes/gyms.js
const express = require('express');
const router  = express.Router();
const db      = require('../database/connection');

const ALL_MODULES = ['crm','billing','attendance','classes','pos','inventory','reports','website','app','api'];

function getModules(gymId) {
  const rows = db.prepare('SELECT module_key, enabled FROM gym_modules WHERE gym_id = ?').all(gymId);
  const obj = {};
  rows.forEach(r => { obj[r.module_key] = r.enabled === 1; });
  return obj;
}

function getFeatures(gymId) {
  const rows = db.prepare('SELECT feature_key, enabled FROM gym_features WHERE gym_id = ?').all(gymId);
  const obj = {};
  rows.forEach(r => { obj[r.feature_key] = r.enabled === 1; });
  return obj;
}

// GET ALL GYMS
router.get('/', (req, res) => {
  try {
    const { plan, status, search } = req.query;
    let query = 'SELECT * FROM gyms WHERE 1=1';
    const params = [];
    if (plan)   { query += ' AND plan = ?';   params.push(plan); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (search) {
      query += ' AND (name LIKE ? OR owner LIKE ? OR city LIKE ?)';
      params.push('%' + search + '%', '%' + search + '%', '%' + search + '%');
    }
    query += ' ORDER BY created_at DESC';
    const gyms = db.prepare(query).all(...params);
    const result = gyms.map(g => ({
      ...g,
      modules: getModules(g.id),
      features: getFeatures(g.id)
    }));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET SINGLE GYM
router.get('/:id', (req, res) => {
  try {
    const gym = db.prepare('SELECT * FROM gyms WHERE id = ?').get(req.params.id);
    if (!gym) return res.status(404).json({ success: false, error: 'Gym not found' });
    gym.modules  = getModules(gym.id);
    gym.features = getFeatures(gym.id);
    res.json({ success: true, data: gym });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE GYM
router.post('/', (req, res) => {
  try {
    const { name, owner, email, phone, city, state, plan, status, max_members, domain, color, notes, modules } = req.body;
    if (!name || !owner || !email) return res.status(400).json({ success: false, error: 'Name, owner and email are required' });
    const PLAN_MRR = { Starter: 1500, Pro: 3000, Elite: 5500, Enterprise: 12000 };
    const id = 'g' + Date.now();
    const mrr = status === 'active' ? (PLAN_MRR[plan] || 0) : 0;
    const joinDate = new Date().toISOString().slice(0, 10);
    const renewDate = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    db.prepare('INSERT INTO gyms (id,name,owner,email,phone,city,state,plan,status,members,max_members,mrr,domain,color,notes,join_date,renew_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, name, owner, email, phone||'', city||'', state||'', plan||'Starter', status||'trial', 0, max_members||100, mrr, domain||'', color||'#2563ff', notes||'', joinDate, renewDate);
    const insertMod = db.prepare('INSERT OR REPLACE INTO gym_modules (gym_id, module_key, enabled) VALUES (?,?,?)');
    ALL_MODULES.forEach(mod => { insertMod.run(id, mod, modules && modules[mod] ? 1 : 0); });
    db.prepare('INSERT INTO activity_log (icon, message, gym_id) VALUES (?,?,?)').run('New', 'New gym added: ' + name, id);
    const gym = db.prepare('SELECT * FROM gyms WHERE id = ?').get(id);
    gym.modules = getModules(id);
    res.json({ success: true, data: gym, message: 'Gym created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE GYM
router.put('/:id', (req, res) => {
  try {
    const { name, owner, email, phone, city, state, plan, status, max_members, domain, color, notes, modules, features } = req.body;
    const existing = db.prepare('SELECT * FROM gyms WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Gym not found' });
    const PLAN_MRR = { Starter: 1500, Pro: 3000, Elite: 5500, Enterprise: 12000 };
    const mrr = (status || existing.status) === 'active' ? (PLAN_MRR[plan || existing.plan] || 0) : 0;
    db.prepare("UPDATE gyms SET name=?, owner=?, email=?, phone=?, city=?, state=?, plan=?, status=?, max_members=?, mrr=?, domain=?, color=?, notes=?, updated_at=datetime('now') WHERE id=?")
      .run(name||existing.name, owner||existing.owner, email||existing.email, phone||existing.phone, city||existing.city, state||existing.state, plan||existing.plan, status||existing.status, max_members||existing.max_members, mrr, domain||existing.domain, color||existing.color, notes||existing.notes, req.params.id);
    if (modules) {
      const insertMod = db.prepare('INSERT OR REPLACE INTO gym_modules (gym_id, module_key, enabled) VALUES (?,?,?)');
      ALL_MODULES.forEach(mod => { insertMod.run(req.params.id, mod, modules[mod] ? 1 : 0); });
    }
    if (features) {
      const insertFt = db.prepare('INSERT OR REPLACE INTO gym_features (gym_id, feature_key, enabled) VALUES (?,?,?)');
      Object.entries(features).forEach(([k, v]) => insertFt.run(req.params.id, k, v ? 1 : 0));
    }
    const gym = db.prepare('SELECT * FROM gyms WHERE id = ?').get(req.params.id);
    gym.modules  = getModules(gym.id);
    gym.features = getFeatures(gym.id);
    res.json({ success: true, data: gym, message: 'Gym updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SUSPEND / REACTIVATE GYM
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const PLAN_MRR = { Starter: 1500, Pro: 3000, Elite: 5500, Enterprise: 12000 };
    const gym = db.prepare('SELECT * FROM gyms WHERE id = ?').get(req.params.id);
    if (!gym) return res.status(404).json({ success: false, error: 'Gym not found' });
    const mrr = status === 'active' ? (PLAN_MRR[gym.plan] || 0) : 0;
    db.prepare("UPDATE gyms SET status=?, mrr=?, updated_at=datetime('now') WHERE id=?").run(status, mrr, req.params.id);
    db.prepare('INSERT INTO activity_log (icon, message, gym_id) VALUES (?,?,?)').run(status === 'suspended' ? 'X' : 'OK', gym.name + ' ' + status, req.params.id);
    res.json({ success: true, message: 'Gym ' + status + ' successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE GYM
router.delete('/:id', (req, res) => {
  try {
    const gym = db.prepare('SELECT name FROM gyms WHERE id = ?').get(req.params.id);
    if (!gym) return res.status(404).json({ success: false, error: 'Gym not found' });
    db.prepare('DELETE FROM gyms WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: gym.name + ' deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
