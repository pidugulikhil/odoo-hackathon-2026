import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import {
  Plus, Search, Download, Eye, Pencil, Users,
  AlertTriangle, Shield, Clock, RefreshCw, Bell,
  ChevronDown, Sliders, Filter, Calendar, UserCheck,
  UserX, Truck, MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import NotificationsBell from '../../components/layout/NotificationsBell';

const STATUSES = ['', 'AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED'];
const CATEGORIES = ['', 'HGV', 'LMV', 'HTV', 'PSV', 'MCWG'];
const LICENSE_STATUSES = ['', 'VALID', 'EXPIRING_SOON', 'EXPIRED'];
const REGIONS = ['', 'Delhi', 'Haryana', 'Punjab', 'Maharashtra', 'West Bengal', 'Uttar Pradesh', 'Rajasthan', 'Karnataka', 'Tamil Nadu'];

/* ─── Sub-components ───────────────────────────────────────── */

function KpiBox({ icon: Icon, title, value, subtitle, color, iconBg }) {
  return (
    <div style={{
      flex: '1 1 180px',
      background: 'var(--surface-card)',
      border: '1px solid var(--surface-border)',
      borderRadius: 16,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minWidth: 170
    }}>
      <div>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', lineHeight: 1, marginBottom: 6 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: color || 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {subtitle}
        </div>
      </div>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: iconBg || 'rgba(255,255,255,0.03)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={18} color={color || '#94a3b8'} />
      </div>
    </div>
  );
}

function SafetyProgressBar({ score }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
  const label = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Fair' : 'Poor';
  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color,
          borderRadius: 2, transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  );
}

function LicenseStatusTag({ status, expiryDate }) {
  const isExpired = status === 'EXPIRED';
  const isExpiring = status === 'EXPIRING_SOON';
  const color = isExpired ? '#ef4444' : isExpiring ? '#f59e0b' : '#10b981';
  const text = isExpired ? 'Expired' : isExpiring ? 'Exp. soon' : 'Valid';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{text}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
        {new Date(expiryDate).toLocaleDateString('en-IN')}
      </div>
    </div>
  );
}

