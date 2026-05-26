import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RequestAdminPage() {
  const { user, requestAdmin } = useAuth();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (user?.role === 'admin' || user?.role === 'head_admin') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '4rem 1rem' }}>
        <CheckCircle size={56} color="#22C55E" style={{ margin: '0 auto 1rem', display: 'block' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>You already have admin access</h2>
        <p style={{ color: '#64748B', fontSize: 14 }}>You are currently a{user.role === 'head_admin' ? ' Head' : 'n'} Admin in the system.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '4rem 1rem' }}>
        <Clock size={56} color="#F59E0B" style={{ margin: '0 auto 1rem', display: 'block' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>Request Submitted</h2>
        <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.6 }}>
          Your admin access request has been sent to the Head Administrator for review. You will receive an email notification once a decision is made.
        </p>
        <div style={{ background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 10, padding: '14px 18px', marginTop: '1.5rem', fontSize: 13, color: '#92400E', textAlign: 'left' }}>
          <strong>What happens next?</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 16, lineHeight: 2 }}>
            <li>The Head Administrator reviews your request</li>
            <li>You will be notified by email of the decision</li>
            <li>If approved, you'll gain Admin access immediately</li>
          </ul>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 20) return toast.error('Please provide a more detailed reason (minimum 20 characters)');
    setLoading(true);
    try {
      await requestAdmin(reason);
      setSubmitted(true);
      toast.success('Admin request submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Request Admin Access</h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Submit a request for admin-level access to the Head Administrator</p>
      </div>

      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '14px 18px', marginBottom: '1.5rem', fontSize: 13, color: '#1E40AF', display: 'flex', gap: 10 }}>
        <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          Admin access allows you to view all branch reports, approve or reject submissions, and access analytics. All requests are reviewed by the <strong>Head Administrator</strong> before being approved.
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.75rem' }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: '1.5rem', padding: '14px', background: '#F8FAFC', borderRadius: 8 }}>
          <div style={{ width: 40, height: 40, background: '#185FA520', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#185FA5' }}>{user?.fullname?.charAt(0)}</span>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{user?.fullname}</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{user?.email} · {user?.branch_name} · {user?.division}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Why do you need admin access? <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              value={reason} onChange={e => setReason(e.target.value)} rows={5} required
              placeholder="Describe your role, responsibilities, and why you need admin access to manage church reports... (minimum 20 characters)"
              style={{ width: '100%', padding: '12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
            <div style={{ fontSize: 12, color: reason.length < 20 ? '#EF4444' : '#22C55E', marginTop: 4 }}>
              {reason.length} / 20 minimum characters
            </div>
          </div>

          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '12px 14px', marginBottom: '1.25rem', fontSize: 13, color: '#9A3412' }}>
            By submitting this request, you acknowledge that admin access comes with responsibility. All your actions as an admin will be logged and monitored.
          </div>

          <button type="submit" disabled={loading || reason.trim().length < 20}
            style={{ width: '100%', padding: '12px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: (loading || reason.trim().length < 20) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ShieldCheck size={18} />
            {loading ? 'Submitting...' : 'Submit Admin Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
