const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initializeDatabase } = require('./src/db/database');

const authRoutes = require('./src/routes/authRoutes');
const shiftRoutes = require('./src/routes/shiftRoutes');
const assignmentRoutes = require('./src/routes/assignmentRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = () => {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('  GET    /api/locations');
    console.log('  POST   /api/locations (admin)');
    console.log('  PUT    /api/locations/:id (admin)');
    console.log('  GET    /api/admin/users (admin)');
    console.log('  PUT    /api/admin/users/:id/role (admin)');
    console.log('  GET    /api/admin/stats (admin)');
    try {
      await initializeDatabase();
      console.log('Database initialized');
    } catch (err) {
      console.error('Database init error:', err);
    }
  });
};

startServer();

module.exports = app;
