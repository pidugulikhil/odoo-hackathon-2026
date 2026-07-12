import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Truck, Users, MapPin, Wrench, Fuel, Receipt, BarChart2,
  LayoutDashboard, LogOut, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { section: 'OVERVIEW', items: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['FLEET_MANAGER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'] },
  ]},
  { section: 'FLEET', items: [
    { to: '/vehicles', label: 'Vehicles', icon: Truck, roles: ['FLEET_MANAGER', 'SAFETY_OFFICER'] },
    { to: '/drivers', label: 'Drivers', icon: Users, roles: ['FLEET_MANAGER', 'SAFETY_OFFICER'] },
  ]},
  { section: 'OPERATIONS', items: [
    { to: '/trips', label: 'Trips', icon: MapPin, roles: ['FLEET_MANAGER', 'DRIVER', 'SAFETY_OFFICER'] },
    { to: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['FLEET_MANAGER'] },
    { to: '/fuel', label: 'Fuel Logs', icon: Fuel, roles: ['FLEET_MANAGER', 'FINANCIAL_ANALYST'] },
    { to: '/expenses', label: 'Expenses', icon: Receipt, roles: ['FLEET_MANAGER', 'FINANCIAL_ANALYST'] },
  ]},
  { section: 'ANALYTICS', items: [
    { to: '/reports', label: 'Reports', icon: BarChart2, roles: ['FLEET_MANAGER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'] },
  ]},
];

export default function Sidebar() {
  const { user, logout, ROLE_LABELS } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  // Filter sections and items based on user role
  const userRole = user?.role || 'DRIVER';
  const filteredNavItems = navItems.map(section => {
    const items = section.items.filter(item => item.roles.includes(userRole));
    return { ...section, items };
  }).filter(section => section.items.length > 0);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Truck size={18} color="#fff" />
        </div>
        <div>
          <div className="sidebar-logo-text">TransitOps</div>
          <div className="sidebar-logo-sub">Fleet Management</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {filteredNavItems.map(section => (
          <div key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Drive Safety Banner */}
      <div style={{ padding: '0 14px 14px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 12, padding: 14,
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1, transparent)' }} />
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Drive Safety. Save Lives.</h4>
          <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4, marginBottom: 12 }}>Monitor driver behavior and improve safety scores.</p>
          <button onClick={() => navigate('/reports')} style={{
            fontSize: 11, fontWeight: 600, color: '#fff',
            background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 6, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 4,
            cursor: 'pointer', transition: 'all 0.2s ease'
          }}>
            View Insights →
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {user && (
          <div className="user-info" onClick={handleLogout} title="Logout">
            <div className="user-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name truncate">{user.name}</div>
              <div className="user-role">{ROLE_LABELS[user.role] || user.role}</div>
            </div>
            <LogOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        )}
      </div>
    </aside>
  );
}
