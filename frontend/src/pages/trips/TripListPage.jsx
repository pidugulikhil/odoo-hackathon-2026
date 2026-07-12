import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import {
  Plus, Search, Download, Eye, MapPin, Truck, Calendar,
  Sliders, Filter, Shield, AlertTriangle, HelpCircle,
  MoreVertical, Star, ChevronDown, CheckCircle, Clock
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const STATUSES = ['', 'DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED'];
const DATE_FILTERS = [
  { label: 'All Time', value: '' },
  { label: 'This Month', value: 'month' },
  { label: 'This Week', value: 'week' },
];

/* ─── Sub-components ───────────────────────────────────────── */

function KpiBox({ icon: Icon, title, value, subtitle, color, iconBg }) {
  return (
    <div style={{
      flex: '1 1 140px',
      background: 'var(--surface-card)',
      border: '1px solid var(--surface-border)',
      borderRadius: 16,
      padding: '16px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minWidth: 140
    }}>
      <div>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', lineHeight: 1, marginBottom: 6 }}>
          {value}
        </div>
        <div style={{ fontSize: 10, color: color || 'var(--text-muted)' }}>
          {subtitle}
        </div>
      </div>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: iconBg || 'rgba(255,255,255,0.03)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={16} color={color || '#94a3b8'} />
      </div>
    </div>
  );
}

function TripNumberBadge({ num, status }) {
  const colors = {
    COMPLETED: { text: '#10b981', border: '#10b98133', bg: 'rgba(16,185,129,0.08)' },
    DISPATCHED: { text: '#f59e0b', border: '#f59e0b33', bg: 'rgba(245,158,11,0.08)' },
    DRAFT: { text: '#8b5cf6', border: '#8b5cf633', bg: 'rgba(139,92,246,0.08)' },
    CANCELLED: { text: '#ef4444', border: '#ef444433', bg: 'rgba(239,68,68,0.08)' }
  };
  const c = colors[status] || colors.DRAFT;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ width: 3, height: 24, background: c.text, borderRadius: '2px 0 0 2px' }} />
      <span style={{
        display: 'inline-block', padding: '4px 10px',
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: '0 6px 6px 0', fontSize: 11, fontWeight: 700,
        color: c.text, fontFamily: 'monospace', letterSpacing: '0.02em'
      }}>
        {num}
      </span>
    </div>
  );
}

