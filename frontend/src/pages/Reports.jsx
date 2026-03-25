import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line, ResponsiveContainer
} from 'recharts';
import API from '../services/api';

const COLORS = ['#7F77DD','#1D9E75','#BA7517','#E24B4A','#378ADD','#A855F7'];

export default function Reports() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = JSON.parse(localStorage.getItem('user') || '{}');

  const [overview,   setOverview]   = useState(null);
  const [byStatus,   setByStatus]   = useState([]);
  const [byPriority, setByPriority] = useState([]);
  const [byUser,     setByUser]     = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [activity,   setActivity]   = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [selProject, setSelProject] = useState('');
  const [projReport, setProjReport] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { fetchAll(); fetchProjects(); }, []);
  useEffect(() => { if (selProject) fetchProjectReport(selProject); }, [selProject]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [ov, st, pr, us, ca, ac] = await Promise.all([
        API.get('/api/reports/overview'),
        API.get('/api/reports/tasks-by-status'),
        API.get('/api/reports/tasks-by-priority'),
        API.get('/api/reports/tasks-by-user'),
        API.get('/api/reports/projects-by-category'),
        API.get('/api/reports/activity'),
      ]);
      setOverview(ov.data);
      setByStatus(st.data.data   || []);
      setByPriority(pr.data.data || []);
      setByUser(us.data.data     || []);
      setByCategory(ca.data.data || []);
      setActivity(ac.data.data   || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchProjects    = async () => { try { const r = await API.get('/api/projects');         setProjects(r.data.projects || []); } catch(e){} };
  const fetchProjectReport = async (id) => { try { const r = await API.get(`/api/reports/project/${id}`); setProjReport(r.data); } catch(e){} };

  const avBg  = (n='') => ['#EEEDFE','#E1F5EE','#FAEEDA','#E6F1FB','#FAECE7'][(n.charCodeAt(0)||0)%5];
  const avClr = (n='') => ['#3C3489','#085041','#633806','#0C447C','#993C1D'][(n.charCodeAt(0)||0)%5];

  const navLinks = [
    { icon:'◉', label:'Utilisateurs', path:'/dashboard' },
    { icon:'◈', label:'Projets',      path:'/projects'  },
    { icon:'✓', label:'Tâches',       path:'/tasks'     },
    { icon:'◫', label:'Chat',         path:'/chat'      },
    { icon:'◧', label:'Rapports',     path:'/reports'   },
  ];

  const overviewCards = overview ? [
    { label:'Projets',   val: overview.projects.total,     bg:'#EEEDFE', color:'#3C3489' },
    { label:'Tâches',    val: overview.tasks.total,        bg:'#E1F5EE', color:'#085041' },
    { label:'En cours',  val: overview.tasks.inprogress,   bg:'#FAEEDA', color:'#633806' },
    { label:'En retard', val: overview.tasks.overdue,      bg:'#FCEBEB', color:'#A32D2D' },
    { label:'Membres',   val: overview.users.total,        bg:'#E6F1FB', color:'#0C447C' },
    { label:'Terminés',  val: overview.projects.completed, bg:'#EAF3DE', color:'#3B6D11' },
  ] : [];

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', gap:'10px', color:'#888', fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width:'20px', height:'20px', borderRadius:'50%', border:'2px solid #e5e7eb', borderTopColor:'#7F77DD', animation:'spin 0.7s linear infinite' }} />
      Chargement...
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        .nav-lnk:hover   { background:#EEEDFE; color:#3C3489; }
        .logout-btn:hover { background:#FCEBEB; color:#A32D2D; border-color:#F7C1C1; }
        .stat-card:hover  { transform:translateY(-1px); box-shadow:0 4px 16px rgba(127,119,221,.1); }
        select:focus { outline:none; border-color:#7F77DD !important; }
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
          {/* Top */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px' }}>
            <div>
              <div style={s.ptitle}>Rapports</div>
              <div style={s.psub}>Vue d'ensemble de l'activité de votre équipe</div>
            </div>
            <button onClick={fetchAll} style={s.btnRefresh}>↻ Actualiser</button>
          </div>

          {/* Stats overview */}
          {overview && (
            <div style={s.grid6}>
              {overviewCards.map((c, i) => (
                <div key={i} className="stat-card" style={{ ...s.statCard, background: c.bg }}>
                  <div style={{ fontSize:'22px', fontWeight:700, color: c.color }}>{c.val}</div>
                  <div style={{ fontSize:'11px', color: c.color, opacity:.7, marginTop:'2px', fontWeight:500 }}>{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Graphiques row 1 */}
          <div style={s.grid3}>
            <div style={s.card}>
              <div style={s.cardTitle}>Tâches par statut</div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={byStatus} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize:11, fill:'#aaa' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize:11, fill:'#aaa' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius:'8px', border:'0.5px solid #e5e7eb', fontSize:'12px' }} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {byStatus.map((e, i) => <Cell key={i} fill={e.color || COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Tâches par priorité</div>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={byPriority} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={72} innerRadius={38} paddingAngle={3}>
                    {byPriority.map((e, i) => <Cell key={i} fill={e.color || COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius:'8px', border:'0.5px solid #e5e7eb', fontSize:'12px' }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Projets par catégorie</div>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={byCategory} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={72} innerRadius={38} paddingAngle={3}>
                    {byCategory.map((e, i) => <Cell key={i} fill={e.color || COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius:'8px', border:'0.5px solid #e5e7eb', fontSize:'12px' }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activité */}
          {activity.length > 0 && (
            <div style={{ ...s.card, marginBottom:'16px' }}>
              <div style={s.cardTitle}>Activité sur 6 mois</div>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={activity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize:11, fill:'#aaa' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize:11, fill:'#aaa' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius:'8px', border:'0.5px solid #e5e7eb', fontSize:'12px' }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:11 }} />
                  <Line type="monotone" dataKey="created"   name="Créées"   stroke="#7F77DD" strokeWidth={2} dot={{ r:3, fill:'#7F77DD' }} />
                  <Line type="monotone" dataKey="completed" name="Terminées" stroke="#1D9E75" strokeWidth={2} dot={{ r:3, fill:'#1D9E75' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Charge équipe */}
          {byUser.length > 0 && (
            <div style={{ ...s.card, marginBottom:'16px' }}>
              <div style={s.cardTitle}>Charge par membre</div>
              <table style={s.table}>
                <thead>
                  <tr style={{ background:'#fafafa' }}>
                    {['Membre','Total','Terminées','En cours','À faire','Complétion'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byUser.map((u, i) => (
                    <tr key={i} style={{ borderBottom:'0.5px solid #f3f4f6' }}>
                      <td style={s.td}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <div style={{ ...s.av, width:'26px', height:'26px', fontSize:'11px', background: avBg(u.username), color: avClr(u.username) }}>
                            {(u.username||'?')[0].toUpperCase()}
                          </div>
                          {u.username}
                        </div>
                      </td>
                      <td style={s.td}>{u.total}</td>
                      <td style={{ ...s.td, color:'#3B6D11', fontWeight:500 }}>{u.done}</td>
                      <td style={{ ...s.td, color:'#633806' }}>{u.inprogress}</td>
                      <td style={{ ...s.td, color:'#aaa' }}>{u.todo}</td>
                      <td style={s.td}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <div style={s.track}>
                            <div style={{ ...s.fill, width:`${u.completion}%`, background: u.completion>=75?'#1D9E75':u.completion>=50?'#BA7517':'#E24B4A' }} />
                          </div>
                          <span style={{ fontSize:'11px', color:'#aaa', minWidth:'30px' }}>{u.completion}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Rapport projet */}
          <div style={s.card}>
            <div style={s.cardTitle}>Rapport par projet</div>
            <select style={s.select} value={selProject} onChange={e => setSelProject(e.target.value)}>
              <option value="">Sélectionner un projet...</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>

            {projReport && (
              <div style={{ marginTop:'20px' }}>
                {/* Mini stats */}
                <div style={s.grid5}>
                  {[
                    { label:'Total',    val: projReport.stats.total,      bg:'#EEEDFE', color:'#3C3489' },
                    { label:'À faire',  val: projReport.stats.todo,       bg:'#f3f4f6', color:'#888'    },
                    { label:'En cours', val: projReport.stats.inprogress, bg:'#FAEEDA', color:'#633806' },
                    { label:'Terminé',  val: projReport.stats.done,       bg:'#EAF3DE', color:'#3B6D11' },
                    { label:'Retard',   val: projReport.stats.overdue,    bg:'#FCEBEB', color:'#A32D2D' },
                  ].map((c, i) => (
                    <div key={i} style={{ background: c.bg, borderRadius:'10px', padding:'14px', textAlign:'center' }}>
                      <div style={{ fontSize:'22px', fontWeight:700, color: c.color }}>{c.val}</div>
                      <div style={{ fontSize:'11px', color: c.color, opacity:.7, marginTop:'2px' }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Barre progression */}
                <div style={{ margin:'16px 0' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                    <span style={{ fontSize:'12px', color:'#555' }}>Progression globale</span>
                    <span style={{ fontSize:'12px', color:'#7F77DD', fontWeight:600 }}>{projReport.stats.completion}%</span>
                  </div>
                  <div style={{ ...s.track, height:'8px' }}>
                    <div style={{ ...s.fill, width:`${projReport.stats.completion}%`, background:'#7F77DD' }} />
                  </div>
                </div>

                {/* Liste tâches */}
                <div style={{ fontSize:'12px', fontWeight:600, color:'#555', margin:'16px 0 8px' }}>
                  Tâches ({projReport.tasks.length})
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  {projReport.tasks.map((t, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', background:'#fafafa', borderRadius:'8px', border:'0.5px solid #f3f4f6' }}>
                      <span style={{ width:'7px', height:'7px', borderRadius:'50%', flexShrink:0, background: t.status==='done'?'#1D9E75':t.status==='inprogress'?'#BA7517':'#ddd' }} />
                      <span style={{ flex:1, fontSize:'13px', color:'#333' }}>{t.title}</span>
                      <span style={{ fontSize:'11px', color:'#aaa' }}>{t.assignedTo?.username || 'Non assigné'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
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
  ptitle:     { fontSize:'20px', fontWeight:600, color:'#111' },
  psub:       { fontSize:'13px', color:'#888', marginTop:'3px' },
  btnRefresh: { padding:'8px 16px', background:'#EEEDFE', color:'#3C3489', border:'0.5px solid #AFA9EC', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:500 },
  grid6:      { display:'grid', gridTemplateColumns:'repeat(6,minmax(0,1fr))', gap:'12px', marginBottom:'20px' },
  statCard:   { borderRadius:'10px', padding:'14px 16px', transition:'all .2s' },
  grid3:      { display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'14px', marginBottom:'16px' },
  grid5:      { display:'grid', gridTemplateColumns:'repeat(5,minmax(0,1fr))', gap:'10px', marginBottom:'16px' },
  card:       { background:'#fff', borderRadius:'12px', padding:'20px', border:'0.5px solid #e5e7eb', marginBottom:'16px' },
  cardTitle:  { fontSize:'13px', fontWeight:600, color:'#111', marginBottom:'14px' },
  table:      { width:'100%', borderCollapse:'collapse' },
  th:         { padding:'9px 12px', textAlign:'left', fontSize:'10px', fontWeight:600, color:'#aaa', letterSpacing:'0.5px', textTransform:'uppercase', borderBottom:'0.5px solid #e5e7eb' },
  td:         { padding:'10px 12px', fontSize:'13px', color:'#444' },
  track:      { height:'6px', background:'#f3f4f6', borderRadius:'3px', overflow:'hidden', flex:1 },
  fill:       { height:'100%', borderRadius:'3px', transition:'width .3s' },
  select:     { padding:'8px 12px', border:'0.5px solid #e5e7eb', borderRadius:'8px', fontSize:'13px', width:'260px', color:'#111', background:'#fff' },
};