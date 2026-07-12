import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const VEHICLE_TYPES = ['TRUCK', 'VAN', 'BUS', 'MINI_TRUCK', 'TRAILER', 'OTHER'];

export default function VehicleEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    registrationNumber: '', name: '', model: '', type: 'TRUCK',
    maxLoadCapacity: '', odometer: '', acquisitionCost: '', region: '',
  });

  useEffect(() => {
    apiClient.get(`/vehicles/${id}`).then(res => {
      const v = res.data.data.vehicle;
      setForm({
        registrationNumber: v.registrationNumber,
        name: v.name, model: v.model, type: v.type,
        maxLoadCapacity: v.maxLoadCapacity, odometer: v.odometer,
        acquisitionCost: v.acquisitionCost, region: v.region,
      });
    }).catch(() => { toast.error('Vehicle not found'); navigate('/vehicles'); })
    .finally(() => setFetching(false));
  }, [id]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.put(`/vehicles/${id}`, {
        ...form,
        maxLoadCapacity: parseFloat(form.maxLoadCapacity),
        odometer: parseFloat(form.odometer),
        acquisitionCost: parseFloat(form.acquisitionCost),
      });
      toast.success('Vehicle updated successfully!');
      navigate(`/vehicles/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate(`/vehicles/${id}`)}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title">Edit Vehicle</h1>
            <p className="page-subtitle">{form.registrationNumber}</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Registration Number</label>
              <input className="form-control" value={form.registrationNumber} onChange={set('registrationNumber')} />
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle Name</label>
              <input className="form-control" value={form.name} onChange={set('name')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Model</label>
              <input className="form-control" value={form.model} onChange={set('model')} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-control" value={form.type} onChange={set('type')}>
                {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Max Load Capacity (kg)</label>
              <input className="form-control" type="number" value={form.maxLoadCapacity} onChange={set('maxLoadCapacity')} />
            </div>
            <div className="form-group">
              <label className="form-label">Odometer (km)</label>
              <input className="form-control" type="number" value={form.odometer} onChange={set('odometer')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Acquisition Cost (₹)</label>
              <input className="form-control" type="number" value={form.acquisitionCost} onChange={set('acquisitionCost')} />
            </div>
            <div className="form-group">
              <label className="form-label">Region</label>
              <input className="form-control" value={form.region} onChange={set('region')} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/vehicles/${id}`)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
