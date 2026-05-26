import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldX, Clock, User, Building, MessageSquare } from 'lucide-react';
import api from '../utils/api';

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [modal, setModal] = useState(null); // { type: 'approve'|'reject', request }
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/requests?status=${filter}`);
      setRequests(data);
    } catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await api.post(`/admin/requests/${modal.request.id}/approve`, { note });
      toast.success(`Admin access granted to ${modal.request.fullname}`);
      setModal(null); setNote('');
      fetchRequests();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setProcessing(false); }
  };

  const handleReject = async () => {
    if (!note.trim()) return toast.error('Please provide a reason for rejection');
    setProcessing(true);
    try {
      await api.post(`/admin/requests/${modal.request.id}/reject`, { reason: note });
      toast.success('Request rejected');
      setModal(null); setNote('');
      fetchRequests();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setProcessing(false); }
  };

  const statusColor = { pending: '#F59E0B', approved: '#22C55E', rejected: '#EF4444' };
  const statusBg = { pending: '#FEF9C3', approved: '#DCFCE7', rejected: '#FEE2E2' };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Admin Access Requests</h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Review and manage user requests for admin privileges</p>
      </div>

      {/* Notice */}
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', fontSize: 13, color: '#1E40AF', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Head Admin Only:</strong> Only you (the Head Administrator) can approve or reject requests to grant users admin-level access to the church management system. Approved users become Admins and can manage reports from all branches.
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'transparent', borderBottom: filter === s ? '2px solid #185FA5' : '2px solid transparent', color: filter === s ? '#185FA5' : '#64748B', textTransform: 'capitalize' }}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Loading requests...</div>
      ) : requests.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#94A3B8' }}>
          <ShieldCheck size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
          <div>No {filter} requests found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {requests.map(req => (
            <div key={req.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 44, height: 44, background: '#185FA520', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={20} color="#185FA5" />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>{req.fullname}</div>
                    <div style={{ fontSize: 13, color: '#64748B', margin: '2px 0' }}>{req.email}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building size={12} /> {req.branch_name}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {new Date(req.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: statusBg[req.status], color: statusColor[req.status], padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                  {req.status === 'pending' && (
                    <>
                      <button onClick={() => { setModal({ type: 'approve', request: req }); setNote(''); }}
                        style={{ padding: '7px 16px', background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={15} /> Approve
                      </button>
                      <button onClick={() => { setModal({ type: 'reject', request: req }); setNote(''); }}
                        style={{ padding: '7px 16px', background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldX size={15} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1rem', background: '#F8FAFC', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={12} /> Reason for requesting admin access:
                </div>
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{req.reason}</div>
              </div>

              {req.review_note && (
                <div style={{ marginTop: 10, background: req.status === 'approved' ? '#F0FDF4' : '#FFF1F2', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: req.status === 'approved' ? '#15803D' : '#DC2626' }}>
                  <strong>Review note:</strong> {req.review_note}
                  {req.reviewed_by_name && <span style={{ fontSize: 12, opacity: 0.7 }}> — by {req.reviewed_by_name}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 460, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
              {modal.type === 'approve'
                ? <div style={{ width: 44, height: 44, background: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={22} color="#15803D" /></div>
                : <div style={{ width: 44, height: 44, background: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldX size={22} color="#DC2626" /></div>
              }
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                  {modal.type === 'approve' ? 'Approve Admin Access' : 'Reject Request'}
                </div>
                <div style={{ fontSize: 13, color: '#64748B' }}>for {modal.request.fullname}</div>
              </div>
            </div>

            {modal.type === 'approve' && (
              <div style={{ background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400E', marginBottom: '1rem' }}>
                This will grant <strong>{modal.request.fullname}</strong> full admin access to review and manage branch reports. This action will be logged.
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                {modal.type === 'approve' ? 'Note (optional)' : 'Rejection reason (required)'}
              </label>
              <textarea
                value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder={modal.type === 'approve' ? 'Add a note to the approval...' : 'Explain why the request was not approved...'}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 20px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                disabled={processing}
                onClick={modal.type === 'approve' ? handleApprove : handleReject}
                style={{ padding: '9px 20px', background: modal.type === 'approve' ? '#15803D' : '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: processing ? 0.7 : 1 }}>
                {processing ? 'Processing...' : modal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
