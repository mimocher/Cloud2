const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || 'secret_m206_jwt';

// ── Modèles (lecture seule, même DB) ─────────────────────────
const User = mongoose.model('User', new mongoose.Schema({ username: String, email: String }));

const Project = mongoose.model('Project', new mongoose.Schema({
  name: String, status: String, category: String
}, { timestamps: true }));

const Task = mongoose.model('Task', new mongoose.Schema({
  status: String, priority: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deadline: Date, project: mongoose.Schema.Types.ObjectId
}, { timestamps: true }));

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
app.get('/api/reports/overview', auth, async (req, res) => {
  try {
    const now = new Date();
    const [
      totalProjects, totalTasks, totalUsers,
      activeProjects, completedProjects, pausedProjects,
      todoTasks, inprogressTasks, doneTasks,
      highPriority, mediumPriority, lowPriority,
      overdueTasks
    ] = await Promise.all([
      Project.countDocuments(),
      Task.countDocuments(),
      User.countDocuments(),
      Project.countDocuments({ status: 'active' }),
      Project.countDocuments({ status: 'completed' }),
      Project.countDocuments({ status: 'paused' }),
      Task.countDocuments({ status: 'todo' }),
      Task.countDocuments({ status: 'inprogress' }),
      Task.countDocuments({ status: 'done' }),
      Task.countDocuments({ priority: 'high' }),
      Task.countDocuments({ priority: 'medium' }),
      Task.countDocuments({ priority: 'low' }),
      Task.countDocuments({ deadline: { $lt: now }, status: { $ne: 'done' } })
    ]);

    res.json({
      projects: { total: totalProjects, active: activeProjects, completed: completedProjects, paused: pausedProjects },
      tasks:    { total: totalTasks, todo: todoTasks, inprogress: inprogressTasks, done: doneTasks, overdue: overdueTasks },
      priorities: { high: highPriority, medium: mediumPriority, low: lowPriority },
      users: { total: totalUsers }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/tasks-by-status', auth, async (req, res) => {
  try {
    const data = await Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

    const result = [
      { status: 'todo',       label: 'À faire',  count: 0, color: '#64748b' },
      { status: 'inprogress', label: 'En cours', count: 0, color: '#d97706' },
      { status: 'done',       label: 'Terminé',  count: 0, color: '#16a34a' }
    ];

    data.forEach(d => {
      const item = result.find(r => r.status === d._id);
      if (item) item.count = d.count;
    });

    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/tasks-by-priority', auth, async (req, res) => {
  try {
    const data = await Task.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]);

    const result = [
      { priority: 'high',   label: 'Haute',   count: 0, color: '#dc2626' },
      { priority: 'medium', label: 'Moyenne', count: 0, color: '#d97706' },
      { priority: 'low',    label: 'Basse',   count: 0, color: '#16a34a' }
    ];

    data.forEach(d => {
      const item = result.find(r => r.priority === d._id);
      if (item) item.count = d.count;
    });

    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/tasks-by-user', auth, async (req, res) => {
  try {
    const data = await Task.aggregate([
      { $match: { assignedTo: { $exists: true, $ne: null } } },
      {
        $group: {
          _id:        '$assignedTo',
          total:      { $sum: 1 },
          done:       { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          inprogress: { $sum: { $cond: [{ $eq: ['$status', 'inprogress'] }, 1, 0] } },
          todo:       { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } }
        }
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          username:   '$user.username',
          total:      1, done: 1, inprogress: 1, todo: 1,
          completion: { $round: [{ $multiply: [{ $divide: ['$done', '$total'] }, 100] }, 0] }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/projects-by-category', auth, async (req, res) => {
  try {
    const data = await Project.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const colors = ['#4f46e5', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#7c3aed'];
    const result = data.map((d, i) => ({
      category: d._id || 'Sans catégorie',
      count: d.count,
      color: colors[i % colors.length]
    }));

    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/activity', auth, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const data = await Task.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id:       { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          created:   { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const result = data.map(d => ({
      month: months[d._id.month - 1],
      created: d.created,
      completed: d.completed
    }));

    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/project/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const tasks = await Task.find({ project: req.params.id }).populate('assignedTo', 'username');

    const done = tasks.filter(t => t.status === 'done').length;
    const stats = {
      total:          tasks.length,
      todo:           tasks.filter(t => t.status === 'todo').length,
      inprogress:     tasks.filter(t => t.status === 'inprogress').length,
      done,
      overdue:        tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length,
      completion:     tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
      highPriority:   tasks.filter(t => t.priority === 'high').length,
      mediumPriority: tasks.filter(t => t.priority === 'medium').length,
      lowPriority:    tasks.filter(t => t.priority === 'low').length
    };

    res.json({ project, tasks, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Démarrage ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/projet_m206_db')
  .then(() => console.log('Report: MongoDB connecté'))
  .catch(err => console.error('Report: erreur MongoDB', err));

app.listen(5007, () => console.log('Report Service sur :5007'));
