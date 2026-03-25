const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ── Modèle User ──────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String },
  role:     { type: String, enum: ['admin', 'member', 'guest'], default: 'member' },
  isBlocked:{ type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ── Routes ───────────────────────────────────────────────────
// Liste avec filtres optionnels
app.get('/api/users', async (req, res) => {
  try {
    const filter = {};
    if (req.query.name)  filter.username = new RegExp(req.query.name, 'i');
    if (req.query.email) filter.email    = new RegExp(req.query.email, 'i');
    if (req.query.role)  filter.role     = req.query.role;

    const users = await User.find(filter).select('-password');
    res.json({ total: users.length, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Un seul utilisateur
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modifier (le password ne passe pas ici)
app.put('/api/users/:id', async (req, res) => {
  try {
    delete req.body.password;
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({ message: 'Utilisateur mis à jour', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Supprimer
app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Démarrage ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/projet_m206_db')
  .then(() => console.log('User: MongoDB connecté'))
  .catch(err => console.error('User: erreur MongoDB', err));

app.listen(5002, () => console.log('User Service sur :5002'));
