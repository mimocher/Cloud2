import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../services/api';

export default function Projects() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = JSON.parse(localStorage.getItem('user') || '{}');

  const [projects,    setProjects]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [modal,       setModal]       = useState(null);
  const [filters,     setFilters]     = useState({ name:'', status:'', category:'' });
  const [form,        setForm]        = useState({ name:'', description:'', startDate:'', endDate:'', status:'active', category:'' });

  useEffect(() => { fetchProjects(); fetchCategories(); }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.name)     params.name     = filters.name;
      if (filters.status)   params.status   = filters.status;
      if (filters.category) params.category = filters.category;
      const res = await API.get('/api/projects', { params });
      setProjects(res.data.projects || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await API.get('/api/projects/categories');
      setCategories(res.data.categories || []);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async () => {
    try {
      if (editProject) await API.put(`/api/projects/${editProject._id}`, form);
      else             await API.post('/api/projects', form);
      setShowForm(false);
      setEditProject(null);
      setForm({ name:'', description:'', startDate:'', endDate:'', status:'active', category:'' });
      fetchProjects(); fetchCategories();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  };

  const handleEdit = (p) => {
    setEditProject(p);
    setForm({ name: p.name, description: p.description||'', startDate: p.startDate?.split('T')[0]||'', endDate: p.endDate?.split('T')[0]||'', status: p.status, category: p.category||'' });
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/api/projects/${modal.id}`);
      fetchProjects();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
    finally { setModal(null); }
  };

  const statusConf = (s) => ({
    active:    { bg:'#EAF3DE', color:'#3B6D11', dot:'#639922',  label:'Actif'    },
    completed: { bg:'#EEEDFE', color:'#3C3489', dot:'#7F77DD',  label:'Terminé'  },
    paused:    { bg:'#FAEEDA', color:'#633806', dot:'#BA7517',  label:'En pause' },
  }[s] || { bg:'#f3f4f6', color:'#888', dot:'#aaa', label: s });

  const avBg  = (n='') => ['#EEEDFE','#E1F5EE','#FAEEDA','#E6F1FB','#FAECE7'][(n.charCodeAt(0)||0)%5];
  const avClr = (n='') => ['#3C3489','#085041','#633806','#0C447C','#993C1D'][(n.charCodeAt(0)||0)%5];

  const navLinks = [
    { icon:'◉', label:'Utilisateurs', path:'/dashboard' },
    { icon:'◈', label:'Projets',      path:'/projects'  },
    { icon:'✓', label:'Tâches',       path:'/tasks'     },
    { icon:'◫', label:'Chat',         path:'/chat'      },
    { icon:'◧', label:'Rapports',     path:'/reports'   },
  ];

  const resetForm = () => { setShowForm(false); setEditProject(null); setForm({ name:'', description:'', startDate:'', endDate:'', status:'active', category:'' }); };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes popIn  { from { transform:scale(.92); opacity:0; } to { transform:scale(1); opacity:1; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .nav-lnk:hover   { background:#EEEDFE; color:#3C3489; }
        .logout-btn:hover { background:#FCEBEB; color:#A32D2D; border-color:#F7C1C1; }
        .card-item:hover  { box-shadow:0 4px 20px rgba(127,119,221,.12); transform:translateY(-1px); }
        .btn:hover        { opacity:.8; }
        input:focus, select:focus, textarea:focus { outline:none; border-color:#7F77DD !important; box-shadow:0 0 0 3px rgba(127,119,221,.12); }
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
                style={{ ...s.nav, ...(active ? s.navActive : {}) }}>
                <span style={{ fontSize:'14px', width:'16px', textAlign:'center' }}>{n.icon}</span>
                {n.label}
              </div>
            );
          })}
          <div style={s.sideBottom}>
            <div style={s.userCard}>
              <div style={{ ...s.av, background: avBg(user.username), color: avClr(user.username) }}>
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
            <div>
              <div style={s.ptitle}>Projets</div>
              <div style={s.psub}>{projects.length} projet{projects.length > 1 ? 's' : ''} au total</div>
            </div>
            <button className="btn" style={s.btnAdd} onClick={() => { setShowForm(true); setEditProject(null); }}>
              + Nouveau projet
            </button>
          </div>

          {/* Filtres */}
          <div style={s.filterBar}>
            <input style={s.filterInput} placeholder="Rechercher par nom..." value={filters.name}
              onChange={e => setFilters({ ...filters, name: e.target.value })} />
            <select style={s.filterInput} value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="completed">Terminé</option>
              <option value="paused">En pause</option>
            </select>
            <select style={s.filterInput} value={filters.category}
              onChange={e => setFilters({ ...filters, category: e.target.value })}>
              <option value="">Toutes les catégories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn" style={s.btnFilter} onClick={fetchProjects}>Filtrer</button>
            <button className="btn" style={s.btnReset} onClick={() => { setFilters({ name:'', status:'', category:'' }); setTimeout(fetchProjects, 100); }}>Reset</button>
          </div>

          {/* Formulaire */}
          {showForm && (
            <div style={s.formCard}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                <div style={{ fontSize:'15px', fontWeight:600, color:'#111' }}>
                  {editProject ? 'Modifier le projet' : 'Nouveau projet'}
                </div>
                <button onClick={resetForm} style={{ background:'none', border:'none', color:'#aaa', cursor:'pointer', fontSize:'18px' }}>✕</button>
              </div>
              <div style={s.formGrid}>
                {[
                  { label:'Nom *',       key:'name',        type:'text',   placeholder:'Nom du projet' },
                  { label:'Catégorie',   key:'category',    type:'text',   placeholder:'Mobile, Web, Backend...' },
                  { label:'Date début *',key:'startDate',   type:'date',   placeholder:'' },
                  { label:'Date fin *',  key:'endDate',     type:'date',   placeholder:'' },
                ].map(f => (
                  <div key={f.key} style={s.formGroup}>
                    <label style={s.label}>{f.label}</label>
                    <input style={s.input} type={f.type} placeholder={f.placeholder}
                      value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                  </div>
                ))}
                <div style={s.formGroup}>
                  <label style={s.label}>Statut</label>
                  <select style={s.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Actif</option>
                    <option value="completed">Terminé</option>
                    <option value="paused">En pause</option>
                  </select>
                </div>
                <div style={{ ...s.formGroup, gridColumn:'span 2' }}>
                  <label style={s.label}>Description</label>
                  <textarea style={{ ...s.input, height:'80px', resize:'vertical' }}
                    value={form.description} placeholder="Description du projet..."
                    onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
                <button className="btn" style={s.btnSave} onClick={handleSubmit}>
                  {editProject ? 'Enregistrer' : 'Créer'}
                </button>
                <button className="btn" style={s.btnCancel} onClick={resetForm}>Annuler</button>
              </div>
            </div>
          )}

          {/* Grille projets */}
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'60px', color:'#888', gap:'10px', alignItems:'center' }}>
              <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:'2px solid #e5e7eb', borderTopColor:'#7F77DD', animation:'spin 0.7s linear infinite' }} />
              Chargement...
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#aaa', fontSize:'14px' }}>Aucun projet trouvé</div>
          ) : (
            <div style={s.grid}>
              {projects.map(p => {
                const sc = statusConf(p.status);
                return (
                  <div key={p._id} className="card-item" style={s.card}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                      <span style={s.catBadge}>{p.category || 'Sans catégorie'}</span>
                      <span style={{ ...s.badge, background: sc.bg, color: sc.color }}>
                        <span style={{ width:'5px', height:'5px', borderRadius:'50%', background: sc.dot, display:'inline-block' }} />
                        {sc.label}
                      </span>
                    </div>

                    <div style={{ fontSize:'15px', fontWeight:600, color:'#111', marginBottom:'6px' }}>{p.name}</div>
                    <div style={{ fontSize:'12px', color:'#888', marginBottom:'14px', lineHeight:1.5 }}>
                      {p.description || 'Aucune description'}
                    </div>

                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#aaa', marginBottom:'12px' }}>
                      <span>Début : {p.startDate ? new Date(p.startDate).toLocaleDateString('fr-FR') : '—'}</span>
                      <span>Fin : {p.endDate ? new Date(p.endDate).toLocaleDateString('fr-FR') : '—'}</span>
                    </div>

                    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'14px' }}>
                      <div style={{ ...s.av, width:'24px', height:'24px', fontSize:'10px', background: avBg(p.owner?.username), color: avClr(p.owner?.username) }}>
                        {(p.owner?.username||'?')[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize:'12px', color:'#555', fontWeight:500 }}>{p.owner?.username}</span>
                      {p.members?.length > 0 && (
                        <span style={{ fontSize:'11px', color:'#aaa' }}>+ {p.members.length} membre(s)</span>
                      )}
                    </div>

                    <div style={{ display:'flex', gap:'6px', borderTop:'0.5px solid #f3f4f6', paddingTop:'12px' }}>
                      <button className="btn" style={s.btnEdit}   onClick={() => handleEdit(p)}>Modifier</button>
                      <button className="btn" style={s.btnDelete} onClick={() => setModal({ id: p._id, name: p.name })}>Supprimer</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Modal suppression ── */}
      {modal && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalIcon}>🗑️</div>
            <div style={s.modalTitle}>Supprimer le projet</div>
            <div style={s.modalText}>
              Voulez-vous vraiment supprimer <strong>{modal.name}</strong> ?<br />
              <span style={{ color:'#aaa' }}>Cette action est irréversible.</span>
            </div>
            <div style={s.modalActions}>
              <button style={s.btnCancelModal} onClick={() => setModal(null)}>Annuler</button>
              <button style={s.btnConfirmModal} onClick={confirmDelete}>Supprimer</button>
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
  main:       { flex:1, marginLeft:'210px', padding:'32px 36px' },
  topBar:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' },
  ptitle:     { fontSize:'20px', fontWeight:600, color:'#111' },
  psub:       { fontSize:'13px', color:'#888', marginTop:'3px' },
  btnAdd:     { padding:'9px 18px', background:'#7F77DD', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:500 },
  filterBar:  { display:'flex', gap:'8px', marginBottom:'24px', flexWrap:'wrap', background:'#fff', padding:'14px 16px', borderRadius:'12px', border:'0.5px solid #e5e7eb' },
  filterInput:{ padding:'7px 12px', border:'0.5px solid #e5e7eb', borderRadius:'8px', fontSize:'12px', color:'#111', background:'#fff', minWidth:'150px' },
  btnFilter:  { padding:'7px 14px', background:'#7F77DD', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:500 },
  btnReset:   { padding:'7px 14px', background:'#f3f4f6', color:'#555', border:'0.5px solid #e5e7eb', borderRadius:'8px', cursor:'pointer', fontSize:'12px' },
  formCard:   { background:'#fff', padding:'24px', borderRadius:'12px', border:'0.5px solid #e5e7eb', marginBottom:'24px' },
  formGrid:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' },
  formGroup:  { display:'flex', flexDirection:'column' },
  label:      { marginBottom:'5px', fontWeight:500, color:'#555', fontSize:'12px' },
  input:      { padding:'9px 12px', border:'0.5px solid #e5e7eb', borderRadius:'8px', fontSize:'13px', color:'#111', background:'#fff' },
  btnSave:    { padding:'9px 20px', background:'#7F77DD', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:500 },
  btnCancel:  { padding:'9px 20px', background:'#f3f4f6', color:'#555', border:'0.5px solid #e5e7eb', borderRadius:'8px', cursor:'pointer', fontSize:'13px' },
  grid:       { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'16px' },
  card:       { background:'#fff', borderRadius:'12px', padding:'18px', border:'0.5px solid #e5e7eb', transition:'all .2s', cursor:'default' },
  catBadge:   { fontSize:'11px', color:'#3C3489', fontWeight:500, background:'#EEEDFE', padding:'3px 8px', borderRadius:'20px' },
  badge:      { display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:500 },
  btnEdit:    { flex:1, padding:'6px 10px', background:'#EEEDFE', color:'#3C3489', border:'0.5px solid #AFA9EC', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:500 },
  btnDelete:  { flex:1, padding:'6px 10px', background:'#FCEBEB', color:'#A32D2D', border:'0.5px solid #F7C1C1', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:500 },
  overlay:    { position:'fixed', inset:0, background:'rgba(15,10,40,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, backdropFilter:'blur(3px)', animation:'fadeIn .2s ease' },
  modalBox:   { background:'#fff', borderRadius:'16px', padding:'32px 28px', width:'360px', maxWidth:'90vw', animation:'popIn .22s ease', border:'0.5px solid #e5e7eb' },
  modalIcon:  { fontSize:'32px', textAlign:'center', marginBottom:'12px' },
  modalTitle: { fontSize:'16px', fontWeight:600, color:'#111', textAlign:'center', marginBottom:'8px' },
  modalText:  { fontSize:'13px', color:'#555', textAlign:'center', lineHeight:1.6, marginBottom:'24px' },
  modalActions:    { display:'flex', gap:'10px' },
  btnCancelModal:  { flex:1, padding:'10px', border:'0.5px solid #e5e7eb', background:'#fff', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:500, color:'#555' },
  btnConfirmModal: { flex:1, padding:'10px', background:'#FCEBEB', color:'#A32D2D', border:'0.5px solid #F7C1C1', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:500 },
};