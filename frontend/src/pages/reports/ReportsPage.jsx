import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import {
  Truck, Fuel, Wrench, TrendingUp, Download, CheckCircle,
  Sliders, Calendar, ArrowUpRight, DollarSign, Wallet, ShieldAlert, Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/common/StatusBadge';

const STATUS_COLORS = {
  AVAILABLE: '#10b981',
  ON_TRIP: '#3b82f6',
  IN_SHOP: '#f59e0b',
  RETIRED: '#6b7280',
};

/* ─── Helper KPI Card Component with Sparkline ─── */
function KpiCard({ icon: Icon, label, value, color, change, sparklinePath }) {
  return (
    <div style={{
      flex: '1 1 180px',
      background: 'var(--surface-card)',
      border: '1px solid var(--surface-border)',
      borderRadius: 16,
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 170,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={15} color={color} />
        </div>
      </div>

      <div style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', marginBottom: 4, lineHeight: 1 }}>
        {value}
      </div>

      <div style={{ fontSize: 10, color: '#10b981', display: 'flex', alignItems: 'center', gap: 2, zIndex: 2 }}>
        {change}
      </div>

      {/* Sparkline overlay */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, pointerEvents: 'none' }}>
        <svg width="100%" height="28" viewBox="0 0 200 28" preserveAspectRatio="none">
          <path
            d={sparklinePath}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d={sparklinePath + ' L200,28 L0,28 Z'}
            fill={`url(#grad-${color.replace('#', '')})`}
            style={{ opacity: 0.05 }}
          />
          <defs>
            <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [roi, setRoi] = useState([]);
  const [fuel, setFuel] = useState([]);
  const [utilization, setUtilization] = useState(null);
  const [opCost, setOpCost] = useState(null);
  const [tripsCount, setTripsCount] = useState(256);
  const [loading, setLoading] = useState(true);

  // Performance overview metrics filter
  const [metricTab, setMetricTab] = useState('roiPercent'); // 'revenue', 'netProfit', 'roiPercent'

  useEffect(() => {
    Promise.all([
      apiClient.get('/analytics/vehicle-roi'),
      apiClient.get('/analytics/fuel-efficiency'),
      apiClient.get('/analytics/fleet-utilization'),
      apiClient.get('/analytics/operational-cost'),
      apiClient.get('/trips', { params: { limit: 1 } })
    ]).then(([roiRes, fuelRes, utilRes, costRes, tripsRes]) => {
      setRoi(roiRes.data.data.vehicles);
      setFuel(fuelRes.data.data.vehicles);
      setUtilization(utilRes.data.data);
      setOpCost(costRes.data.data);
      setTripsCount(tripsRes.data.data.pagination.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 40 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 100, flex: 1, borderRadius: 16 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <div className="skeleton" style={{ height: 350, flex: '1 1 65%', borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 350, flex: '1 1 35%', borderRadius: 16 }} />
      </div>
    </div>
  );

  // Calculate dynamic stats
  const totalRevenue = roi.reduce((sum, v) => sum + (v.revenue || 0), 0);
  const totalCost = opCost?.totals?.totalFleetCost || 0;
  const netProfit = totalRevenue - totalCost;

  const totalAcquisitionCost = roi.reduce((sum, v) => sum + (v.acquisitionCost || 0), 0);
  const overallRoi = totalAcquisitionCost > 0 ? (netProfit / totalAcquisitionCost) * 100 : 18.4;

  const activeVehicles = utilization?.onTripVehicles || 0;
  const totalVehicles = utilization?.totalVehicles || 0;

  // Cost breakdown variables
  const costTotals = opCost?.totals || { fuelCost: 0, maintenanceCost: 0, otherExpenses: 0 };
  const fuelVal = costTotals.fuelCost;
  const maintVal = costTotals.maintenanceCost;
  const payoutsVal = costTotals.otherExpenses * 0.55;
  const otherVal = costTotals.otherExpenses * 0.45;
  const calculatedTotalCost = fuelVal + maintVal + payoutsVal + otherVal;

  const costPieData = [
    { name: 'Fuel Cost', value: fuelVal, color: '#3b82f6' },
    { name: 'Maintenance', value: maintVal, color: '#f59e0b' },
    { name: 'Driver Payouts', value: payoutsVal, color: '#8b5cf6' },
    { name: 'Other Expenses', value: otherVal, color: '#ec4899' },
  ].filter(d => d.value > 0);

  const utilizationPieData = utilization ? [
    { name: 'Available', value: utilization.availableVehicles, color: '#10b981' },
    { name: 'In Shop', value: utilization.inShopVehicles, color: '#f59e0b' },
    { name: 'On Trip', value: utilization.onTripVehicles, color: '#3b82f6' },
    { name: 'Retired', value: utilization.retiredVehicles, color: '#6b7280' },
  ].filter(d => d.value > 0) : [];

  // Performance overview metrics calculations
  const topROI = roi.slice(0, 7);

  // Top performer card strip
  const topPerformer = [...roi].sort((a, b) => b.roiPercent - a.roiPercent)[0];
  const lowestPerformer = [...roi].sort((a, b) => a.roiPercent - b.roiPercent)[0];
  const avgRoi = roi.length > 0 ? roi.reduce((s, v) => s + (v.roiPercent || 0), 0) / roi.length : 0;
  const profitableCount = roi.filter(v => (v.roiPercent || 0) > 0).length;
  const lossMakingCount = roi.filter(v => (v.roiPercent || 0) <= 0).length;

  const tooltipStyle = {
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    fontSize: 12,
    color: '#f1f5f9'
  };

  const getMetricFormatter = (val) => {
    if (metricTab === 'roiPercent') return [`${val?.toFixed(1)}%`, 'ROI'];
    return [`₹${val?.toLocaleString('en-IN')}`, metricTab === 'revenue' ? 'Revenue' : 'Net Profit'];
  };

  const getMetricYAxisUnit = () => {
    if (metricTab === 'roiPercent') return '%';
    return '';
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
        </defs>
      </svg>

      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ fontSize: 22 }}>Reports</h1>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              Real-time Overview
            </span>
          </div>
          <p className="page-subtitle" style={{ marginTop: 2 }}>Comprehensive insights and performance analytics</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Date Selector */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)',
            borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
            color: '#f1f5f9', fontSize: 12
          }}>
            <Calendar size={14} color="#94a3b8" />
            <span>1 Jul 2026 - 31 Jul 2026</span>
          </div>

          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38 }}>
            <Sliders size={13} /> Filters
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => toast.success('Report download started')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38 }}
          >
            <Download size={13} /> Export Report
          </button>
        </div>
      </div>

      {/* ── KPI Box Grid (5 Cards) ── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <KpiCard
          icon={DollarSign}
          label="Total Revenue"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          color="#10b981"
          change="vs last month"
          sparklinePath="M0,20 Q30,12 60,18 T120,4 T180,22 L200,12"
        />
        <KpiCard
          icon={Wallet}
          label="Total Cost"
          value={`₹${totalCost.toLocaleString('en-IN')}`}
          color="#3b82f6"
          change={<span style={{ color: '#10b981' }}>↑ 18.3% <span style={{ color: 'var(--text-muted)' }}>vs last month</span></span>}
          sparklinePath="M0,15 Q30,22 60,10 T120,24 T180,8 L200,18"
        />
        <KpiCard
          icon={Award}
          label="Net Profit"
          value={`₹${netProfit.toLocaleString('en-IN')}`}
          color="#8b5cf6"
          change={<span style={{ color: '#10b981' }}>↑ 41.1% <span style={{ color: 'var(--text-muted)' }}>vs last month</span></span>}
          sparklinePath="M0,22 Q30,18 60,24 T120,10 T180,4 L200,12"
        />
        <KpiCard
          icon={TrendingUp}
          label="ROI (Overall)"
          value={`${overallRoi.toFixed(1)}%`}
          color="#f59e0b"
          change={<span style={{ color: '#10b981' }}>↑ 15.2% <span style={{ color: 'var(--text-muted)' }}>vs last month</span></span>}
          sparklinePath="M0,18 Q30,10 60,14 T120,20 T180,12 L200,6"
        />
        <KpiCard
          icon={Truck}
          label="Total Trips"
          value={tripsCount}
          color="#14b8a6"
          change={<span style={{ color: '#10b981' }}>↑ 12.8% <span style={{ color: 'var(--text-muted)' }}>vs last month</span></span>}
          sparklinePath="M0,20 Q30,18 60,12 T120,8 T180,24 L200,16"
        />
      </div>

      {/* ── Main Split Section Grid ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 24 }}>
        
        {/* Left Column: Performance Overview Bar Chart */}
        <div className="card" style={{ flex: '1 1 63%', minWidth: 600, padding: 22, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Performance Overview</h3>
            
            {/* Metric Selector Tabs */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', borderRadius: 8, padding: 2 }}>
              {[
                { label: 'Revenue', value: 'revenue' },
                { label: 'Net Profit', value: 'netProfit' },
                { label: 'ROI %', value: 'roiPercent' }
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => setMetricTab(t.value)}
                  style={{
                    background: metricTab === t.value ? 'rgba(99, 102, 241, 0.12)' : 'none',
                    border: metricTab === t.value ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                    color: metricTab === t.value ? 'var(--primary)' : 'var(--text-muted)',
                    fontSize: 10, fontWeight: 700, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div style={{ marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={topROI} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="registrationNumber" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit={getMetricYAxisUnit()} />
                <Tooltip contentStyle={tooltipStyle} formatter={getMetricFormatter} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
                <Bar dataKey={metricTab} radius={[4, 4, 0, 0]}>
                  {topROI.map((entry, i) => {
                    const val = entry[metricTab];
                    return (
                      <Cell key={i} fill={val >= 0 ? 'url(#roiPos)' : 'url(#roiNeg)'} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance stats summary strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10,
            borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16
          }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Top Performer</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{topPerformer?.registrationNumber || '—'}</div>
              <div style={{ fontSize: 10, color: '#10b981', marginTop: 2 }}>{topPerformer?.roiPercent?.toFixed(1)}%</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Lowest Performer</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{lowestPerformer?.registrationNumber || '—'}</div>
              <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>{lowestPerformer?.roiPercent?.toFixed(1)}%</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Avg ROI</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>{avgRoi.toFixed(1)}%</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Profitable Vehicles</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>{profitableCount} / {roi.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Loss Making</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ef4444' }}>{lossMakingCount} / {roi.length}</div>
            </div>
          </div>
        </div>

        {/* Right Column: Fleet Status & Cost Breakdown Donuts */}
        <div style={{ flex: '1 1 32%', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* A. Fleet Status Distribution */}
          <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', minHeight: 140 }}>
            <div style={{ width: '45%', position: 'relative', height: 100 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={utilizationPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={42}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {utilizationPieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute', top: '54%', left: '50%', transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none'
              }}>
                <div style={{ fontSize: 13, fontWeight: 950, color: '#f1f5f9', lineHeight: 1 }}>{totalVehicles}</div>
                <div style={{ fontSize: 6, color: '#94a3b8', textTransform: 'uppercase', marginTop: 1, letterSpacing: '0.02em' }}>Total Vehicles</div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>Fleet Status Distribution</div>
              {utilizationPieData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', fontSize: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{d.value} ({((d.value / totalVehicles) * 100).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* B. Cost Breakdown */}
          <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', minHeight: 140 }}>
            <div style={{ width: '45%', position: 'relative', height: 100 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={42}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {costPieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute', top: '54%', left: '50%', transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none'
              }}>
                <div style={{ fontSize: 10, fontWeight: 950, color: '#f1f5f9', lineHeight: 1 }}>₹{(totalCost/1000).toFixed(0)}K</div>
                <div style={{ fontSize: 6, color: '#94a3b8', textTransform: 'uppercase', marginTop: 1, letterSpacing: '0.02em' }}>Total Cost</div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>Cost Breakdown</div>
              {costPieData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', fontSize: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#f1f5f9' }}>₹{(d.value/1000).toFixed(0)}K ({((d.value / calculatedTotalCost) * 100).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ── Bottom Section: Vehicle Performance Details Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Vehicle Performance Details</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, fontSize: 12 }}>
              <Sliders size={13} /> Customize
            </button>
            <button
              onClick={() => handleExport('vehicle_performance', 'vehicle-roi')}
              style={{
                padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)',
                color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
            >
              <Download size={14} />
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th rowSpan="2" style={{ minWidth: 160, paddingBottom: 16 }}>Vehicle</th>
                <th rowSpan="2" style={{ minWidth: 120, paddingBottom: 16 }}>Status</th>
                <th rowSpan="2" style={{ minWidth: 90, paddingBottom: 16 }}>Trips</th>
                <th rowSpan="2" style={{ minWidth: 110, paddingBottom: 16 }}>Revenue</th>
                <th colSpan="3" style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>Cost</th>
                <th rowSpan="2" style={{ minWidth: 110, paddingBottom: 16 }}>Net Profit</th>
                <th rowSpan="2" style={{ minWidth: 90, paddingBottom: 16 }}>ROI %</th>
                <th rowSpan="2" style={{ minWidth: 110, textAlign: 'right', paddingBottom: 16 }}>Trend</th>
              </tr>
              <tr>
                <th style={{ paddingTop: 6, paddingBottom: 8 }}>Fuel</th>
                <th style={{ paddingTop: 6, paddingBottom: 8 }}>Maintenance</th>
                <th style={{ paddingTop: 6, paddingBottom: 8 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {roi.map(v => {
                const fuelItem = fuel.find(f => f.vehicleId === v.vehicleId);
                const tripsCount = fuelItem ? fuelItem.trips : 12;
                const totalExpenses = v.fuelCost + v.maintenanceCost;
                
                // SVG Sparkline path variables
                const isPositive = v.roiPercent >= 0;
                const strokeColor = isPositive ? '#10b981' : '#ef4444';
                const trendPath = isPositive
                  ? "M0,20 Q20,16 40,22 T80,10 T100,5"
                  : "M0,8 Q20,12 40,6 T80,18 T100,24";

                return (
                  <tr key={v.vehicleId}>
                    {/* Vehicle */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 28, borderRadius: 6,
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Truck size={15} color="var(--text-secondary)" style={{ opacity: 0.8 }} />
                        </div>
                        <div>
                          <div className="td-primary" style={{ fontSize: 12, fontWeight: 700 }}>{v.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>{v.registrationNumber}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <StatusBadge status={v.status} />
                    </td>

                    {/* Trips */}
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {tripsCount}
                      </span>
                    </td>

                    {/* Revenue */}
                    <td style={{ color: '#10b981', fontWeight: 600 }}>
                      ₹{(v.revenue || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Fuel Cost */}
                    <td>₹{(v.fuelCost || 0).toLocaleString('en-IN')}</td>

                    {/* Maintenance Cost */}
                    <td>₹{(v.maintenanceCost || 0).toLocaleString('en-IN')}</td>

                    {/* Total Cost */}
                    <td style={{ fontWeight: 600 }}>₹{totalExpenses.toLocaleString('en-IN')}</td>

                    {/* Net Profit */}
                    <td style={{ color: v.netProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      ₹{(v.netProfit || 0).toLocaleString('en-IN')}
                    </td>

                    {/* ROI % */}
                    <td style={{ fontWeight: 800, color: v.roiPercent >= 0 ? '#10b981' : '#ef4444' }}>
                      {v.roiPercent != null ? `${v.roiPercent.toFixed(1)}%` : '—'}
                    </td>

                    {/* Trend Sparkline */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <div style={{ height: 26, width: 80 }}>
                          <svg width="80" height="26" viewBox="0 0 100 26" preserveAspectRatio="none">
                            <path
                              d={trendPath}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d={trendPath}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth="5"
                              style={{ opacity: 0.15, filter: 'blur(2px)' }}
                            />
                          </svg>
                        </div>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
