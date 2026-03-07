// database/setup.js
// Run this once to create all tables and seed data
// Command: node database/setup.js

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create database folder if not exists
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(__dirname, 'ironcore.db');
const dbDirPath = path.dirname(dbPath);
if (!fs.existsSync(dbDirPath)) fs.mkdirSync(dbDirPath, { recursive: true });
const db = new Database(dbPath);

console.log('ð§ Setting up IronCore database...');

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ââ CREATE TABLES ââââââââââââââââââââââââââââââââââ

db.exec(`
  -- GYMS TABLE
  CREATE TABLE IF NOT EXISTS gyms (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    owner       TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT,
    city        TEXT,
    state       TEXT,
    plan        TEXT DEFAULT 'Starter',
    status      TEXT DEFAULT 'trial',
    members     INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 100,
    mrr         INTEGER DEFAULT 0,
    domain      TEXT,
    color       TEXT DEFAULT '#2563ff',
    notes       TEXT,
    join_date   TEXT,
    renew_date  TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  -- GYM MODULES TABLE
  CREATE TABLE IF NOT EXISTS gym_modules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id      TEXT NOT NULL,
    module_key  TEXT NOT NULL,
    enabled     INTEGER DEFAULT 0,
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
    UNIQUE(gym_id, module_key)
  );

  -- GYM FEATURES TABLE
  CREATE TABLE IF NOT EXISTS gym_features (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id       TEXT NOT NULL,
    feature_key  TEXT NOT NULL,
    enabled      INTEGER DEFAULT 0,
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
    UNIQUE(gym_id, feature_key)
  );

  -- USERS TABLE
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT,
    role        TEXT DEFAULT 'Gym Owner',
    gym_id      TEXT,
    last_login  TEXT,
    status      TEXT DEFAULT 'active',
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL
  );

  -- TICKETS TABLE
  CREATE TABLE IF NOT EXISTS tickets (
    id          TEXT PRIMARY KEY,
    subject     TEXT NOT NULL,
    description TEXT,
    gym_id      TEXT,
    priority    TEXT DEFAULT 'medium',
    status      TEXT DEFAULT 'open',
    assignee    TEXT,
    last_reply  TEXT,
    opened_date TEXT DEFAULT (date('now')),
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL
  );

  -- INVOICES TABLE
  CREATE TABLE IF NOT EXISTS invoices (
    id          TEXT PRIMARY KEY,
    gym_id      TEXT,
    description TEXT,
    amount      INTEGER DEFAULT 0,
    due_date    TEXT,
    status      TEXT DEFAULT 'pending',
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL
  );

  -- ACTIVITY LOG TABLE
  CREATE TABLE IF NOT EXISTS activity_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    icon        TEXT,
    message     TEXT NOT NULL,
    gym_id      TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);

console.log('â Tables created!');

// ââ SEED DATA ââââââââââââââââââââââââââââââââââââââ

const gyms = [
  { id:'g1', name:'FitZone Mumbai',    owner:'Rahul Kumar',   email:'rahul@fitzone.in',    phone:'+91 9876543210', city:'Mumbai',    state:'MH', plan:'Elite',      status:'active',    members:284, max_members:600,  mrr:5500,  domain:'fitzone.ironcore.in',    color:'#00ff87', notes:'Top client. Wants API.', join_date:'2024-01-15', renew_date:'2025-01-15' },
  { id:'g2', name:'PowerHouse Delhi',  owner:'Anjali Singh',  email:'anjali@powerhouse.in',phone:'+91 9988776655', city:'New Delhi', state:'DL', plan:'Pro',        status:'active',    members:167, max_members:300,  mrr:3000,  domain:'powerhouse.ironcore.in', color:'#2563ff', notes:'', join_date:'2024-03-20', renew_date:'2025-03-20' },
  { id:'g3', name:'IronGrip Pune',     owner:'Vikram Patil',  email:'vikram@irongrip.in',  phone:'+91 9876123456', city:'Pune',      state:'MH', plan:'Starter',    status:'active',    members:78,  max_members:100,  mrr:1500,  domain:'irongrip.ironcore.in',   color:'#ff6b35', notes:'', join_date:'2024-05-10', renew_date:'2025-05-10' },
  { id:'g4', name:'StrongArm Hyd',     owner:'Priya Reddy',   email:'priya@strongarm.in',  phone:'+91 9123456789', city:'Hyderabad', state:'TG', plan:'Pro',        status:'active',    members:203, max_members:300,  mrr:3000,  domain:'strongarm.ironcore.in',  color:'#c084fc', notes:'', join_date:'2024-02-05', renew_date:'2025-02-05' },
  { id:'g5', name:'FlexFit Bangalore', owner:'Arjun Nair',    email:'arjun@flexfit.in',    phone:'+91 9012345678', city:'Bangalore', state:'KA', plan:'Enterprise', status:'active',    members:512, max_members:9999, mrr:12000, domain:'flexfit.ironcore.in',    color:'#fbbf24', notes:'VIP. Monthly review.', join_date:'2023-11-01', renew_date:'2025-11-01' },
  { id:'g6', name:'BeastMode Chennai', owner:'Kavya Rajan',   email:'kavya@beastmode.in',  phone:'+91 8765432109', city:'Chennai',   state:'TN', plan:'Starter',    status:'trial',     members:12,  max_members:100,  mrr:0,     domain:'beastmode.ironcore.in',  color:'#ef4444', notes:'14-day trial.', join_date:'2025-01-01', renew_date:'2025-01-15' },
  { id:'g7', name:'CoreFit Jaipur',    owner:'Sanjay Meena',  email:'sanjay@corefit.in',   phone:'+91 9871234567', city:'Jaipur',    state:'RJ', plan:'Pro',        status:'trial',     members:34,  max_members:300,  mrr:0,     domain:'corefit.ironcore.in',    color:'#06b6d4', notes:'', join_date:'2025-01-03', renew_date:'2025-01-17' },
  { id:'g8', name:'MaxPulse Kolkata',  owner:'Ritu Banerjee', email:'ritu@maxpulse.in',    phone:'+91 8901234567', city:'Kolkata',   state:'WB', plan:'Starter',    status:'suspended', members:0,   max_members:100,  mrr:0,     domain:'maxpulse.ironcore.in',   color:'#5a5a88', notes:'Expired. Non-payment.', join_date:'2023-09-15', renew_date:'2024-09-15' },
];

const gymModules = {
  g1: ['crm','billing','attendance','classes','pos','inventory','reports','website'],
  g2: ['crm','billing','attendance','classes','pos','reports'],
  g3: ['crm','billing','attendance'],
  g4: ['crm','billing','attendance','classes','pos','reports','website'],
  g5: ['crm','billing','attendance','classes','pos','inventory','reports','website','app','api'],
  g6: ['crm','attendance'],
  g7: ['crm','billing','attendance','classes','reports'],
  g8: [],
};

const users = [
  { id:'u1', name:'Super Admin',  email:'admin@ironcore.in',    role:'Master Admin', gym_id:null, status:'active' },
  { id:'u2', name:'Rahul Kumar',  email:'rahul@fitzone.in',     role:'Gym Owner',    gym_id:'g1', status:'active' },
  { id:'u3', name:'Anjali Singh', email:'anjali@powerhouse.in', role:'Gym Owner',    gym_id:'g2', status:'active' },
  { id:'u4', name:'Vikram Patil', email:'vikram@irongrip.in',   role:'Gym Owner',    gym_id:'g3', status:'active' },
  { id:'u5', name:'Priya Reddy',  email:'priya@strongarm.in',   role:'Gym Owner',    gym_id:'g4', status:'active' },
  { id:'u6', name:'Arjun Nair',   email:'arjun@flexfit.in',     role:'Gym Owner',    gym_id:'g5', status:'active' },
  { id:'u7', name:'Riya Support', email:'riya@ironcore.in',     role:'Support Staff',gym_id:null, status:'active' },
  { id:'u8', name:'Kavya Rajan',  email:'kavya@beastmode.in',   role:'Gym Owner',    gym_id:'g6', status:'trial'  },
];

const tickets = [
  { id:'TK001', subject:'Billing module showing blank',        description:'Billing tab blank after latest update.', gym_id:'g3', priority:'high',   status:'open',        assignee:'Riya',  opened_date:'2025-01-09' },
  { id:'TK002', subject:'Upgrade from Pro to Elite',           description:'Client wants to upgrade. Needs pricing.', gym_id:'g2', priority:'medium', status:'in-progress', assignee:'Riya',  opened_date:'2025-01-08' },
  { id:'TK003', subject:'Custom domain SSL issue',             description:'HTTPS not working after domain change.',  gym_id:'g5', priority:'high',   status:'in-progress', assignee:'Admin', opened_date:'2025-01-08' },
  { id:'TK004', subject:'Excel export for attendance',         description:'Feature request â CSV/Excel export.',     gym_id:'g4', priority:'low',    status:'open',        assignee:'',      opened_date:'2025-01-07' },
  { id:'TK005', subject:'Member app OTP not received',         description:'SMS gateway config fixed. Resolved.',     gym_id:'g1', priority:'medium', status:'resolved',    assignee:'Admin', opened_date:'2025-01-06' },
  { id:'TK006', subject:'Trial extension request â 7 days',   description:'Owner needs more time to evaluate.',      gym_id:'g6', priority:'low',    status:'open',        assignee:'',      opened_date:'2025-01-07' },
];

const invoices = [
  { id:'INV001', gym_id:'g1', description:'Elite Annual 2025',      amount:66000,  due_date:'2025-01-15', status:'paid'    },
  { id:'INV002', gym_id:'g2', description:'Pro Annual 2025',        amount:36000,  due_date:'2025-03-20', status:'paid'    },
  { id:'INV003', gym_id:'g3', description:'Starter Annual 2025',    amount:18000,  due_date:'2025-05-10', status:'pending' },
  { id:'INV004', gym_id:'g4', description:'Pro Annual 2025',        amount:36000,  due_date:'2025-02-05', status:'pending' },
  { id:'INV005', gym_id:'g5', description:'Enterprise Annual 2025', amount:144000, due_date:'2025-11-01', status:'paid'    },
  { id:'INV006', gym_id:'g8', description:'Starter Renewal',        amount:18000,  due_date:'2024-09-15', status:'overdue' },
];

const activities = [
  { icon:'ð¢', message:'FitZone Mumbai logged 48 check-ins today',      gym_id:'g1' },
  { icon:'â¬ï¸', message:'CoreFit Jaipur trial converted to Pro',          gym_id:'g7' },
  { icon:'ð«', message:'New ticket: SSL issue from FlexFit Bangalore',   gym_id:'g5' },
  { icon:'ð°', message:'Invoice paid by PowerHouse Delhi',               gym_id:'g2' },
  { icon:'ð', message:'BeastMode Chennai started 14-day trial',         gym_id:'g6' },
  { icon:'â ï¸', message:'MaxPulse Kolkata payment overdue 90 days',       gym_id:'g8' },
];

// Check if already seeded
const existing = db.prepare('SELECT COUNT(*) as c FROM gyms').get();
if (existing.c > 0) {
  console.log('â ï¸  Data already exists. Skipping seed.');
} else {
  // Insert gyms
  const insertGym = db.prepare(`INSERT INTO gyms (id,name,owner,email,phone,city,state,plan,status,members,max_members,mrr,domain,color,notes,join_date,renew_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  gyms.forEach(g => insertGym.run(g.id,g.name,g.owner,g.email,g.phone,g.city,g.state,g.plan,g.status,g.members,g.max_members,g.mrr,g.domain,g.color,g.notes,g.join_date,g.renew_date));

  // Insert modules
  const insertMod = db.prepare(`INSERT INTO gym_modules (gym_id, module_key, enabled) VALUES (?,?,?)`);
  const allModules = ['crm','billing','attendance','classes','pos','inventory','reports','website','app','api'];
  Object.entries(gymModules).forEach(([gymId, enabledMods]) => {
    allModules.forEach(mod => {
      insertMod.run(gymId, mod, enabledMods.includes(mod) ? 1 : 0);
    });
  });

  // Insert users
  const insertUser = db.prepare(`INSERT INTO users (id,name,email,role,gym_id,status) VALUES (?,?,?,?,?,?)`);
  users.forEach(u => insertUser.run(u.id,u.name,u.email,u.role,u.gym_id||null,u.status));

  // Insert tickets
  const insertTicket = db.prepare(`INSERT INTO tickets (id,subject,description,gym_id,priority,status,assignee,opened_date) VALUES (?,?,?,?,?,?,?,?)`);
  tickets.forEach(t => insertTicket.run(t.id,t.subject,t.description,t.gym_id,t.priority,t.status,t.assignee,t.opened_date));

  // Insert invoices
  const insertInv = db.prepare(`INSERT INTO invoices (id,gym_id,description,amount,due_date,status) VALUES (?,?,?,?,?,?)`);
  invoices.forEach(i => insertInv.run(i.id,i.gym_id,i.description,i.amount,i.due_date,i.status));

  // Insert activities
  const insertAct = db.prepare(`INSERT INTO activity_log (icon,message,gym_id) VALUES (?,?,?)`);
  activities.forEach(a => insertAct.run(a.icon,a.message,a.gym_id));

  console.log('â Sample data seeded!');
}

console.log('');
console.log('ð IronCore database is ready!');
console.log('ð Now run: npm run dev');
console.log('');

db.close();
