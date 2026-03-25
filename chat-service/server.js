const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || 'secret_m206_jwt';

// ── Modèles ──────────────────────────────────────────────────
mongoose.model('User', new mongoose.Schema({ username: String }));

const Message = mongoose.model('Message', new mongoose.Schema({
  content:  { type: String, required: true },
  sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project:  { type: mongoose.Schema.Types.ObjectId, required: true },
  type:     { type: String, default: 'text' },
  readBy:   [{ type: mongoose.Schema.Types.ObjectId }]
}, { timestamps: true }));

const Notification = mongoose.model('Notification', new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['new_task', 'task_updated', 'task_completed', 'new_message', 'new_comment', 'project_added'],
    required: true
  },
  title:   { type: String, required: true },
  content: { type: String, required: true },
  link:    { type: String },
  read:    { type: Boolean, default: false }
}, { timestamps: true }));

// ── Middleware auth HTTP ──────────────────────────────────────
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

// ── Routes chat ───────────────────────────────────────────────
app.get('/api/chat/:projectId', auth, async (req, res) => {
  try {
    const filter = { project: req.params.projectId };
    if (req.query.before) filter.createdAt = { $lt: new Date(req.query.before) };

    const messages = await Message.find(filter)
      .populate('sender', 'username')
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 50);

    await Message.updateMany(
      { project: req.params.projectId, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    );

    res.json({ messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat/:projectId', auth, async (req, res) => {
  try {
    if (!req.body.content?.trim()) return res.status(400).json({ error: 'Contenu requis' });

    const message = await Message.create({
      content: req.body.content.trim(),
      sender: req.user.id,
      project: req.params.projectId,
      readBy: [req.user.id]
    });

    await message.populate('sender', 'username');
    res.status(201).json({ message });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/chat/messages/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message introuvable' });

    if (message.sender.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: 'Message supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Routes notifications ──────────────────────────────────────
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'username')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ total: notifications.length, unread: notifications.filter(n => !n.read).length, notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', auth, async (req, res) => {
  try {
    const notification = await Notification.create(req.body);
    res.status(201).json({ notification });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
    res.json({ message: 'Toutes les notifications lues' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Notification lue' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notifications/:id', auth, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Socket.IO ─────────────────────────────────────────────────
const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Token manquant'));
  try {
    socket.user = jwt.verify(token, SECRET);
    next();
  } catch {
    next(new Error('Token invalide'));
  }
});

io.on('connection', (socket) => {
  const { id: userId, username } = socket.user;

  onlineUsers.set(userId, socket.id);
  io.emit('users:online', Array.from(onlineUsers.keys()));
  console.log(`+ ${username} connecté`);

  socket.on('join:project', (projectId) => {
    socket.join(`project:${projectId}`);
    socket.emit('joined', { projectId });
  });

  socket.on('leave:project', (projectId) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on('message:send', async ({ projectId, content }) => {
    try {
      if (!content?.trim()) return;
      const msg = await Message.create({ content: content.trim(), sender: userId, project: projectId, readBy: [userId] });
      await msg.populate('sender', 'username');
      io.to(`project:${projectId}`).emit('message:new', msg);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('notification:send', async ({ recipientId, type, title, content, link }) => {
    try {
      const notif = await Notification.create({ recipient: recipientId, sender: userId, type, title, content, link });
      const recipientSocket = onlineUsers.get(recipientId);
      if (recipientSocket) io.to(recipientSocket).emit('notification:new', notif);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('typing:start', ({ projectId }) => {
    socket.to(`project:${projectId}`).emit('typing:start', { username });
  });

  socket.on('typing:stop', ({ projectId }) => {
    socket.to(`project:${projectId}`).emit('typing:stop', { username });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('users:online', Array.from(onlineUsers.keys()));
    console.log(`- ${username} déconnecté`);
  });
});

// ── Démarrage ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/projet_m206_db')
  .then(() => console.log('Chat: MongoDB connecté'))
  .catch(err => console.error('Chat: erreur MongoDB', err));

server.listen(5006, () => console.log('Chat Service sur :5006'));
