import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Plus, Search, Download, Eye, Pencil, Archive, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

const VEHICLE_TYPES = ['', 'TRUCK', 'VAN', 'BUS', 'MINI_TRUCK', 'TRAILER', 'OTHER'];
const VEHICLE_STATUSES = ['', 'AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED'];

export default function VehicleListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isManager = hasRole('FLEET_MANAGER');

  const [vehicles, setVehicles] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [retireTarget, setRetireTarget] = useState(null);
  const [retireLoading, setRetireLoading] = useState(false);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, sortBy, sortOrder };
      if (search) params.search = search;
      if (status) params.status = status;
      if (type) params.type = type;
      const res = await apiClient.get('/vehicles', { params });
      setVehicles(res.data.data.vehicles);
      setPagination(res.data.data.pagination);
    } catch (e) {
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, type, sortBy, sortOrder]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleExport = async () => {
    try {
      const res = await apiClient.get('/vehicles/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'vehicles.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const handleRetire = async () => {
    if (!retireTarget) return;
    setRetireLoading(true);
    try {
      await apiClient.post(`/vehicles/${retireTarget.id}/retire`);
      toast.success(`${retireTarget.name} retired successfully`);
      setRetireTarget(null);
      fetchVehicles();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Retire failed');
    } finally {
      setRetireLoading(false);
    }
  };

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicles</h1>
          <p className="page-subtitle">Manage your fleet vehicles</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </button>
          {isManager && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/vehicles/new')}>
              <Plus size={14} /> Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrapper">
          <Search size={14} />
          <input id="vehicle-search" className="search-input" placeholder="Search vehicles..." value={search} onChange={handleSearch} />
        </div>
        <select id="vehicle-status-filter" className="filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <select id="vehicle-type-filter" className="filter-select" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
          {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
        </select>
        <select id="vehicle-sort" className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="createdAt">Newest First</option>
          <option value="name">Name</option>
          <option value="maxLoadCapacity">Capacity</option>
          <option value="status">Status</option>
          <option value="type">Type</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 24 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8 }} />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="empty-state">
            <Truck size={40} />
            <h3>No vehicles found</h3>
            <p style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Registration</th>
                  <th>Name / Model</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Odometer</th>
                  <th>Region</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td><span className="font-mono td-primary" style={{ fontSize: 12 }}>{v.registrationNumber}</span></td>
                    <td>
                      <div className="td-primary">{v.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.model}</div>
                    </td>
                    <td>{v.type.replace('_', ' ')}</td>
                    <td>{v.maxLoadCapacity.toLocaleString()} kg</td>
                    <td>{v.odometer.toLocaleString()} km</td>
                    <td>{v.region}</td>
                    <td><StatusBadge status={v.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost" onClick={() => navigate(`/vehicles/${v.id}`)} title="View">
                          <Eye size={14} />
                        </button>
                        {isManager && v.status !== 'RETIRED' && (
                          <>
                            <button className="btn btn-ghost" onClick={() => navigate(`/vehicles/${v.id}/edit`)} title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button className="btn btn-ghost" onClick={() => setRetireTarget(v)} title="Retire" style={{ color: '#f59e0b' }}>
                              <Archive size={14} />
                            </button>
                          </>
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
