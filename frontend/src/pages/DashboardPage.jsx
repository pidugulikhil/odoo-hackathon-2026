import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Users, MapPin, Wrench, TrendingUp, Activity,
  BarChart2, Zap, AlertTriangle, CheckCircle, Clock, Fuel, Award
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6b7280'];

function KpiCard({ icon: Icon, label, value, color = '#10b981', subtitle }) {
  return (
    <div className="kpi-card" style={{ flex: '1 1 180px', minWidth: 160 }}>
      <div className="kpi-icon" style={{ background: `${color}18` }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#f1f5f9', marginBottom: 2 }}>
          {value != null ? value : '—'}
        </div>
        {subtitle && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ item }) {
  const getIcon = () => {
    switch (item.icon) {
      case 'truck': return <Truck size={14} color="#3b82f6" />;
      case 'wrench': return <Wrench size={14} color="#f59e0b" />;
      case 'fuel': return <Fuel size={14} color="#10b981" />;
      default: return <Activity size={14} color="var(--primary)" />;
    }
  };

  const getBg = () => {
    switch (item.icon) {
      case 'truck': return 'rgba(59, 130, 246, 0.08)';
      case 'wrench': return 'rgba(245, 158, 11, 0.08)';
      case 'fuel': return 'rgba(16, 185, 129, 0.08)';
      default: return 'rgba(99, 102, 241, 0.08)';
    }
  };

  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: getBg(), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        {getIcon()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{item.message}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }} className="truncate">{item.detail}</div>
      </div>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [activities, setActivities] = useState([]);
  const [roi, setRoi] = useState([]);
  const [driverTrips, setDriverTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const isDriver = user?.role === 'DRIVER';

  useEffect(() => {
    async function load() {
      try {
        if (isDriver) {
          const [dashRes, actRes, tripsRes] = await Promise.all([
            apiClient.get('/analytics/dashboard'),
            apiClient.get('/analytics/activity'),
            apiClient.get('/trips', { params: { limit: 5 } }),
          ]);
          setKpis(dashRes.data.data.kpis);
          setActivities(actRes.data.data.activities);
          setDriverTrips(tripsRes.data.data.trips);
        } else {
          const [dashRes, actRes, roiRes] = await Promise.all([
            apiClient.get('/analytics/dashboard'),
            apiClient.get('/analytics/activity'),
            apiClient.get('/analytics/vehicle-roi'),
          ]);
          setKpis(dashRes.data.data.kpis);
          setActivities(actRes.data.data.activities);
          setRoi(roiRes.data.data.vehicles.slice(0, 6));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isDriver]);

  const vehicleStatusData = kpis && !isDriver ? [
    { name: 'Available', value: kpis.availableVehicles, color: '#10b981' },
    { name: 'On Trip', value: kpis.activeTrips, color: '#3b82f6' },
    { name: 'In Shop', value: kpis.vehiclesInMaintenance, color: '#f59e0b' },
    { name: 'Retired', value: kpis.totalVehicles - kpis.activeVehicles, color: '#6b7280' },
  ] : [];

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="skeleton" style={{ width: 200, height: 28, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 150, height: 18 }} />
          </div>
        </div>
        <div className="kpi-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="kpi-card">
              <div className="skeleton" style={{ width: 44, height: 44, marginBottom: 16 }} />
              <div className="skeleton" style={{ width: 80, height: 36, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 120, height: 16 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Render Driver Specific Dashboard ─── */
  if (isDriver) {
    const safetyColor = kpis?.safetyScore >= 90 ? '#10b981' : kpis?.safetyScore >= 75 ? '#f59e0b' : '#ef4444';
    const licenseColor = kpis?.licenseStatus === 'VALID' ? '#10b981' : kpis?.licenseStatus === 'EXPIRING_SOON' ? '#f59e0b' : '#ef4444';

    return (
      <div>
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Driver Portal</h1>
            <p className="page-subtitle">
              Welcome back, <strong style={{ color: 'var(--primary)' }}>{user?.name}</strong> — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Driver Scoped KPI Grid */}
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <KpiCard icon={Truck} label="Assigned Vehicle" value={kpis?.assignedVehicle} color="#3b82f6" subtitle="Current Active Trip" />
          <KpiCard icon={Award} label="Safety Score" value={`${kpis?.safetyScore} / 100`} color={safetyColor} subtitle="Compliance Rating" />
          <KpiCard icon={Zap} label="License Status" value={kpis?.licenseStatus} color={licenseColor} subtitle="RTO Validation" />
          <KpiCard icon={MapPin} label="Total Trips" value={kpis?.totalTrips} color="#8b5cf6" subtitle={`${kpis?.completedTrips} Completed`} />
          <KpiCard icon={Clock} label="Active Trips" value={kpis?.activeTrips} color="#f59e0b" subtitle={`${kpis?.pendingTrips} Drafts`} />
        </div>

        {/* Content Layout Split */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Left: Driver Assigned Trips List */}
          <div className="card" style={{ flex: '1 1 65%', minWidth: 500, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Your Assigned Trips</h3>
              <span onClick={() => navigate('/trips')} style={{ fontSize: 11, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
            </div>
            {driverTrips.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <MapPin size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p>No trips assigned to you yet.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Trip #</th>
                      <th>Route</th>
                      <th>Cargo (kg)</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverTrips.map(t => (
                      <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/trips/${t.id}`)}>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                            {t.tripNumber}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{t.source}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>→ {t.destination}</div>
                        </td>
                        <td>{t.cargoWeight.toLocaleString('en-IN')}</td>
                        <td><StatusBadge status={t.status} /></td>
                        <td>
                          <div style={{ fontSize: 11 }}>{new Date(t.createdAt).toLocaleDateString('en-IN')}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: Driver Scoped Activities */}
          <div className="card" style={{ flex: '1 1 30%', minWidth: 260, padding: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Your Recent Updates</h3>
            {activities.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <Activity size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ fontSize: 12 }}>No recent updates</p>
              </div>
            ) : (
              activities.slice(0, 5).map((item, i) => <ActivityItem key={i} item={item} />)
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Render Fleet Manager / Analytics Dashboard ─── */
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <strong style={{ color: 'var(--primary)' }}>{user?.name}</strong> — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {kpis?.expiringLicenses > 0 && (
            <div className="alert alert-warning" style={{ margin: 0, padding: '8px 14px', fontSize: 12 }}>
              <AlertTriangle size={14} />
              {kpis.expiringLicenses} license{kpis.expiringLicenses > 1 ? 's' : ''} expiring soon
            </div>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KpiCard icon={Truck} label="Active Vehicles" value={kpis?.activeVehicles} color="#10b981" subtitle={`of ${kpis?.totalVehicles} total`} />
        <KpiCard icon={Truck} label="Available Vehicles" value={kpis?.availableVehicles} color="#3b82f6" />
        <KpiCard icon={Wrench} label="In Maintenance" value={kpis?.vehiclesInMaintenance} color="#f59e0b" />
        <KpiCard icon={MapPin} label="Active Trips" value={kpis?.activeTrips} color="#8b5cf6" />
        <KpiCard icon={Clock} label="Pending Trips" value={kpis?.pendingTrips} color="#6b7280" />
        <KpiCard icon={Users} label="Drivers On Duty" value={kpis?.driversOnDuty} color="#ec4899" />
        <KpiCard
          icon={TrendingUp}
          label="Fleet Utilization"
          value={kpis ? `${kpis.fleetUtilization?.toFixed(1)}%` : '—'}
          color="#10b981"
          subtitle="of active fleet"
        />
      </div>

      {/* Charts Row */}
      <div className="content-grid" style={{ marginBottom: 20 }}>
        {/* Vehicle Status Donut */}
        <div className="chart-card">
          <h3 className="chart-title">Fleet Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={vehicleStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                {vehicleStatusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a2236', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle ROI Chart */}
        <div className="chart-card">
          <h3 className="chart-title">Vehicle ROI (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roi} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="registrationNumber" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a2236', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                formatter={(val) => [`${val?.toFixed(1)}%`, 'ROI']}
              />
              <Bar dataKey="roiPercent" radius={[4, 4, 0, 0]}>
                {roi.map((entry, i) => (
                  <Cell key={i} fill={entry.roiPercent >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: Financial Summary + Activity Feed */}
      <div className="content-grid">
        {/* Financial Cards */}
        <div>
          <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>Financial Overview</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Total Revenue', value: kpis?.totalRevenue, color: '#10b981', icon: TrendingUp },
              { label: 'Fuel Cost', value: kpis?.totalFuelCost, color: '#3b82f6', icon: Fuel },
              { label: 'Maintenance Cost', value: kpis?.totalMaintenanceCost, color: '#f59e0b', icon: Wrench },
              { label: 'Operational Cost', value: kpis?.operationalCost, color: '#ef4444', icon: BarChart2 },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, background: `${color}18`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color }}>{
                    value != null ? `₹${value.toLocaleString('en-IN')}` : '₹0'
                  }</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>Recent Activity</h3>
          <div className="card" style={{ padding: '4px 20px 16px' }}>
            {activities.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <Activity size={32} style={{ marginBottom: 12 }} />
                <p>No recent activity</p>
              </div>
            ) : (
              activities.slice(0, 8).map((item, i) => <ActivityItem key={i} item={item} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
