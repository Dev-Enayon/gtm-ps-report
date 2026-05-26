import React, { useEffect, useState } from 'react';

import toast from 'react-hot-toast';
import api from '../utils/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/users').then(r => setUsers(r.data)).catch(() => toast.error('Failed to load users')).finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (u) => {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      await api.put(`/admin/users/${u.id}/status`, { status: newStatus });
      toast.success(`User ${newStatus}`);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: newStatus } : x));
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const roleColor = { head_admin: '#8B5CF6', admin: '#3B82F6', branch: '#64748B' };
  const statusColor = { active: '#22C55E', pending: '#F59E0B', suspended: '#EF4444' };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>User Management</h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{users.length} registered users</p>
      </div>
      {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Loading...</div> : (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Name', 'Email', 'Role', 'Branch', 'Division', 'Status', 'Last Login', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 600 }}>{u.fullname}</td>
                    <td style={{ padding: '11px 14px', color: '#64748B' }}>{u.email}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: (roleColor[u.role] || '#64748B') + '20', color: roleColor[u.role] || '#64748B', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#64748B' }}>{u.branch_name}</td>
                    <td style={{ padding: '11px 14px', color: '#64748B' }}>{u.division}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: (statusColor[u.status] || '#94A3B8') + '20', color: statusColor[u.status] || '#94A3B8', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#94A3B8', fontSize: 12 }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString('en-NG') : 'Never'}
                    </td>
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
