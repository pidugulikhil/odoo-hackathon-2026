import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import {
  Plus, Search, Download, Eye, Wrench, Calendar,
  Sliders, Filter, Shield, AlertTriangle, Activity,
  MoreVertical, CheckCircle, Clock, ChevronDown, List, LayoutGrid, BarChart2, Bell,
  HelpCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const STATUSES = ['', 'ACTIVE', 'DRAFT', 'COMPLETED', 'CANCELLED'];
const TYPES = ['', 'Oil Change', 'Brake Service', 'Engine Overhaul', 'Paint Job', 'Battery Check', 'AC Service', 'Tyre Replacement'];
const MECHANICS = ['', 'hemanth', 'kumar', 'singh', 'gupta'];

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

function PriorityTag({ priority }) {
  const colors = {
    HIGH: { text: '#ef4444', border: '#ef444433', bg: 'rgba(239,68,68,0.06)' },
    MEDIUM: { text: '#3b82f6', border: '#3b82f633', bg: 'rgba(59,130,246,0.06)' },
    LOW: { text: '#10b981', border: '#10b98133', bg: 'rgba(16,185,129,0.06)' }
  };
  const c = colors[priority] || colors.LOW;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px',
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 4, fontSize: 9, fontWeight: 700,
      color: c.text, textTransform: 'uppercase', letterSpacing: '0.02em'
    }}>
      {priority}
    </span>
  );
}

function RecordBadge({ num, priority }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 3, height: 24, background: 'var(--primary)', borderRadius: '2px 0 0 2px' }} />
        <span style={{
          display: 'inline-block', padding: '4px 10px',
          background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)',
          borderRadius: '0 6px 6px 0', fontSize: 11, fontWeight: 700,
          color: '#818cf8', fontFamily: 'monospace', letterSpacing: '0.02em'
        }}>
          {num}
        </span>
      </div>
      <PriorityTag priority={priority} />
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
      <Wrench size={16} color="var(--text-secondary)" style={{ opacity: 0.8 }} />
    </div>
  );
}

function TypeTag({ type }) {
  const hash = type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px',
      background: `hsla(${hue}, 70%, 50%, 0.08)`,
      border: `1px solid hsla(${hue}, 70%, 50%, 0.2)`,
      borderRadius: 6, fontSize: 11, fontWeight: 600,
      color: `hsl(${hue}, 85%, 65%)`
    }}>
      {type}
    </span>
  );
}

/* ─── Main Maintenance Page Component ─────────────────────────── */

