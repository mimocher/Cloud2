import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation }     from 'react-router-dom';
import API                              from '../services/api';
import { connectSocket, getSocket }     from '../services/socket';

export default function Chat() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const user        = JSON.parse(localStorage.getItem('user') || '{}');
  const token       = localStorage.getItem('token');
  const messagesEnd = useRef(null);
  const typingTimeout = useRef(null);

  const [projects,      setProjects]      = useState([]);
  const [selProject,    setSelProject]    = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [content,       setContent]       = useState('');
  const [typing,        setTyping]        = useState('');
  const [onlineUsers,   setOnlineUsers]   = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]        = useState(0);
  const [showNotif,     setShowNotif]     = useState(false);

  useEffect(() => {
    const socket = connectSocket(token);
    fetchProjects();
    fetchNotifications();

    socket.on('message:new',      (msg)         => setMessages(prev => [...prev, msg]));
    socket.on('users:online',     (users)       => setOnlineUsers(users));
    socket.on('typing:start',     ({ username }) => setTyping(`${username} est en train d'écrire...`));
    socket.on('typing:stop',      ()            => setTyping(''));
    socket.on('notification:new', (notif)       => { setNotifications(prev => [notif, ...prev]); setUnread(prev => prev + 1); });

    return () => {
      socket.off('message:new');
      socket.off('users:online');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('notification:new');
    };
  }, []);

  useEffect(() => {
    if (selProject) {
      getSocket()?.emit('join:project', selProject._id);
      fetchMessages(selProject._id);
    }
  }, [selProject]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchProjects      = async () => { try { const r = await API.get('/api/projects');      setProjects(r.data.projects || []); if (r.data.projects?.length) setSelProject(r.data.projects[0]); } catch(e){} };
  const fetchMessages      = async (id) => { try { const r = await API.get(`/api/chat/${id}`); setMessages(r.data.messages || []); } catch(e){} };
  const fetchNotifications = async () => { try { const r = await API.get('/api/notifications'); setNotifications(r.data.notifications || []); setUnread(r.data.unread || 0); } catch(e){} };

  const handleSend = () => {
    if (!content.trim() || !selProject) return;
    const s = getSocket();
    s?.emit('message:send', { projectId: selProject._id, content: content.trim() });
    s?.emit('typing:stop',  { projectId: selProject._id });
    setContent('');
  };

  const handleTyping = (val) => {
    setContent(val);
    const s = getSocket();
    s?.emit('typing:start', { projectId: selProject._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => s?.emit('typing:stop', { projectId: selProject._id }), 1500);
  };

  const handleMarkAllRead  = async () => { try { await API.patch('/api/notifications/read-all'); setUnread(0); setNotifications(p => p.map(n => ({ ...n, read:true }))); } catch(e){} };
  const handleMarkRead     = async (id) => { try { await API.patch(`/api/notifications/${id}/read`); setNotifications(p => p.map(n => n._id===id ? {...n,read:true}:n)); setUnread(p => Math.max(0,p-1)); } catch(e){} };
  const handleDeleteNotif  = async (id) => { try { await API.delete(`/api/notifications/${id}`);                setNotifications(p => p.filter(n => n._id!==id)); } catch(e){} };
  const handleDeleteMsg    = async (id) => { try { await API.delete(`/api/chat/messages/${id}`);                setMessages(p => p.filter(m => m._id!==id)); } catch(e){} };

  const avBg  = (n='') => ['#EEEDFE','#E1F5EE','#FAEEDA','#E6F1FB','#FAECE7'][(n.charCodeAt(0)||0)%5];
  const avClr = (n='') => ['#3C3489','#085041','#633806','#0C447C','#993C1D'][(n.charCodeAt(0)||0)%5];

  const notifIcon = (type) => ({ new_task:'📋', task_updated:'✏️', task_completed:'✅', new_message:'💬', new_comment:'🗨️', project_added:'📁' }[type] || '🔔');

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
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .nav-lnk:hover  { background:#EEEDFE; color:#3C3489; }
        .proj-item:hover { background:#f0efff; }
        .logout-btn:hover { background:#FCEBEB; color:#A32D2D; border-color:#F7C1C1; }
        .send-btn:hover { opacity:.85; }
        .send-btn:disabled { opacity:.4; cursor:default; }
        .notif-item:hover { background:#f5f5f5; }
        .del-btn:hover { color:#A32D2D; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#ddd; border-radius:4px; }
      `}</style>

      <div style={s.layout}>

        {/* ── Sidebar ── */}
        <aside style={s.side}>
          <div style={s.logo}>Projet <span style={{ color:'#7F77DD' }}>M206</span></div>

          <div style={s.navSection}>Navigation</div>
          {navLinks.map(n => {
            const active = location.pathname === n.path;
            return (
              <div key={n.path} className="nav-lnk"
                onClick={() => navigate(n.path)}
                style={{ ...s.nav, ...(active ? s.navActive : {}) }}>
                <span style={{ fontSize:'14px', width:'16px', textAlign:'center' }}>{n.icon}</span>
                {n.label}
              </div>
            );
          })}

          {/* Projets dans la sidebar */}
          <div style={{ ...s.navSection, marginTop:'20px' }}>Projets</div>
          {projects.map(p => (
            <div key={p._id} className="proj-item"
              onClick={() => setSelProject(p)}
              style={{
                ...s.projItem,
                background:  selProject?._id === p._id ? '#EEEDFE' : 'transparent',
                color:       selProject?._id === p._id ? '#3C3489' : '#555',
                borderLeft:  selProject?._id === p._id ? '2px solid #7F77DD' : '2px solid transparent',
              }}>
              <span style={{ fontSize:'13px', flex:1 }}># {p.name}</span>
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: p.status==='active'?'#639922':'#aaa', flexShrink:0 }} />
            </div>
          ))}

          {/* En ligne */}
          {onlineUsers.length > 0 && (
            <>
              <div style={{ ...s.navSection, marginTop:'20px' }}>En ligne ({onlineUsers.length})</div>
              <div style={{ padding:'4px 10px', fontSize:'12px', color:'#888' }}>
                {onlineUsers.slice(0,5).map((u,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'3px 0' }}>
                    <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#639922' }} />
                    {u}
                  </div>
                ))}
              </div>
            </>
          )}

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

        {/* ── Zone principale ── */}
        <div style={s.main}>

          {/* Top bar */}
          <div style={s.topBar}>
            <div>
              <div style={s.ptitle}>{selProject ? `# ${selProject.name}` : 'Chat'}</div>
              <div style={s.psub}>{selProject ? `${selProject.members?.length||0} membre(s)` : 'Sélectionnez un projet'}</div>
            </div>

            {/* Cloche notifications */}
            <div style={{ position:'relative' }}>
              <button onClick={() => setShowNotif(!showNotif)} style={s.notifBtn}>
                🔔
                {unread > 0 && <span style={s.badge}>{unread}</span>}
              </button>

              {showNotif && (
                <div style={s.notifPanel} onClick={e => e.stopPropagation()}>
                  <div style={s.notifHead}>
                    <span style={{ fontSize:'13px', fontWeight:600, color:'#111' }}>Notifications</span>
                    <button onClick={handleMarkAllRead} style={s.readAllBtn}>Tout lire</button>
                  </div>
                  <div style={s.notifList}>
                    {notifications.length === 0
                      ? <div style={s.emptyNotif}>Aucune notification</div>
                      : notifications.map(n => (
                          <div key={n._id} className="notif-item"
                            style={{ ...s.notifItem, background: n.read ? '#fff' : '#EEEDFE' }}
                            onClick={() => handleMarkRead(n._id)}>
                            <span style={{ fontSize:'16px' }}>{notifIcon(n.type)}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:'12px', fontWeight:500, color:'#111' }}>{n.title}</div>
                              <div style={{ fontSize:'11px', color:'#888', marginTop:'1px' }}>{n.content}</div>
                              <div style={{ fontSize:'10px', color:'#aaa', marginTop:'2px' }}>{new Date(n.createdAt).toLocaleDateString('fr-FR')}</div>
                            </div>
                            <button className="del-btn" onClick={e => { e.stopPropagation(); handleDeleteNotif(n._id); }} style={s.delBtn}>✕</button>
                          </div>
                        ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={s.messages} onClick={() => setShowNotif(false)}>
            {!selProject ? (
              <div style={s.empty}>Sélectionnez un projet pour démarrer</div>
            ) : messages.length === 0 ? (
              <div style={s.empty}>Aucun message — soyez le premier ! 👋</div>
            ) : (
              messages.map((msg, i) => {
                const isMe     = msg.sender?._id === user.id || msg.sender === user.id;
                const showDate = i === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[i-1]?.createdAt).toDateString();
                const senderName = msg.sender?.username || '?';

                return (
                  <div key={msg._id}>
                    {showDate && (
                      <div style={s.dateSep}>
                        {new Date(msg.createdAt).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
                      </div>
                    )}
                    <div style={{ display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap:'8px', marginBottom:'12px', alignItems:'flex-end' }}>
                      {!isMe && (
                        <div style={{ ...s.av, background: avBg(senderName), color: avClr(senderName) }}>
                          {senderName[0].toUpperCase()}
                        </div>
                      )}
                      <div style={{ maxWidth:'60%' }}>
                        {!isMe && <div style={s.senderName}>{senderName}</div>}
                        <div style={{
                          ...s.bubble,
                          background:   isMe ? '#7F77DD' : '#fff',
                          color:        isMe ? '#fff'    : '#333',
                          borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        }}>
                          {msg.content}
                        </div>
                        <div style={{ fontSize:'10px', color:'#aaa', marginTop:'3px', textAlign: isMe?'right':'left', display:'flex', justifyContent: isMe?'flex-end':'flex-start', gap:'6px', alignItems:'center' }}>
                          {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
                          {isMe && (
                            <button onClick={() => handleDeleteMsg(msg._id)} style={s.delMsgBtn}>🗑</button>
                          )}
                        </div>
                      </div>
                      {isMe && (
                        <div style={{ ...s.av, background: avBg(user.username), color: avClr(user.username) }}>
                          {(user.username||'?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {typing && <div style={s.typing}>{typing}</div>}
            <div ref={messagesEnd} />
          </div>

          {/* Input */}
          <div style={s.inputArea}>
            <input
              style={s.msgInput}
              placeholder={selProject ? `Message dans #${selProject.name}...` : 'Sélectionnez un projet...'}
              value={content}
              disabled={!selProject}
              onChange={e => handleTyping(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            />
            <button className="send-btn" style={s.sendBtn} onClick={handleSend} disabled={!content.trim() || !selProject}>
              Envoyer ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:       { height:'100vh', fontFamily:"'Segoe UI', system-ui, sans-serif", overflow:'hidden' },
  layout:     { display:'flex', height:'100vh' },

  /* sidebar — identique au Dashboard */
  side:       { width:'210px', background:'#fff', borderRight:'0.5px solid #e5e7eb', padding:'20px 12px', display:'flex', flexDirection:'column', gap:'2px', flexShrink:0 },
  logo:       { fontSize:'16px', fontWeight:600, padding:'0 8px', marginBottom:'12px', color:'#111' },
  navSection: { fontSize:'10px', color:'#aaa', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', padding:'0 10px', margin:'4px 0 6px' },
  nav:        { display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', borderRadius:'8px', fontSize:'13px', color:'#555', cursor:'pointer', transition:'all 0.15s' },
  navActive:  { background:'#EEEDFE', color:'#3C3489', fontWeight:500 },
  projItem:   { display:'flex', alignItems:'center', gap:'6px', padding:'7px 10px', borderRadius:'8px', cursor:'pointer', transition:'all 0.15s', marginBottom:'1px' },
  sideBottom: { marginTop:'auto', borderTop:'0.5px solid #e5e7eb', paddingTop:'12px' },
  userCard:   { display:'flex', alignItems:'center', gap:'8px', padding:'8px' },
  av:         { width:'30px', height:'30px', borderRadius:'50%', fontSize:'12px', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  logout:     { width:'100%', marginTop:'8px', padding:'7px', border:'0.5px solid #e5e7eb', background:'transparent', borderRadius:'8px', fontSize:'12px', color:'#888', cursor:'pointer', transition:'all 0.15s' },

  /* main */
  main:       { flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#f7f7f8' },
  topBar:     { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 24px', background:'#fff', borderBottom:'0.5px solid #e5e7eb', flexShrink:0 },
  ptitle:     { fontSize:'16px', fontWeight:600, color:'#111' },
  psub:       { fontSize:'12px', color:'#888', marginTop:'2px' },

  /* notifications */
  notifBtn:   { position:'relative', padding:'7px 10px', background:'transparent', border:'0.5px solid #e5e7eb', borderRadius:'8px', cursor:'pointer', fontSize:'16px' },
  badge:      { position:'absolute', top:'-4px', right:'-4px', background:'#E24B4A', color:'#fff', borderRadius:'50%', width:'16px', height:'16px', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center' },
  notifPanel: { position:'absolute', top:'42px', right:0, width:'300px', background:'#fff', borderRadius:'12px', border:'0.5px solid #e5e7eb', boxShadow:'0 8px 24px rgba(0,0,0,0.1)', zIndex:1000, overflow:'hidden', animation:'fadeIn .15s ease' },
  notifHead:  { padding:'12px 16px', borderBottom:'0.5px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' },
  readAllBtn: { padding:'4px 10px', background:'#EEEDFE', color:'#3C3489', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:500 },
  notifList:  { maxHeight:'360px', overflowY:'auto' },
  notifItem:  { display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px 14px', borderBottom:'0.5px solid #f3f4f6', cursor:'pointer', transition:'background .15s' },
  emptyNotif: { padding:'24px', textAlign:'center', color:'#aaa', fontSize:'13px' },
  delBtn:     { background:'none', border:'none', color:'#ccc', cursor:'pointer', fontSize:'12px', flexShrink:0, transition:'color .15s' },

  /* messages */
  messages:   { flex:1, overflowY:'auto', padding:'20px 24px' },
  empty:      { textAlign:'center', color:'#aaa', fontSize:'13px', marginTop:'80px' },
  dateSep:    { textAlign:'center', color:'#bbb', fontSize:'11px', margin:'16px 0' },
  senderName: { fontSize:'11px', color:'#888', fontWeight:500, marginBottom:'2px', marginLeft:'4px' },
  bubble:     { padding:'10px 14px', fontSize:'13px', lineHeight:1.5, border:'0.5px solid #e5e7eb', display:'inline-block', maxWidth:'100%', wordBreak:'break-word' },
  delMsgBtn:  { background:'none', border:'none', cursor:'pointer', fontSize:'11px', color:'#ccc', padding:0 },
  typing:     { color:'#aaa', fontSize:'12px', fontStyle:'italic', padding:'4px 0' },

  /* input */
  inputArea:  { padding:'14px 24px', borderTop:'0.5px solid #e5e7eb', display:'flex', gap:'10px', background:'#fff', flexShrink:0 },
  msgInput:   { flex:1, padding:'10px 16px', border:'0.5px solid #e5e7eb', borderRadius:'24px', fontSize:'13px', outline:'none', background:'#f7f7f8' },
  sendBtn:    { padding:'10px 20px', background:'#7F77DD', color:'#fff', border:'none', borderRadius:'24px', cursor:'pointer', fontWeight:500, fontSize:'13px', transition:'opacity .15s' },
};