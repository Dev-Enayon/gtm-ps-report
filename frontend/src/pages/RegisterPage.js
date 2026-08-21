import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Church, User, Mail, Lock, Building, Layers } from 'lucide-react';

const BRANCHES = ['Lagos Branch', 'Ogun Branch', 'Badagry Branch'];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullname: '', email: '', password: '', confirm: '', branch_name: '', division: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await register({ fullname: form.fullname, email: form.email, password: form.password, branch_name: form.branch_name, division: form.division, phone: form.phone });
      toast.success('Account created! Welcome.');
      navigate('/my-reports');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const selectStyle = { width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', appearance: 'none', background: '#fff' };
  const iconStyle = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0C447C 0%, #185FA5 50%, #378ADD 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', width: '100%', maxWidth: 460, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.jpeg" alt="GOTM" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', marginBottom: 10 }} />
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0C447C', margin: '0 0 2px' }}>Gospel of Truth Mission</h1>
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Create your branch account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={iconStyle} />
              <input type="text" required placeholder="John Doe" value={form.fullname} onChange={e => set('fullname', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={iconStyle} />
              <input type="email" required placeholder="john@email.com" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Phone Number (optional)</label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={iconStyle} />
              <input type="tel" placeholder="+234 800 000 0000" value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={iconStyle} />
              <input type="password" required placeholder="Min. 8 characters" value={form.password} onChange={e => set('password', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={iconStyle} />
              <input type="password" required placeholder="Repeat password" value={form.confirm} onChange={e => set('confirm', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Branch Name</label>
            <div style={{ position: 'relative' }}>
              <Building size={15} style={iconStyle} />
              <select required value={form.branch_name} onChange={e => set('branch_name', e.target.value)} style={selectStyle}>
                <option value="">Select branch</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Division</label>
            <div style={{ position: 'relative' }}>
              <Layers size={15} style={iconStyle} />
              <input type="text" required placeholder="e.g. Youth, Women, Men" value={form.division} onChange={e => set('division', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 16 }}>
            <strong>Note:</strong> New accounts are created as Branch Users. To request Admin access, you can do so after registration from your account settings.
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: 11, background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: '1.25rem' }}>
          Already have an account? <Link to="/login" style={{ color: '#185FA5', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
