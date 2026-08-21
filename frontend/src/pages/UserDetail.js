import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, Calendar, DollarSign, Users } from 'lucide-react';
import api from '../utils/api';

const badgeColor = { approved: '#22C55E', submitted: '#F59E0B', rejected: '#EF4444', draft: '#94A3B8' };
const statusColor = { active: '#22C55E', pending: '#F59E0B', suspended: '#EF4444' };
const roleColor = { head_admin: '#8B5CF6', admin: '#3B82F6', branch: '#64748B' };

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/admin/users/${id}`),
      api.get(`/admin/users/${id}/reports`),
    ]).then(([u, r]) => {
      setUser(u.data);
      setReports(r.data);
    }).catch(() => {
      toast.error('Failed to load user');
      navigate('/users');
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Loading user profile...</div>;
  if (!user) return null;

  const totalAttendance = reports.reduce((sum, r) => sum + (r.total_attendance || 0), 0);
  const totalRevenue = reports.reduce((sum, r) => sum + parseFloat(r.total_amount_remitted || 0), 0);
  const totalRemitted = reports.reduce((sum, r) => sum + parseFloat(r.total_amount_remitted || 0), 0);

  return (
    <div>
      <button onClick={() => navigate('/users')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#185FA5', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={16} /> Back to Users
      </button>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.5rem', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#185FA5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
            {user.fullname?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>{user.fullname}</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{user.email}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ background: (roleColor[user.role] || '#64748B') + '20', color: roleColor[user.role] || '#64748B', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              {user.role.replace('_', ' ')}
            </span>
            <span style={{ background: (statusColor[user.status] || '#94A3B8') + '20', color: statusColor[user.status] || '#94A3B8', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              {user.status}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Branch</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{user.branch_name || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Division</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{user.division || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Phone</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{user.phone || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Joined</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{user.created_at ? new Date(user.created_at).toLocaleDateString('en-NG') : '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Last Login</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{user.last_login ? new Date(user.last_login).toLocaleDateString('en-NG') : 'Never'}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#185FA520', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={18} color="#185FA5" /></div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A' }}>{reports.length}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>Total Reports</div>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#8B5CF620', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={18} color="#8B5CF6" /></div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A' }}>{totalAttendance.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>Total Attendance</div>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#0EA5E920', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DollarSign size={18} color="#0EA5E9" /></div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A' }}>₦{totalRemitted.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>Total Remitted</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F1F5F9' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>Uploaded Reports</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Period', 'Branch', 'Division', 'Status', 'Attendance', 'Remitted', 'Created'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No reports uploaded yet</td></tr>
              ) : reports.map(r => (
                <tr key={r.id} onClick={() => navigate(`/admin/reports/${r.id}`)} style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                    <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4, color: '#94A3B8' }} />
                    {r.month} {r.year}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748B' }}>{r.branch}</td>
                  <td style={{ padding: '10px 14px', color: '#64748B' }}>{r.division}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: badgeColor[r.status] + '20', color: badgeColor[r.status], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748B' }}>{(r.total_attendance || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: '#64748B' }}>₦{(r.total_amount_remitted || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: '#94A3B8', fontSize: 12 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-NG') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
