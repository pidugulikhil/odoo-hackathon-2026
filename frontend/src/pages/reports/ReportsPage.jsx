import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Truck, Fuel, Wrench, TrendingUp } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function ReportsPage() {
  const [roi, setRoi] = useState([]);
  const [fuel, setFuel] = useState([]);
  const [utilization, setUtilization] = useState(null);
  const [opCost, setOpCost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/analytics/vehicle-roi'),
      apiClient.get('/analytics/fuel-efficiency'),
      apiClient.get('/analytics/fleet-utilization'),
      apiClient.get('/analytics/operational-cost'),
    ]).then(([roiRes, fuelRes, utilRes, costRes]) => {
      setRoi(roiRes.data.data.vehicles);
      setFuel(fuelRes.data.data.vehicles);
      setUtilization(utilRes.data.data);
      setOpCost(costRes.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
      Loading analytics...
    </div>
  );

  const costByVehicle = opCost?.vehicles?.slice(0, 8) || [];
  const topROI = roi.slice(0, 8);
  const topFuel = fuel.slice(0, 8);

  const utilizationPieData = utilization ? [
    { name: 'On Trip', value: utilization.onTripVehicles, color: '#3b82f6' },
    { name: 'Available', value: utilization.availableVehicles, color: '#10b981' },
    { name: 'In Shop', value: utilization.inShopVehicles, color: '#f59e0b' },
    { name: 'Retired', value: utilization.retiredVehicles, color: '#6b7280' },
  ].filter(d => d.value > 0) : [];

  const tooltipStyle = { background: '#1a2236', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Fleet performance insights</p>
        </div>
      </div>

      {/* Fleet Utilization */}
      <Section title={<><Truck size={18} /> Fleet Utilization</>}>
        <div className="content-grid">
          <div className="chart-card">
            <h3 className="chart-title">Fleet Status Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={utilizationPieData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} dataKey="value" paddingAngle={3}>
                  {utilizationPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 className="chart-title">By Vehicle Type</h3>
            {utilization?.byType && Object.entries(utilization.byType).map(([type, data]) => (
              <div key={type} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--surface-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{type.replace('_', ' ')}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.total} total</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span style={{ color: '#10b981' }}>✓ {data.available} available</span>
                  <span style={{ color: '#3b82f6' }}>▶ {data.onTrip} on trip</span>
                  <span style={{ color: '#f59e0b' }}>⚙ {data.inShop} in shop</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Vehicle ROI */}
      <Section title={<><TrendingUp size={18} /> Vehicle ROI Analysis</>}>
        <div className="chart-card">
          <h3 className="chart-title">ROI by Vehicle (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topROI} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="registrationNumber" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v?.toFixed(2)}%`, 'ROI']} />
              <Bar dataKey="roiPercent" radius={[4, 4, 0, 0]}>
                {topROI.map((entry, i) => <Cell key={i} fill={entry.roiPercent >= 0 ? '#10b981' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ROI Table */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Acquisition Cost</th>
                  <th>Revenue</th>
                  <th>Fuel Cost</th>
                  <th>Maintenance</th>
                  <th>Net Profit</th>
                  <th>ROI %</th>
                </tr>
              </thead>
              <tbody>
                {topROI.map(v => (
                  <tr key={v.vehicleId}>
                    <td>
                      <div className="td-primary">{v.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.registrationNumber}</div>
                    </td>
                    <td>₹{(v.acquisitionCost || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#10b981' }}>₹{(v.revenue || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#f59e0b' }}>₹{(v.fuelCost || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#f59e0b' }}>₹{(v.maintenanceCost || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: v.netProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      ₹{(v.netProfit || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700, color: v.roiPercent >= 0 ? '#10b981' : '#ef4444' }}>
                      {v.roiPercent != null ? `${v.roiPercent.toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Fuel Efficiency */}
      <Section title={<><Fuel size={18} /> Fuel Efficiency</>}>
        <div className="chart-card">
          <h3 className="chart-title">km per Liter by Vehicle</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topFuel} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="registrationNumber" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" km/L" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v?.toFixed(2)} km/L`, 'Efficiency']} />
              <Bar dataKey="fuelEfficiency" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Operational Cost */}
      <Section title={<><Wrench size={18} /> Operational Cost Breakdown</>}>
        <div className="chart-card">
          <h3 className="chart-title">Cost by Vehicle</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={costByVehicle} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="registrationNumber" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, '']} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey="fuelCost" name="Fuel" stackId="a" fill="#3b82f6" />
              <Bar dataKey="maintenanceCost" name="Maintenance" stackId="a" fill="#f59e0b" />
              <Bar dataKey="otherExpenses" name="Other" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {opCost?.totals && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginTop: 16 }}>
            {[
              { label: 'Total Fuel Cost', value: opCost.totals.fuelCost, color: '#3b82f6' },
              { label: 'Total Maintenance', value: opCost.totals.maintenanceCost, color: '#f59e0b' },
              { label: 'Other Expenses', value: opCost.totals.otherExpenses, color: '#8b5cf6' },
              { label: 'Total Fleet Cost', value: opCost.totals.totalFleetCost, color: '#ef4444' },
            ].map(({ label, value, color }) => (
              <div key={label} className="kpi-card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>₹{(value || 0).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
