import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Church, LayoutDashboard, FileText, BarChart2, Activity,
  Users, ShieldCheck, ClipboardList, PlusCircle, History,
  LogOut, Bell, Menu, X, UserCog
} from 'lucide-react';

const S = {
  wrap: { display: 'flex', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', background: '#F8FAFC' },
  sidebar: (open) => ({
    width: 240, background: '#0C447C', color: '#fff', display: 'flex', flexDirection: 'column',
    position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 200,
    transform: open ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.25s ease', overflowY: 'auto',
  }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 },
  brand: { padding: '1.25rem 1rem', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.1)' },
  brandIcon: { width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  brandText: { fontSize: 13, fontWeight: 600, lineHeight: 1.3 },
  section: { fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', padding: '12px 1rem 4px', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8 },
  navItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 1rem', fontSize: 13, fontWeight: 500,
    color: active ? '#fff' : 'rgba(255,255,255,0.65)', background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
    borderRadius: 0, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.15s',
    borderLeft: active ? '3px solid #60A5FA' : '3px solid transparent',
  }),
  main: { flex: 1, marginLeft: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  topbar: { background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  content: { flex: 1, padding: '1.5rem', maxWidth: 1200, width: '100%', margin: '0 auto', boxSizing: 'border-box' },
  avatar: { width: 34, height: 34, borderRadius: '50%', background: '#185FA5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  userInfo: { fontSize: 13, color: '#475569' },
};

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink to={to} style={({ isActive }) => S.navItem(isActive)}>
      <Icon size={17} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function DashboardLayout() {
  const { user, logout, isAdmin, isHeadAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const initials = user?.fullname?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div style={S.wrap}>
      {/* Sidebar */}
      {!sidebarOpen && <div style={S.overlay} onClick={() => setSidebarOpen(true)} />}
      <aside style={{ ...S.sidebar(sidebarOpen), transform: sidebarOpen ? 'translateX(0)' : 'translateX(-240px)' }}>
        <div style={S.brand}>
          <div style={S.brandIcon}><Church size={20} color="#fff" /></div>
          <div style={S.brandText}>Gospel of Truth<br /><span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>Report System</span></div>
        </div>

        <nav style={{ flex: 1, paddingTop: 8 }}>
          {isAdmin ? (
            <>
              <div style={S.section}>Overview</div>
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
              <div style={S.section}>Reports</div>
              <NavItem to="/admin/reports" icon={FileText} label="All Reports" />
              <NavItem to="/analytics" icon={BarChart2} label="Analytics" />
              <div style={S.section}>Administration</div>
              <NavItem to="/activity" icon={Activity} label="Activity Log" />
              <NavItem to="/users" icon={Users} label="User Management" />
              {isHeadAdmin && <NavItem to="/admin/requests" icon={ShieldCheck} label="Admin Requests" />}
            </>
          ) : (
            <>
              <div style={S.section}>My Reports</div>
              <NavItem to="/my-reports" icon={ClipboardList} label="My Reports" />
              <NavItem to="/my-reports/new" icon={PlusCircle} label="New Report" />
              <div style={S.section}>Account</div>
              <NavItem to="/my-reports" icon={History} label="History" />
              <NavItem to="/request-admin" icon={UserCog} label="Request Admin Access" />
            </>
          )}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{user?.fullname}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
            {user?.role === 'head_admin' ? '👑 Head Admin' : user?.role === 'admin' ? '🔐 Admin' : `📍 ${user?.branch_name}`}
          </div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.75)', fontSize: 13, cursor: 'pointer', width: '100%' }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ ...S.main, marginLeft: sidebarOpen ? 240 : 0, transition: 'margin 0.25s ease' }}>
        <header style={S.topbar}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}>
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bell size={18} color="#64748B" style={{ cursor: 'pointer' }} />
            <div style={S.avatar}>{initials}</div>
            <div style={S.userInfo}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1E293B' }}>{user?.fullname}</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>{user?.branch_name} · {user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        </header>
        <main style={S.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
