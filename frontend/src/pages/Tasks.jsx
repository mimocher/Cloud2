import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../services/api';

const COLUMNS = [
  { key:'todo',       label:'À faire',  bg:'#f3f4f6', accent:'#6b7280', dotColor:'#9ca3af' },
  { key:'inprogress', label:'En cours', bg:'#FAEEDA', accent:'#633806', dotColor:'#BA7517' },
  { key:'done',       label:'Terminé',  bg:'#EAF3DE', accent:'#3B6D11', dotColor:'#639922' },
];

const PRIO = {
  low:    { bg:'#EAF3DE', color:'#3B6D11', label:'Basse'   },
  medium: { bg:'#FAEEDA', color:'#633806', label:'Moyenne' },
  high:   { bg:'#FCEBEB', color:'#A32D2D', label:'Haute'   },
};

export default function Tasks() {
  const navigate = useNavigate();
  const location = useLocation();
  const user     = JSON.parse(localStorage.getItem('user') || '{}');

  const [tasks,         setTasks]         = useState([]);
  const [projects,      setProjects]      = useState([]);
  const [users,         setUsers]         = useState([]);
  const [selProject,    setSelProject]    = useState('');
  const [showForm,      setShowForm]      = useState(false);
  const [editTask,      setEditTask]      = useState(null);
  const [selTask,       setSelTask]       = useState(null);
  const [comment,       setComment]       = useState('');
  const [dragTask,      setDragTask]      = useState(null);
  const [reminders,     setReminders]     = useState([]);
  const [showReminders, setShowReminders] = useState(false);
  const [modal,         setModal]         = useState(null);
  const [form, setForm] = useState({
    title:'', description:'', priority:'medium', deadline:'',
    assignedTo:'', reminderEnabled:false, reminderDaysBefore:1
  });

  useEffect(() => { fetchProjects(); fetchUsers(); fetchReminders(); }, []);
  useEffect(() => { if (selProject) fetchTasks(); }, [selProject]);

  const fetchProjects  = async () => { try { const r = await API.get('/api/projects'); setProjects(r.data.projects||[]); if(r.data.projects?.length) setSelProject(r.data.projects[0]._id); } catch(e){} };
  const fetchUsers     = async () => { try { const r = await API.get('/api/users');    setUsers(r.data.users||[]); } catch(e){} };
  const fetchTasks     = async () => { try { const r = await API.get('/api/tasks', { params:{ project:selProject } }); setTasks(r.data.tasks||[]); } catch(e){} };
  const fetchReminders = async () => { try { const r = await API.get('/api/tasks/reminders'); setReminders(r.data.reminders||[]); } catch(e){} };

  const resetForm = () => setForm({ title:'', description:'', priority:'medium', deadline:'', assignedTo:'', reminderEnabled:false, reminderDaysBefore:1 });

  const handleSubmit = async () => {
    try {
      if (editTask) await API.put(`/api/tasks/${editTask._id}`, form);
      else          await API.post('/api/tasks', { ...form, project: selProject });
      setShowForm(false); setEditTask(null); resetForm(); fetchTasks();
    } catch(err) { alert(err.response?.data?.error || 'Erreur'); }
  };

  const handleEdit = (task) => {
    setEditTask(task);
    setForm({ title:task.title, description:task.description||'', priority:task.priority, deadline:task.deadline?.split('T')[0]||'', assignedTo:task.assignedTo?._id||'', reminderEnabled:task.reminder?.enabled||false, reminderDaysBefore:task.reminder?.daysBefore||1 });
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/api/tasks/${modal.id}`);
      if (selTask?._id === modal.id) setSelTask(null);
      fetchTasks();
    } catch(err) { alert(err.response?.data?.error || 'Erreur'); }
    finally { setModal(null); }
  };

  const handleDrop = async (status) => {
    if (!dragTask || dragTask.status === status) return;
    try { await API.patch(`/api/tasks/${dragTask._id}/status`, { status }); fetchTasks(); } catch(e){}
    setDragTask(null);
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try { const r = await API.post(`/api/tasks/${selTask._id}/comments`, { content:comment }); setSelTask(r.data.task); setComment(''); fetchTasks(); } catch(e){}
  };

  const handleDeleteComment = async (cid) => {
    try { const r = await API.delete(`/api/tasks/${selTask._id}/comments/${cid}`); setSelTask(r.data.task); fetchTasks(); } catch(e){}
  };

  const handleUploadFile = async (file) => {
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try { const r = await API.post(`/api/tasks/${selTask._id}/files`, fd, { headers:{ 'Content-Type':'multipart/form-data' } }); setSelTask(r.data.task); fetchTasks(); } catch(e){ alert(e.response?.data?.error||'Erreur upload'); }
  };

  const handleDeleteFile = async (filename) => {
    try { const r = await API.delete(`/api/tasks/${selTask._id}/files/${filename}`); setSelTask(r.data.task); fetchTasks(); } catch(e){}
  };

  const handleDownloadFile = (taskId, filename) => window.open(`http://localhost:5000/api/tasks/${taskId}/files/${filename}`, '_blank');

  const handleSetReminder = async (taskId, enabled, daysBefore) => {
    try { const r = await API.patch(`/api/tasks/${taskId}/reminder`, { enabled, daysBefore:Number(daysBefore) }); setSelTask(r.data.task); fetchTasks(); fetchReminders(); } catch(e){}
  };

  const tasksByStatus = (s) => tasks.filter(t => t.status === s);

  const avBg  = (n='') => ['#EEEDFE','#E1F5EE','#FAEEDA','#E6F1FB','#FAECE7'][(n.charCodeAt(0)||0)%5];
  const avClr = (n='') => ['#3C3489','#085041','#633806','#0C447C','#993C1D'][(n.charCodeAt(0)||0)%5];

  const navLinks = [
    { icon:'◉', label:'Utilisateurs', path:'/dashboard' },
    { icon:'◈', label:'Projets',      path:'/projects'  },
    { icon:'✓', label:'Tâches',       path:'/tasks'     },
    { icon:'◫', label:'Chat',         path:'/chat'      },
    { icon:'◧', label:'Rapports',     path:'/reports'   },
  ];

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes popIn  { from{transform:scale(.92);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .nav-lnk:hover    { background:#EEEDFE; color:#3C3489; }
        .logout-btn:hover { background:#FCEBEB; color:#A32D2D; border-color:#F7C1C1; }
        .task-card:hover  { border-color:#AFA9EC; }
        .btn:hover        { opacity:.8; }
        .col-drop         { transition:background .15s; }
        .col-drop.drag-over { background:#f0efff; }
        input:focus,select:focus,textarea:focus { outline:none; border-color:#7F77DD !important; box-shadow:0 0 0 3px rgba(127,119,221,.12); }
      `}</style>

      <div style={s.layout}>
        {/* ── Sidebar ── */}
        <aside style={s.side}>
          <div style={s.logo}>Projet <span style={{ color:'#7F77DD' }}>M206</span></div>
          <div style={s.navSection}>Navigation</div>
          {navLinks.map(n => {
            const active = location.pathname === n.path;
            return (
              <div key={n.path} className="nav-lnk" onClick={() => navigate(n.path)}
                style={{ ...s.nav, ...(active ? s.navActive:{}) }}>
                <span style={{ fontSize:'14px', width:'16px', textAlign:'center' }}>{n.icon}</span>
                {n.label}
              </div>
            );
          })}
          <div style={s.sideBottom}>
            <div style={s.userCard}>
              <div style={{ ...s.av, background:avBg(user.username), color:avClr(user.username) }}>
                {(user.username||'U')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:'13px', fontWeight:500, color:'#111' }}>{user.username}</div>
                <div style={{ fontSize:'11px', color:'#888' }}>{user.role}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={() => { localStorage.clear(); navigate('/login'); }} style={s.logout}>
              ↩ Déconnexion
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={s.main}>
          {/* Top bar */}
          <div style={s.topBar}>
            <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
              <div>
                <div style={s.ptitle}>Tableau Kanban</div>
                <div style={s.psub}>{tasks.length} tâche{tasks.length>1?'s':''}</div>
              </div>
              <select style={s.projSelect} value={selProject} onChange={e => setSelProject(e.target.value)}>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              {/* Cloche rappels */}
              <button onClick={() => setShowReminders(!showReminders)} style={s.bellBtn}>
                ⏰
                {reminders.length > 0 && <span style={s.bellBadge}>{reminders.length}</span>}
              </button>
              <button className="btn" style={s.btnAdd} onClick={() => { setShowForm(true); setEditTask(null); resetForm(); }}>
                + Nouvelle tâche
              </button>
            </div>
          </div>

          {/* Panel rappels */}
          {showReminders && (
            <div style={s.reminderPanel}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'#111', marginBottom:'10px' }}>
                Rappels de deadlines
              </div>
              {reminders.length === 0
                ? <div style={{ color:'#aaa', fontSize:'13px' }}>Aucun rappel actif</div>
                : reminders.map((r, i) => (
                    <div key={i} style={s.reminderItem}>
                      <div style={{ flex:1 }}>
                        <span style={{ fontWeight:500, fontSize:'13px' }}>{r.title}</span>
                        <span style={{ fontSize:'11px', color:'#888', marginLeft:'8px' }}>Deadline : {r.deadline}</span>
                      </div>
                      <span style={{ ...s.badge, background: r.daysLeft<=0?'#FCEBEB':r.daysLeft===1?'#FAEEDA':'#EEEDFE', color: r.daysLeft<=0?'#A32D2D':r.daysLeft===1?'#633806':'#3C3489' }}>
                        {r.daysLeft<=0?'En retard !':r.daysLeft===1?'Demain !':`${r.daysLeft} jours`}
                      </span>
                      <span style={{ ...s.badge, background:PRIO[r.priority]?.bg, color:PRIO[r.priority]?.color }}>
                        {PRIO[r.priority]?.label}
                      </span>
                    </div>
                  ))
              }
            </div>
          )}

          {/* Formulaire */}
          {showForm && (
            <div style={s.formCard}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                <div style={{ fontSize:'14px', fontWeight:600, color:'#111' }}>{editTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</div>
                <button onClick={() => { setShowForm(false); setEditTask(null); resetForm(); }} style={{ background:'none', border:'none', color:'#aaa', cursor:'pointer', fontSize:'16px' }}>✕</button>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label style={s.label}>Titre *</label>
                  <input style={s.input} value={form.title} placeholder="Titre de la tâche" onChange={e => setForm({...form, title:e.target.value})} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Priorité</label>
                  <select style={s.input} value={form.priority} onChange={e => setForm({...form, priority:e.target.value})}>
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Deadline</label>
                  <input style={s.input} type="date" value={form.deadline} onChange={e => setForm({...form, deadline:e.target.value})} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Assigné à</label>
                  <select style={s.input} value={form.assignedTo} onChange={e => setForm({...form, assignedTo:e.target.value})}>
                    <option value="">Non assigné</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.username}</option>)}
                  </select>
                </div>
                <div style={{ ...s.formGroup, gridColumn:'span 2' }}>
                  <label style={s.label}>Description</label>
                  <textarea style={{ ...s.input, height:'70px', resize:'vertical' }} value={form.description} placeholder="Description..." onChange={e => setForm({...form, description:e.target.value})} />
                </div>
                <div style={{ ...s.formGroup, gridColumn:'span 2' }}>
                  <label style={s.label}>Rappel deadline</label>
                  <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                    <label style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'13px' }}>
                      <input type="checkbox" checked={form.reminderEnabled} onChange={e => setForm({...form, reminderEnabled:e.target.checked})} />
                      Activer le rappel
                    </label>
                    {form.reminderEnabled && (
                      <select style={{ ...s.input, width:'auto' }} value={form.reminderDaysBefore} onChange={e => setForm({...form, reminderDaysBefore:e.target.value})}>
                        <option value={1}>1 jour avant</option>
                        <option value={2}>2 jours avant</option>
                        <option value={3}>3 jours avant</option>
                        <option value={7}>1 semaine avant</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
                <button className="btn" style={s.btnSave} onClick={handleSubmit}>{editTask ? 'Enregistrer' : 'Créer'}</button>
                <button className="btn" style={s.btnCancel} onClick={() => { setShowForm(false); setEditTask(null); resetForm(); }}>Annuler</button>
              </div>
            </div>
          )}

          {/* ── Kanban ── */}
          <div style={s.kanban}>
            {COLUMNS.map(col => (
              <div key={col.key} className="col-drop"
                style={s.column}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                onDrop={e => { e.currentTarget.classList.remove('drag-over'); handleDrop(col.key); }}>

                {/* Colonne header */}
                <div style={{ ...s.colHeader, background: col.bg }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:col.dotColor }} />
                    <span style={{ fontSize:'13px', fontWeight:600, color:col.accent }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize:'11px', fontWeight:600, background:col.accent, color:'#fff', padding:'2px 8px', borderRadius:'20px' }}>
                    {tasksByStatus(col.key).length}
                  </span>
                </div>

                {/* Tâches */}
                <div style={s.colBody}>
                  {tasksByStatus(col.key).length === 0 && (
                    <div style={s.emptyCol}>Aucune tâche</div>
                  )}
                  {tasksByStatus(col.key).map(task => {
                    const pc = PRIO[task.priority] || PRIO.medium;
                    const overdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';
                    return (
                      <div key={task._id} className="task-card"
                        draggable onDragStart={() => setDragTask(task)}
                        style={{ ...s.taskCard, borderLeft:`3px solid ${overdue?'#E24B4A':pc.color}` }}>

                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                          <span style={{ ...s.badge, background:pc.bg, color:pc.color }}>{pc.label}</span>
                          <div style={{ display:'flex', gap:'4px' }}>
                            {task.reminder?.enabled && <span style={{ fontSize:'12px' }}>⏰</span>}
                            {task.files?.length > 0 && <span style={{ fontSize:'12px' }}>📎</span>}
                          </div>
                        </div>

                        <div style={{ fontSize:'13px', fontWeight:600, color:'#111', marginBottom:'6px' }}>{task.title}</div>

                        {task.deadline && (
                          <div style={{ fontSize:'11px', color: overdue?'#A32D2D':'#aaa', marginBottom:'4px' }}>
                            {new Date(task.deadline).toLocaleDateString('fr-FR')}
                            {overdue && ' — En retard !'}
                          </div>
                        )}

                        {task.assignedTo && (
                          <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'8px' }}>
                            <div style={{ ...s.av, width:'20px', height:'20px', fontSize:'9px', background:avBg(task.assignedTo.username), color:avClr(task.assignedTo.username) }}>
                              {task.assignedTo.username[0].toUpperCase()}
                            </div>
                            <span style={{ fontSize:'11px', color:'#888' }}>{task.assignedTo.username}</span>
                          </div>
                        )}

                        {(task.comments?.length > 0 || task.files?.length > 0) && (
                          <div style={{ display:'flex', gap:'6px', marginBottom:'8px' }}>
                            {task.comments?.length > 0 && <span style={s.metaTag}>💬 {task.comments.length}</span>}
                            {task.files?.length > 0    && <span style={s.metaTag}>📎 {task.files.length}</span>}
                          </div>
                        )}

                        <div style={{ display:'flex', gap:'5px', borderTop:'0.5px solid #f3f4f6', paddingTop:'8px' }}>
                          <button className="btn" style={s.btnView}   onClick={() => setSelTask(task)}>Voir</button>
                          <button className="btn" style={s.btnEdit}   onClick={() => handleEdit(task)}>Modifier</button>
                          <button className="btn" style={s.btnDel}    onClick={() => setModal({ id:task._id, name:task.title })}>Suppr.</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* ── Modal détail tâche ── */}
      {selTask && (
        <div style={s.overlay} onClick={() => setSelTask(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={{ fontSize:'16px', fontWeight:600, color:'#111' }}>{selTask.title}</div>
              <button onClick={() => setSelTask(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:'18px' }}>✕</button>
            </div>
            <div style={s.modalBody}>

              {/* Infos */}
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px' }}>
                <span style={{ ...s.badge, background:PRIO[selTask.priority]?.bg, color:PRIO[selTask.priority]?.color }}>{PRIO[selTask.priority]?.label}</span>
                <span style={{ ...s.badge, background:'#f3f4f6', color:'#555' }}>{selTask.status}</span>
                {selTask.assignedTo && <span style={{ ...s.badge, background:avBg(selTask.assignedTo.username), color:avClr(selTask.assignedTo.username) }}>{selTask.assignedTo.username}</span>}
                {selTask.deadline && <span style={{ ...s.badge, background:'#f3f4f6', color:'#888' }}>{new Date(selTask.deadline).toLocaleDateString('fr-FR')}</span>}
              </div>
              {selTask.description && <div style={{ fontSize:'13px', color:'#555', marginBottom:'16px', lineHeight:1.6 }}>{selTask.description}</div>}

              {/* Rappel */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Rappel deadline</div>
                <div style={{ display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'13px' }}>
                    <input type="checkbox" checked={selTask.reminder?.enabled||false}
                      onChange={e => handleSetReminder(selTask._id, e.target.checked, selTask.reminder?.daysBefore||1)} />
                    Activer
                  </label>
                  {selTask.reminder?.enabled && (
                    <select style={{ ...s.input, width:'auto', padding:'5px 10px', fontSize:'12px' }}
                      value={selTask.reminder?.daysBefore||1}
                      onChange={e => handleSetReminder(selTask._id, true, e.target.value)}>
                      <option value={1}>1 jour avant</option>
                      <option value={2}>2 jours avant</option>
                      <option value={3}>3 jours avant</option>
                      <option value={7}>1 semaine avant</option>
                    </select>
                  )}
                  {selTask.reminder?.enabled && (
                    <span style={{ fontSize:'12px', color: selTask.reminder?.sent?'#3B6D11':'#633806' }}>
                      {selTask.reminder?.sent ? '✓ Rappel envoyé' : '◌ En attente'}
                    </span>
                  )}
                </div>
              </div>

              {/* Fichiers */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Fichiers joints ({selTask.files?.length||0})</div>
                {selTask.files?.map((f, i) => (
                  <div key={i} style={s.fileItem}>
                    <span>{f.mimetype?.includes('image')?'🖼️':f.mimetype?.includes('pdf')?'📕':f.mimetype?.includes('word')?'📝':'📄'}</span>
                    <span style={{ flex:1, fontSize:'12px', color:'#333' }}>{f.originalname}</span>
                    <span style={{ fontSize:'11px', color:'#aaa' }}>{(f.size/1024).toFixed(1)} KB</span>
                    <button className="btn" style={s.btnDownload} onClick={() => handleDownloadFile(selTask._id, f.filename)}>↓</button>
                    <button className="btn" style={s.btnDelSm}    onClick={() => handleDeleteFile(f.filename)}>✕</button>
                  </div>
                ))}
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'10px', padding:'10px', background:'#f8f8ff', borderRadius:'8px', border:'1px dashed #AFA9EC' }}>
                  <input type="file" id="fileInput" style={{ display:'none' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                    onChange={e => { if(e.target.files[0]) handleUploadFile(e.target.files[0]); e.target.value=''; }} />
                  <button className="btn" style={s.btnUpload} onClick={() => document.getElementById('fileInput').click()}>+ Joindre</button>
                  <span style={{ fontSize:'11px', color:'#aaa' }}>Max 5MB — PDF, Word, Excel, Images</span>
                </div>
              </div>

              {/* Commentaires */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Commentaires ({selTask.comments?.length||0})</div>
                <div style={{ maxHeight:'180px', overflowY:'auto', marginBottom:'10px' }}>
                  {selTask.comments?.length === 0 && <div style={{ color:'#aaa', fontSize:'12px' }}>Aucun commentaire</div>}
                  {selTask.comments?.map((c, i) => (
                    <div key={i} style={s.commentItem}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <div style={{ ...s.av, width:'22px', height:'22px', fontSize:'9px', background:avBg(c.author?.username||''), color:avClr(c.author?.username||'') }}>
                            {(c.author?.username||'?')[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize:'12px', fontWeight:500, color:'#3C3489' }}>{c.author?.username||'Utilisateur'}</span>
                          <span style={{ fontSize:'11px', color:'#aaa' }}>{new Date(c.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {(user.role==='admin'||c.author?._id===user.id) && (
                          <button onClick={() => handleDeleteComment(c._id)} style={{ background:'none', border:'none', color:'#ccc', cursor:'pointer', fontSize:'12px' }}>✕</button>
                        )}
                      </div>
                      <div style={{ fontSize:'13px', color:'#333' }}>{c.content}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <input style={{ ...s.input, flex:1, fontSize:'13px' }} placeholder="Ajouter un commentaire..."
                    value={comment} onChange={e => setComment(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && handleAddComment()} />
                  <button className="btn" style={s.btnSave} onClick={handleAddComment}>Envoyer</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal suppression ── */}
      {modal && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={{ ...s.modal, maxWidth:'360px', padding:'32px 28px', animation:'popIn .22s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'32px', textAlign:'center', marginBottom:'12px' }}>🗑️</div>
            <div style={{ fontSize:'16px', fontWeight:600, color:'#111', textAlign:'center', marginBottom:'8px' }}>Supprimer la tâche</div>
            <div style={{ fontSize:'13px', color:'#555', textAlign:'center', lineHeight:1.6, marginBottom:'24px' }}>
              Voulez-vous supprimer <strong>{modal.name}</strong> ?<br />
              <span style={{ color:'#aaa' }}>Cette action est irréversible.</span>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button style={s.btnCancel} onClick={() => setModal(null)}>Annuler</button>
              <button style={{ ...s.btnSave, background:'#FCEBEB', color:'#A32D2D', border:'0.5px solid #F7C1C1', flex:1 }} onClick={confirmDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:       { fontFamily:"'Segoe UI', system-ui, sans-serif", background:'#f7f7f8', minHeight:'100vh' },
  layout:     { display:'flex', minHeight:'100vh' },
  side:       { width:'210px', background:'#fff', borderRight:'0.5px solid #e5e7eb', padding:'20px 12px', display:'flex', flexDirection:'column', gap:'2px', flexShrink:0, position:'fixed', top:0, left:0, height:'100vh' },
  logo:       { fontSize:'16px', fontWeight:600, padding:'0 8px', marginBottom:'12px', color:'#111' },
  navSection: { fontSize:'10px', color:'#aaa', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:'0 10px', margin:'4px 0 6px' },
  nav:        { display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', borderRadius:'8px', fontSize:'13px', color:'#555', cursor:'pointer', transition:'all .15s' },
  navActive:  { background:'#EEEDFE', color:'#3C3489', fontWeight:500 },
  sideBottom: { marginTop:'auto', borderTop:'0.5px solid #e5e7eb', paddingTop:'12px' },
  userCard:   { display:'flex', alignItems:'center', gap:'8px', padding:'8px' },
  av:         { width:'30px', height:'30px', borderRadius:'50%', fontSize:'12px', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  logout:     { width:'100%', marginTop:'8px', padding:'7px', border:'0.5px solid #e5e7eb', background:'transparent', borderRadius:'8px', fontSize:'12px', color:'#888', cursor:'pointer', transition:'all .15s' },
  main:       { flex:1, marginLeft:'210px', padding:'28px 32px' },
  topBar:     { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' },
  ptitle:     { fontSize:'20px', fontWeight:600, color:'#111' },
  psub:       { fontSize:'12px', color:'#888', marginTop:'2px' },
  projSelect: { padding:'7px 12px', border:'0.5px solid #e5e7eb', borderRadius:'8px', fontSize:'13px', color:'#111', background:'#fff', minWidth:'180px' },
  bellBtn:    { position:'relative', padding:'7px 10px', background:'#fff', border:'0.5px solid #e5e7eb', borderRadius:'8px', cursor:'pointer', fontSize:'15px' },
  bellBadge:  { position:'absolute', top:'-4px', right:'-4px', background:'#E24B4A', color:'#fff', borderRadius:'50%', width:'16px', height:'16px', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center' },
  btnAdd:     { padding:'9px 18px', background:'#7F77DD', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:500 },
  reminderPanel: { background:'#fff', border:'0.5px solid #e5e7eb', borderRadius:'12px', padding:'14px 18px', marginBottom:'16px' },
  reminderItem:  { display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', background:'#fafafa', borderRadius:'8px', marginBottom:'6px' },
  badge:      { display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:500 },
  formCard:   { background:'#fff', padding:'20px', borderRadius:'12px', border:'0.5px solid #e5e7eb', marginBottom:'16px' },
  formGrid:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' },
  formGroup:  { display:'flex', flexDirection:'column' },
  label:      { marginBottom:'5px', fontWeight:500, color:'#555', fontSize:'12px' },
  input:      { padding:'8px 12px', border:'0.5px solid #e5e7eb', borderRadius:'8px', fontSize:'13px', color:'#111', background:'#fff' },
  btnSave:    { flex:1, padding:'9px 18px', background:'#7F77DD', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:500 },
  btnCancel:  { flex:1, padding:'9px 18px', background:'#f3f4f6', color:'#555', border:'0.5px solid #e5e7eb', borderRadius:'8px', cursor:'pointer', fontSize:'13px' },
  kanban:     { display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'16px' },
  column:     { background:'#fff', borderRadius:'12px', border:'0.5px solid #e5e7eb', overflow:'hidden', minHeight:'500px' },
  colHeader:  { padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  colBody:    { padding:'10px' },
  taskCard:   { background:'#fafafa', border:'0.5px solid #e5e7eb', borderRadius:'10px', padding:'12px', marginBottom:'8px', cursor:'grab', transition:'border-color .15s' },
  emptyCol:   { textAlign:'center', color:'#ccc', fontSize:'12px', padding:'30px 0' },
  metaTag:    { fontSize:'10px', color:'#888', background:'#f0f0f0', padding:'2px 6px', borderRadius:'10px' },
  btnView:    { flex:1, padding:'5px 8px', background:'#EEEDFE', color:'#3C3489', border:'0.5px solid #AFA9EC', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:500 },
  btnEdit:    { flex:1, padding:'5px 8px', background:'#FAEEDA', color:'#633806', border:'0.5px solid #FAC775', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:500 },
  btnDel:     { flex:1, padding:'5px 8px', background:'#FCEBEB', color:'#A32D2D', border:'0.5px solid #F7C1C1', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:500 },
  overlay:    { position:'fixed', inset:0, background:'rgba(15,10,40,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, backdropFilter:'blur(3px)', animation:'fadeIn .2s ease' },
  modal:      { background:'#fff', borderRadius:'16px', width:'90%', maxWidth:'620px', maxHeight:'88vh', overflowY:'auto', animation:'popIn .22s ease', border:'0.5px solid #e5e7eb' },
  modalHeader:{ padding:'18px 22px', borderBottom:'0.5px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#fff' },
  modalBody:  { padding:'20px 22px' },
  section:    { borderTop:'0.5px solid #f3f4f6', paddingTop:'14px', marginTop:'14px' },
  sectionTitle:{ fontSize:'12px', fontWeight:600, color:'#555', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.5px' },
  fileItem:   { display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', background:'#fafafa', borderRadius:'8px', marginBottom:'5px' },
  btnDownload:{ padding:'4px 10px', background:'#EEEDFE', color:'#3C3489', border:'0.5px solid #AFA9EC', borderRadius:'6px', cursor:'pointer', fontSize:'11px' },
  btnDelSm:   { padding:'4px 8px', background:'#FCEBEB', color:'#A32D2D', border:'0.5px solid #F7C1C1', borderRadius:'6px', cursor:'pointer', fontSize:'11px' },
  btnUpload:  { padding:'7px 14px', background:'#EAF3DE', color:'#3B6D11', border:'0.5px solid #C0DD97', borderRadius:'7px', cursor:'pointer', fontSize:'12px', fontWeight:500 },
  commentItem:{ background:'#fafafa', borderRadius:'8px', padding:'10px', marginBottom:'6px', border:'0.5px solid #f3f4f6' },
};