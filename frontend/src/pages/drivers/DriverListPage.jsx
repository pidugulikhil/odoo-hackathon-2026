import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import { Plus, Search, Download, Eye, Pencil, UserX, Users, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = ['', 'AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED'];
const LICENSE_STATUSES = ['', 'VALID', 'EXPIRING_SOON', 'EXPIRED'];
const CATEGORIES = ['', 'HGV', 'LMV', 'HTV', 'PSV'];

export default function DriverListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole('FLEET_MANAGER', 'SAFETY_OFFICER');

  const [drivers, setDrivers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [licenseStatus, setLicenseStatus] = useState('');
  const [page, setPage] = useState(1);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (licenseStatus) params.licenseStatus = licenseStatus;
      const res = await apiClient.get('/drivers', { params });
      setDrivers(res.data.data.drivers);
      setPagination(res.data.data.pagination);
    } catch { toast.error('Failed to load drivers'); }
    finally { setLoading(false); }
  }, [page, search, status, licenseStatus]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleExport = async () => {
    try {
      const res = await apiClient.get('/drivers/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'drivers.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const safetyColor = (score) => score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Drivers</h1>
          <p className="page-subtitle">Manage drivers and compliance</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} /> Export CSV</button>
          {canManage && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/drivers/new')}><Plus size={14} /> Add Driver</button>
          )}
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-input-wrapper">
          <Search size={14} />
          <input className="search-input" placeholder="Search drivers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <select className="filter-select" value={licenseStatus} onChange={e => { setLicenseStatus(e.target.value); setPage(1); }}>
          {LICENSE_STATUSES.map(s => <option key={s} value={s}>{s || 'All Licenses'}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 24 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8 }} />)}</div>
        ) : drivers.length === 0 ? (
          <div className="empty-state"><Users size={40} /><h3>No drivers found</h3></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>License</th>
                  <th>Category</th>
                  <th>Expiry</th>
                  <th>License Status</th>
                  <th>Safety Score</th>
                  <th>Region</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(d => (
                  <tr key={d.id}>
                    <td className="td-primary">{d.name}</td>
                    <td><span className="font-mono" style={{ fontSize: 12 }}>{d.licenseNumber}</span></td>
                    <td>{d.licenseCategory}</td>
                    <td style={{ fontSize: 12 }}>{new Date(d.licenseExpiryDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StatusBadge status={d.licenseStatus} showDot={false} />
                        {d.licenseStatus === 'EXPIRING_SOON' && <AlertTriangle size={12} color="#f59e0b" />}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: safetyColor(d.safetyScore) }}>{d.safetyScore}</span>
                        <div className="progress-bar" style={{ width: 50 }}>
                          <div className="progress-fill" style={{ width: `${d.safetyScore}%`, background: safetyColor(d.safetyScore) }} />
                        </div>
                      </div>
                    </td>
                    <td>{d.region}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost" onClick={() => navigate(`/drivers/${d.id}`)} title="View"><Eye size={14} /></button>
                        {canManage && (
                          <button className="btn btn-ghost" onClick={() => navigate(`/drivers/${d.id}/edit`)} title="Edit"><Pencil size={14} /></button>
                        )}
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
