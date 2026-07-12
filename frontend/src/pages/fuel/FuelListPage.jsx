import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import Pagination from '../../components/common/Pagination';
import { Plus, Search, Fuel, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function FuelListPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/fuel', { params: { page, limit: 20 } });
      setLogs(res.data.data.fuelLogs);
      setPagination(res.data.data.pagination);
    } catch { toast.error('Failed to load fuel logs'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/fuel/${deleteTarget.id}`);
      toast.success('Fuel log deleted');
      setDeleteTarget(null);
      fetchLogs();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Fuel Logs</h1><p className="page-subtitle">Track fuel consumption and costs</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/fuel/new')}><Plus size={14} /> Add Log</button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 24 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8 }} />)}</div>
        ) : logs.length === 0 ? (
          <div className="empty-state"><Fuel size={40} /><h3>No fuel logs</h3></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Trip</th>
                  <th>Date</th>
                  <th>Liters</th>
                  <th>Cost</th>
                  <th>Price/L</th>
                  <th>Odometer</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {logs.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div className="td-primary">{f.vehicle?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.vehicle?.registrationNumber}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{f.trip?.tripNumber || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(f.date).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{f.liters}L</td>
                    <td>₹{f.cost.toLocaleString('en-IN')}</td>
                    <td>{f.pricePerLiter ? `₹${f.pricePerLiter.toFixed(2)}/L` : '—'}</td>
                    <td>{f.odometer ? `${f.odometer.toLocaleString()} km` : '—'}</td>
                    <td>
                      <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={() => setDeleteTarget(f)}>
                        <Trash2 size={14} />
                      </button>
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
        isOpen={!!deleteTarget}
        title="Delete Fuel Log?"
        message="Are you sure you want to delete this fuel log?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
