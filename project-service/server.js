const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || 'secret_m206_jwt';

// ── Modèles ──────────────────────────────────────────────────
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  email: String
}));

const projectSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  status:      { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
  category:    { type: String },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);

// ── Middleware auth ───────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

// ── Routes ───────────────────────────────────────────────────
// Catégories distinctes
app.get('/api/projects/categories', auth, async (req, res) => {
  try {
    const categories = await Project.distinct('category');
    res.json({ categories: categories.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Liste avec filtres
app.get('/api/projects', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.name)      filter.name     = new RegExp(req.query.name, 'i');
    if (req.query.status)    filter.status   = req.query.status;
    if (req.query.category)  filter.category = new RegExp(req.query.category, 'i');
    if (req.query.startDate) filter.startDate = { $gte: new Date(req.query.startDate) };
    if (req.query.endDate)   filter.startDate = { ...filter.startDate, $lte: new Date(req.query.endDate) };

    const projects = await Project.find(filter)
      .populate('owner', 'username email')
      .populate('members', 'username email')
      .sort({ createdAt: -1 });

    res.json({ total: projects.length, projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Un projet
app.get('/api/projects/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'username email')
      .populate('members', 'username email');
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer
app.post('/api/projects', auth, async (req, res) => {
  try {
    const { name, description, startDate, endDate, status, category, members } = req.body;
    const project = await new Project({
      name, description, startDate, endDate, status, category,
      members: members || [],
      owner: req.user.id
    }).save();

    await project.populate('owner', 'username email');
    await project.populate('members', 'username email');

    res.status(201).json({ message: 'Projet créé', project });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Modifier
app.put('/api/projects/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    if (project.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('owner', 'username email')
      .populate('members', 'username email');

    res.json({ message: 'Projet mis à jour', project: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Supprimer
app.delete('/api/projects/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    if (project.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Projet supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter un membre
app.post('/api/projects/:id/members', auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: req.body.userId } },
      { new: true }
    ).populate('owner', 'username email').populate('members', 'username email');

    if (!project) return res.status(404).json({ error: 'Projet introuvable' });
    res.json({ message: 'Membre ajouté', project });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Démarrage ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/projet_m206_db')
  .then(() => console.log('Project: MongoDB connecté'))
  .catch(err => console.error('Project: erreur MongoDB', err));

app.listen(5004, () => console.log('Project Service sur :5004'));
