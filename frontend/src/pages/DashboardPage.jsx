import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import {
  Truck, Users, MapPin, Wrench, TrendingUp, Activity,
  BarChart2, Zap, AlertTriangle, CheckCircle, Clock, Fuel
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import StatusBadge from '../components/common/StatusBadge';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6b7280'];

function KpiCard({ icon: Icon, label, value, color = '#10b981', subtitle }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: `${color}18` }}>
        <Icon size={20} color={color} />
      </div>
      <div className="kpi-value" style={{ color }}>{value ?? '—'}</div>
      <div className="kpi-label">{label}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

function ActivityItem({ item }) {
  const iconMap = { TRIP: MapPin, MAINTENANCE: Wrench, FUEL: Fuel, EXPENSE: BarChart2 };
  const colorMap = { TRIP: '#3b82f6', MAINTENANCE: '#f59e0b', FUEL: '#10b981', EXPENSE: '#8b5cf6' };
  const Icon = iconMap[item.type] || Activity;
  const color = colorMap[item.type] || '#94a3b8';

  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--surface-border)' }}>
      <div style={{ width: 34, height: 34, background: `${color}18`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{item.message}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.detail}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: 2 }}>
        {new Date(item.timestamp).toLocaleDateString()}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [activities, setActivities] = useState([]);
  const [roi, setRoi] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, actRes, roiRes] = await Promise.all([
          apiClient.get('/analytics/dashboard'),
          apiClient.get('/analytics/activity'),
          apiClient.get('/analytics/vehicle-roi'),
        ]);
        setKpis(dashRes.data.data.kpis);
        setActivities(actRes.data.data.activities);
        setRoi(roiRes.data.data.vehicles.slice(0, 6));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const vehicleStatusData = kpis ? [
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
          {Array.from({ length: 7 }).map((_, i) => (
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
