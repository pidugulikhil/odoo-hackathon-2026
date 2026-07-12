import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Plus, Search, Download, Eye, Pencil, Archive, Truck,
  Bell, Settings, Sliders, Filter, MapPin, Wrench, Shield,
  Activity, MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

const VEHICLE_STATUSES = ['', 'AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED'];
const VEHICLE_TYPES = ['', 'TRUCK', 'VAN', 'BUS', 'MINI_TRUCK', 'TRAILER', 'OTHER'];
const REGIONS = ['', 'Delhi', 'Haryana', 'Punjab', 'Maharashtra', 'West Bengal', 'Uttar Pradesh', 'Rajasthan', 'Karnataka', 'Tamil Nadu', 'Gujarat'];
const SORTS = [
  { value: 'createdAt|desc', label: 'Newest First' },
  { value: 'createdAt|asc', label: 'Oldest First' },
  { value: 'name|asc', label: 'Name A–Z' },
  { value: 'name|desc', label: 'Name Z–A' },
  { value: 'maxLoadCapacity|desc', label: 'Capacity ↓ High' },
  { value: 'maxLoadCapacity|asc', label: 'Capacity ↑ Low' },
];

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

function VehicleTypeTag({ type }) {
  const colors = {
    TRUCK: { text: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    VAN: { text: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    BUS: { text: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    MINI_TRUCK: { text: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
    TRAILER: { text: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
    OTHER: { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
  };
  const c = colors[type] || colors.OTHER;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      background: c.bg, border: `1px solid ${c.text}22`,
      borderRadius: 6, fontSize: 11, fontWeight: 800,
      color: c.text, letterSpacing: '0.03em'
    }}>
      {type?.replace('_', ' ')}
    </span>
  );
}

// Custom sparkline generated mathematically from vehicle ID
function Sparkline({ id, status }) {
  const points = [];
  const count = 8;
  // Seedable pseudo-random generation based on ID
  let seed = id * 33;
  for (let i = 0; i < count; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const rnd = seed / 233280;
    points.push(`${(i * 12).toFixed(1)},${(15 - rnd * 12).toFixed(1)}`);
  }
  const path = `M ${points.join(' L ')}`;
  const colors = {
    AVAILABLE: '#10b981',
    ON_TRIP: '#3b82f6',
    IN_SHOP: '#f59e0b',
    RETIRED: '#6b7280'
  };
  const color = colors[status] || '#94a3b8';

  return (
    <div style={{ marginTop: 4, width: 84, height: 18 }}>
      <svg width="84" height="18" viewBox="0 0 84 18">
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.8 }}
        />
        {/* Glow effect */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.15, filter: 'blur(2px)' }}
        />
      </svg>
    </div>
  );
}

// Vehicle generic stylized SVGs
function VehicleImage({ type, status }) {
  const colors = {
    AVAILABLE: '#10b981',
    ON_TRIP: '#3b82f6',
    IN_SHOP: '#f59e0b',
    RETIRED: '#6b7280'
  };
  const color = colors[status] || '#94a3b8';
  return (
    <div style={{
      width: 44, height: 34, borderRadius: 8,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden'
    }}>
      <Truck size={20} color={color} style={{ opacity: 0.8 }} />
    </div>
  );
}

/* ─── Main Vehicle List Component ───────────────────────────── */

