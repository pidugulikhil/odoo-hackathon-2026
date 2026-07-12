import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ArrowLeft, Zap, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

function Stepper({ status }) {
  const steps = [
    { key: 'DRAFT', label: 'Draft', num: 1 },
    { key: 'DISPATCHED', label: 'Dispatched', num: 2 },
    { key: 'COMPLETED', label: 'Completed', num: 3 },
  ];
  const order = { DRAFT: 0, DISPATCHED: 1, COMPLETED: 2, CANCELLED: -1 };
  const current = order[status];

  if (status === 'CANCELLED') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
        <div className="step-circle cancelled">✕</div>
        <span style={{ color: '#ef4444', fontWeight: 600 }}>CANCELLED</span>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 8 }}>
      <div className="stepper">
        {steps.map((step, i) => (
          <div key={step.key} className="step-item">
            <div className={`step-circle ${current > i ? 'done' : current === i ? 'current' : ''}`}>
              {current > i ? '✓' : step.num}
            </div>
            {i < steps.length - 1 && <div className={`step-line ${current > i ? 'done' : ''}`} />}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {steps.map(step => (
          <div key={step.key} className="step-label" style={{ flex: 1 }}>{step.label}</div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--surface-border)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>{value ?? '—'}</span>
    </div>
  );
}

export default function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completeForm, setCompleteForm] = useState({ finalOdometer: '', fuelConsumed: '', revenue: '' });
  const [completeErrors, setCompleteErrors] = useState({});

  const reload = () => {
    apiClient.get(`/trips/${id}`)
      .then(res => setTrip(res.data.data.trip))
      .catch(() => { toast.error('Trip not found'); navigate('/trips'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [id]);

  const handleDispatch = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/trips/${id}/dispatch`);
      toast.success('Trip dispatched! Vehicle and Driver set to ON_TRIP.');
      reload();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Dispatch failed');
    } finally {
      setActionLoading(false);
    }
  };

  const validateComplete = () => {
    const e = {};
    if (!completeForm.finalOdometer) e.finalOdometer = 'Required';
    else if (trip.startOdometer && parseFloat(completeForm.finalOdometer) < trip.startOdometer) {
      e.finalOdometer = `Must be >= start odometer (${trip.startOdometer})`;
    }
    if (!completeForm.fuelConsumed || parseFloat(completeForm.fuelConsumed) <= 0) e.fuelConsumed = 'Must be > 0';
    if (completeForm.revenue && parseFloat(completeForm.revenue) < 0) e.revenue = 'Cannot be negative';
    setCompleteErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleComplete = async () => {
    if (!validateComplete()) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/trips/${id}/complete`, {
        finalOdometer: parseFloat(completeForm.finalOdometer),
        fuelConsumed: parseFloat(completeForm.fuelConsumed),
        revenue: parseFloat(completeForm.revenue) || 0,
      });
      toast.success('Trip completed! Vehicle and Driver restored to AVAILABLE.');
      setShowComplete(false);
      reload();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Complete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/trips/${id}/cancel`);
      toast.success('Trip cancelled');
      setShowCancel(false);
      reload();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Cancel failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!trip) return null;

  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN') : '—';
  const actualDist = trip.finalOdometer && trip.startOdometer ? trip.finalOdometer - trip.startOdometer : null;
  const fuelEff = trip.fuelConsumed && actualDist ? (actualDist / trip.fuelConsumed).toFixed(2) : null;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/trips')}><ArrowLeft size={16} /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title font-mono">{trip.tripNumber}</h1>
              <StatusBadge status={trip.status} />
            </div>
            <p className="page-subtitle">{trip.source} → {trip.destination}</p>
          </div>
        </div>
        <div className="page-actions">
          {trip.status === 'DRAFT' && (
            <>
              <button id="dispatch-btn" className="btn btn-primary btn-sm" onClick={handleDispatch} disabled={actionLoading}>
                <Zap size={14} /> Dispatch
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setShowCancel(true)} disabled={actionLoading}>
                <XCircle size={14} /> Cancel
              </button>
            </>
          )}
          {trip.status === 'DISPATCHED' && (
            <>
              <button id="complete-btn" className="btn btn-primary btn-sm" onClick={() => setShowComplete(true)} disabled={actionLoading}>
                <CheckCircle size={14} /> Complete Trip
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setShowCancel(true)} disabled={actionLoading}>
                <XCircle size={14} /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="card" style={{ padding: '20px 28px', marginBottom: 20 }}>
        <Stepper status={trip.status} />
      </div>

      <div className="content-grid">
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Trip Details</h4>
            <InfoRow label="Source" value={trip.source} />
            <InfoRow label="Destination" value={trip.destination} />
            <InfoRow label="Cargo Weight" value={`${trip.cargoWeight.toLocaleString()} kg`} />
            <InfoRow label="Planned Distance" value={`${trip.plannedDistance.toLocaleString()} km`} />
            <InfoRow label="Start Odometer" value={trip.startOdometer ? `${trip.startOdometer.toLocaleString()} km` : '—'} />
            <InfoRow label="Final Odometer" value={trip.finalOdometer ? `${trip.finalOdometer.toLocaleString()} km` : '—'} />
            <InfoRow label="Actual Distance" value={trip.actualDistance ? `${trip.actualDistance.toLocaleString()} km` : '—'} />
            <InfoRow label="Fuel Consumed" value={trip.fuelConsumed ? `${trip.fuelConsumed}L` : '—'} />
            <InfoRow label="Fuel Efficiency" value={fuelEff ? `${fuelEff} km/L` : '—'} />
            <InfoRow label="Revenue" value={trip.revenue ? `₹${trip.revenue.toLocaleString('en-IN')}` : '—'} />
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 12 }}>Timeline</h4>
            <InfoRow label="Created" value={fmtDate(trip.createdAt)} />
            <InfoRow label="Dispatched" value={fmtDate(trip.dispatchDate)} />
            <InfoRow label="Completed" value={fmtDate(trip.completionDate)} />
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Vehicle</h4>
            {trip.vehicle && (
              <>
                <InfoRow label="Registration" value={<span className="font-mono">{trip.vehicle.registrationNumber}</span>} />
                <InfoRow label="Name" value={trip.vehicle.name} />
                <InfoRow label="Type" value={trip.vehicle.type} />
                <InfoRow label="Status" value={<StatusBadge status={trip.vehicle.status} />} />
                <InfoRow label="Max Capacity" value={`${trip.vehicle.maxLoadCapacity?.toLocaleString()} kg`} />
              </>
            )}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 12 }}>Driver</h4>
            {trip.driver && (
              <>
                <InfoRow label="Name" value={trip.driver.name} />
                <InfoRow label="License" value={<span className="font-mono">{trip.driver.licenseNumber}</span>} />
                <InfoRow label="Status" value={<StatusBadge status={trip.driver.status} />} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <ConfirmDialog
        isOpen={showCancel}
        title="Cancel Trip?"
        message={`Cancel trip ${trip.tripNumber}? ${trip.status === 'DISPATCHED' ? 'Vehicle and Driver will be restored to AVAILABLE.' : ''}`}
        confirmLabel="Cancel Trip"
        onConfirm={handleCancel}
        onCancel={() => setShowCancel(false)}
        loading={actionLoading}
      />

      {/* Complete Modal */}
      {showComplete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Complete Trip {trip.tripNumber}</h3>
              <button className="btn btn-ghost" onClick={() => setShowComplete(false)}>✕</button>
            </div>
            <div>
              {trip.startOdometer && (
                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                  Start Odometer: <strong>{trip.startOdometer.toLocaleString()} km</strong>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Final Odometer (km) *</label>
                <input id="final-odometer" className="form-control" type="number" value={completeForm.finalOdometer}
                  onChange={e => setCompleteForm(f => ({ ...f, finalOdometer: e.target.value }))}
                  style={completeErrors.finalOdometer ? { borderColor: '#ef4444' } : {}} />
                {completeErrors.finalOdometer && <div className="form-error">{completeErrors.finalOdometer}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Fuel Consumed (L) *</label>
                <input id="fuel-consumed" className="form-control" type="number" value={completeForm.fuelConsumed}
                  onChange={e => setCompleteForm(f => ({ ...f, fuelConsumed: e.target.value }))}
                  style={completeErrors.fuelConsumed ? { borderColor: '#ef4444' } : {}} />
                {completeErrors.fuelConsumed && <div className="form-error">{completeErrors.fuelConsumed}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Revenue (₹)</label>
                <input id="trip-revenue" className="form-control" type="number" value={completeForm.revenue}
                  onChange={e => setCompleteForm(f => ({ ...f, revenue: e.target.value }))}
                  style={completeErrors.revenue ? { borderColor: '#ef4444' } : {}} />
                {completeErrors.revenue && <div className="form-error">{completeErrors.revenue}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowComplete(false)} disabled={actionLoading}>Cancel</button>
              <button id="confirm-complete-btn" className="btn btn-primary" onClick={handleComplete} disabled={actionLoading}>
                {actionLoading ? 'Completing...' : 'Complete Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