function DriverInitialsAvatar({ name, score }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const bg = score >= 80 ? 'rgba(16,185,129,0.1)' : score >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: bg, border: `1px solid ${color}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 700, color, flexShrink: 0
    }}>
      {name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );
}

/* ─── Main Page Component ───────────────────────────────────── */

export default function DriverListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole('FLEET_MANAGER', 'SAFETY_OFFICER');

  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [licStatus, setLicStatus] = useState('');
  const [region, setRegion] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [showAdvanceFilters, setShowAdvanceFilters] = useState(false);

  // Fetch stats and list of drivers
  const loadData = useCallback(async () => {
    setLoading(true);
    
    // 1. Fetch Drivers List
    try {
      const driversRes = await apiClient.get('/drivers', {
        params: {
          page,
          limit: 15,
          search,
          status,
          licenseCategory: category,
          licenseStatus: licStatus,
          region
        }
      });
      setDrivers(driversRes.data.data.drivers);
      setPagination(driversRes.data.data.pagination);
    } catch (err) {
      console.error('Drivers list fetch failed:', err);
      toast.error('Failed to load drivers list');
    }

    // 2. Fetch Dashboard KPIs
    try {
      const dashRes = await apiClient.get('/analytics/dashboard');
      setStats(dashRes.data.data.kpis);
    } catch (err) {
      console.error('Dashboard stats fetch failed:', err);
      // Fail silently without user-facing toast since table is main content
    }

    setLoading(false);
  }, [page, search, status, category, licStatus, region]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get('/drivers/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'drivers.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully!');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearch(''); setStatus(''); setCategory(''); setLicStatus(''); setRegion(''); setPage(1);
  };
  const hasActiveFilters = !!(search || status || category || licStatus || region);

  // Percent calculation helper
  const getPercent = (value, total) => {
    if (!total || total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <div>
      {/* ── Header Area ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 22 }}>Drivers</h1>
          <p className="page-subtitle">Manage your drivers, licenses and safety compliance</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Notification Bell */}
          <NotificationsBell />

          <button id="add-driver-btn" className="btn btn-primary btn-sm" onClick={() => navigate('/drivers/new')} style={{ height: 38 }}>
            <Plus size={14} /> Add Driver
          </button>
          <button id="export-drivers-btn" className="btn btn-secondary btn-sm" onClick={handleExport} disabled={exporting} style={{ height: 38 }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI Box Grid ── */}
      <div style={{
        display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20
      }}>
        <KpiBox
          icon={Users}
          title="Total Drivers"
          value={stats?.totalDrivers ?? 0}
          subtitle={<span style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>↑ 8 this month</span>}
          color="#10b981"
          iconBg="rgba(16, 185, 129, 0.08)"
        />
        <KpiBox
          icon={Truck}
          title="On Trip"
          value={stats?.driversOnDuty ?? 0}
          subtitle={`${getPercent(stats?.driversOnDuty, stats?.totalDrivers)} of total`}
          color="#3b82f6"
          iconBg="rgba(59, 130, 246, 0.08)"
        />
        <KpiBox
          icon={UserCheck}
          title="Available"
          value={stats?.availableDrivers ?? 0}
          subtitle={`${getPercent(stats?.availableDrivers, stats?.totalDrivers)} of total`}
          color="#8b5cf6"
          iconBg="rgba(139, 92, 246, 0.08)"
        />
        <KpiBox
          icon={Calendar}
          title="Expiring Soon"
          value={stats?.expiringLicenses ?? 0}
          subtitle="In next 30 days"
          color="#f59e0b"
          iconBg="rgba(245, 158, 11, 0.08)"
        />
        <KpiBox
          icon={AlertTriangle}
          title="Suspended"
          value={stats?.suspendedDrivers ?? 0}
          subtitle="Requires action"
          color="#ef4444"
          iconBg="rgba(239, 68, 68, 0.08)"
        />

        {/* 3D Illustration Graphic Panel */}
        <div style={{
          flex: '1 1 240px',
          background: 'linear-gradient(135deg, #0d1b2a 0%, #0c1020 100%)',
          border: '1px solid rgba(16, 185, 129, 0.12)',
          borderRadius: 16,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 100,
          minWidth: 230
        }}>
          <div style={{ zIndex: 2, maxWidth: '60%' }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Drive Safely</h4>
            <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>Ensure safety standards and compliance are met across all driver activities.</p>
          </div>
          <img src="/driver_3d_avatar.png" alt="Driver illustration" style={{
            position: 'absolute', right: -5, bottom: -12, height: 120, objectFit: 'contain', zIndex: 1
          }} />
        </div>
      </div>

      {/* ── Colored Alerts Strip ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 14, marginBottom: 20
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: 'rgba(245,158,11,0.03)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: 12
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={15} color="#f59e0b" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700 }}>
              {stats?.expiringLicenses ?? 0} Licenses expiring soon
            </div>
            <button onClick={() => { setLicStatus('EXPIRING_SOON'); setPage(1); }} style={{ fontSize: 11, color: 'var(--text-muted)', border: 'none', background: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
              View drivers →
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 12
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={15} color="#3b82f6" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700 }}>
              {drivers.filter(d => d.status === 'OFF_DUTY').length} Drivers off duty
            </div>
            <button onClick={() => { setStatus('OFF_DUTY'); setPage(1); }} style={{ fontSize: 11, color: 'var(--text-muted)', border: 'none', background: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
              Check status →
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 12
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserX size={15} color="#ef4444" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#f87171', fontWeight: 700 }}>
              {stats?.suspendedDrivers ?? 0} Driver suspended
            </div>
            <button onClick={() => { setStatus('SUSPENDED'); setPage(1); }} style={{ fontSize: 11, color: 'var(--text-muted)', border: 'none', background: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
              Review now →
            </button>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Panel ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Search */}
        <div className="search-input-wrapper" style={{ maxWidth: 280, flex: '1 1 200px' }}>
          <Search size={14} />
          <input
            id="driver-search"
            className="search-input"
            placeholder="Search by name, license, phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Dropdowns */}
        <select
          id="driver-status-filter"
          className="filter-select"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ minWidth: 120 }}
        >
          <option value="">All Status</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>

        <select
          className="filter-select"
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1); }}
          style={{ minWidth: 140 }}
        >
          <option value="">All Categories</option>
          {CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          id="driver-license-filter"
          className="filter-select"
          value={licStatus}
          onChange={e => { setLicStatus(e.target.value); setPage(1); }}
          style={{ minWidth: 130 }}
        >
          <option value="">All Licenses</option>
          {LICENSE_STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>

        {showAdvanceFilters && (
          <select
            className="filter-select"
            value={region}
            onChange={e => { setRegion(e.target.value); setPage(1); }}
            style={{ minWidth: 130 }}
          >
            <option value="">All Regions</option>
            {REGIONS.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}

        {/* Action Buttons */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowAdvanceFilters(f => !f)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, borderColor: showAdvanceFilters ? 'var(--primary)' : undefined }}
        >
          <Sliders size={13} />
          More Filters
        </button>

        <button
          className="btn btn-sm"
          onClick={clearFilters}
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: 'var(--primary)',
            padding: 8, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8
          }}
          title="Reset Filters"
        >
          <Filter size={14} />
        </button>

        {hasActiveFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ color: '#ef4444', fontSize: 12 }}>
            ✕ Clear
          </button>
        )}

        {pagination && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {pagination.total} drivers
          </span>
        )}
      </div>

      {/* ── Table Container ── */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 24 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 58, marginBottom: 10, borderRadius: 8 }} />
            ))}
          </div>
        ) : drivers.length === 0 ? (
          <div className="empty-state">
            <Users size={44} style={{ opacity: 0.3, marginBottom: 12 }} />
            <h3>No drivers found</h3>
            <p style={{ fontSize: 13, marginTop: 6 }}>Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Driver</th>
                  <th style={{ minWidth: 160 }}>License &amp; Category</th>
                  <th style={{ minWidth: 130 }}>License Status</th>
                  <th style={{ minWidth: 140 }}>Safety Score</th>
                  <th style={{ minWidth: 100 }}>Region</th>
                  <th style={{ minWidth: 120 }}>Status</th>
                  <th style={{ minWidth: 80, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(d => (
                  <tr key={d.id} style={d.licenseStatus === 'EXPIRED' || d.status === 'SUSPENDED' ? { background: 'rgba(239,68,68,0.02)' } : {}}>
                    {/* Driver */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <DriverInitialsAvatar name={d.name} score={d.safetyScore} />
                        <div>
                          <div className="td-primary" style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.contactNumber}</div>
                        </div>
                      </div>
                    </td>

                    {/* License & Category */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                          {d.licenseNumber}
                        </span>
                        <span style={{
                          padding: '1px 6px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--text-secondary)'
                        }}>
                          {d.licenseCategory}
                        </span>
                      </div>
                    </td>

                    {/* License Status */}
                    <td>
                      <LicenseStatusTag status={d.licenseStatus} expiryDate={d.licenseExpiryDate} />
                    </td>

                    {/* Safety Score */}
                    <td>
                      <SafetyProgressBar score={d.safetyScore} />
                    </td>

                    {/* Region */}
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {d.region}
                    </td>

                    {/* Status */}
                    <td>
                      <StatusBadge status={d.status} />
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          className="btn btn-ghost"
                          onClick={() => navigate(`/drivers/${d.id}`)}
                          title="View Details"
                          style={{ padding: 6 }}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => navigate(`/drivers/${d.id}/edit`)}
                          title="Edit"
                          style={{ padding: 6 }}
                        >
                          <MoreVertical size={14} />
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

      <Pagination meta={pagination} onPageChange={setPage} />
    </div>
  );
}
