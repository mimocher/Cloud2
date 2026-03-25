const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Connexion ──────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/projet_m206_db';
// ── Schémas ────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  username:  { type: String, required: true },
  email:     { type: String, required: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['admin', 'member', 'guest'], default: 'member' },
  isBlocked: { type: Boolean, default: false }
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: String,
  startDate:   Date,
  endDate:     Date,
  status:      { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
  category:    String,
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: String,
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  deadline:    Date,
  status:      { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
  project:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: [{
    author:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    date:    { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// ── Modèles ────────────────────────────────────────────────────────────────
const User    = mongoose.model('User',    userSchema);
const Project = mongoose.model('Project', projectSchema);
const Task    = mongoose.model('Task',    taskSchema);

// ── Fonction principale ────────────────────────────────────────────────────
async function seed() {

  // 1. Connexion
  await mongoose.connect(MONGO_URI);
  console.log('\n✅  Connecté à projet_m206_db\n');

  // 2. Vider les collections
  await User.deleteMany({});
  await Project.deleteMany({});
  await Task.deleteMany({});
  console.log('🗑️   Collections vidées\n');

  // ────────────────────────────────────────────────────────────────────────
  // 3. USERS
  // ────────────────────────────────────────────────────────────────────────
  const hash = async (p) => bcrypt.hash(p, 10);

  const users = await User.insertMany([
    {
      username:  'admin_sara',
      email:     'sara@m206.ma',
      password:  await hash('Admin@1234'),
      role:      'admin',
      isBlocked: false
    },
    {
      username:  'youssef_dev',
      email:     'youssef@m206.ma',
      password:  await hash('Member@1234'),
      role:      'member',
      isBlocked: false
    },
    {
      username:  'fatima_design',
      email:     'fatima@m206.ma',
      password:  await hash('Member@1234'),
      role:      'member',
      isBlocked: false
    },
    {
      username:  'karim_backend',
      email:     'karim@m206.ma',
      password:  await hash('Member@1234'),
      role:      'member',
      isBlocked: false
    },
    {
      username:  'invite_ali',
      email:     'ali@m206.ma',
      password:  await hash('Guest@1234'),
      role:      'guest',
      isBlocked: false
    },
    {
      username:  'user_bloque',
      email:     'bloque@m206.ma',
      password:  await hash('Test@1234'),
      role:      'member',
      isBlocked: true
    }
  ]);

  console.log(`👥  ${users.length} utilisateurs créés`);

  // Raccourcis
  const [sara, youssef, fatima, karim, ali] = users;

  // ────────────────────────────────────────────────────────────────────────
  // 4. PROJECTS
  // ────────────────────────────────────────────────────────────────────────
  const projects = await Project.insertMany([
    {
      name:        'Application Mobile E-commerce',
      description: 'Développement d\'une app mobile de vente en ligne avec paiement intégré',
      startDate:   new Date('2025-01-10'),
      endDate:     new Date('2025-06-30'),
      status:      'active',
      category:    'Mobile',
      owner:       sara._id,
      members:     [youssef._id, fatima._id, karim._id]
    },
    {
      name:        'Refonte Site Web Institutionnel',
      description: 'Modernisation du site web avec React et un design responsive',
      startDate:   new Date('2025-02-01'),
      endDate:     new Date('2025-04-30'),
      status:      'active',
      category:    'Web',
      owner:       youssef._id,
      members:     [fatima._id, ali._id]
    },
    {
      name:        'API REST Gestion RH',
      description: 'Création d\'une API complète pour la gestion des ressources humaines',
      startDate:   new Date('2024-09-01'),
      endDate:     new Date('2025-01-01'),
      status:      'completed',
      category:    'Backend',
      owner:       karim._id,
      members:     [youssef._id, sara._id]
    },
    {
      name:        'Dashboard Analytics',
      description: 'Tableau de bord pour visualiser les KPIs de l\'entreprise en temps réel',
      startDate:   new Date('2025-03-01'),
      endDate:     new Date('2025-08-01'),
      status:      'paused',
      category:    'Data',
      owner:       sara._id,
      members:     [karim._id, fatima._id]
    }
  ]);

  console.log(`📁  ${projects.length} projets créés`);

  // Raccourcis
  const [projMobile, projWeb, projRH, projDash] = projects;

  // ────────────────────────────────────────────────────────────────────────
  // 5. TASKS
  // ────────────────────────────────────────────────────────────────────────
  const tasks = await Task.insertMany([

    // ── Projet Mobile ──────────────────────────────────────────────────
    {
      title:       'Maquettes UI/UX',
      description: 'Créer les maquettes Figma de toutes les pages de l\'application',
      priority:    'high',
      deadline:    new Date('2025-02-15'),
      status:      'done',
      project:     projMobile._id,
      assignedTo:  fatima._id,
      comments: [
        {
          author:  sara._id,
          content: 'Super travail Fatima, les maquettes sont validées !',
          date:    new Date('2025-02-16')
        },
        {
          author:  fatima._id,
          content: 'Merci ! J\'ai appliqué le design system demandé.',
          date:    new Date('2025-02-16')
        }
      ]
    },
    {
      title:       'Authentification JWT mobile',
      description: 'Implémenter le login/register avec JWT et refresh token',
      priority:    'high',
      deadline:    new Date('2025-02-28'),
      status:      'done',
      project:     projMobile._id,
      assignedTo:  karim._id,
      comments: [
        {
          author:  youssef._id,
          content: 'N\'oublie pas d\'ajouter le refresh token !',
          date:    new Date('2025-02-20')
        }
      ]
    },
    {
      title:       'Intégration API paiement',
      description: 'Intégrer Stripe pour les paiements en ligne',
      priority:    'high',
      deadline:    new Date('2025-04-10'),
      status:      'inprogress',
      project:     projMobile._id,
      assignedTo:  youssef._id,
      comments: [
        {
          author:  karim._id,
          content: 'Utilise le SDK Stripe React Native v8',
          date:    new Date('2025-03-05')
        }
      ]
    },
    {
      title:       'Tests unitaires',
      description: 'Écrire les tests Jest pour tous les composants principaux',
      priority:    'medium',
      deadline:    new Date('2025-05-01'),
      status:      'todo',
      project:     projMobile._id,
      assignedTo:  youssef._id,
      comments:    []
    },
    {
      title:       'Déploiement sur Play Store',
      description: 'Préparer le bundle et soumettre l\'app sur Google Play',
      priority:    'low',
      deadline:    new Date('2025-06-20'),
      status:      'todo',
      project:     projMobile._id,
      assignedTo:  karim._id,
      comments:    []
    },

    // ── Projet Web ─────────────────────────────────────────────────────
    {
      title:       'Audit du site existant',
      description: 'Analyser les performances et problèmes SEO du site actuel',
      priority:    'medium',
      deadline:    new Date('2025-02-10'),
      status:      'done',
      project:     projWeb._id,
      assignedTo:  youssef._id,
      comments: [
        {
          author:  fatima._id,
          content: 'Score Lighthouse très bas, surtout sur mobile.',
          date:    new Date('2025-02-11')
        }
      ]
    },
    {
      title:       'Développement composants React',
      description: 'Créer la bibliothèque de composants réutilisables',
      priority:    'high',
      deadline:    new Date('2025-03-15'),
      status:      'inprogress',
      project:     projWeb._id,
      assignedTo:  fatima._id,
      comments: [
        {
          author:  youssef._id,
          content: 'Penser à rendre les composants accessibles ARIA',
          date:    new Date('2025-03-01')
        }
      ]
    },
    {
      title:       'Optimisation SEO',
      description: 'Ajouter les meta tags, sitemap et améliorer le score Lighthouse',
      priority:    'medium',
      deadline:    new Date('2025-04-20'),
      status:      'todo',
      project:     projWeb._id,
      assignedTo:  ali._id,
      comments:    []
    },

    // ── Projet RH ──────────────────────────────────────────────────────
    {
      title:       'Modélisation base de données',
      description: 'Créer les schémas Mongoose pour employés, contrats et congés',
      priority:    'high',
      deadline:    new Date('2024-09-15'),
      status:      'done',
      project:     projRH._id,
      assignedTo:  karim._id,
      comments: [
        {
          author:  sara._id,
          content: 'Bien pensé, ajouter le champ departement svp',
          date:    new Date('2024-09-16')
        },
        {
          author:  karim._id,
          content: 'Fait ! Mis à jour dans le commit 42',
          date:    new Date('2024-09-17')
        }
      ]
    },
    {
      title:       'Endpoints CRUD employés',
      description: 'Créer toutes les routes GET/POST/PUT/DELETE pour les employés',
      priority:    'high',
      deadline:    new Date('2024-10-30'),
      status:      'done',
      project:     projRH._id,
      assignedTo:  youssef._id,
      comments: [
        {
          author:  karim._id,
          content: 'Penser à la pagination sur le GET all !',
          date:    new Date('2024-10-15')
        }
      ]
    },
    {
      title:       'Documentation Swagger',
      description: 'Documenter tous les endpoints avec Swagger UI',
      priority:    'low',
      deadline:    new Date('2024-12-15'),
      status:      'done',
      project:     projRH._id,
      assignedTo:  karim._id,
      comments: [
        {
          author:  sara._id,
          content: 'Excellente doc, très claire pour les développeurs front !',
          date:    new Date('2024-12-18')
        }
      ]
    },

    // ── Projet Dashboard ───────────────────────────────────────────────
    {
      title:       'Choix de la stack de visualisation',
      description: 'Comparer Chart.js, Recharts et D3.js pour le dashboard',
      priority:    'medium',
      deadline:    new Date('2025-03-10'),
      status:      'done',
      project:     projDash._id,
      assignedTo:  fatima._id,
      comments: [
        {
          author:  sara._id,
          content: 'Recharts semble plus simple à intégrer avec React',
          date:    new Date('2025-03-08')
        },
        {
          author:  karim._id,
          content: 'D3.js est plus flexible mais plus complexe',
          date:    new Date('2025-03-09')
        },
        {
          author:  fatima._id,
          content: 'Je pars sur Recharts, décision validée en réunion.',
          date:    new Date('2025-03-10')
        }
      ]
    },
    {
      title:       'Connexion API temps réel',
      description: 'Implémenter WebSocket pour les données en live sur le dashboard',
      priority:    'high',
      deadline:    new Date('2025-05-15'),
      status:      'todo',
      project:     projDash._id,
      assignedTo:  karim._id,
      comments:    []
    }
  ]);

  console.log(`✅  ${tasks.length} tâches créées`);

  // ── Résumé final ───────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('   BASE DE DONNÉES : projet_m206_db');
  console.log('══════════════════════════════════════════════════');
  console.log(`   👥 Users    : ${users.length}`);
  console.log(`   📁 Projects : ${projects.length}`);
  console.log(`   ✅ Tasks    : ${tasks.length}`);
  console.log('══════════════════════════════════════════════════');
  console.log('\n   Comptes de test :');
  console.log('   sara@m206.ma    / Admin@1234   → admin');
  console.log('   youssef@m206.ma / Member@1234  → member');
  console.log('   fatima@m206.ma  / Member@1234  → member');
  console.log('   karim@m206.ma   / Member@1234  → member');
  console.log('   ali@m206.ma     / Guest@1234   → guest');
  console.log('   bloque@m206.ma  / Test@1234    → bloqué');
  console.log('══════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌  Déconnecté de MongoDB\n');
}

// ── Lancer ─────────────────────────────────────────────────────────────────
seed().catch(err => {
  console.error('\n❌  Erreur seed :', err.message);
  process.exit(1);
});