import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ArrowLeft, Play, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--surface-border)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>{value ?? '—'}</span>
    </div>
  );
}

export default function MaintenanceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const reload = () => {
    apiClient.get(`/maintenance/${id}`)
      .then(res => setRecord(res.data.data.maintenance))
      .catch(() => { toast.error('Not found'); navigate('/maintenance'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [id]);

  const doAction = async (action, successMsg) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/maintenance/${id}/${action}`);
      toast.success(successMsg);
      setConfirm(null);
      reload();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!record) return null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/maintenance')}><ArrowLeft size={16} /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title font-mono">{record.maintenanceNumber}</h1>
              <StatusBadge status={record.status} />
            </div>
            <p className="page-subtitle">{record.type}: {record.description}</p>
          </div>
        </div>
        <div className="page-actions">
          {record.status === 'DRAFT' && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => setConfirm({ action: 'start', label: 'Start Maintenance', msg: 'Start this maintenance? Vehicle will be set to IN_SHOP.', confirmClass: 'btn-primary' })}>
                <Play size={14} /> Start
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirm({ action: 'cancel', label: 'Cancel', msg: 'Cancel this maintenance record?', confirmClass: 'btn-danger' })}>
                <XCircle size={14} /> Cancel
              </button>
            </>
          )}
          {record.status === 'ACTIVE' && (
            <button className="btn btn-primary btn-sm" onClick={() => setConfirm({ action: 'complete', label: 'Complete', msg: 'Mark maintenance complete? Vehicle will be restored to AVAILABLE.', confirmClass: 'btn-primary' })}>
              <CheckCircle size={14} /> Complete
            </button>
          )}
        </div>
      </div>

      {record.status === 'ACTIVE' && (
        <div className="alert alert-warning">Vehicle is currently IN_SHOP. Complete this maintenance to restore it.</div>
      )}

      <div className="card" style={{ padding: 24 }}>
        <h4 style={{ marginBottom: 12 }}>Maintenance Details</h4>
        <InfoRow label="Record Number" value={<span className="font-mono">{record.maintenanceNumber}</span>} />
        <InfoRow label="Vehicle" value={`${record.vehicle?.name} (${record.vehicle?.registrationNumber})`} />
        <InfoRow label="Vehicle Status" value={<StatusBadge status={record.vehicle?.status} showDot={false} />} />
        <InfoRow label="Type" value={record.type} />
        <InfoRow label="Description" value={record.description} />
        <InfoRow label="Cost" value={`₹${record.cost.toLocaleString('en-IN')}`} />
        <InfoRow label="Technician" value={record.technician || '—'} />
        <InfoRow label="Start Date" value={record.startDate ? new Date(record.startDate).toLocaleDateString('en-IN') : '—'} />
        <InfoRow label="End Date" value={record.endDate ? new Date(record.endDate).toLocaleDateString('en-IN') : '—'} />
        <InfoRow label="Created" value={new Date(record.createdAt).toLocaleDateString('en-IN')} />
      </div>

      <ConfirmDialog
        isOpen={!!confirm}
        title={`${confirm?.label}?`}
        message={confirm?.msg}
        confirmLabel={confirm?.label}
        confirmClass={confirm?.confirmClass}
        onConfirm={() => doAction(confirm.action, `${confirm.label} successful`)}
        onCancel={() => setConfirm(null)}
        loading={actionLoading}
      />
    </div>
  );
}
