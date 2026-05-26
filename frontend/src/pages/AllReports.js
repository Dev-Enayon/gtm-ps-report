import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Filter, Download, Eye, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import * as XLSX from 'xlsx';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_COLOR = { approved: '#22C55E', submitted: '#F59E0B', rejected: '#EF4444', draft: '#94A3B8' };
const STATUS_BG = { approved: '#DCFCE7', submitted: '#FEF9C3', rejected: '#FEE2E2', draft: '#F1F5F9' };

export default function AllReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ month: '', year: '', branch: '', status: '', page: 1 });
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.month) params.set('month', filters.month);
      if (filters.year) params.set('year', filters.year);
      if (filters.branch) params.set('branch', filters.branch);
      if (filters.status) params.set('status', filters.status);
      params.set('page', filters.page);
      params.set('limit', 15);
      const { data } = await api.get(`/reports?${params}`);
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  const approve = async (id) => {
    setProcessing(id);
    try {
      await api.post(`/reports/${id}/approve`);
      toast.success('Report approved');
      fetchReports();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setProcessing(null); }
  };

  const reject = async () => {
    if (!rejectReason.trim()) return toast.error('Please provide a rejection reason');
    setProcessing(rejectModal);
    try {
      await api.post(`/reports/${rejectModal}/reject`, { reason: rejectReason });
      toast.success('Report returned for revision');
      setRejectModal(null); setRejectReason('');
      fetchReports();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setProcessing(null); }
  };

  const exportExcel = () => {
    const data = reports.map(r => ({
      'Branch': r.branch, 'Division': r.division, 'Month': r.month, 'Year': r.year,
      'Status': r.status, 'Total Attendance': r.total_attendance,
      'Total Men': r.total_men, 'Total Women': r.total_women, 'Total Children': r.total_children,
      'New Converts': r.total_new_converts, 'New Guests': r.total_new_guests,
      'Amount Remitted (₦)': r.total_amount_remitted,
      'Submitted By': r.submitted_by_name, 'Submitted At': r.submitted_at,
      'Reviewed By': r.reviewed_by_name || '', 'Reviewed At': r.reviewed_at || '',
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Reports');
    XLSX.writeFile(wb, `GOTM_Reports_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('Exported to Excel');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>All Reports</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{total} report{total !== 1 ? 's' : ''} found</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchReports} style={{ padding: '8px 14px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={exportExcel} style={{ padding: '8px 14px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={16} color="#94A3B8" />
        <select value={filters.month} onChange={e => setFilter('month', e.target.value)} style={{ padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 13, background: '#fff', color: '#374151' }}>
          <option value="">All Months</option>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filters.year} onChange={e => setFilter('year', e.target.value)} style={{ padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 13, background: '#fff' }}>
          <option value="">All Years</option>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilter('status', e.target.value)} style={{ padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 13, background: '#fff' }}>
          <option value="">All Statuses</option>
          {['draft', 'submitted', 'approved', 'rejected'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input placeholder="Search branch..." value={filters.branch} onChange={e => setFilter('branch', e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {(filters.month || filters.year || filters.status || filters.branch) && (
          <button onClick={() => setFilters({ month: '', year: '', branch: '', status: '', page: 1 })} style={{ padding: '7px 12px', background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Branch', 'Division', 'Period', 'Submitted By', 'Status', 'Attendance', 'Remitted (₦)', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>No reports found</td></tr>
              ) : reports.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F8FAFC', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F172A' }}>{r.branch}</td>
                  <td style={{ padding: '10px 14px', color: '#64748B' }}>{r.division}</td>
                  <td style={{ padding: '10px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>{r.month} {r.year}</td>
                  <td style={{ padding: '10px 14px', color: '#64748B' }}>{r.submitted_by_name}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: STATUS_BG[r.status], color: STATUS_COLOR[r.status], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748B', textAlign: 'right' }}>{(r.total_attendance || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: '#64748B', textAlign: 'right' }}>{(r.total_amount_remitted || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: '#94A3B8', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-NG') : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => navigate(`/admin/reports/${r.id}`)}
                        style={{ padding: '5px 10px', background: '#EFF6FF', color: '#185FA5', border: '1px solid #BFDBFE', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Eye size={13} /> View
                      </button>
                      {r.status === 'submitted' && (
                        <>
                          <button onClick={() => approve(r.id)} disabled={processing === r.id}
                            style={{ padding: '5px 8px', background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                            <CheckCircle size={13} />
                          </button>
                          <button onClick={() => { setRejectModal(r.id); setRejectReason(''); }}
                            style={{ padding: '5px 8px', background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                            <XCircle size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#64748B' }}>
            <span>Showing {Math.min((filters.page - 1) * 15 + 1, total)}–{Math.min(filters.page * 15, total)} of {total}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                style={{ padding: '5px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: filters.page <= 1 ? '#F8FAFC' : '#fff' }}>
                ← Prev
              </button>
              <button disabled={filters.page * 15 >= total} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                style={{ padding: '5px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '2rem', width: '100%', maxWidth: 440, boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
              <div style={{ width: 40, height: 40, background: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={20} color="#DC2626" />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>Return Report for Revision</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#374151' }}>Reason for rejection <span style={{ color: '#EF4444' }}>*</span></label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4}
                placeholder="Explain what needs to be corrected..."
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModal(null)} style={{ padding: '9px 18px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={reject} disabled={!!processing} style={{ padding: '9px 18px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: processing ? 0.7 : 1 }}>
                {processing ? 'Rejecting...' : 'Reject Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
