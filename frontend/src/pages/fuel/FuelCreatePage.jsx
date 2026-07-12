import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { ArrowLeft, Fuel } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FuelCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [form, setForm] = useState({ vehicleId: '', tripId: '', liters: '', cost: '', date: new Date().toISOString().split('T')[0], odometer: '' });
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  useEffect(() => {
    apiClient.get('/vehicles', { params: { limit: 100 } }).then(res => setVehicles(res.data.data.vehicles.filter(v => v.status !== 'RETIRED')));
    apiClient.get('/trips', { params: { status: 'DISPATCHED', limit: 50 } }).then(res => setTrips(res.data.data.trips));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicleId || !form.liters || !form.cost || !form.date) { toast.error('Fill required fields'); return; }
    setLoading(true);
    try {
      await apiClient.post('/fuel', {
        vehicleId: parseInt(form.vehicleId),
        tripId: form.tripId ? parseInt(form.tripId) : undefined,
        liters: parseFloat(form.liters), cost: parseFloat(form.cost),
        date: form.date, odometer: form.odometer ? parseFloat(form.odometer) : undefined,
      });
      toast.success('Fuel log added');
      navigate('/fuel');
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
          <button className="btn btn-ghost" onClick={() => navigate('/fuel')}><ArrowLeft size={16} /></button>
          <div><h1 className="page-title">Add Fuel Log</h1></div>
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
              <label className="form-label">Trip (optional)</label>
              <select className="form-control" value={form.tripId} onChange={set('tripId')}>
                <option value="">No trip</option>
                {trips.map(t => <option key={t.id} value={t.id}>{t.tripNumber}: {t.source}→{t.destination}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Liters *</label><input className="form-control" type="number" step="0.1" value={form.liters} onChange={set('liters')} placeholder="e.g. 45.5" /></div>
            <div className="form-group"><label className="form-label">Total Cost (₹) *</label><input className="form-control" type="number" value={form.cost} onChange={set('cost')} placeholder="e.g. 5000" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Date *</label><input className="form-control" type="date" value={form.date} onChange={set('date')} /></div>
            <div className="form-group"><label className="form-label">Odometer Reading (km)</label><input className="form-control" type="number" value={form.odometer} onChange={set('odometer')} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/fuel')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}><Fuel size={14} /> {loading ? 'Saving...' : 'Add Log'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
