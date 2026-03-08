// server.js — IronCore ERP Backend
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// -- MIDDLEWARE --
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// -- ROUTES --
app.use('/api/gyms',     require('./routes/gyms'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/tickets',  require('./routes/tickets'));
app.use('/api/billing',  require('./routes/billing'));
app.use('/api/ai',       require('./routes/ai'));
app.use('/api/dashboard',require('./routes/dashboard'));

// -- HEALTH CHECK --
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'IronCore ERP is running!',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

// -- SERVE FRONTEND --
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/master-erp.html'));
});
app.get('/member', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/member-app.html'));
});

// -- START SERVER --
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log('IronCore ERP Server Running on port ' + PORT);
});
