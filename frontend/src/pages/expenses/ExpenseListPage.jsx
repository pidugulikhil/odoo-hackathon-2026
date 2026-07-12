import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const EXPENSE_TYPE_COLORS = {
  TOLL: '#3b82f6', PARKING: '#8b5cf6', REPAIR: '#f59e0b',
  FINE: '#ef4444', INSURANCE: '#10b981', OTHER: '#6b7280'
};

export default function ExpenseListPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/expenses', { params: { page, limit: 20 } });
      setExpenses(res.data.data.expenses);
      setPagination(res.data.data.pagination);
      setTotalAmount(res.data.data.summary?.totalAmount || 0);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/expenses/${deleteTarget.id}`);
      toast.success('Expense deleted');
      setDeleteTarget(null);
      fetchExpenses();
    } catch { toast.error('Delete failed'); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Total: <strong style={{ color: 'var(--primary)' }}>₹{totalAmount.toLocaleString('en-IN')}</strong></p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/expenses/new')}><Plus size={14} /> Add Expense</button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 24 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8 }} />)}</div>
        ) : expenses.length === 0 ? (
          <div className="empty-state"><Receipt size={40} /><h3>No expenses</h3></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Trip</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div className="td-primary">{e.vehicle?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.vehicle?.registrationNumber}</div>
                    </td>
                    <td>
                      <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${EXPENSE_TYPE_COLORS[e.type]}18`, color: EXPENSE_TYPE_COLORS[e.type] }}>
                        {e.type}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{e.description || '—'}</td>
                    <td style={{ fontWeight: 600, color: '#ef4444' }}>₹{e.amount.toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: 12 }}>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontSize: 12 }}>{e.trip?.tripNumber || '—'}</td>
                    <td>
                      <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={() => setDeleteTarget(e)}>
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
        title="Delete Expense?"
        message="Delete this expense record?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
