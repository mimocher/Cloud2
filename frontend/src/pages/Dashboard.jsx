import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../services/api';

export default function Dashboard() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // { type: 'block'|'unblock'|'delete', user }

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await API.get('/api/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ── actions ── */
  const confirmAction = async () => {
    if (!modal) return;
    try {
      if (modal.type === 'block')   await API.put(`/api/admin/block/${modal.user._id}`);
      if (modal.type === 'unblock') await API.put(`/api/admin/unblock/${modal.user._id}`);
      if (modal.type === 'delete')  await API.delete(`/api/users/${modal.user._id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setModal(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: 'Total',   value: users.length },
    { label: 'Actifs',  value: users.filter(u => !u.isBlocked).length },
    { label: 'Bloqués', value: users.filter(u =>  u.isBlocked).length },
    { label: 'Admins',  value: users.filter(u => u.role === 'admin').length },
  ];

  const roleStyle = (role) => ({
    admin:  { bg: '#EEEDFE', color: '#3C3489', dot: '#7F77DD' },
    member: { bg: '#E1F5EE', color: '#085041', dot: '#1D9E75' },
    guest:  { bg: '#FAEEDA', color: '#633806', dot: '#BA7517' },
  }[role] || { bg: '#FAEEDA', color: '#633806', dot: '#BA7517' });

  const avBg  = (n='') => ['#EEEDFE','#E1F5EE','#FAEEDA','#E6F1FB','#FAECE7'][(n.charCodeAt(0)||0)%5];
  const avClr = (n='') => ['#3C3489','#085041','#633806','#0C447C','#993C1D'][(n.charCodeAt(0)||0)%5];

  /* ── nav links ── */
  const navLinks = [
    { icon: '◉', label: 'Utilisateurs', path: '/dashboard' },
    { icon: '◈', label: 'Projets',      path: '/projects'  },
    { icon: '✓', label: 'Tâches',       path: '/tasks'     },
    { icon: '◫', label: 'Chat',         path: '/chat'      },
    { icon: '◧', label: 'Rapports',     path: '/reports'   },
  ];

  /* ── modal config ── */
  const modalConfig = {
    block:   { icon: '🔒', title: 'Bloquer l\'utilisateur',    text: 'Cet utilisateur ne pourra plus se connecter.',  confirmCls: 'btn-modal-warn',  confirmLabel: 'Bloquer'    },
    unblock: { icon: '🔓', title: 'Débloquer l\'utilisateur',  text: 'Cet utilisateur pourra de nouveau se connecter.', confirmCls: 'btn-modal-ok',  confirmLabel: 'Débloquer'  },
    delete:  { icon: '🗑️', title: 'Supprimer l\'utilisateur',  text: 'Cette action est irréversible.',                confirmCls: 'btn-modal-danger', confirmLabel: 'Supprimer' },
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes popIn   { from { transform:scale(.92); opacity:0; } to { transform:scale(1); opacity:1; } }
        .nav-lnk:hover     { background:#EEEDFE; color:#3C3489; }
        .tr-row:hover td   { background:#fafafa; }
        .btn:hover         { opacity:.8; }
        .logout-btn:hover  { background:#FCEBEB; color:#A32D2D; border-color:#F7C1C1; }
        .btn-modal-warn    { background:#FAEEDA; color:#633806; border:0.5px solid #FAC775; }
        .btn-modal-warn:hover   { background:#FAC775; }
        .btn-modal-ok      { background:#EAF3DE; color:#3B6D11; border:0.5px solid #C0DD97; }
        .btn-modal-ok:hover     { background:#C0DD97; }
        .btn-modal-danger  { background:#FCEBEB; color:#A32D2D; border:0.5px solid #F7C1C1; }
        .btn-modal-danger:hover { background:#F7C1C1; }
        input:focus { outline:none; border-color:#7F77DD !important; box-shadow:0 0 0 3px rgba(127,119,221,.12); }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={s.side}>
        <div style={s.logo}>Projet <span style={{ color:'#7F77DD' }}>M206</span></div>

        <div style={{ fontSize:'10px', color:'#aaa', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:'0 10px', marginBottom:'6px' }}>Navigation</div>

        {navLinks.map(n => {
          const active = location.pathname === n.path;
          return (
            <div
              key={n.path}
              className="nav-lnk"
              onClick={() => navigate(n.path)}
              style={{ ...s.nav, ...(active ? s.navActive : {}) }}
            >
              <span style={{ fontSize:'14px', width:'16px', textAlign:'center' }}>{n.icon}</span>
              {n.label}
            </div>
          );
        })}

        <div style={s.sideBottom}>
          <div style={s.userCard}>
            <div style={{ ...s.av, background: avBg(currentUser.username), color: avClr(currentUser.username) }}>
              {(currentUser.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:'13px', fontWeight:500, color:'#111' }}>{currentUser.username || 'Utilisateur'}</div>
              <div style={{ fontSize:'11px', color:'#888' }}>{currentUser.role}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} style={s.logout}>↩ Déconnexion</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={s.main}>
        <div style={s.ptitle}>Utilisateurs</div>
        <div style={s.psub}>Gérez les comptes, rôles et accès de votre équipe</div>

        {/* Stats */}
        <div style={s.statsGrid}>
          {stats.map(st => (
            <div key={st.label} style={s.statCard}>
              <div style={s.statNum}>{st.value}</div>
              <div style={s.statLabel}>{st.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={s.tableCard}>
          <div style={s.tableTop}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={s.tableTitle}>Tous les utilisateurs</span>
              <span style={s.count}>{filtered.length}</span>
            </div>
            <input
              style={s.search}
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div style={s.loading}><div style={s.spinner} /> Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={s.empty}>Aucun utilisateur trouvé</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Utilisateur</th>
                  <th style={s.th}>Rôle</th>
                  <th style={s.th}>Statut</th>
                  {currentUser.role === 'admin' && <th style={s.th}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const rs = roleStyle(u.role);
                  return (
                    <tr key={u._id} className="tr-row">
                      <td style={s.td}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ ...s.av, background: avBg(u.username), color: avClr(u.username) }}>
                            {(u.username||'?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight:500, fontSize:'13px', color:'#111' }}>{u.username}</div>
                            <div style={{ fontSize:'11px', color:'#888' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: rs.bg, color: rs.color }}>
                          <span style={{ width:'5px', height:'5px', borderRadius:'50%', background: rs.dot, display:'inline-block' }} />
                          {u.role}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: u.isBlocked?'#FCEBEB':'#EAF3DE', color: u.isBlocked?'#A32D2D':'#3B6D11' }}>
                          <span style={{ width:'5px', height:'5px', borderRadius:'50%', background: u.isBlocked?'#E24B4A':'#639922', display:'inline-block' }} />
                          {u.isBlocked ? 'Bloqué' : 'Actif'}
                        </span>
                      </td>
                      {currentUser.role === 'admin' && (
                        <td style={s.td}>
                          <div style={{ display:'flex', gap:'6px' }}>
                            {u.isBlocked
                              ? <button className="btn" style={s.btnG} onClick={() => setModal({ type:'unblock', user:u })}>Débloquer</button>
                              : <button className="btn" style={s.btnO} onClick={() => setModal({ type:'block',   user:u })}>Bloquer</button>
                            }
                            <button className="btn" style={s.btnR} onClick={() => setModal({ type:'delete', user:u })}>Supprimer</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ── Modal de confirmation ── */}
      {modal && (() => {
        const cfg = modalConfig[modal.type];
        return (
          <div style={s.overlay} onClick={() => setModal(null)}>
            <div style={s.modalBox} onClick={e => e.stopPropagation()}>
              <div style={s.modalIcon}>{cfg.icon}</div>
              <div style={s.modalTitle}>{cfg.title}</div>
              <div style={s.modalText}>
                Voulez-vous vraiment effectuer cette action sur <strong>{modal.user.username}</strong> ?<br />
                <span style={{ color:'#aaa' }}>{cfg.text}</span>
              </div>
              <div style={s.modalActions}>
                <button style={s.btnCancel} onClick={() => setModal(null)}>Annuler</button>
                <button className={cfg.confirmCls} style={s.btnConfirm} onClick={confirmAction}>
                  {cfg.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const s = {
  page:       { display:'flex', minHeight:'100vh', background:'#f7f7f8', fontFamily:"'Segoe UI', system-ui, sans-serif" },
  side:       { width:'210px', background:'#fff', borderRight:'0.5px solid #e5e7eb', padding:'20px 12px', display:'flex', flexDirection:'column', gap:'2px', flexShrink:0, position:'fixed', top:0, left:0, height:'100vh' },
  logo:       { fontSize:'16px', fontWeight:600, padding:'0 8px', marginBottom:'12px', color:'#111' },
  nav:        { display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', borderRadius:'8px', fontSize:'13px', color:'#555', cursor:'pointer', transition:'all 0.15s' },
  navActive:  { background:'#EEEDFE', color:'#3C3489', fontWeight:500 },
  sideBottom: { marginTop:'auto', borderTop:'0.5px solid #e5e7eb', paddingTop:'12px' },
  userCard:   { display:'flex', alignItems:'center', gap:'8px', padding:'8px' },
  av:         { width:'30px', height:'30px', borderRadius:'50%', fontSize:'12px', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  logout:     { width:'100%', marginTop:'8px', padding:'7px', border:'0.5px solid #e5e7eb', background:'transparent', borderRadius:'8px', fontSize:'12px', color:'#888', cursor:'pointer', transition:'all 0.15s' },
  main:       { flex:1, marginLeft:'210px', padding:'32px 36px' },
  ptitle:     { fontSize:'20px', fontWeight:600, color:'#111' },
  psub:       { fontSize:'13px', color:'#888', marginTop:'3px' },
  statsGrid:  { display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:'10px', margin:'20px 0' },
  statCard:   { background:'#fff', border:'0.5px solid #e5e7eb', borderRadius:'10px', padding:'16px' },
  statNum:    { fontSize:'24px', fontWeight:600, color:'#111' },
  statLabel:  { fontSize:'12px', color:'#888', marginTop:'2px' },
  tableCard:  { background:'#fff', border:'0.5px solid #e5e7eb', borderRadius:'12px', overflow:'hidden' },
  tableTop:   { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'0.5px solid #e5e7eb' },
  tableTitle: { fontSize:'14px', fontWeight:600, color:'#111' },
  count:      { fontSize:'11px', background:'#EEEDFE', color:'#3C3489', padding:'2px 8px', borderRadius:'20px' },
  search:     { padding:'7px 12px', border:'0.5px solid #d1d5db', borderRadius:'8px', fontSize:'12px', color:'#111', background:'#fff', width:'200px' },
  table:      { width:'100%', borderCollapse:'collapse' },
  thead:      { background:'#fafafa' },
  th:         { padding:'10px 20px', textAlign:'left', fontSize:'10px', fontWeight:600, color:'#888', letterSpacing:'0.5px', textTransform:'uppercase', borderBottom:'0.5px solid #e5e7eb' },
  td:         { padding:'12px 20px', fontSize:'13px', color:'#333', borderBottom:'0.5px solid #f3f4f6' },
  badge:      { display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:500 },
  btnO:       { padding:'5px 10px', background:'#FAEEDA', color:'#633806', border:'0.5px solid #FAC775', borderRadius:'6px', fontSize:'11px', cursor:'pointer' },
  btnG:       { padding:'5px 10px', background:'#EAF3DE', color:'#3B6D11', border:'0.5px solid #C0DD97', borderRadius:'6px', fontSize:'11px', cursor:'pointer' },
  btnR:       { padding:'5px 10px', background:'#FCEBEB', color:'#A32D2D', border:'0.5px solid #F7C1C1', borderRadius:'6px', fontSize:'11px', cursor:'pointer' },
  loading:    { display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', padding:'60px', color:'#888', fontSize:'13px' },
  spinner:    { width:'18px', height:'18px', borderRadius:'50%', border:'2px solid #e5e7eb', borderTopColor:'#7F77DD', animation:'spin 0.7s linear infinite' },
  empty:      { textAlign:'center', padding:'50px', color:'#aaa', fontSize:'13px' },

  /* modal */
  overlay:      { position:'fixed', inset:0, background:'rgba(15,10,40,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, animation:'fadeIn .2s ease', backdropFilter:'blur(3px)' },
  modalBox:     { background:'#fff', borderRadius:'16px', padding:'32px 28px', width:'360px', maxWidth:'90vw', animation:'popIn .22s ease', border:'0.5px solid #e5e7eb' },
  modalIcon:    { fontSize:'32px', textAlign:'center', marginBottom:'12px' },
  modalTitle:   { fontSize:'16px', fontWeight:600, color:'#111', textAlign:'center', marginBottom:'8px' },
  modalText:    { fontSize:'13px', color:'#555', textAlign:'center', lineHeight:1.6, marginBottom:'24px' },
  modalActions: { display:'flex', gap:'10px' },
  btnCancel:    { flex:1, padding:'10px', border:'0.5px solid #e5e7eb', background:'#fff', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:500, color:'#555' },
  btnConfirm:   { flex:1, padding:'10px', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:500 },
};