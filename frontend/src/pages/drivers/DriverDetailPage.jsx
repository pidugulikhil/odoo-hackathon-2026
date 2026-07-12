import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  ArrowLeft, Pencil, AlertTriangle, Shield, Phone, Mail,
  MapPin, Award, Truck, CheckCircle, Clock, TrendingUp,
  UserX, UserCheck, Coffee, Calendar, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Helpers ──────────────────────────────────────────────── */

function safetyColor(s) {
  return s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';
}
function safetyLabel(s) {
  return s >= 80 ? 'Excellent' : s >= 60 ? 'Fair' : 'Poor';
}

/* ─── Info Row ─────────────────────────────────────────────── */

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--surface-border)'
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 13, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13, textAlign: 'right', maxWidth: '60%' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

/* ─── KPI Card ─────────────────────────────────────────────── */

function KpiCard({ icon, label, value, color, sub }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12, padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 2,
      transition: 'all 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>{icon}</div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ─── Safety Score Display ─────────────────────────────────── */

function SafetyScore({ score }) {
  const color = safetyColor(score);
  const label = safetyLabel(score);
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
      {/* Big gauge number */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 100, height: 100, borderRadius: '50%',
        background: `conic-gradient(${color} 0% ${score}%, rgba(255,255,255,0.06) ${score}% 100%)`,
        padding: 6,
        boxShadow: `0 0 0 3px ${color}22, 0 0 30px ${color}22`,
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: 'var(--surface-card)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>/ 100</span>
        </div>
      </div>

      {/* Label + Bar */}
      <div style={{ marginTop: 12 }}>
        <span style={{
          display: 'inline-block', padding: '3px 14px', borderRadius: 999,
          background: `${color}18`, color, fontSize: 12, fontWeight: 700, marginBottom: 8
        }}>{label}</span>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${score}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            borderRadius: 3, transition: 'width 0.8s ease'
          }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────── */

export default function DriverDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole('FLEET_MANAGER', 'SAFETY_OFFICER');

  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm,       setConfirm]       = useState(null);
  const [tab,           setTab]           = useState('info');

  const reload = () => {
    setLoading(true);
    apiClient.get(`/drivers/${id}`)
      .then(res  => setData(res.data.data))
      .catch(()  => { toast.error('Driver not found'); navigate('/drivers'); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { reload(); }, [id]);

  const handleAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/drivers/${id}/${confirm.type}`);
      toast.success(confirm.successMsg);
      setConfirm(null);
      reload();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div className="skeleton" style={{ height: 72, marginBottom: 16, borderRadius: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />
          ))}
        </div>
        <div className="content-grid">
          <div className="skeleton" style={{ height: 320, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 320, borderRadius: 12 }} />
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { driver, analytics } = data;
  const isExpired  = driver.licenseStatus === 'EXPIRED';
  const isExpiring = driver.licenseStatus === 'EXPIRING_SOON';
  const isSuspended= driver.status === 'SUSPENDED';
  const sc         = safetyColor(driver.safetyScore);

  /* Status action buttons */
  const actions = [];
  if (canManage) {
    if (driver.status !== 'SUSPENDED' && driver.status !== 'ON_TRIP')
      actions.push({ type: 'suspend',   label: 'Suspend',      cls: 'btn-danger',    successMsg: 'Driver suspended',       icon: <UserX    size={14} /> });
    if (driver.status !== 'ON_TRIP' && driver.status !== 'OFF_DUTY' && driver.status !== 'SUSPENDED')
      actions.push({ type: 'off-duty',  label: 'Set Off Duty', cls: 'btn-secondary', successMsg: 'Driver set off duty',     icon: <Coffee   size={14} /> });
    if (driver.status === 'SUSPENDED' || driver.status === 'OFF_DUTY')
      actions.push({ type: 'available', label: 'Set Available',cls: 'btn-primary',   successMsg: 'Driver set available',   icon: <UserCheck size={14} /> });
  }

  const completionRate = analytics?.totalTrips
    ? Math.round((analytics.completedTrips / analytics.totalTrips) * 100)
    : 0;

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/drivers')} style={{ padding: '8px 10px', flexShrink: 0 }}>
            <ArrowLeft size={18} />
          </button>

          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: `linear-gradient(135deg, ${sc}, ${sc}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: '#fff', flexShrink: 0,
            boxShadow: `0 0 0 3px rgba(0,0,0,0.3), 0 0 20px ${sc}44`
          }}>
            {driver.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ fontSize: 20 }}>{driver.name}</h1>
              <StatusBadge status={driver.status} />
              {(isExpired || isExpiring) && (
                <span style={{
                  padding: '2px 8px', borderRadius: 999,
                  background: isExpired ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                  color: isExpired ? '#f87171' : '#fbbf24',
                  fontSize: 11, fontWeight: 700
                }}>
                  {isExpired ? 'License Expired' : 'Expiring Soon'}
                </span>
              )}
            </div>
            <p className="page-subtitle" style={{ marginTop: 3 }}>
              <span className="font-mono">{driver.licenseNumber}</span>
              {' · '}{driver.licenseCategory}{' · '}{driver.region}
            </p>
          </div>
        </div>

        <div className="page-actions">
          {canManage && (
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/drivers/${id}/edit`)}>
              <Pencil size={14} /> Edit
            </button>
          )}
          {actions.map(a => (
            <button key={a.type} className={`btn btn-sm ${a.cls}`} onClick={() => setConfirm(a)}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Alert Banners ── */}
      {isExpired && (
        <div className="alert alert-danger" style={{ marginBottom: 14 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>License Expired</strong> — Cannot be assigned to any trips.
            Expired {Math.abs(driver.daysUntilExpiry)} day{Math.abs(driver.daysUntilExpiry) !== 1 ? 's' : ''} ago
            ({new Date(driver.licenseExpiryDate).toLocaleDateString('en-IN')}).
          </div>
        </div>
      )}
      {isExpiring && !isExpired && (
        <div className="alert alert-warning" style={{ marginBottom: 14 }}>
          <Clock size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>License Expiring Soon</strong> — {driver.daysUntilExpiry} day{driver.daysUntilExpiry !== 1 ? 's' : ''} remaining.
            Expires {new Date(driver.licenseExpiryDate).toLocaleDateString('en-IN')}.
          </div>
        </div>
      )}
      {isSuspended && (
        <div className="alert alert-danger" style={{ marginBottom: 14 }}>
          <UserX size={16} style={{ flexShrink: 0 }} />
          <strong>Driver Suspended</strong> — Ineligible for trip assignments until reinstated.
        </div>
      )}

      {/* ── KPI Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard
          icon={<Truck size={15} color="#3b82f6" />}
          label="Total Trips" value={analytics?.totalTrips ?? 0}
          color="#3b82f6"
        />
        <KpiCard
          icon={<CheckCircle size={15} color="#10b981" />}
          label="Completed" value={analytics?.completedTrips ?? 0}
          color="#10b981"
          sub={analytics?.totalTrips ? `${completionRate}% rate` : 'No trips'}
        />
        <KpiCard
          icon={<TrendingUp size={15} color="#8b5cf6" />}
          label="Distance"
          value={analytics?.totalDistance ? `${(analytics.totalDistance/1000).toFixed(1)}k` : '0'}
          color="#8b5cf6"
          sub="km driven"
        />
        <KpiCard
          icon={<Award size={15} color={sc} />}
          label="Safety Score"
          value={driver.safetyScore}
          color={sc}
          sub={safetyLabel(driver.safetyScore)}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          ['info',       'Driver Info'],
          ['safety',     'Safety & Compliance'],
          ['trips',      `Trips (${driver.trips?.length ?? 0})`],
        ].map(([key, lbl]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Info Tab ── */}
      {tab === 'info' && (
        <div className="content-grid">
          {/* Left: Personal + License */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
                Personal Info
              </div>
              <InfoRow label={<><Phone size={12} style={{ marginRight: 6 }} />Contact</>} value={driver.contactNumber} />
              <InfoRow label={<><Mail  size={12} style={{ marginRight: 6 }} />Email</>}   value={driver.email || '—'} />
              <InfoRow label={<><MapPin size={12} style={{ marginRight: 6 }} />Region</>} value={driver.region} />
              <InfoRow label={<><Calendar size={12} style={{ marginRight: 6 }} />Added</>} value={new Date(driver.createdAt).toLocaleDateString('en-IN')} />
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
                License Details
              </div>
              <InfoRow label="Number"   value={<span className="font-mono" style={{ fontSize: 12 }}>{driver.licenseNumber}</span>} />
              <InfoRow label="Category" value={
                <span style={{ padding: '2px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                  {driver.licenseCategory}
                </span>
              } />
              <InfoRow label="Expiry"   value={new Date(driver.licenseExpiryDate).toLocaleDateString('en-IN')} />
              <InfoRow label="Days Left" value={
                driver.daysUntilExpiry >= 0
                  ? <span style={{ color: driver.daysUntilExpiry <= 30 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                      {driver.daysUntilExpiry} days
                    </span>
                  : <span style={{ color: '#ef4444', fontWeight: 700 }}>
                      Expired {Math.abs(driver.daysUntilExpiry)} days ago
                    </span>
              } />
              <InfoRow label="Status" value={
                <span style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                  background: isExpired ? 'rgba(239,68,68,0.12)' : isExpiring ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                  color:      isExpired ? '#f87171'             : isExpiring ? '#fbbf24'              : '#34d399'
                }}>{driver.licenseStatus?.replace('_', ' ')}</span>
              } />
            </div>
          </div>

          {/* Right: Safety Score */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 16 }}>
              Safety Performance
            </div>
            <SafetyScore score={driver.safetyScore} />

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Excellent (80–100)', color: '#10b981' },
                { label: 'Fair (60–79)',       color: '#f59e0b' },
                { label: 'Poor (0–59)',        color: '#ef4444' },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Trip performance */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--surface-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
                Trip Statistics
              </div>
              <InfoRow label="Total Trips"      value={analytics?.totalTrips ?? 0} />
              <InfoRow label="Completed"        value={analytics?.completedTrips ?? 0} />
              <InfoRow label="Completion Rate"  value={`${completionRate}%`} />
              <InfoRow label="Total Distance"   value={analytics?.totalDistance ? `${analytics.totalDistance.toLocaleString()} km` : '—'} />
            </div>
          </div>
        </div>
      )}

      {/* ── Safety Tab ── */}
      {tab === 'safety' && (
        <div className="content-grid">
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 16, fontSize: 14 }}>Compliance Checklist</h4>
            {[
              {
                label: 'License Valid',
                ok: !isExpired,
                warn: isExpiring && !isExpired,
                detail: isExpired
                  ? `Expired ${Math.abs(driver.daysUntilExpiry)} days ago`
                  : isExpiring
                    ? `Expiring in ${driver.daysUntilExpiry} days — renew now`
                    : `Valid for ${driver.daysUntilExpiry} more days`,
              },
              {
                label: 'Operational Status',
                ok: driver.status === 'AVAILABLE',
                warn: driver.status === 'OFF_DUTY',
                detail: `Currently ${driver.status.replace(/_/g, ' ')}`,
              },
              {
                label: 'Not Suspended',
                ok: !isSuspended,
                detail: isSuspended ? 'Driver is suspended' : 'No suspension on record',
              },
              {
                label: 'Trip Eligible',
                ok: !isExpired && driver.status === 'AVAILABLE',
                detail: !isExpired && driver.status === 'AVAILABLE'
                  ? 'Ready for dispatch'
                  : 'Not eligible — check status',
              },
              {
                label: 'Safety Score Acceptable',
                ok: driver.safetyScore >= 60,
                warn: driver.safetyScore >= 60 && driver.safetyScore < 80,
                detail: `Score: ${driver.safetyScore} — ${safetyLabel(driver.safetyScore)}`,
              },
            ].map((item, i, arr) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--surface-border)' : 'none'
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: item.ok ? 'rgba(16,185,129,0.12)' : item.warn ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {item.ok
                    ? <CheckCircle size={14} color="#10b981" />
                    : item.warn
                      ? <Clock size={14} color="#f59e0b" />
                      : <AlertTriangle size={14} color="#ef4444" />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: item.ok ? 'var(--text-muted)' : item.warn ? '#f59e0b' : '#ef4444' }}>
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 16, fontSize: 14 }}>Safety Score</h4>
            <SafetyScore score={driver.safetyScore} />
            <div style={{ marginTop: 20 }}>
              {driver.safetyScore < 60 && (
                <div className="alert alert-danger">
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  Critical — mandatory retraining recommended.
                </div>
              )}
              {driver.safetyScore >= 60 && driver.safetyScore < 80 && (
                <div className="alert alert-warning">
                  <Clock size={14} style={{ flexShrink: 0 }} />
                  Fair score — monitor driving behavior closely.
                </div>
              )}
              {driver.safetyScore >= 80 && (
                <div className="alert alert-success">
                  <Shield size={14} style={{ flexShrink: 0 }} />
                  Excellent record. Driver is performing well.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Trips Tab ── */}
      {tab === 'trips' && (
        <div className="card">
          {!driver.trips?.length ? (
            <div className="empty-state">
              <Truck size={40} />
              <h3>No Trips Yet</h3>
              <p style={{ fontSize: 13, marginTop: 8 }}>This driver hasn't been assigned to any trips.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Trip #</th>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Distance</th>
                    <th>Revenue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {driver.trips.map(t => (
                    <tr
                      key={t.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/trips/${t.id}`)}
                    >
                      <td>
                        <span className="font-mono" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                          {t.tripNumber}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div className="td-primary">{t.source}</div>
                        <div style={{ color: 'var(--text-muted)' }}>→ {t.destination}</div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.vehicle?.registrationNumber ?? '—'}</td>
                      <td style={{ fontSize: 12 }}>
                        {t.actualDistance
                          ? `${t.actualDistance.toLocaleString()} km`
                          : t.plannedDistance
                            ? `${t.plannedDistance.toLocaleString()} km (planned)`
                            : '—'}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {t.revenue ? <span style={{ color: '#10b981', fontWeight: 600 }}>₹{t.revenue.toLocaleString('en-IN')}</span> : '—'}
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        isOpen={!!confirm}
        title={`${confirm?.label} Driver?`}
        message={`Are you sure you want to ${confirm?.label?.toLowerCase()} ${driver.name}?`}
        confirmLabel={confirm?.label}
        confirmClass={confirm?.cls || 'btn-primary'}
        onConfirm={handleAction}
        onCancel={() => setConfirm(null)}
        loading={actionLoading}
      />
    </div>
  );
}
