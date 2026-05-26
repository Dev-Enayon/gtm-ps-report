import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Save, Send } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DIVISIONS = ['Division A','Division B','Division C','Division D'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getDaysInMonth(month, year) {
  return new Date(parseInt(year), MONTHS.indexOf(month) + 1, 0).getDate();
}
function getStartDay(month, year) {
  return new Date(parseInt(year), MONTHS.indexOf(month), 1).getDay();
}
function buildRows(month, year, existing = []) {
  const days = getDaysInMonth(month, year);
  const start = getStartDay(month, year);
  return Array.from({ length: days }, (_, i) => {
    const ex = existing.find(r => r.date === i + 1) || {};
    return {
      date: i + 1, day_name: DAY_NAMES[(start + i) % 7],
      attendance_men: ex.attendance_men || '', attendance_women: ex.attendance_women || '',
      attendance_children: ex.attendance_children || '', attendance_total: ex.attendance_total || 0,
      preacher_minister: ex.preacher_minister || '', new_convert: ex.new_convert || '',
      new_guest: ex.new_guest || '', sunday_school_attendance: ex.sunday_school_attendance || '',
      house_fellowship: ex.house_fellowship || '', monetary_amount: ex.monetary_amount || '',
    };
  });
}

const FIN_GROUPS = [
  { label: "Workers' Tithe", fields: [{ label: '100%', key: 'workers_tithe_100' }, { label: '70%', key: 'workers_tithe_70' }] },
  { label: "Members' Tithe", fields: [{ label: '100%', key: 'members_tithe_100' }, { label: '70%', key: 'members_tithe_70' }] },
  { label: 'Welfare Offering', fields: [{ label: '100%', key: 'welfare_offering_100' }, { label: '90%', key: 'welfare_offering_90' }, { label: '10%', key: 'welfare_offering_10' }] },
  { label: 'Offering', fields: [{ label: '100%', key: 'offering_100' }, { label: '70%', key: 'offering_70' }, { label: '30%', key: 'offering_30' }] },
  { label: 'Wednesday Offering', fields: [{ label: '70%', key: 'wednesday_offering_70' }, { label: '30%', key: 'wednesday_offering_30' }] },
  { label: 'Gospel Service Offering', fields: [{ label: '70%', key: 'gospel_service_offering_70' }, { label: '30%', key: 'gospel_service_offering_30' }] },
];
const ALL_FIN_KEYS = FIN_GROUPS.flatMap(g => g.fields.map(f => f.key));

export default function ReportForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [header, setHeader] = useState({ division: user?.division || '', branch: user?.branch_name || '', month: MONTHS[new Date().getMonth()], year: String(new Date().getFullYear()) });
  const [rows, setRows] = useState(() => buildRows(header.month, header.year));
  const [fin, setFin] = useState(Object.fromEntries(ALL_FIN_KEYS.map(k => [k, ''])));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const autosaveRef = useRef(null);

  // Load existing report if editing
  useEffect(() => {
    if (id) {
      api.get(`/reports/${id}`).then(({ data }) => {
        setHeader({ division: data.division, branch: data.branch, month: data.month, year: String(data.year) });
        setRows(buildRows(data.month, data.year, data.attendanceRows || []));
        const finData = {};
        ALL_FIN_KEYS.forEach(k => { finData[k] = data[k] || ''; });
        setFin(finData);
      }).catch(() => toast.error('Failed to load report'));
    }
  }, [id]);

  // Autosave every 60s
  useEffect(() => {
    autosaveRef.current = setInterval(() => { saveDraft(true); }, 60000);
    return () => clearInterval(autosaveRef.current);
  }, [header, rows, fin]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRow = (i, field, val) => {
    setRows(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      const m = parseInt(next[i].attendance_men) || 0;
      const w = parseInt(next[i].attendance_women) || 0;
      const c = parseInt(next[i].attendance_children) || 0;
      next[i].attendance_total = m + w + c;
      return next;
    });
  };

  const changeMonth = (month) => {
    setHeader(h => ({ ...h, month }));
    setRows(buildRows(month, header.year));
  };
  const changeYear = (year) => {
    setHeader(h => ({ ...h, year }));
    setRows(buildRows(header.month, year));
  };

  const buildPayload = (status) => ({
    ...header, year: parseInt(header.year), status,
    attendanceRows: rows.map(r => ({ ...r, attendance_men: parseInt(r.attendance_men) || 0, attendance_women: parseInt(r.attendance_women) || 0, attendance_children: parseInt(r.attendance_children) || 0, new_convert: parseInt(r.new_convert) || 0, new_guest: parseInt(r.new_guest) || 0, sunday_school_attendance: parseInt(r.sunday_school_attendance) || 0, house_fellowship: parseInt(r.house_fellowship) || 0, monetary_amount: parseFloat(r.monetary_amount) || 0 })),
    financials: Object.fromEntries(Object.entries(fin).map(([k, v]) => [k, parseFloat(v) || 0])),
  });

  const saveDraft = async (silent = false) => {
    if (!header.division || !header.branch) return;
    setSaving(true);
    try {
      await api.post('/reports', buildPayload('draft'));
      if (!silent) toast.success('Draft saved');
    } catch (err) {
      if (!silent) toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const submitReport = async () => {
    if (!header.division || !header.branch) return toast.error('Please fill in Division and Branch');
    setLoading(true);
    try {
      await api.post('/reports', buildPayload('submitted'));
      toast.success('Report submitted successfully! Admin will review shortly.');
      navigate('/my-reports');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally { setLoading(false); }
  };

  // Totals
  const totals = { men: 0, women: 0, children: 0, total: 0, converts: 0, guests: 0, sunday: 0, fellowship: 0, monetary: 0 };
  rows.forEach(r => {
    totals.men += parseInt(r.attendance_men) || 0;
    totals.women += parseInt(r.attendance_women) || 0;
    totals.children += parseInt(r.attendance_children) || 0;
    totals.total += r.attendance_total || 0;
    totals.converts += parseInt(r.new_convert) || 0;
    totals.guests += parseInt(r.new_guest) || 0;
    totals.sunday += parseInt(r.sunday_school_attendance) || 0;
    totals.fellowship += parseInt(r.house_fellowship) || 0;
    totals.monetary += parseFloat(r.monetary_amount) || 0;
  });
  const totalRemitted = ALL_FIN_KEYS.reduce((s, k) => s + (parseFloat(fin[k]) || 0), 0);

  const inp = (val, onChange, style = {}) => (
    <input type="number" min="0" value={val} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '3px 4px', border: '1px solid #E2E8F0', borderRadius: 4, fontSize: 11, textAlign: 'right', background: '#fff', ...style }} />
  );
  const cell = { padding: '4px 5px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9', fontSize: 12 };
  const hcell = { ...cell, background: '#0C447C', color: '#fff', fontSize: 10, fontWeight: 700, padding: '6px 5px', whiteSpace: 'nowrap' };
  const tcell = { ...cell, background: '#EFF6FF', color: '#0C447C', fontWeight: 600, textAlign: 'right' };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>{id ? 'Edit' : 'New'} Monthly Report</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Auto-saves every 60 seconds · {saving ? 'Saving...' : 'Saved'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => saveDraft()} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={submitReport} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            <Send size={15} /> {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
        {/* Church header */}
        <div style={{ background: '#0C447C', color: '#fff', textAlign: 'center', padding: '1rem', borderBottom: '3px solid #378ADD' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>GOSPEL OF TRUTH MISSION</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Monthly General Progress Report Sheet</div>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {/* Report header fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: '1.5rem', padding: '1rem', background: '#F8FAFC', borderRadius: 8 }}>
            {[
              { label: 'Division', type: 'select', value: header.division, onChange: v => setHeader(h => ({ ...h, division: v })), options: DIVISIONS },
              { label: 'Branch', type: 'text', value: header.branch, onChange: v => setHeader(h => ({ ...h, branch: v })), placeholder: 'Branch name' },
              { label: 'Month', type: 'select', value: header.month, onChange: changeMonth, options: MONTHS },
              { label: 'Year', type: 'select', value: header.year, onChange: changeYear, options: ['2023','2024','2025','2026'] },
            ].map(({ label, type, value, onChange, options, placeholder }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                {type === 'select' ? (
                  <select value={value} onChange={e => onChange(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                    <option value="">Select {label}</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
          </div>

          {/* Attendance table */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0C447C', marginBottom: '0.75rem' }}>
              Attendance Record — {header.month} {header.year} ({rows.length} days)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 820 }}>
                <thead>
                  <tr>
                    {['Date','Day','Men','Women','Children','Total','Preacher/Minister','New Convert','New Guest','Sun. School','House Flwp','Monetary (₦)'].map(h => (
                      <th key={h} style={hcell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                      <td style={{ ...cell, textAlign: 'center', fontWeight: 600, color: '#475569', width: 32 }}>{r.date}</td>
                      <td style={{ ...cell, textAlign: 'center', color: '#94A3B8', width: 36, fontSize: 11 }}>{r.day_name}</td>
                      <td style={{ ...cell, width: 52 }}>{inp(r.attendance_men, v => updateRow(i, 'attendance_men', v))}</td>
                      <td style={{ ...cell, width: 52 }}>{inp(r.attendance_women, v => updateRow(i, 'attendance_women', v))}</td>
                      <td style={{ ...cell, width: 52 }}>{inp(r.attendance_children, v => updateRow(i, 'attendance_children', v))}</td>
                      <td style={{ ...tcell, width: 44 }}>{r.attendance_total || 0}</td>
                      <td style={{ ...cell, minWidth: 110 }}>
                        <input type="text" value={r.preacher_minister} onChange={e => updateRow(i, 'preacher_minister', e.target.value)} placeholder="Name"
                          style={{ width: '100%', padding: '3px 4px', border: '1px solid #E2E8F0', borderRadius: 4, fontSize: 11 }} />
                      </td>
                      <td style={{ ...cell, width: 52 }}>{inp(r.new_convert, v => updateRow(i, 'new_convert', v))}</td>
                      <td style={{ ...cell, width: 52 }}>{inp(r.new_guest, v => updateRow(i, 'new_guest', v))}</td>
                      <td style={{ ...cell, width: 60 }}>{inp(r.sunday_school_attendance, v => updateRow(i, 'sunday_school_attendance', v))}</td>
                      <td style={{ ...cell, width: 60 }}>{inp(r.house_fellowship, v => updateRow(i, 'house_fellowship', v))}</td>
                      <td style={{ ...cell, width: 80 }}>{inp(r.monetary_amount, v => updateRow(i, 'monetary_amount', v))}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#0C447C' }}>
                    <td colSpan={2} style={{ ...hcell, textAlign: 'center' }}>TOTALS</td>
                    {[totals.men, totals.women, totals.children, totals.total].map((v, i) => <td key={i} style={{ ...hcell, textAlign: 'right' }}>{v.toLocaleString()}</td>)}
                    <td style={hcell}></td>
                    {[totals.converts, totals.guests, totals.sunday, totals.fellowship].map((v, i) => <td key={i} style={{ ...hcell, textAlign: 'right' }}>{v.toLocaleString()}</td>)}
                    <td style={{ ...hcell, textAlign: 'right' }}>₦{totals.monetary.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial breakdown */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0C447C', marginBottom: '0.75rem' }}>Financial Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: '1rem' }}>
              {FIN_GROUPS.map(({ label, fields }) => (
                <div key={label} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0C447C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  {fields.map(({ label: pct, key }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{pct}</span>
                      <input type="number" min="0" step="0.01" value={fin[key]} onChange={e => setFin(f => ({ ...f, [key]: e.target.value }))} placeholder="0.00"
                        style={{ width: 120, padding: '5px 8px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, textAlign: 'right', background: '#fff' }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Total remitted */}
            <div style={{ background: '#0C447C', borderRadius: 10, padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600 }}>TOTAL AMOUNT REMITTED</span>
              <span style={{ color: '#fff', fontSize: 26, fontWeight: 800 }}>₦{totalRemitted.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
