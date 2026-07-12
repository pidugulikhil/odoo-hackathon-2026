import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { Truck, Fuel, Wrench, TrendingUp, Download, CheckCircle, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function Section({ title, onExport, exporting, children }) {
  return (
    <div style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--surface-border)',
      borderRadius: 16,
      padding: 24,
      marginBottom: 32,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: '#f1f5f9' }}>
          {title}
        </h2>
        {onExport && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onExport}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, fontSize: 12 }}
          >
            <Download size={13} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        )}
      </div>
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
  const [exportingSec, setExportingSec] = useState({});

  const handleExport = async (reportName, endpoint) => {
    setExportingSec(prev => ({ ...prev, [reportName]: true }));
    try {
      const res = await apiClient.get(`/analytics/${endpoint}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName}_report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    } catch {
      toast.error('Export failed');
    } finally {
      setExportingSec(prev => ({ ...prev, [reportName]: false }));
    }
  };

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
      <div className="skeleton" style={{ height: 40, width: 250, marginBottom: 20, borderRadius: 8 }} />
      <div className="skeleton" style={{ height: 280, marginBottom: 20, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
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

  const tooltipStyle = {
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    fontSize: 12,
    color: '#f1f5f9'
  };

  return (
    <div>
      {/* SVG Color Gradients definitions for premium charts UI */}
      <svg style={{ height: 0, width: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="roiPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.85}/>
            <stop offset="100%" stopColor="#059669" stopOpacity={0.25}/>
          </linearGradient>
          <linearGradient id="roiNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.85}/>
            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.25}/>
          </linearGradient>
          <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.85}/>
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.25}/>
          </linearGradient>
          <linearGradient id="maintGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.85}/>
            <stop offset="100%" stopColor="#d97706" stopOpacity={0.25}/>
          </linearGradient>
          <linearGradient id="otherGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.85}/>
            <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.25}/>
          </linearGradient>
        </defs>
      </svg>

      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="page-title" style={{ fontSize: 22 }}>Reports & Analytics</h1>
          <CheckCircle size={18} color="#10b981" style={{ marginTop: 4 }} />
        </div>
      </div>

      {/* ── 1. Fleet Utilization ── */}
      <Section title={<><Truck size={16} /> Fleet Utilization</>} onExport={() => handleExport('fleet_utilization', 'fleet-utilization')} exporting={exportingSec.fleet_utilization}>
        <div className="content-grid" style={{ gap: 20 }}>
          <div style={{
            background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)',
            borderRadius: 12, padding: 18, flex: '1 1 45%'
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Fleet Status Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={utilizationPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" paddingAngle={2.5}>
                  {utilizationPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 45%' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>By Vehicle Type</h3>
            {utilization?.byType && Object.entries(utilization.byType).map(([type, data]) => (
              <div key={type} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--surface-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#f1f5f9' }}>{type.replace('_', ' ')}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.total} total</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>✓ {data.available} available</span>
                  <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>▶ {data.onTrip} on trip</span>
                  <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>⚙ {data.inShop} in shop</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 2. Vehicle ROI Analysis ── */}
      <Section title={<><TrendingUp size={16} /> Vehicle ROI Analysis</>} onExport={() => handleExport('vehicle_roi', 'vehicle-roi')} exporting={exportingSec.vehicle_roi}>
        <div style={{
          background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: 12, padding: 18, marginBottom: 18
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>ROI by Vehicle (%)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topROI} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="registrationNumber" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v?.toFixed(2)}%`, 'ROI']} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
              <Bar dataKey="roiPercent" radius={[4, 4, 0, 0]}>
                {topROI.map((entry, i) => (
                  <Cell key={i} fill={entry.roiPercent >= 0 ? 'url(#roiPos)' : 'url(#roiNeg)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ROI Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 150 }}>Vehicle</th>
                  <th style={{ minWidth: 120 }}>Acquisition Cost</th>
                  <th style={{ minWidth: 110 }}>Revenue</th>
                  <th style={{ minWidth: 110 }}>Fuel Cost</th>
                  <th style={{ minWidth: 110 }}>Maintenance</th>
                  <th style={{ minWidth: 120 }}>Net Profit</th>
                  <th style={{ minWidth: 90, textAlign: 'right' }}>ROI %</th>
                </tr>
              </thead>
              <tbody>
                {topROI.map(v => (
                  <tr key={v.vehicleId}>
                    <td>
                      <div className="td-primary" style={{ fontSize: 12, fontWeight: 700 }}>{v.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>{v.registrationNumber}</div>
                    </td>
                    <td>₹{(v.acquisitionCost || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>₹{(v.revenue || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#f59e0b' }}>₹{(v.fuelCost || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#f59e0b' }}>₹{(v.maintenanceCost || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: v.netProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      ₹{(v.netProfit || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 800, color: v.roiPercent >= 0 ? '#10b981' : '#ef4444', textAlign: 'right' }}>
                      {v.roiPercent != null ? `${v.roiPercent.toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ── 3. Fuel Efficiency ── */}
      <Section title={<><Fuel size={16} /> Fuel Efficiency</>} onExport={() => handleExport('fuel_efficiency', 'fuel-efficiency')} exporting={exportingSec.fuel_efficiency}>
        <div style={{
          background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: 12, padding: 18
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>km per Liter by Vehicle</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topFuel} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="registrationNumber" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" km/L" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v?.toFixed(2)} km/L`, 'Efficiency']} />
              <Bar dataKey="fuelEfficiency" fill="url(#fuelGrad)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ── 4. Operational Cost Breakdown ── */}
      <Section title={<><Wrench size={16} /> Operational Cost Breakdown</>} onExport={() => handleExport('operational_cost', 'operational-cost')} exporting={exportingSec.operational_cost}>
        <div style={{
          background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: 12, padding: 18, marginBottom: 18
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Cost by Vehicle</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={costByVehicle} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="registrationNumber" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, '']} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }} />
              <Bar dataKey="fuelCost" name="Fuel" stackId="a" fill="url(#fuelGrad)" />
              <Bar dataKey="maintenanceCost" name="Maintenance" stackId="a" fill="url(#maintGrad)" />
              <Bar dataKey="otherExpenses" name="Other" stackId="a" fill="url(#otherGrad)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {opCost?.totals && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { label: 'Total Fuel Cost', value: opCost.totals.fuelCost, color: '#3b82f6' },
              { label: 'Total Maintenance', value: opCost.totals.maintenanceCost, color: '#f59e0b' },
              { label: 'Other Expenses', value: opCost.totals.otherExpenses, color: '#8b5cf6' },
              { label: 'Total Fleet Cost', value: opCost.totals.totalFleetCost, color: '#ef4444' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
                borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.02em' }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>₹{(value || 0).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
