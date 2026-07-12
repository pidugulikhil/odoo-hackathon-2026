import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import { Plus, Search, Eye, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = ['', 'DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED'];

export default function TripListPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await apiClient.get('/trips', { params });
      setTrips(res.data.data.trips);
      setPagination(res.data.data.pagination);
    } catch { toast.error('Failed to load trips'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Trips</h1><p className="page-subtitle">Manage trip lifecycle</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/trips/new')}><Plus size={14} /> New Trip</button>
      </div>

      <div className="filters-bar">
        <div className="search-input-wrapper">
          <Search size={14} />
          <input className="search-input" placeholder="Search by number, route..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 24 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8 }} />)}</div>
        ) : trips.length === 0 ? (
          <div className="empty-state"><MapPin size={40} /><h3>No trips found</h3></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trip #</th>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Cargo (kg)</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Revenue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(t => (
                  <tr key={t.id}>
                    <td><span className="font-mono td-primary" style={{ fontSize: 12, color: 'var(--primary)' }}>{t.tripNumber}</span></td>
                    <td>
                      <div className="td-primary">{t.source}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>→ {t.destination}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{t.vehicle?.registrationNumber}</td>
                    <td style={{ fontSize: 12 }}>{t.driver?.name}</td>
                    <td>{t.cargoWeight.toLocaleString()}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {t.dispatchDate ? new Date(t.dispatchDate).toLocaleDateString('en-IN') : new Date(t.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td>{t.revenue ? `₹${t.revenue.toLocaleString('en-IN')}` : '—'}</td>
                    <td>
                      <button className="btn btn-ghost" onClick={() => navigate(`/trips/${t.id}`)}><Eye size={14} /></button>
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
