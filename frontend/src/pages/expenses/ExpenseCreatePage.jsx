import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { ArrowLeft, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

const EXPENSE_TYPES = ['TOLL', 'PARKING', 'REPAIR', 'FINE', 'INSURANCE', 'OTHER'];

export default function ExpenseCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [form, setForm] = useState({ vehicleId: '', tripId: '', type: 'TOLL', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  useEffect(() => {
    apiClient.get('/vehicles', { params: { limit: 100 } }).then(res => setVehicles(res.data.data.vehicles.filter(v => v.status !== 'RETIRED')));
    apiClient.get('/trips', { params: { limit: 50 } }).then(res => setTrips(res.data.data.trips));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicleId || !form.amount || !form.date) { toast.error('Fill required fields'); return; }
    setLoading(true);
    try {
      await apiClient.post('/expenses', {
        vehicleId: parseInt(form.vehicleId),
        tripId: form.tripId ? parseInt(form.tripId) : undefined,
        type: form.type, description: form.description,
        amount: parseFloat(form.amount), date: form.date,
      });
      toast.success('Expense added');
      navigate('/expenses');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/expenses')}><ArrowLeft size={16} /></button>
          <div><h1 className="page-title">Add Expense</h1></div>
        </div>
      </div>
      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vehicle *</label>
              <select className="form-control" value={form.vehicleId} onChange={set('vehicleId')}>
                <option value="">Select vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Expense Type *</label>
              <select className="form-control" value={form.type} onChange={set('type')}>
                {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Amount (₹) *</label><input className="form-control" type="number" value={form.amount} onChange={set('amount')} placeholder="e.g. 500" /></div>
            <div className="form-group"><label className="form-label">Date *</label><input className="form-control" type="date" value={form.date} onChange={set('date')} /></div>
          </div>
          <div className="form-group">
            <label className="form-label">Trip (optional)</label>
            <select className="form-control" value={form.tripId} onChange={set('tripId')}>
              <option value="">No trip</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.tripNumber}: {t.source}→{t.destination}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-control" value={form.description} onChange={set('description')} placeholder="Optional notes" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/expenses')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}><Receipt size={14} /> {loading ? 'Saving...' : 'Add Expense'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
