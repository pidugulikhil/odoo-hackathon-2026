import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Truck, Users, MapPin, Wrench, Fuel, Receipt, BarChart2,
  LayoutDashboard, LogOut, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { section: 'OVERVIEW', items: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'FLEET', items: [
    { to: '/vehicles', label: 'Vehicles', icon: Truck },
    { to: '/drivers', label: 'Drivers', icon: Users },
  ]},
  { section: 'OPERATIONS', items: [
    { to: '/trips', label: 'Trips', icon: MapPin },
    { to: '/maintenance', label: 'Maintenance', icon: Wrench },
    { to: '/fuel', label: 'Fuel Logs', icon: Fuel },
    { to: '/expenses', label: 'Expenses', icon: Receipt },
  ]},
  { section: 'ANALYTICS', items: [
    { to: '/reports', label: 'Reports', icon: BarChart2 },
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
        {navItems.map(section => (
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
