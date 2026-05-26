// Analytics.js
import React, { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import api from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

export default function Analytics() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/reports/analytics/summary').then(r => setData(r.data)).catch(console.error); }, []);
  if (!data) return <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Loading analytics...</div>;
  const months = (data.monthly || []).slice(0, 6).reverse();
  const opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Analytics</h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Branch performance and trends</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.25rem' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 1rem' }}>Monthly Attendance</h3>
          <div style={{ height: 220 }}>
            <Bar data={{ labels: months.map(m => `${m.month.slice(0,3)} ${m.year}`), datasets: [{ label: 'Attendance', data: months.map(m => parseInt(m.total_attendance)), backgroundColor: '#3B82F6', borderRadius: 6 }] }} options={{ ...opts, plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.25rem' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 1rem' }}>Monthly Revenue (₦)</h3>
          <div style={{ height: 220 }}>
            <Line data={{ labels: months.map(m => `${m.month.slice(0,3)} ${m.year}`), datasets: [{ label: 'Revenue', data: months.map(m => parseFloat(m.total_remitted)), borderColor: '#22C55E', tension: 0.3, fill: false }] }} options={{ ...opts, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => '₦' + (v/1000).toFixed(0) + 'K' } } } }} />
          </div>
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.25rem' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 1rem' }}>Branch Performance (₦ Remitted)</h3>
        <div style={{ height: 260 }}>
          <Bar data={{ labels: (data.byBranch || []).map(b => b.branch), datasets: [{ label: 'Amount Remitted', data: (data.byBranch || []).map(b => parseFloat(b.total_remitted)), backgroundColor: '#8B5CF6', borderRadius: 6 }] }} options={{ ...opts, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => '₦' + (v/1000).toFixed(0) + 'K' } } } }} />
        </div>
      </div>
    </div>
  );
}
