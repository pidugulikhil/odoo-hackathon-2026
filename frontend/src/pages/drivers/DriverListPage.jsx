import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import {
  Plus, Search, Download, Eye, Pencil, Users,
  AlertTriangle, Shield, Clock, RefreshCw, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = ['', 'AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED'];
const LICENSE_STATUSES = ['', 'VALID', 'EXPIRING_SOON', 'EXPIRED'];
const CATEGORIES = ['', 'HGV', 'LMV', 'HTV', 'PSV', 'MCWG'];
const SORTS = [
  { value: 'createdAt|desc', label: 'Newest First' },
  { value: 'createdAt|asc', label: 'Oldest First' },
  { value: 'name|asc', label: 'Name A–Z' },
  { value: 'name|desc', label: 'Name Z–A' },
  { value: 'safetyScore|desc', label: 'Safety ↓ High' },
  { value: 'safetyScore|asc', label: 'Safety ↑ Low' },
  { value: 'licenseExpiryDate|asc', label: 'Expiry Soonest' },
];

/* ─── Sub-components ───────────────────────────────────────── */

function SafetyPill({ score }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
  const bg    = pct >= 80 ? 'rgba(16,185,129,0.1)' : pct >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
  const label = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Fair' : 'Poor';
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 22, borderRadius: 6,
          background: bg, color, fontSize: 12, fontWeight: 800,
        }}>{pct}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          borderRadius: 2, transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  );
}

function LicenseTag({ status, days }) {
  if (status === 'EXPIRED') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <AlertTriangle size={10} /> EXPIRED
    </span>
  );
  if (status === 'EXPIRING_SOON') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <Clock size={10} /> {days}d left
    </span>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.12)', color: '#34d399', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <Shield size={10} /> VALID
    </span>
  );
}

