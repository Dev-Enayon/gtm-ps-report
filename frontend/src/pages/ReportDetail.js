import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import api from '../utils/api';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    api.get(`/reports/${id}`).then(r => setReport(r.data)).catch(() => toast.error('Failed to load report')).finally(() => setLoading(false));
  }, [id]);

  const approve = async () => {
    setProcessing(true);
    try {
      await api.post(`/reports/${id}/approve`, { comment });
      toast.success('Report approved!');
      setReport(r => ({ ...r, status: 'approved', admin_comment: comment }));
      setModal(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setProcessing(false); }
  };

  const reject = async () => {
    if (!comment.trim()) return toast.error('Rejection reason is required');
    setProcessing(true);
    try {
      await api.post(`/reports/${id}/reject`, { reason: comment });
      toast.success('Report returned for revision');
      setReport(r => ({ ...r, status: 'rejected', rejection_reason: comment }));
      setModal(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setProcessing(false); }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Loading report...</div>;
  if (!report) return <div style={{ padding: '3rem', textAlign: 'center', color: '#EF4444' }}>Report not found</div>;

  const statColor = { approved: '#22C55E', submitted: '#F59E0B', rejected: '#EF4444', draft: '#94A3B8' };
  const statBg = { approved: '#DCFCE7', submitted: '#FEF9C3', rejected: '#FEE2E2', draft: '#F1F5F9' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 8 }}>
            <ArrowLeft size={15} /> Back to reports
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>{report.branch} — {report.month} {report.year}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ background: statBg[report.status], color: statColor[report.status], padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{report.status.toUpperCase()}</span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Division: {report.division}</span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Submitted by: {report.submitted_by_name}</span>
          </div>
        </div>
        {report.status === 'submitted' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setModal('approve'); setComment(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <CheckCircle size={16} /> Approve
            </button>
            <button onClick={() => { setModal('reject'); setComment(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <XCircle size={16} /> Reject
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      {report.admin_comment && <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, padding: '12px 16px', marginBottom: '1rem', fontSize: 13, color: '#15803D' }}><strong>Admin comment:</strong> {report.admin_comment}</div>}
      {report.rejection_reason && <div style={{ background: '#FFF1F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', marginBottom: '1rem', fontSize: 13, color: '#DC2626' }}><strong>Rejection reason:</strong> {report.rejection_reason}</div>}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: '1.25rem' }}>
        {[['Total Attendance', report.total_attendance || 0], ['Men', report.total_men || 0], ['Women', report.total_women || 0], ['Children', report.total_children || 0], ['New Converts', report.total_new_converts || 0], ['New Guests', report.total_new_guests || 0], ['Amount Remitted', '₦' + parseFloat(report.total_amount_remitted || 0).toLocaleString()]].map(([label, val]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '1rem' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Attendance table */}
      {report.attendanceRows?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem', overflowX: 'auto' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 1rem', color: '#0C447C' }}>Daily Attendance Record</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#0C447C' }}>
                {['Date', 'Day', 'Men', 'Women', 'Children', 'Total', 'Preacher', 'Converts', 'Guests', 'Sun School', 'House Flwp', 'Monetary (₦)'].map(h => (
                  <th key={h} style={{ padding: '7px 8px', color: '#fff', fontSize: 10, fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.attendanceRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 ? '#FAFBFC' : '#fff' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.date}</td>
                  <td style={{ padding: '6px 8px', color: '#94A3B8' }}>{r.day_name}</td>
                  <td style={{ padding: '6px 8px' }}>{r.attendance_men || 0}</td>
                  <td style={{ padding: '6px 8px' }}>{r.attendance_women || 0}</td>
                  <td style={{ padding: '6px 8px' }}>{r.attendance_children || 0}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: '#185FA5' }}>{r.attendance_total || 0}</td>
                  <td style={{ padding: '6px 8px', color: '#64748B' }}>{r.preacher_minister || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{r.new_convert || 0}</td>
                  <td style={{ padding: '6px 8px' }}>{r.new_guest || 0}</td>
                  <td style={{ padding: '6px 8px' }}>{r.sunday_school_attendance || 0}</td>
                  <td style={{ padding: '6px 8px' }}>{r.house_fellowship || 0}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>₦{parseFloat(r.monetary_amount || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '2rem', width: '100%', maxWidth: 440, boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: modal === 'approve' ? '#DCFCE7' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {modal === 'approve' ? <CheckCircle size={20} color="#15803D" /> : <XCircle size={20} color="#DC2626" />}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{modal === 'approve' ? 'Approve Report' : 'Reject Report'}</div>
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4}
              placeholder={modal === 'approve' ? 'Optional comment for the branch...' : 'Reason for rejection (required)...'}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '8px 16px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={modal === 'approve' ? approve : reject} disabled={processing}
                style={{ padding: '8px 18px', background: modal === 'approve' ? '#15803D' : '#DC2626', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: processing ? 0.7 : 1 }}>
                {processing ? 'Processing...' : modal === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