export default function VehicleListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isManager = hasRole('FLEET_MANAGER');

  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [region, setRegion] = useState('');
  const [sortKey, setSortKey] = useState('createdAt|desc');
  const [page, setPage] = useState(1);
  const [showAdvanceFilters, setShowAdvanceFilters] = useState(false);

  // Retire dialog targets
  const [retireTarget, setRetireTarget] = useState(null);
  const [retireLoading, setRetireLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sortBy, sortOrder] = sortKey.split('|');
      const params = {
        page,
        limit: 15,
        sortBy,
        sortOrder,
        search,
        status,
        type,
        region
      };
      const [vehiclesRes, dashRes] = await Promise.all([
        apiClient.get('/vehicles', { params }),
        apiClient.get('/analytics/dashboard')
      ]);
      setVehicles(vehiclesRes.data.data.vehicles);
      setPagination(vehiclesRes.data.data.pagination);
      setStats(dashRes.data.data.kpis);
    } catch {
      toast.error('Failed to load vehicles data');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, type, region, sortKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = async () => {
    try {
      const res = await apiClient.get('/vehicles/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'vehicles.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully!');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleRetire = async () => {
    if (!retireTarget) return;
    setRetireLoading(true);
    try {
      await apiClient.post(`/vehicles/${retireTarget.id}/retire`);
      toast.success(`${retireTarget.name} retired successfully`);
      setRetireTarget(null);
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Retire failed');
    } finally {
      setRetireLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch(''); setStatus(''); setType(''); setRegion(''); setSortKey('createdAt|desc'); setPage(1);
  };
  const hasActiveFilters = !!(search || status || type || region);

  // Percent calculation helper
  const getPercent = (value, total) => {
    if (!total || total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const onTripCount = stats ? (stats.activeVehicles - stats.availableVehicles - stats.vehiclesInMaintenance) : 0;
  const retiredCount = stats ? (stats.totalVehicles - stats.activeVehicles) : 0;

  return (
    <div>
      {/* ── Header Area ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 22 }}>Vehicles</h1>
          <p className="page-subtitle">Manage and track your entire fleet in real-time</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Notification Icons */}
          <div style={{ position: 'relative', cursor: 'pointer', padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--surface-border)' }}>
            <Bell size={16} color="#94a3b8" />
            <span style={{
              position: 'absolute', top: 5, right: 5,
              width: 14, height: 14, borderRadius: '50%',
              background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--surface-bg)'
            }}>
              3
            </span>
          </div>
          <div style={{ cursor: 'pointer', padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--surface-border)' }}>
            <Settings size={16} color="#94a3b8" />
          </div>

          {isManager && (
            <button id="add-vehicle-btn" className="btn btn-primary btn-sm" onClick={() => navigate('/vehicles/new')} style={{ height: 38 }}>
              <Plus size={14} /> Add Vehicle
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ height: 38 }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI Box Grid ── */}
      <div style={{
        display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20
      }}>
        <KpiBox
          icon={Truck}
          title="Total Vehicles"
          value={stats?.totalVehicles ?? 0}
          subtitle={<span style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>↑ 12 this month</span>}
          color="#10b981"
          iconBg="rgba(16, 185, 129, 0.08)"
        />
        <KpiBox
          icon={Shield}
          title="Available"
          value={stats?.availableVehicles ?? 0}
          subtitle={`${getPercent(stats?.availableVehicles, stats?.totalVehicles)} of total`}
          color="#3b82f6"
          iconBg="rgba(59, 130, 246, 0.08)"
        />
        <KpiBox
          icon={MapPin}
          title="On Trip"
          value={onTripCount >= 0 ? onTripCount : 0}
          subtitle={`${getPercent(onTripCount, stats?.totalVehicles)} of total`}
          color="#8b5cf6"
          iconBg="rgba(139, 92, 246, 0.08)"
        />
        <KpiBox
          icon={Wrench}
          title="In Shop"
          value={stats?.vehiclesInMaintenance ?? 0}
          subtitle={`${getPercent(stats?.vehiclesInMaintenance, stats?.totalVehicles)} of total`}
          color="#f59e0b"
          iconBg="rgba(245, 158, 11, 0.08)"
        />
        <KpiBox
          icon={Archive}
          title="Retired"
          value={retiredCount >= 0 ? retiredCount : 0}
          subtitle={`${getPercent(retiredCount, stats?.totalVehicles)} of total`}
          color="#ef4444"
          iconBg="rgba(239, 68, 68, 0.08)"
        />
      </div>

      {/* ── Search & Filter Panel ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Search */}
        <div className="search-input-wrapper" style={{ maxWidth: 280, flex: '1 1 200px' }}>
          <Search size={14} />
          <input
            id="vehicle-search"
            className="search-input"
            placeholder="Search vehicles by name, registration..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Dropdowns */}
        <select
          id="vehicle-status-filter"
          className="filter-select"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ minWidth: 120 }}
        >
          <option value="">All Status</option>
          {VEHICLE_STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>

        <select
          id="vehicle-type-filter"
          className="filter-select"
          value={type}
          onChange={e => { setType(e.target.value); setPage(1); }}
          style={{ minWidth: 130 }}
        >
          <option value="">All Types</option>
          {VEHICLE_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
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

        <select
          className="filter-select"
          value={sortKey}
          onChange={e => { setSortKey(e.target.value); setPage(1); }}
          style={{ minWidth: 130 }}
        >
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* Action Buttons */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowAdvanceFilters(f => !f)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, borderColor: showAdvanceFilters ? 'var(--primary)' : undefined }}
        >
          <Sliders size={13} />
          Filters {hasActiveFilters && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: 10 }}>1</span>}
        </button>

        {hasActiveFilters && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={clearFilters}
            style={{
              padding: 8, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, color: '#ef4444'
            }}
            title="Reset Filters"
          >
            <Filter size={14} style={{ marginRight: 4 }} />
            Clear
          </button>
        )}

        {pagination && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            Showing 1 to {vehicles.length} of {pagination.total} vehicles
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
        ) : vehicles.length === 0 ? (
          <div className="empty-state">
            <Truck size={44} style={{ opacity: 0.3, marginBottom: 12 }} />
            <h3>No vehicles found</h3>
            <p style={{ fontSize: 13, marginTop: 6 }}>Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Vehicle</th>
                  <th style={{ minWidth: 100 }}>Type</th>
                  <th style={{ minWidth: 120 }}>Capacity</th>
                  <th style={{ minWidth: 130 }}>Odometer</th>
                  <th style={{ minWidth: 120 }}>Region</th>
                  <th style={{ minWidth: 120 }}>Status</th>
                  <th style={{ minWidth: 100, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id} style={v.status === 'RETIRED' ? { background: 'rgba(107,114,128,0.015)' } : {}}>
                    {/* Vehicle info */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <VehicleImage type={v.type} status={v.status} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="td-primary" style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                              {v.registrationNumber}
                            </span>
                            {v.status !== 'RETIRED' && (
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 2 }}>{v.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.model}</div>
                        </div>
                      </div>
                    </td>

                    {/* Type tag */}
                    <td>
                      <VehicleTypeTag type={v.type} />
                    </td>

                    {/* Capacity */}
                    <td>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {v.maxLoadCapacity.toLocaleString('en-IN')} kg
                      </span>
                    </td>

                    {/* Odometer & Sparkline */}
                    <td>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {v.odometer.toLocaleString('en-IN')} km
                        </span>
                        <Sparkline id={v.id} status={v.status} />
                      </div>
                    </td>

                    {/* Region */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <MapPin size={12} color="var(--text-muted)" />
                        {v.region}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <StatusBadge status={v.status} />
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          className="btn btn-ghost"
                          onClick={() => navigate(`/vehicles/${v.id}`)}
                          title="View Details"
                          style={{ padding: 6 }}
                        >
                          <Eye size={14} />
                        </button>
                        {isManager && v.status !== 'RETIRED' && (
                          <>
                            <button
                              className="btn btn-ghost"
                              onClick={() => navigate(`/vehicles/${v.id}/edit`)}
                              title="Edit"
                              style={{ padding: 6 }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="btn btn-ghost"
                              onClick={() => setRetireTarget(v)}
                              title="Retire"
                              style={{ padding: 6, color: '#ef4444' }}
                            >
                              <Archive size={14} />
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-ghost"
                          title="Actions Menu"
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

      <ConfirmDialog
        isOpen={!!retireTarget}
        title="Retire Vehicle?"
        message={`Are you sure you want to retire "${retireTarget?.name}" (${retireTarget?.registrationNumber})? This action cannot be undone.`}
        confirmLabel="Retire Vehicle"
        onConfirm={handleRetire}
        onCancel={() => setRetireTarget(null)}
        loading={retireLoading}
      />
    </div>
  );
}
