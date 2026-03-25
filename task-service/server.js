const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || 'secret_m206_jwt';
const UPLOAD_DIR = '/app/uploads';

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Upload config ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Type de fichier non autorisé'));
  }
});

// ── Modèles ──────────────────────────────────────────────────
mongoose.model('User', new mongoose.Schema({ username: String, email: String }));

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  deadline:    { type: Date },
  status:      { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
  project:     { type: mongoose.Schema.Types.ObjectId, required: true },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: [{
    author:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    date:    { type: Date, default: Date.now }
  }],
  files: [{
    filename:     String,
    originalname: String,
    mimetype:     String,
    size:         Number,
    uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt:   { type: Date, default: Date.now }
  }],
  reminder: {
    enabled:    { type: Boolean, default: false },
    daysBefore: { type: Number, default: 1 },
    sent:       { type: Boolean, default: false }
  }
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

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

// Rappels actifs (avant /:id pour éviter le conflit)
app.get('/api/tasks/reminders', auth, async (req, res) => {
  try {
    const tasks = await Task.find({
      'reminder.enabled': true,
      'reminder.sent': false,
      status: { $ne: 'done' },
      deadline: { $exists: true, $ne: null }
    }).populate('assignedTo', 'username email');

    const now = new Date();
    const reminders = tasks.map(task => {
      const daysLeft = Math.ceil((new Date(task.deadline) - now) / (1000 * 60 * 60 * 24));
      return {
        taskId: task._id,
        title: task.title,
        deadline: new Date(task.deadline).toLocaleDateString('fr-FR'),
        daysLeft,
        assignedTo: task.assignedTo?.username || 'Non assigné',
        priority: task.priority
      };
    });

    res.json({ total: reminders.length, reminders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Liste avec filtres
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.project)    filter.project    = req.query.project;
    if (req.query.status)     filter.status     = req.query.status;
    if (req.query.priority)   filter.priority   = req.query.priority;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'username email')
      .populate('comments.author', 'username')
      .populate('files.uploadedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ total: tasks.length, tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Une tâche
app.get('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'username email')
      .populate('comments.author', 'username')
      .populate('files.uploadedBy', 'username');
    if (!task) return res.status(404).json({ error: 'Tâche introuvable' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer
app.post('/api/tasks', auth, async (req, res) => {
  try {
    const { title, description, priority, deadline, project, assignedTo, reminderEnabled, reminderDaysBefore } = req.body;
    const task = await new Task({
      title, description, priority, deadline, project,
      assignedTo: assignedTo || null,
      reminder: {
        enabled: reminderEnabled === true || reminderEnabled === 'true',
        daysBefore: reminderDaysBefore || 1,
        sent: false
      }
    }).save();

    await task.populate('assignedTo', 'username email');
    res.status(201).json({ message: 'Tâche créée', task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Modifier
app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.comments;
    delete body.files;

    if (body.reminderEnabled !== undefined) {
      body['reminder.enabled']    = body.reminderEnabled;
      body['reminder.daysBefore'] = body.reminderDaysBefore || 1;
      body['reminder.sent']       = false;
      delete body.reminderEnabled;
      delete body.reminderDaysBefore;
    }

    const task = await Task.findByIdAndUpdate(req.params.id, body, { new: true })
      .populate('assignedTo', 'username email')
      .populate('comments.author', 'username')
      .populate('files.uploadedBy', 'username');

    if (!task) return res.status(404).json({ error: 'Tâche introuvable' });
    res.json({ message: 'Tâche mise à jour', task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Changer le statut
app.patch('/api/tasks/:id/status', auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate('assignedTo', 'username email');
    if (!task) return res.status(404).json({ error: 'Tâche introuvable' });
    res.json({ message: 'Statut mis à jour', task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Activer/désactiver un rappel
app.patch('/api/tasks/:id/reminder', auth, async (req, res) => {
  try {
    const { enabled, daysBefore } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { 'reminder.enabled': enabled, 'reminder.daysBefore': daysBefore || 1, 'reminder.sent': false },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Tâche introuvable' });
    res.json({ message: enabled ? 'Rappel activé' : 'Rappel désactivé', task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Supprimer
app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tâche introuvable' });

    for (const f of task.files) {
      const filePath = `${UPLOAD_DIR}/${f.filename}`;
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tâche supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter un commentaire
app.post('/api/tasks/:id/comments', auth, async (req, res) => {
  try {
    if (!req.body.content) return res.status(400).json({ error: 'Contenu requis' });

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { author: req.user.id, content: req.body.content, date: new Date() } } },
      { new: true }
    ).populate('comments.author', 'username').populate('assignedTo', 'username email');

    if (!task) return res.status(404).json({ error: 'Tâche introuvable' });
    res.status(201).json({ message: 'Commentaire ajouté', task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Supprimer un commentaire
app.delete('/api/tasks/:id/comments/:commentId', auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $pull: { comments: { _id: req.params.commentId } } },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Tâche introuvable' });
    res.json({ message: 'Commentaire supprimé', task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Upload d'un fichier
app.post('/api/tasks/:id/files', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          files: {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadedBy: req.user.id,
            uploadedAt: new Date()
          }
        }
      },
      { new: true }
    ).populate('files.uploadedBy', 'username');

    if (!task) return res.status(404).json({ error: 'Tâche introuvable' });
    res.status(201).json({ message: 'Fichier uploadé', task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Télécharger un fichier
app.get('/api/tasks/:id/files/:filename', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tâche introuvable' });

    const file = task.files.find(f => f.filename === req.params.filename);
    if (!file) return res.status(404).json({ error: 'Fichier introuvable' });

    const filePath = `${UPLOAD_DIR}/${file.filename}`;
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier absent du serveur' });

    res.download(filePath, file.originalname);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un fichier
app.delete('/api/tasks/:id/files/:filename', auth, async (req, res) => {
  try {
    const filePath = `${UPLOAD_DIR}/${req.params.filename}`;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $pull: { files: { filename: req.params.filename } } },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Tâche introuvable' });
    res.json({ message: 'Fichier supprimé', task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Cron rappels (toutes les heures) ─────────────────────────
const cron = require('node-cron');

cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    const tasks = await Task.find({
      'reminder.enabled': true,
      'reminder.sent': false,
      status: { $ne: 'done' },
      deadline: { $exists: true, $ne: null }
    }).populate('assignedTo', 'username email');

    for (const task of tasks) {
      const daysLeft = Math.ceil((new Date(task.deadline) - now) / (1000 * 60 * 60 * 24));
      if (daysLeft <= task.reminder.daysBefore && daysLeft >= 0) {
        await Task.findByIdAndUpdate(task._id, { 'reminder.sent': true });
        console.log(`⏰ Rappel : "${task.title}" échéance dans ${daysLeft} jour(s) - assigné à ${task.assignedTo?.username || 'personne'}`);
      }
    }
  } catch (err) {
    console.error('Erreur cron rappels :', err.message);
  }
});

// ── Démarrage ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/projet_m206_db')
  .then(() => console.log('Task: MongoDB connecté'))
  .catch(err => console.error('Task: erreur MongoDB', err));

app.listen(5005, () => console.log('Task Service sur :5005'));