export default function MaintenanceListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === 'FLEET_MANAGER';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  // Stats computation state
  const [stats, setStats] = useState({
    total: 0, completed: 0, active: 0, scheduled: 0, cancelled: 0, cost: 0,
    upcomingServices: [], recentActivity: []
  });

  // Filter options
  const [vehicles, setVehicles] = useState([]);

  // Filter selection
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState('');
  const [mechanic, setMechanic] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const [showAdvanceFilters, setShowAdvanceFilters] = useState(false);

  // Load vehicles for filters
  useEffect(() => {
    async function loadVehicles() {
      try {
        const res = await apiClient.get('/vehicles', { params: { limit: 100 } });
        setVehicles(res.data.data.vehicles);
      } catch (err) {
        console.error('Failed to load filter dropdowns', err);
      }
    }
    loadVehicles();
  }, []);

  // Fetch records list and compute stats
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      // Determine tab-based status filter
      let statusQuery = status;
      if (activeTab === 'ACTIVE') statusQuery = 'ACTIVE';
      else if (activeTab === 'SCHEDULED') statusQuery = 'DRAFT'; // Map scheduled to draft
      else if (activeTab === 'COMPLETED') statusQuery = 'COMPLETED';
      else if (activeTab === 'CANCELLED') statusQuery = 'CANCELLED';
      else if (activeTab === 'DRAFT') statusQuery = 'DRAFT';

      const params = {
        page,
        limit: 10,
        search,
        status: statusQuery,
        vehicleId
      };

      const [listRes, statsRes] = await Promise.all([
        apiClient.get('/maintenance', { params }),
        apiClient.get('/maintenance', { params: { limit: 1000 } }) // fetch all for dynamic analytics
      ]);

      setRecords(listRes.data.data.maintenance);
      setPagination(listRes.data.data.pagination);

      // Compute statistics dynamically
      const allRecords = statsRes.data.data.maintenance;
      const completed = allRecords.filter(r => r.status === 'COMPLETED');
      const active = allRecords.filter(r => r.status === 'ACTIVE');
      const scheduled = allRecords.filter(r => r.status === 'DRAFT'); // count draft as scheduled
      const cancelled = allRecords.filter(r => r.status === 'CANCELLED');

      const totalCost = completed.reduce((sum, r) => sum + (r.cost || 0), 0);

      // Calculate priority dynamically from cost
      const getPriorityLabel = (cost) => {
        if (cost >= 40000) return 'HIGH';
        if (cost >= 15000) return 'MEDIUM';
        return 'LOW';
      };

      // Extract upcoming services (DRAFT or ACTIVE)
      const upcomingServices = allRecords
        .filter(r => r.status === 'DRAFT' || r.status === 'ACTIVE')
        .slice(0, 3)
        .map(r => {
          const date = r.startDate ? new Date(r.startDate) : new Date(r.createdAt);
          const day = date.getDate();
          const month = date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
          return {
            id: r.id,
            reg: r.vehicle?.registrationNumber || '—',
            type: r.type,
            day,
            month
          };
        });

      // Calculate recent activity logs
      const sorted = [...allRecords].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      const recentActivity = sorted.slice(0, 4).map(r => {
        let text = `Record ${r.maintenanceNumber} updated`;
        let color = '#94a3b8';
        let actIcon = HelpCircle;

        if (r.status === 'COMPLETED') {
          text = `${r.maintenanceNumber} marked as completed`;
          color = '#10b981';
          actIcon = CheckCircle;
        } else if (r.status === 'ACTIVE') {
          text = `${r.maintenanceNumber} marked as active`;
          color = '#f59e0b';
          actIcon = Activity;
        } else if (r.status === 'CANCELLED') {
          text = `${r.maintenanceNumber} cancelled`;
          color = '#ef4444';
          actIcon = AlertTriangle;
        } else if (r.status === 'DRAFT') {
          text = `${r.maintenanceNumber} created as draft`;
          color = '#8b5cf6';
          actIcon = Clock;
        }

        const diffMs = new Date() - new Date(r.updatedAt);
        const diffMins = Math.max(1, Math.round(diffMs / 60000));
        const timeText = diffMins < 60 ? `${diffMins}h ago` : `${Math.round(diffMins/60)}h ago`;

        return { id: r.id, text, time: timeText, color, icon: actIcon };
      });

      setStats({
        total: allRecords.length,
        completed: completed.length,
        active: active.length,
        scheduled: scheduled.length,
        cancelled: cancelled.length,
        cost: totalCost,
        upcomingServices,
        recentActivity
      });

    } catch (err) {
      toast.error('Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, vehicleId, activeTab]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Priority mapping for table rows
  const getRecordPriority = (cost) => {
    if (cost >= 40000) return 'HIGH';
    if (cost >= 15000) return 'MEDIUM';
    return 'LOW';
  };

  const clearFilters = () => {
    setSearch(''); setStatus(''); setVehicleId(''); setType(''); setMechanic(''); setPage(1);
  };
  const hasActiveFilters = !!(search || status || vehicleId || type || mechanic);

  // Percent calculator
  const getPercent = (val) => {
    if (!stats.total) return '0%';
    return `${((val / stats.total) * 100).toFixed(1)}%`;
  };

  // Recharts Donut data
  const pieData = [
    { name: 'Completed', value: stats.completed, color: '#10b981' },
    { name: 'Active', value: stats.active, color: '#8b5cf6' },
    { name: 'Scheduled', value: stats.scheduled, color: '#f59e0b' },
    { name: 'Cancelled', value: stats.cancelled, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div>
      {/* ── Header Area ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="page-title" style={{ fontSize: 22 }}>Maintenance</h1>
          <CheckCircle size={18} color="#10b981" style={{ marginTop: 4 }} />
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Action Icons */}
          <div className="search-input-wrapper" style={{ maxWidth: 220, height: 38 }}>
            <Search size={14} />
            <input
              className="search-input"
              placeholder="Search records, vehicle..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div style={{ cursor: 'pointer', padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--surface-border)' }}>
            <Sliders size={16} color="#94a3b8" />
          </div>
          <select style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: '#94a3b8', fontSize: 12, height: 38, borderRadius: 10, padding: '0 12px', outline: 'none' }}>
            <option value="month">This Month</option>
          </select>

          {isManager && (
            <div style={{ display: 'flex', gap: 1 }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/maintenance/new')} style={{ height: 38, borderRadius: '8px 0 0 8px' }}>
                <Plus size={14} /> Add Record
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
          icon={Wrench}
          title="Total Records"
          value={stats.total}
          subtitle={<span style={{ color: '#10b981' }}>↑ 18% vs last month</span>}
          color="#10b981"
          iconBg="rgba(16, 185, 129, 0.08)"
        />
        <KpiBox
          icon={CheckCircle}
          title="Completed"
          value={stats.completed}
          subtitle={`${getPercent(stats.completed)} of total`}
          color="#3b82f6"
          iconBg="rgba(59, 130, 246, 0.08)"
        />
        <KpiBox
          icon={Activity}
          title="Active"
          value={stats.active}
          subtitle={`${getPercent(stats.active)} of total`}
          color="#8b5cf6"
          iconBg="rgba(139, 92, 246, 0.08)"
        />
        <KpiBox
          icon={Calendar}
          title="Scheduled"
          value={stats.scheduled}
          subtitle={`${getPercent(stats.scheduled)} of total`}
          color="#f59e0b"
          iconBg="rgba(245, 158, 11, 0.08)"
        />
        <KpiBox
          icon={AlertTriangle}
          title="Cancelled"
          value={stats.cancelled}
          subtitle={`${getPercent(stats.cancelled)} of total`}
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
              <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>Total</div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 10 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', fontSize: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {['ALL', 'ACTIVE', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'DRAFT'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              style={{
                background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                padding: '10px 4px', fontSize: 13, fontWeight: activeTab === tab ? 700 : 500, cursor: 'pointer',
                transition: 'all 0.2s ease', textTransform: 'capitalize'
              }}
            >
              {tab === 'ALL' ? 'All Records' : tab.toLowerCase()}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, paddingBottom: 6 }}>
          <button style={{ padding: 6, borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'var(--primary)' }}>
            <List size={14} />
          </button>
          <button style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', color: 'var(--text-muted)' }}>
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>

      {/* ── Filters Panel ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <select
          className="filter-select"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ minWidth: 125 }}
        >
          <option value="">All Status</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

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
          value={type}
          onChange={e => { setType(e.target.value); setPage(1); }}
          style={{ minWidth: 140 }}
        >
          <option value="">All Types</option>
          {TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          className="filter-select"
          value={mechanic}
          onChange={e => { setMechanic(e.target.value); setPage(1); }}
          style={{ minWidth: 140 }}
        >
          <option value="">All Mechanics</option>
          {MECHANICS.filter(Boolean).map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowAdvanceFilters(f => !f)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36 }}
        >
          <Sliders size={13} />
          More Filters
        </button>

        {hasActiveFilters && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={clearFilters}
            style={{
              padding: 8, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, color: '#ef4444'
            }}
          >
            <Filter size={14} style={{ marginRight: 4 }} />
            Clear
          </button>
        )}
      </div>

      {/* ── Two Column Content Layout ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left: Maintenance Table */}
        <div className="card" style={{ flex: '1 1 70%', minWidth: 600, padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 56, marginBottom: 10, borderRadius: 8 }} />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <Wrench size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3>No maintenance records found</h3>
              <p style={{ fontSize: 13, marginTop: 6 }}>Try adjusting your search filters.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 170 }}>Record</th>
                    <th style={{ minWidth: 180 }}>Vehicle</th>
                    <th style={{ minWidth: 130 }}>Type</th>
                    <th style={{ minWidth: 160 }}>Description</th>
                    <th style={{ minWidth: 100 }}>Cost</th>
                    <th style={{ minWidth: 120 }}>Status</th>
                    <th style={{ minWidth: 110 }}>Date</th>
                    <th style={{ minWidth: 80, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(m => (
                    <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/maintenance/${m.id}`)}>
                      {/* Record ID & Priority */}
                      <td>
                        <RecordBadge num={m.maintenanceNumber} priority={getRecordPriority(m.cost)} />
                      </td>

                      {/* Vehicle */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <VehicleImage />
                          <div>
                            <div className="td-primary" style={{ fontSize: 12, fontWeight: 700 }}>
                              {m.vehicle?.name || '—'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {m.vehicle?.registrationNumber || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td>
                        <TypeTag type={m.type} />
                      </td>

                      {/* Description */}
                      <td>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.description}
                        </div>
                      </td>

                      {/* Cost */}
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                          ₹{m.cost.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusBadge status={m.status} />
                      </td>

                      {/* Date */}
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                          {m.startDate ? new Date(m.startDate).toLocaleDateString('en-IN') : '—'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            className="btn btn-ghost"
                            onClick={(e) => { e.stopPropagation(); navigate(`/maintenance/${m.id}`); }}
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
          
          {/* 1. Total Cost Summary */}
          <div className="card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Total Cost</h4>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>This Month</span>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#f1f5f9', lineHeight: 1, marginBottom: 4 }}>
                ₹{stats.cost.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 10, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
                ↑ 24.5% vs last month
              </div>
            </div>
            {/* Glowing Sparkline */}
            <div style={{ height: 26, width: '100%' }}>
              <svg width="100%" height="26" viewBox="0 0 200 26" preserveAspectRatio="none">
                <path
                  d="M0,18 Q30,6 60,14 T120,2 T180,18 L200,8"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M0,18 Q30,6 60,14 T120,2 T180,18 L200,8"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="5"
                  style={{ opacity: 0.15, filter: 'blur(2px)' }}
                />
              </svg>
            </div>
          </div>

          {/* 2. Upcoming Services */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Upcoming Services</h4>
              <span style={{ fontSize: 10, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.upcomingServices.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No upcoming services</div>
              ) : (
                stats.upcomingServices.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{item.day}</span>
                      <span style={{ fontSize: 8, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>{item.month}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>{item.reg}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.type}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Quick Actions (Only visible to managers) */}
          {isManager && (
            <div className="card" style={{ padding: 18 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>Quick Actions</h4>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <div onClick={() => navigate('/maintenance/new')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flex: 1 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <Plus size={14} color="#10b981" />
                  </div>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>Add Record</span>
                </div>
                <div onClick={() => navigate('/maintenance/new')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flex: 1 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <Calendar size={14} color="#3b82f6" />
                  </div>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>Schedule</span>
                </div>
                <div onClick={() => navigate('/reports')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flex: 1 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <BarChart2 size={14} color="#8b5cf6" />
                  </div>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>Report</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flex: 1 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <Bell size={14} color="#f59e0b" />
                  </div>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>Reminders</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Recent Activity */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Recent Activity</h4>
              <span style={{ fontSize: 10, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {stats.recentActivity.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No recent activities</div>
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
