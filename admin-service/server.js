const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://localhost:5002';

// ── Routes ───────────────────────────────────────────────────
// Tous les utilisateurs
app.get('/api/admin/users', async (req, res) => {
  try {
    const { data } = await axios.get(`${USER_SERVICE}/api/users`, { params: req.query });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bloquer un user
app.put('/api/admin/block/:id', async (req, res) => {
  try {
    const { data } = await axios.put(`${USER_SERVICE}/api/users/${req.params.id}`, { isBlocked: true });
    res.json({ message: 'Utilisateur bloqué', user: data.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Débloquer un user
app.put('/api/admin/unblock/:id', async (req, res) => {
  try {
    const { data } = await axios.put(`${USER_SERVICE}/api/users/${req.params.id}`, { isBlocked: false });
    res.json({ message: 'Utilisateur débloqué', user: data.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un user
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { data } = await axios.delete(`${USER_SERVICE}/api/users/${req.params.id}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Démarrage ────────────────────────────────────────────────
app.listen(5003, () => console.log('Admin Service sur :5003'));
