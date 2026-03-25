import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import Login     from './pages/Login';
import Register  from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects  from './pages/Projects';
import Tasks     from './pages/Tasks';
import Chat      from './pages/Chat';
import Reports   from './pages/Reports';

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/projects',  label: 'Projets'   },
  { path: '/tasks',     label: 'Tâches'    },
  { path: '/chat',      label: 'Chat'      },
  { path: '/reports',   label: 'Rapports'  },
];

function Navbar() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  if (isAuthPage) return null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <nav style={styles.nav}>
      <span style={styles.brand}>M206</span>
      <div style={styles.links}>
        {navItems.map(({ path, label }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? styles.linkActive : {}),
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>
      <button onClick={handleLogout} style={styles.logout}>
        Déconnexion
      </button>
    </nav>
  );
}

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"          element={<Navigate to="/login" />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/register"  element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/projects"  element={<PrivateRoute><Projects /></PrivateRoute>} />
        <Route path="/tasks"     element={<PrivateRoute><Tasks /></PrivateRoute>} />
        <Route path="/chat"      element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/reports"   element={<PrivateRoute><Reports /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 32px',
    height: '60px',
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  brand: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#fff',
    letterSpacing: '0.15em',
    marginRight: '48px',
    textTransform: 'uppercase',
    background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',  
    gap: '4px',
    flex: 1,
    height: '100%',
  },
  link: {
    padding: '6px 18px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    borderRadius: '8px',
    letterSpacing: '0.04em',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
  },
  linkActive: {
    color: '#fff',
    background: 'rgba(167,139,250,0.15)',
    border: '1px solid rgba(167,139,250,0.4)',
  },
  logout: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    padding: '6px 16px',
    transition: 'all 0.2s ease',
    letterSpacing: '0.04em',
  },
};