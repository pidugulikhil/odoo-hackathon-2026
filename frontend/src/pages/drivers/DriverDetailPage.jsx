import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ArrowLeft, Pencil, AlertTriangle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--surface-border)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>{value ?? '—'}</span>
    </div>
  );
}

export default function DriverDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole('FLEET_MANAGER', 'SAFETY_OFFICER');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState(null); // { type, label }

  const reload = () => {
    apiClient.get(`/drivers/${id}`)
      .then(res => setData(res.data.data))
      .catch(() => { toast.error('Driver not found'); navigate('/drivers'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [id]);

  const handleAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/drivers/${id}/${confirm.type}`);
      toast.success(confirm.label + ' successfully');
      setConfirm(null);
      reload();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!data) return null;

  const { driver, analytics } = data;
  const safetyColor = (s) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/drivers')}><ArrowLeft size={16} /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title">{driver.name}</h1>
              <StatusBadge status={driver.status} />
            </div>
            <p className="page-subtitle font-mono">{driver.licenseNumber}</p>
          </div>
        </div>
        {canManage && (
          <div className="page-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/drivers/${id}/edit`)}>
              <Pencil size={14} /> Edit
            </button>
            {driver.status !== 'SUSPENDED' && driver.status !== 'ON_TRIP' && (
              <button className="btn btn-sm btn-danger" onClick={() => setConfirm({ type: 'suspend', label: 'Driver suspended' })}>
                Suspend
              </button>
            )}
            {(driver.status === 'SUSPENDED' || driver.status === 'OFF_DUTY') && (
              <button className="btn btn-sm btn-primary" onClick={() => setConfirm({ type: 'available', label: 'Driver set available' })}>
                Set Available
              </button>
            )}
          </div>
        )}
      </div>

      {driver.licenseStatus === 'EXPIRED' && (
        <div className="alert alert-danger"><AlertTriangle size={16} /> This driver's license has expired. They cannot be assigned to trips.</div>
      )}
      {driver.licenseStatus === 'EXPIRING_SOON' && (
        <div className="alert alert-warning"><AlertTriangle size={16} /> License expires in {driver.daysUntilExpiry} days. Renewal required soon.</div>
      )}

      <div className="content-grid">
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Driver Details</h4>
            <InfoRow label="License Number" value={<span className="font-mono">{driver.licenseNumber}</span>} />
            <InfoRow label="License Category" value={driver.licenseCategory} />
            <InfoRow label="License Expiry" value={new Date(driver.licenseExpiryDate).toLocaleDateString('en-IN')} />
            <InfoRow label="License Status" value={<StatusBadge status={driver.licenseStatus} showDot={false} />} />
            <InfoRow label="Days Until Expiry" value={driver.daysUntilExpiry >= 0 ? `${driver.daysUntilExpiry} days` : `Expired ${Math.abs(driver.daysUntilExpiry)} days ago`} />
            <InfoRow label="Contact" value={driver.contactNumber} />
            <InfoRow label="Email" value={driver.email || '—'} />
            <InfoRow label="Region" value={driver.region} />
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 12 }}>Performance</h4>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Safety Score</span>
                <span className="safety-score-value" style={{ background: `linear-gradient(135deg, ${safetyColor(driver.safetyScore)}, ${safetyColor(driver.safetyScore)}cc)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 20, fontWeight: 800 }}>{driver.safetyScore}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${driver.safetyScore}%`, background: safetyColor(driver.safetyScore) }} />
              </div>
            </div>
            <InfoRow label="Total Trips" value={analytics?.totalTrips} />
            <InfoRow label="Completed Trips" value={analytics?.completedTrips} />
            <InfoRow label="Total Distance" value={analytics?.totalDistance ? `${analytics.totalDistance.toLocaleString()} km` : '—'} />
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h4 style={{ marginBottom: 12 }}>Recent Trips</h4>
          {driver.trips?.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No trips yet</p>
          ) : driver.trips?.map(t => (
            <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--surface-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>{t.tripNumber}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.source} → {t.destination}</div>
                </div>
                <StatusBadge status={t.status} showDot={false} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirm}
        title={`${confirm?.type === 'suspend' ? 'Suspend' : 'Set Available'} Driver?`}
        message={`Are you sure you want to ${confirm?.type === 'suspend' ? 'suspend' : 'restore'} ${driver.name}?`}
        confirmLabel={confirm?.type === 'suspend' ? 'Suspend Driver' : 'Set Available'}
        confirmClass={confirm?.type === 'suspend' ? 'btn-danger' : 'btn-primary'}
        onConfirm={handleAction}
        onCancel={() => setConfirm(null)}
        loading={actionLoading}
      />
    </div>
  );
}
