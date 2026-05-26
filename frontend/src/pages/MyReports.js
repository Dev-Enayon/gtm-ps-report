import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusCircle, FileText, CheckCircle, Clock, XCircle, Edit, Download } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const STATUS_COLOR = { approved: '#22C55E', submitted: '#F59E0B', rejected: '#EF4444', draft: '#94A3B8' };
const STATUS_BG = { approved: '#DCFCE7', submitted: '#FEF9C3', rejected: '#FEE2E2', draft: '#F1F5F9' };

export default function MyReports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports?limit=50').then(({ data }) => setReports(data.reports || [])).catch(() => toast.error('Failed to load reports')).finally(() => setLoading(false));
  }, []);

  const counts = {
    approved: reports.filter(r => r.status === 'approved').length,
    submitted: reports.filter(r => r.status === 'submitted').length,
    rejected: reports.filter(r => r.status === 'rejected').length,
    draft: reports.filter(r => r.status === 'draft').length,
  };

  const exportPDF = (report) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(12, 68, 124);
    doc.text('Gospel of Truth Mission', 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('Monthly General Progress Report', 14, 28);
    doc.setFontSize(10);
    doc.text(`Branch: ${report.branch}    Division: ${report.division}    Period: ${report.month} ${report.year}`, 14, 38);
    doc.text(`Status: ${report.status.toUpperCase()}    Generated: ${new Date().toLocaleDateString()}`, 14, 46);
    doc.autoTable({
      startY: 55,
      head: [['Metric', 'Value']],
      body: [
        ['Total Men', report.total_men],
        ['Total Women', report.total_women],
        ['Total Children', report.total_children],
        ['Total Attendance', report.total_attendance],
        ['New Converts', report.total_new_converts],
        ['New Guests', report.total_new_guests],
        ['Total Amount Remitted', `₦${parseFloat(report.total_amount_remitted || 0).toLocaleString()}`],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [24, 95, 165] },
    });
    doc.save(`GOTM_Report_${report.branch}_${report.month}_${report.year}.pdf`);
    toast.success('PDF downloaded');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>My Reports</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{user?.branch_name} — {reports.length} report{reports.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => navigate('/my-reports/new')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          <PlusCircle size={17} /> New Report
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {[
          { icon: CheckCircle, label: 'Approved', value: counts.approved, color: '#22C55E' },
          { icon: Clock, label: 'Pending', value: counts.submitted, color: '#F59E0B' },
          { icon: XCircle, label: 'Rejected', value: counts.rejected, color: '#EF4444' },
          { icon: FileText, label: 'Drafts', value: counts.draft, color: '#94A3B8' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, background: color + '20', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A' }}>{value}</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Reports list */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Loading...</div>
      ) : reports.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '4rem', textAlign: 'center' }}>
          <FileText size={48} color="#CBD5E1" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#475569', margin: '0 0 8px' }}>No reports yet</h3>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 1.25rem' }}>Submit your first monthly report to get started.</p>
          <button onClick={() => navigate('/my-reports/new')}
            style={{ padding: '9px 20px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Create First Report
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Month', 'Year', 'Status', 'Attendance', 'Amount Remitted', 'Submitted', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.month}</td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>{r.year}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: STATUS_BG[r.status], color: STATUS_COLOR[r.status], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B', textAlign: 'right' }}>{(r.total_attendance || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: '#64748B', textAlign: 'right' }}>₦{(r.total_amount_remitted || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 12 }}>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-NG') : '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {r.status === 'draft' || r.status === 'rejected' ? (
                        <button onClick={() => navigate(`/my-reports/${r.id}/edit`)}
                          style={{ padding: '5px 10px', background: '#FEF9C3', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Edit size={12} /> Edit
                        </button>
                      ) : null}
                      <button onClick={() => exportPDF(r)}
                        style={{ padding: '5px 10px', background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Download size={12} /> PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