function DriverAvatar({ name }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

function VehicleImage() {
  return (
    <div style={{
      width: 36, height: 30, borderRadius: 6,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0
    }}>
      <Truck size={16} color="var(--text-secondary)" style={{ opacity: 0.8 }} />
    </div>
  );
}

/* ─── Main Trips Page Component ─────────────────────────────── */

export default function TripListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole('FLEET_MANAGER');

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  // Filter lists
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // Stats / Side panel data
  const [stats, setStats] = useState({
    total: 0, completed: 0, dispatched: 0, cancelled: 0, draft: 0, revenue: 0,
    topRoutes: [], recentActivity: []
  });

  // Filters State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdvanceFilters, setShowAdvanceFilters] = useState(false);

  // Fetch filter dropdown options
  useEffect(() => {
    async function loadFilters() {
      try {
        const [vehRes, drvRes] = await Promise.all([
          apiClient.get('/vehicles', { params: { limit: 100 } }),
          apiClient.get('/drivers', { params: { limit: 100 } })
        ]);
        setVehicles(vehRes.data.data.vehicles);
        setDrivers(drvRes.data.data.drivers);
      } catch (err) {
        console.error('Failed to load filter dropdowns', err);
      }
    }
    loadFilters();
  }, []);

  // Fetch trips list and build statistics
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate date ranges if filter selected
      let dateFrom;
      if (dateFilter === 'month') {
        const d = new Date();
        dateFrom = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      } else if (dateFilter === 'week') {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        dateFrom = new Date(d.setDate(diff)).toISOString();
      }

      const params = {
        page,
        limit: 10,
        search,
        status,
        vehicleId,
        driverId,
        dateFrom
      };

      const [listRes, statsRes] = await Promise.all([
        apiClient.get('/trips', { params }),
        apiClient.get('/trips', { params: { limit: 1000 } }) // fetch all for dynamic analytics
      ]);

      setTrips(listRes.data.data.trips);
      setPagination(listRes.data.data.pagination);

      // Compute statistics dynamically
      const allTrips = statsRes.data.data.trips;
      const completed = allTrips.filter(t => t.status === 'COMPLETED');
      const dispatched = allTrips.filter(t => t.status === 'DISPATCHED');
      const cancelled = allTrips.filter(t => t.status === 'CANCELLED');
      const draft = allTrips.filter(t => t.status === 'DRAFT');

      const revenue = completed.reduce((sum, t) => sum + (t.revenue || 0), 0);

      // Calculate top routes
      const routeCounts = {};
      allTrips.forEach(t => {
        const route = `${t.source} → ${t.destination}`;
        routeCounts[route] = (routeCounts[route] || 0) + 1;
      });
      const topRoutes = Object.entries(routeCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate recent activity
      const sorted = [...allTrips].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      const recentActivity = sorted.slice(0, 3).map(t => {
        let text = `Trip ${t.tripNumber} updated`;
        let desc = `${t.source} → ${t.destination}`;
        let color = '#94a3b8';
        let actIcon = HelpCircle;

        if (t.status === 'COMPLETED') {
          text = `Trip ${t.tripNumber} completed`;
          color = '#10b981';
          actIcon = CheckCircle;
        } else if (t.status === 'DISPATCHED') {
          text = `Trip ${t.tripNumber} dispatched`;
          color = '#3b82f6';
          actIcon = Truck;
        } else if (t.status === 'CANCELLED') {
          text = `Trip ${t.tripNumber} cancelled`;
          color = '#ef4444';
          actIcon = AlertTriangle;
        } else if (t.status === 'DRAFT') {
          text = `New trip ${t.tripNumber} created`;
          color = '#8b5cf6';
          actIcon = Clock;
        }

        const diffMs = new Date() - new Date(t.updatedAt);
        const diffMins = Math.max(1, Math.round(diffMs / 60000));
        const timeText = diffMins < 60 ? `${diffMins}m ago` : `${Math.round(diffMins/60)}h ago`;

        return { id: t.id, text, desc, time: timeText, color, icon: actIcon };
      });

      setStats({
        total: allTrips.length,
        completed: completed.length,
        dispatched: dispatched.length,
        cancelled: cancelled.length,
        draft: draft.length,
        revenue,
        topRoutes,
        recentActivity
      });

    } catch (err) {
      toast.error('Failed to load trips data');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, vehicleId, driverId, dateFilter]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const clearFilters = () => {
    setSearch(''); setStatus(''); setVehicleId(''); setDriverId(''); setDateFilter(''); setPage(1);
  };
  const hasActiveFilters = !!(search || status || vehicleId || driverId || dateFilter);

  // Percent calculator
  const getPercent = (val) => {
    if (!stats.total) return '0%';
    return `${((val / stats.total) * 100).toFixed(1)}%`;
  };

  // Recharts Donut data
  const pieData = [
    { name: 'Completed', value: stats.completed, color: '#10b981' },
    { name: 'In Progress', value: stats.dispatched, color: '#3b82f6' },
    { name: 'Cancelled', value: stats.cancelled, color: '#f59e0b' },
    { name: 'Draft', value: stats.draft, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div>
      {/* ── Header Area ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="page-title" style={{ fontSize: 22 }}>Trips</h1>
          <CheckCircle size={18} color="#10b981" style={{ marginTop: 4 }} />
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Action Icons */}
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

          {canManage && (
            <div style={{ display: 'flex', gap: 1 }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/trips/new')} style={{ height: 38, borderRadius: '8px 0 0 8px' }}>
                <Plus size={14} /> New Trip
              </button>
              <button className="btn btn-primary btn-sm" style={{ height: 38, padding: '0 10px', borderRadius: '0 8px 8px 0', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                <ChevronDown size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Box Grid ── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        <KpiBox
          icon={Truck}
          title="Total Trips"
          value={stats.total}
          subtitle={<span style={{ color: '#10b981' }}>↑ 18% this month</span>}
          color="#10b981"
          iconBg="rgba(16, 185, 129, 0.08)"
        />
        <KpiBox
          icon={Shield}
          title="Completed"
          value={stats.completed}
          subtitle={`${getPercent(stats.completed)} of total`}
          color="#3b82f6"
          iconBg="rgba(59, 130, 246, 0.08)"
        />
        <KpiBox
          icon={Truck}
          title="In Progress"
          value={stats.dispatched}
          subtitle={`${getPercent(stats.dispatched)} of total`}
          color="#8b5cf6"
          iconBg="rgba(139, 92, 246, 0.08)"
        />
        <KpiBox
          icon={AlertTriangle}
          title="Cancelled"
          value={stats.cancelled}
          subtitle={`${getPercent(stats.cancelled)} of total`}
          color="#f59e0b"
          iconBg="rgba(245, 158, 11, 0.08)"
        />
        <KpiBox
          icon={Clock}
          title="Draft"
          value={stats.draft}
          subtitle={`${getPercent(stats.draft)} of total`}
          color="#ef4444"
          iconBg="rgba(239, 68, 68, 0.08)"
        />

        {/* Circular Donut Overview Chart Card */}
        <div style={{
          flex: '1 1 240px',
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          borderRadius: 16,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          minWidth: 230,
          minHeight: 100
        }}>
          <div style={{ width: '45%', position: 'relative', height: 80 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.length > 0 ? pieData : [{ value: 1, color: 'rgba(255,255,255,0.06)' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={24}
                  outerRadius={34}
                  paddingAngle={1.5}
                  dataKey="value"
                >
                  {(pieData.length > 0 ? pieData : [{ color: 'rgba(255,255,255,0.06)' }]).map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center', pointerEvents: 'none'
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{stats.total}</div>
              <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>Trips</div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 10 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', fontSize: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{d.value} ({getPercent(d.value)})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Search & Filter Panel ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Search */}
        <div className="search-input-wrapper" style={{ maxWidth: 280, flex: '1 1 200px' }}>
          <Search size={14} />
          <input
            className="search-input"
            placeholder="Search by trip number, route..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Dropdowns */}
        <select
          className="filter-select"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ minWidth: 125 }}
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {showAdvanceFilters && (
          <>
            <select
              className="filter-select"
              value={vehicleId}
              onChange={e => { setVehicleId(e.target.value); setPage(1); }}
              style={{ minWidth: 140 }}
            >
              <option value="">All Vehicles</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}
            </select>

            <select
              className="filter-select"
              value={driverId}
              onChange={e => { setDriverId(e.target.value); setPage(1); }}
              style={{ minWidth: 140 }}
            >
              <option value="">All Drivers</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </>
        )}

        <select
          className="filter-select"
          value={dateFilter}
          onChange={e => { setDateFilter(e.target.value); setPage(1); }}
          style={{ minWidth: 120 }}
        >
          {DATE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* Action Buttons */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowAdvanceFilters(f => !f)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, borderColor: showAdvanceFilters ? 'var(--primary)' : undefined }}
        >
          <Sliders size={13} />
          Filters {hasActiveFilters && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: 10 }}>2</span>}
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
            Showing 1 to {trips.length} of {pagination.total} trips
          </span>
        )}
      </div>

      {/* ── Two Column Content Layout ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left: Trips Table */}
        <div className="card" style={{ flex: '1 1 70%', minWidth: 600, padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 56, marginBottom: 10, borderRadius: 8 }} />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <MapPin size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3>No trips found</h3>
              <p style={{ fontSize: 13, marginTop: 6 }}>Try adjusting your search filters.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 130 }}>Trip #</th>
                    <th style={{ minWidth: 150 }}>Route</th>
                    <th style={{ minWidth: 180 }}>Vehicle</th>
                    <th style={{ minWidth: 160 }}>Driver</th>
                    <th style={{ minWidth: 100 }}>Cargo (kg)</th>
                    <th style={{ minWidth: 120 }}>Status</th>
                    <th style={{ minWidth: 120 }}>Date</th>
                    <th style={{ minWidth: 110 }}>Revenue</th>
                    <th style={{ minWidth: 80, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map(t => (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/trips/${t.id}`)}>
                      {/* Trip # */}
                      <td>
                        <TripNumberBadge num={t.tripNumber} status={t.status} />
                      </td>

                      {/* Route */}
                      <td>
                        <div>
                          <div className="td-primary" style={{ fontSize: 13, fontWeight: 700 }}>{t.source}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            → {t.destination}
                          </div>
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <VehicleImage />
                          <div>
                            <div className="td-primary" style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                              {t.vehicle?.registrationNumber || '—'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {t.vehicle?.name || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Driver */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <DriverAvatar name={t.driver?.name} />
                          <div>
                            <div className="td-primary" style={{ fontSize: 12, fontWeight: 700 }}>
                              {t.driver?.name || '—'}
                            </div>
                            <div style={{ fontSize: 10, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                              <Star size={10} fill="#f59e0b" />
                              4.8
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cargo Weight */}
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {t.cargoWeight.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusBadge status={t.status} />
                      </td>

                      {/* Date */}
                      <td>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                          {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          {new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Revenue */}
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.revenue ? '#10b981' : 'var(--text-secondary)' }}>
                          {t.revenue ? `₹${t.revenue.toLocaleString('en-IN')}` : '—'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            className="btn btn-ghost"
                            onClick={(e) => { e.stopPropagation(); navigate(`/trips/${t.id}`); }}
                            style={{ padding: 6 }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={(e) => { e.stopPropagation(); }}
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

        {/* Right: Sidebar Widgets */}
        <div style={{ flex: '1 1 25%', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* 1. Top Routes */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Top Routes</h4>
              <span style={{ fontSize: 10, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.topRoutes.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No routes recorded</div>
              ) : (
                stats.topRoutes.map(item => (
                  <div key={item.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5 }}>
                      <span>{item.name}</span>
                      <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{item.count}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${Math.min(100, (item.count / stats.topRoutes[0].count) * 100)}%`,
                        background: 'linear-gradient(90deg, #6366f1, #4f46e5)', borderRadius: 2
                      }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. Revenue Summary */}
          <div className="card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Revenue Summary</h4>
              <select style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="month">This Month</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                Total Revenue
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#10b981', lineHeight: 1, marginBottom: 4 }}>
                ₹{stats.revenue.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 10, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
                ↑ 24.5% from last month
              </div>
            </div>
            {/* Glowing Sparkline */}
            <div style={{ height: 26, width: '100%' }}>
              <svg width="100%" height="26" viewBox="0 0 200 26" preserveAspectRatio="none">
                <path
                  d="M0,20 Q30,10 60,18 T120,5 T180,22 L200,10"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M0,20 Q30,10 60,18 T120,5 T180,22 L200,10"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="5"
                  style={{ opacity: 0.15, filter: 'blur(2px)' }}
                />
              </svg>
            </div>
          </div>

          {/* 3. Recent Activity */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Recent Activity</h4>
              <span style={{ fontSize: 10, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {stats.recentActivity.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No recent trip updates</div>
              ) : (
                stats.recentActivity.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 10 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: `${item.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 2
                    }}>
                      <item.icon size={11} color={item.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>
                        {item.text}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }} className="truncate">
                        {item.desc}
                      </div>
                    </div>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {item.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      <Pagination meta={pagination} onPageChange={setPage} />
    </div>
  );
}
