import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import { ArrowLeft, Pencil, Archive, Truck, TrendingUp, Fuel, Wrench, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--surface-border)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>{value ?? '—'}</span>
    </div>
  );
}

export default function VehicleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isManager = hasRole('FLEET_MANAGER');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retiring, setRetiring] = useState(false);
  const [showRetire, setShowRetire] = useState(false);

  useEffect(() => {
    apiClient.get(`/vehicles/${id}`)
      .then(res => setData(res.data.data))
      .catch(() => { toast.error('Vehicle not found'); navigate('/vehicles'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleRetire = async () => {
    setRetiring(true);
    try {
      await apiClient.post(`/vehicles/${id}/retire`);
      toast.success('Vehicle retired');
      const res = await apiClient.get(`/vehicles/${id}`);
      setData(res.data.data);
      setShowRetire(false);
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Retire failed');
    } finally {
      setRetiring(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!data) return null;

  const { vehicle, analytics } = data;
  const fmt = (n) => n != null ? n.toLocaleString('en-IN') : '—';
  const fmtDist = (n) => n != null ? `${n.toLocaleString()} km` : '—';
  const fmtCurr = (n) => n != null ? `₹${n.toLocaleString('en-IN')}` : '—';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/vehicles')}><ArrowLeft size={16} /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title">{vehicle.name}</h1>
              <StatusBadge status={vehicle.status} />
            </div>
            <p className="page-subtitle font-mono">{vehicle.registrationNumber}</p>
          </div>
        </div>
        {isManager && (
          <div className="page-actions">
            {vehicle.status !== 'RETIRED' && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/vehicles/${id}/edit`)}>
                  <Pencil size={14} /> Edit
                </button>
                <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }} onClick={() => setShowRetire(true)}>
                  <Archive size={14} /> Retire
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="content-grid">
        {/* Left: Details */}
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Vehicle Details</h4>
            <InfoRow label="Registration Number" value={<span className="font-mono">{vehicle.registrationNumber}</span>} />
            <InfoRow label="Model" value={vehicle.model} />
            <InfoRow label="Type" value={vehicle.type.replace('_', ' ')} />
            <InfoRow label="Max Load Capacity" value={`${fmt(vehicle.maxLoadCapacity)} kg`} />
            <InfoRow label="Current Odometer" value={fmtDist(vehicle.odometer)} />
            <InfoRow label="Acquisition Cost" value={fmtCurr(vehicle.acquisitionCost)} />
            <InfoRow label="Region" value={vehicle.region} />
            <InfoRow label="Created" value={new Date(vehicle.createdAt).toLocaleDateString('en-IN')} />
          </div>

          {/* Analytics */}
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 12 }}>Analytics</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Total Trips', value: analytics?.totalTrips, icon: MapPin, color: '#3b82f6' },
                { label: 'Completed', value: analytics?.completedTrips, icon: TrendingUp, color: '#10b981' },
                { label: 'Total Distance', value: fmtDist(analytics?.totalDistance), icon: MapPin, color: '#8b5cf6' },
                { label: 'Fuel Consumed', value: analytics?.totalFuelConsumed ? `${analytics.totalFuelConsumed.toFixed(0)}L` : '—', icon: Fuel, color: '#f59e0b' },
                { label: 'Fuel Efficiency', value: analytics?.fuelEfficiency ? `${analytics.fuelEfficiency.toFixed(2)} km/L` : '—', icon: Fuel, color: '#10b981' },
                { label: 'Total Revenue', value: fmtCurr(analytics?.totalRevenue), icon: TrendingUp, color: '#10b981' },
                { label: 'Op. Cost', value: fmtCurr(analytics?.operationalCost), icon: Wrench, color: '#ef4444' },
                { label: 'ROI', value: analytics?.roiPercent != null ? `${analytics.roiPercent.toFixed(2)}%` : '—', icon: TrendingUp, color: analytics?.roiPercent >= 0 ? '#10b981' : '#ef4444' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 12, border: '1px solid var(--surface-border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color }}>{value ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Trip History */}
        <div>
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 12 }}>Recent Trips</h4>
            {vehicle.trips.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No trips yet</p>
            ) : vehicle.trips.map(t => (
              <Link to={`/trips/${t.id}`} key={t.id} style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--surface-border)', textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>{t.tripNumber}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.source} → {t.destination}</div>
                  </div>
                  <StatusBadge status={t.status} showDot={false} />
                </div>
              </Link>
            ))}
          </div>

          <div className="card" style={{ padding: 24, marginTop: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Maintenance History</h4>
            {vehicle.maintenance.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No maintenance records</p>
            ) : vehicle.maintenance.map(m => (
              <Link to={`/maintenance/${m.id}`} key={m.id} style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--surface-border)', textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{m.maintenanceNumber}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.type}: {m.description}</div>
                  </div>
                  <StatusBadge status={m.status} showDot={false} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showRetire}
        title="Retire Vehicle?"
        message={`Retire "${vehicle.name}"? This vehicle will no longer be available for dispatch.`}
        confirmLabel="Retire Vehicle"
        onConfirm={handleRetire}
        onCancel={() => setShowRetire(false)}
        loading={retiring}
      />
    </div>
  );
}
