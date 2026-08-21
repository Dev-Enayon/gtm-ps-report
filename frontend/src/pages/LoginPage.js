import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Church, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.fullname}!`);
      navigate(['admin','head_admin'].includes(user.role) ? '/dashboard' : '/my-reports');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0C447C 0%, #185FA5 50%, #378ADD 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', width: '100%', maxWidth: 420, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.jpeg" alt="GOTM" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', marginBottom: 12 }} />
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#0C447C', margin: '0 0 4px' }}>Gospel of Truth Mission</h1>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Church Report Management System</p>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: '#1a1a1a' }}>Sign in to your account</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: '1.5rem' }}>Enter your credentials to continue</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>Email address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input
                type="email" required placeholder="your@email.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input
                type={showPass ? 'text' : 'password'} required placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ width: '100%', padding: '10px 40px 10px 38px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 0 }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: '1.5rem' }}>
          Don't have an account? <Link to="/register" style={{ color: '#185FA5', fontWeight: 500, textDecoration: 'none' }}>Create account</Link>
        </p>
      </div>
    </div>
  );
}
