import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';

export default function Register() {
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ username:'', email:'', password:'', role:'member' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await API.post('/api/auth/register', form);
      setSuccess('Compte créé ! Vous pouvez vous connecter.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Inscription</h2>

        {error   && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}

        <form onSubmit={handleSubmit}>
          <div style={styles.group}>
            <label style={styles.label}>Nom d'utilisateur</label>
            <input style={styles.input} type="text" name="username"
              placeholder="youssef_dev" value={form.username}
              onChange={handleChange} required />
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" name="email"
              placeholder="email@exemple.ma" value={form.email}
              onChange={handleChange} required />
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Mot de passe</label>
            <input style={styles.input} type="password" name="password"
              placeholder="••••••••" value={form.password}
              onChange={handleChange} required />
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Rôle</label>
            <select style={styles.input} name="role"
              value={form.role} onChange={handleChange}>
              <option value="member">Membre</option>
              <option value="guest">Invité</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Création...' : 'Créer le compte'}
          </button>
        </form>

        <p style={styles.link}>
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'#f0f2f5' },
  card:      { background:'#fff', padding:'40px', borderRadius:'12px', boxShadow:'0 4px 20px rgba(0,0,0,0.1)', width:'100%', maxWidth:'400px' },
  title:     { textAlign:'center', marginBottom:'24px', color:'#333', fontSize:'24px' },
  group:     { marginBottom:'16px' },
  label:     { display:'block', marginBottom:'6px', color:'#555', fontWeight:'500' },
  input:     { width:'100%', padding:'10px 14px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'15px', boxSizing:'border-box' },
  button:    { width:'100%', padding:'12px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:'8px', fontSize:'16px', cursor:'pointer', marginTop:'8px' },
  error:     { background:'#fee2e2', color:'#dc2626', padding:'10px', borderRadius:'8px', marginBottom:'16px', textAlign:'center' },
  success:   { background:'#dcfce7', color:'#16a34a', padding:'10px', borderRadius:'8px', marginBottom:'16px', textAlign:'center' },
  link:      { textAlign:'center', marginTop:'16px', color:'#555' }
};