function Avatar({ name, score }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const dark  = score >= 80 ? '#065f46' : score >= 60 ? '#78350f' : '#7f1d1d';
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}, ${dark})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, fontWeight: 900, color: '#fff', flexShrink: 0,
      boxShadow: `0 0 0 2px rgba(0,0,0,0.4), 0 0 8px ${color}44`
    }}>
      {name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────── */

export default function DriverListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole('FLEET_MANAGER', 'SAFETY_OFFICER');

  const [drivers,    setDrivers]    = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('');
  const [licStatus,  setLicStatus]  = useState('');
  const [category,   setCategory]   = useState('');
  const [sort,       setSort]       = useState('createdAt|desc');
  const [page,       setPage]       = useState(1);
  const [exporting,  setExporting]  = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const [sortBy, sortOrder] = sort.split('|');
      const params = { page, limit: 15, sortBy, sortOrder };
      if (search)    params.search          = search;
      if (status)    params.status          = status;
      if (licStatus) params.licenseStatus   = licStatus;
      if (category)  params.licenseCategory = category;
      const res = await apiClient.get('/drivers', { params });
      setDrivers(res.data.data.drivers);
      setPagination(res.data.data.pagination);
    } catch { toast.error('Failed to load drivers'); }
    finally  { setLoading(false); }
  }, [page, search, status, licStatus, category, sort]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get('/drivers/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'drivers.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported!');
    } catch { toast.error('Export failed'); }
    finally  { setExporting(false); }
  };

  const clearFilters = () => { setSearch(''); setStatus(''); setLicStatus(''); setCategory(''); setSort('createdAt|desc'); setPage(1); };
  const hasFilters   = !!(search || status || licStatus || category);

  // Compliance alerts from current page data
  const alerts = {
    expired:  drivers.filter(d => d.licenseStatus === 'EXPIRED').length,
    expiring: drivers.filter(d => d.licenseStatus === 'EXPIRING_SOON').length,
    suspended:drivers.filter(d => d.status === 'SUSPENDED').length,
  };
  const totalAlerts = alerts.expired + alerts.expiring + alerts.suspended;

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(16,185,129,0.25)', flexShrink: 0
          }}>
            <Users size={22} color="#fff" />
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: 22 }}>Drivers</h1>
            <p className="page-subtitle">Safety compliance &amp; driver lifecycle management</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={fetchDrivers} title="Refresh" style={{ padding: '7px 10px' }}>
            <RefreshCw size={14} />
          </button>
          <button id="export-drivers-btn" className="btn btn-secondary btn-sm" onClick={handleExport} disabled={exporting}>
            <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          {canManage && (
            <button id="add-driver-btn" className="btn btn-primary btn-sm" onClick={() => navigate('/drivers/new')}>
              <Plus size={14} /> Add Driver
            </button>
          )}
        </div>
      </div>

      {/* ── Compliance Banner ── */}
      {totalAlerts > 0 && !hasFilters && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          padding: '12px 18px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 10, marginBottom: 20
        }}>
          <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: 13 }}>
            {totalAlerts} driver{totalAlerts > 1 ? 's' : ''} need attention
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {alerts.expired  > 0 && <button style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} onClick={() => { setLicStatus('EXPIRED'); setPage(1); }}>{alerts.expired} Expired</button>}
            {alerts.expiring > 0 && <button style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} onClick={() => { setLicStatus('EXPIRING_SOON'); setPage(1); }}>{alerts.expiring} Expiring Soon</button>}
            {alerts.suspended> 0 && <button style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} onClick={() => { setStatus('SUSPENDED'); setPage(1); }}>{alerts.suspended} Suspended</button>}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Search */}
        <div className="search-input-wrapper" style={{ maxWidth: 280, flex: '1 1 200px' }}>
          <Search size={14} />
          <input
            id="driver-search"
            className="search-input"
            placeholder="Search name, license, region…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Status */}
        <select
          id="driver-status-filter"
          className="filter-select"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ minWidth: 130 }}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All Statuses'}</option>)}
        </select>

        {/* License Status */}
        <select
          id="driver-license-filter"
          className="filter-select"
          value={licStatus}
          onChange={e => { setLicStatus(e.target.value); setPage(1); }}
          style={{ minWidth: 130 }}
        >
          {LICENSE_STATUSES.map(s => <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All Licenses'}</option>)}
        </select>

        {/* Category */}
        <select
          className="filter-select"
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1); }}
          style={{ minWidth: 120 }}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c || 'All Categories'}</option>)}
        </select>

        {/* Sort */}
        <select
          className="filter-select"
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(1); }}
          style={{ minWidth: 140 }}
        >
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* Clear & Count */}
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ color: '#ef4444', fontSize: 12 }}>
            ✕ Clear
          </button>
        )}
        {pagination && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {pagination.total} driver{pagination.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 24 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 58, marginBottom: 10, borderRadius: 8 }} />
            ))}
          </div>
        ) : drivers.length === 0 ? (
          <div className="empty-state">
            <Users size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <h3>No drivers found</h3>
            <p style={{ fontSize: 13, marginTop: 6 }}>
              {hasFilters ? 'Try adjusting your filters.' : 'Add your first driver to get started.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
              {hasFilters && <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear Filters</button>}
              {canManage && !hasFilters && (
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/drivers/new')}>
                  <Plus size={14} /> Add Driver
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Driver</th>
                  <th style={{ minWidth: 130 }}>License #</th>
                  <th style={{ minWidth: 80 }}>Category</th>
                  <th style={{ minWidth: 160 }}>License Status</th>
                  <th style={{ minWidth: 110 }}>Safety Score</th>
                  <th style={{ minWidth: 110 }}>Region</th>
                  <th style={{ minWidth: 100 }}>Status</th>
                  <th style={{ minWidth: 80, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(d => {
                  const isProblematic = d.licenseStatus === 'EXPIRED' || d.status === 'SUSPENDED';
                  return (
                    <tr
                      key={d.id}
                      style={isProblematic ? { background: 'rgba(239,68,68,0.03)' } : {}}
                    >
                      {/* Driver Name + Avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={d.name} score={d.safetyScore} />
                          <div style={{ minWidth: 0 }}>
                            <div className="td-primary" style={{ fontSize: 13, marginBottom: 1 }}>{d.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.contactNumber}</div>
                          </div>
                        </div>
                      </td>

                      {/* License Number */}
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
                          {d.licenseNumber}
                        </span>
                      </td>

                      {/* Category */}
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 4, fontSize: 11, fontWeight: 700,
                          letterSpacing: '0.04em', color: 'var(--text-secondary)'
                        }}>
                          {d.licenseCategory}
                        </span>
                      </td>

                      {/* License Status */}
                      <td>
                        <LicenseTag status={d.licenseStatus} days={d.daysUntilExpiry} />
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                          {new Date(d.licenseExpiryDate).toLocaleDateString('en-IN')}
                        </div>
                      </td>

                      {/* Safety Score */}
                      <td>
                        <SafetyPill score={d.safetyScore} />
                      </td>

                      {/* Region */}
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.region}</td>

                      {/* Status */}
                      <td><StatusBadge status={d.status} /></td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost"
                            onClick={() => navigate(`/drivers/${d.id}`)}
                            title="View Details"
                            style={{ padding: '6px 8px' }}
                          >
                            <Eye size={14} />
                          </button>
                          {canManage && (
                            <button
                              className="btn btn-ghost"
                              onClick={() => navigate(`/drivers/${d.id}/edit`)}
                              title="Edit"
                              style={{ padding: '6px 8px' }}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination meta={pagination} onPageChange={p => setPage(p)} />
    </div>
  );
}
