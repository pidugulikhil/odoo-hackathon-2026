import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import { Plus, Search, Eye, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = ['', 'DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export default function MaintenanceListPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await apiClient.get('/maintenance', { params });
      setRecords(res.data.data.maintenance);
      setPagination(res.data.data.pagination);
    } catch { toast.error('Failed to load maintenance records'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Maintenance</h1><p className="page-subtitle">Track vehicle maintenance records</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/maintenance/new')}><Plus size={14} /> Add Record</button>
      </div>

      <div className="filters-bar">
        <div className="search-input-wrapper">
          <Search size={14} />
          <input className="search-input" placeholder="Search maintenance..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 24 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8 }} />)}</div>
        ) : records.length === 0 ? (
          <div className="empty-state"><Wrench size={40} /><h3>No maintenance records</h3></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Record #</th>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(m => (
                  <tr key={m.id}>
                    <td><span className="font-mono td-primary" style={{ fontSize: 12, color: 'var(--primary)' }}>{m.maintenanceNumber}</span></td>
                    <td>
                      <div className="td-primary">{m.vehicle?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.vehicle?.registrationNumber}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{m.type}</td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{m.description}</td>
                    <td>₹{m.cost.toLocaleString('en-IN')}</td>
                    <td><StatusBadge status={m.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.startDate ? new Date(m.startDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <button className="btn btn-ghost" onClick={() => navigate(`/maintenance/${m.id}`)}><Eye size={14} /></button>
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
