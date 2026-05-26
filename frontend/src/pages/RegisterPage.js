import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Church, User, Mail, Lock, Building, Layers } from 'lucide-react';

const DIVISIONS = ['Division A', 'Division B', 'Division C', 'Division D'];

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
  const iconStyle = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0C447C 0%, #185FA5 50%, #378ADD 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', width: '100%', maxWidth: 460, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 48, height: 48, background: '#185FA5', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Church size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0C447C', margin: '0 0 2px' }}>Gospel of Truth Mission</h1>
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Create your branch account</p>
        </div>

        <form onSubmit={handleSubmit}>
          {[
            { key: 'fullname', label: 'Full Name', icon: <User size={15} style={iconStyle} />, type: 'text', placeholder: 'John Doe' },
            { key: 'email', label: 'Email Address', icon: <Mail size={15} style={iconStyle} />, type: 'email', placeholder: 'john@email.com' },
            { key: 'phone', label: 'Phone Number (optional)', icon: <User size={15} style={iconStyle} />, type: 'tel', placeholder: '+234 800 000 0000', required: false },
            { key: 'password', label: 'Password', icon: <Lock size={15} style={iconStyle} />, type: 'password', placeholder: 'Min. 8 characters' },
            { key: 'confirm', label: 'Confirm Password', icon: <Lock size={15} style={iconStyle} />, type: 'password', placeholder: 'Repeat password' },
            { key: 'branch_name', label: 'Branch Name', icon: <Building size={15} style={iconStyle} />, type: 'text', placeholder: 'e.g. Lagos Central Branch' },
          ].map(({ key, label, icon, type, placeholder, required = true }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{label}</label>
              <div style={{ position: 'relative' }}>
                {icon}
                <input type={type} required={required} placeholder={placeholder} value={form[key]} onChange={e => set(key, e.target.value)} style={inputStyle} />
              </div>
            </div>
          ))}

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Division</label>
            <div style={{ position: 'relative' }}>
              <Layers size={15} style={iconStyle} />
              <select required value={form.division} onChange={e => set('division', e.target.value)} style={{ ...inputStyle, appearance: 'none', background: '#fff' }}>
                <option value="">Select division</option>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
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
