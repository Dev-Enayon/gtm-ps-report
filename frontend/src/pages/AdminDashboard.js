import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { FileText, Users, Clock, CheckCircle, XCircle, DollarSign, GitBranch, ShieldCheck } from 'lucide-react';
import api from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend);

const Card = ({ icon: Icon, label, value, sub, color }) => (
  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{ width: 36, height: 36, background: color + '20', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </div>
      <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: '#94A3B8' }}>{sub}</div>}
  </div>
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/reports/analytics/summary'),
      api.get('/reports?limit=5'),
    ]).then(([s, a, r]) => {
      setStats(s.data);
      setAnalytics(a.data);
      setRecentReports(r.data.reports || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Loading dashboard...</div>;

  const months = analytics?.monthly?.slice(0, 6).reverse() || [];
  const attendanceChart = {
    labels: months.map(m => `${m.month.slice(0,3)} ${m.year}`),
    datasets: [{ label: 'Total Attendance', data: months.map(m => parseInt(m.total_attendance)), backgroundColor: '#3B82F6', borderRadius: 6 }],
  };
  const statusChart = {
    labels: ['Approved', 'Pending', 'Rejected', 'Draft'],
    datasets: [{ data: [stats?.approvedReports, stats?.pendingReports, stats?.rejectedReports, (stats?.totalReports - stats?.approvedReports - stats?.pendingReports - stats?.rejectedReports) || 0], backgroundColor: ['#22C55E', '#F59E0B', '#EF4444', '#94A3B8'] }],
  };
  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };

  const badgeColor = { approved: '#22C55E', submitted: '#F59E0B', rejected: '#EF4444', draft: '#94A3B8' };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>Overview of all branch activities</p>
        </div>
        {stats?.pendingAdminRequests > 0 && (
          <button onClick={() => navigate('/admin/requests')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 8, color: '#92400E', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <ShieldCheck size={16} /> {stats.pendingAdminRequests} pending admin request{stats.pendingAdminRequests > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: '1.5rem' }}>
        <Card icon={GitBranch} label="Total Branches" value={stats?.totalBranches || 0} color="#3B82F6" sub="Active branches" />
        <Card icon={FileText} label="Reports Submitted" value={stats?.totalReports || 0} color="#8B5CF6" sub="This period" />
        <Card icon={Clock} label="Pending Review" value={stats?.pendingReports || 0} color="#F59E0B" sub="Awaiting approval" />
        <Card icon={CheckCircle} label="Approved" value={stats?.approvedReports || 0} color="#22C55E" sub="Reports approved" />
        <Card icon={XCircle} label="Rejected" value={stats?.rejectedReports || 0} color="#EF4444" sub="Need revision" />
        <Card icon={DollarSign} label="Total Revenue" value={`₦${((stats?.totalRevenue || 0) / 1000).toFixed(0)}K`} color="#0EA5E9" sub="From approved reports" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.25rem' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: '1rem' }}>Monthly Attendance Trend</h3>
          <div style={{ height: 220 }}><Bar data={attendanceChart} options={chartOpts} /></div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.25rem' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: '1rem' }}>Report Status</h3>
          <div style={{ height: 220 }}><Doughnut data={statusChart} options={{ ...chartOpts, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }} /></div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>Recent Submissions</h3>
          <button onClick={() => navigate('/admin/reports')} style={{ fontSize: 13, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>View all →</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                {['Branch', 'Division', 'Period', 'Status', 'Attendance', 'Remitted', 'Action'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94A3B8', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentReports.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No reports yet</td></tr>
              ) : recentReports.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.branch}</td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{r.division}</td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{r.month} {r.year}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: badgeColor[r.status] + '20', color: badgeColor[r.status], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{(r.total_attendance || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>₦{(r.total_amount_remitted || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => navigate(`/admin/reports/${r.id}`)} style={{ padding: '4px 12px', background: '#EFF6FF', color: '#185FA5', border: '1px solid #BFDBFE', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
