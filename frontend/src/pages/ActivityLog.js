// ActivityLog.js
import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Activity } from 'lucide-react';

export function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/admin/audit-logs').then(r => setLogs(r.data)).catch(() => toast.error('Failed to load logs')).finally(() => setLoading(false));
  }, []);
  const actionColor = { USER_LOGIN: '#3B82F6', REPORT_SUBMITTED: '#F59E0B', REPORT_APPROVED: '#22C55E', REPORT_REJECTED: '#EF4444', ADMIN_REQUEST_APPROVED: '#8B5CF6', ADMIN_REQUEST_REJECTED: '#EF4444', USER_REGISTERED: '#0EA5E9' };
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}><h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Activity Log</h1><p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>All user actions and system events</p></div>
      {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Loading...</div> : (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
          {logs.length === 0 ? <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>No activity yet</div> : logs.map(log => (
            <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 16px', borderBottom: '1px solid #F8FAFC' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: (actionColor[log.action] || '#94A3B8') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Activity size={16} color={actionColor[log.action] || '#94A3B8'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#0F172A' }}><strong>{log.fullname || 'System'}</strong> — <span style={{ color: '#64748B' }}>{log.action.replace(/_/g, ' ')}</span></div>
                {log.details && Object.keys(log.details).length > 0 && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{JSON.stringify(log.details)}</div>}
                <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 3 }}>{new Date(log.created_at).toLocaleString('en-NG')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// UserManagement.js
export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/admin/users').then(r => setUsers(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, []);
  const toggleStatus = async (u) => {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    try { await api.put(`/admin/users/${u.id}/status`, { status: newStatus }); toast.success(`User ${newStatus}`); setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: newStatus } : x)); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const roleColor = { head_admin: '#8B5CF6', admin: '#3B82F6', branch: '#64748B' };
  const statusColor = { active: '#22C55E', pending: '#F59E0B', suspended: '#EF4444' };
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}><h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>User Management</h1><p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{users.length} registered users</p></div>
      {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Loading...</div> : (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#F8FAFC' }}>{['Name','Email','Role','Branch','Division','Status','Last Login','Action'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>)}</tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 600 }}>{u.fullname}</td>
                    <td style={{ padding: '11px 14px', color: '#64748B' }}>{u.email}</td>
                    <td style={{ padding: '11px 14px' }}><span style={{ background: (roleColor[u.role] || '#64748B') + '20', color: roleColor[u.role] || '#64748B', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{u.role.replace('_', ' ')}</span></td>
                    <td style={{ padding: '11px 14px', color: '#64748B' }}>{u.branch_name}</td>
                    <td style={{ padding: '11px 14px', color: '#64748B' }}>{u.division}</td>
                    <td style={{ padding: '11px 14px' }}><span style={{ background: (statusColor[u.status] || '#94A3B8') + '20', color: statusColor[u.status] || '#94A3B8', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{u.status}</span></td>
                    <td style={{ padding: '11px 14px', color: '#94A3B8', fontSize: 12 }}>{u.last_login ? new Date(u.last_login).toLocaleDateString('en-NG') : 'Never'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      {u.role !== 'head_admin' && (
                        <button onClick={() => toggleStatus(u)} style={{ padding: '4px 12px', background: u.status === 'active' ? '#FEE2E2' : '#DCFCE7', color: u.status === 'active' ? '#DC2626' : '#15803D', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ReportDetail.js
export function ReportDetail() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [comment, setComment] = useState('');
  const { id } = { id: window.location.pathname.split('/').pop() };
  useEffect(() => {
    api.get(`/reports/${id}`).then(r => setReport(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, [id]);
  const approve = async () => {
    try { await api.post(`/reports/${id}/approve`, { comment }); toast.success('Approved'); setReport(r => ({ ...r, status: 'approved' })); setModal(null); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const reject = async () => {
    if (!comment.trim()) return toast.error('Reason required');
    try { await api.post(`/reports/${id}/reject`, { reason: comment }); toast.success('Rejected'); setReport(r => ({ ...r, status: 'rejected' })); setModal(null); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Loading...</div>;
  if (!report) return <div style={{ padding: '3rem', textAlign: 'center', color: '#EF4444' }}>Report not found</div>;
  const statColor = { approved: '#22C55E', submitted: '#F59E0B', rejected: '#EF4444', draft: '#94A3B8' };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>{report.branch} — {report.month} {report.year}</h1>
          <span style={{ background: (statColor[report.status] || '#94A3B8') + '20', color: statColor[report.status] || '#94A3B8', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{report.status}</span>
        </div>
        {report.status === 'submitted' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setModal('approve'); setComment(''); }} style={{ padding: '9px 18px', background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>✓ Approve</button>
            <button onClick={() => { setModal('reject'); setComment(''); }} style={{ padding: '9px 18px', background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>✗ Reject</button>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: '1.25rem' }}>
        {[['Total Attendance', report.total_attendance], ['Total Men', report.total_men], ['Total Women', report.total_women], ['Total Children', report.total_children], ['New Converts', report.total_new_converts], ['New Guests', report.total_new_guests], ['Amount Remitted', '₦' + parseFloat(report.total_amount_remitted || 0).toLocaleString()]].map(([label, val]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '1rem' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A' }}>{val}</div>
          </div>
        ))}
      </div>
      {report.attendanceRows?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem', overflowX: 'auto' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 1rem' }}>Daily Attendance</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#0C447C' }}>{['Date','Day','Men','Women','Children','Total','Preacher','Converts','Guests','Sun School','House Flwp','Monetary'].map(h => <th key={h} style={{ padding: '6px 8px', color: '#fff', fontSize: 10, fontWeight: 700, textAlign: 'left' }}>{h}</th>)}</tr></thead>
            <tbody>{report.attendanceRows.filter(r => r.attendance_total > 0 || r.preacher_minister).map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 ? '#FAFBFC' : '#fff' }}>
                {[r.date, r.day_name, r.attendance_men, r.attendance_women, r.attendance_children, r.attendance_total, r.preacher_minister || '—', r.new_convert, r.new_guest, r.sunday_school_attendance, r.house_fellowship, '₦' + parseFloat(r.monetary_amount || 0).toLocaleString()].map((v, j) => (
                  <td key={j} style={{ padding: '6px 8px', color: '#374151' }}>{v}</td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '2rem', width: '100%', maxWidth: 420 }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: 17, fontWeight: 700 }}>{modal === 'approve' ? 'Approve Report' : 'Reject Report'}</h3>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder={modal === 'approve' ? 'Optional comment...' : 'Reason for rejection (required)...'}
              style={{ width: '100%', padding: 10, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '8px 16px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={modal === 'approve' ? approve : reject} style={{ padding: '8px 18px', background: modal === 'approve' ? '#15803D' : '#DC2626', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {modal === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityLog;
