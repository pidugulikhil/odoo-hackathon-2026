import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { ArrowLeft, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MaintenanceCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ vehicleId: '', type: '', description: '', cost: '', technician: '' });
  const [errors, setErrors] = useState({});
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  useEffect(() => {
    apiClient.get('/vehicles', { params: { limit: 100 } }).then(res => {
      setVehicles(res.data.data.vehicles.filter(v => v.status !== 'RETIRED'));
    });
  }, []);

  const validate = () => {
    const e = {};
    if (!form.vehicleId) e.vehicleId = 'Required';
    if (!form.type.trim()) e.type = 'Required';
    if (!form.description.trim()) e.description = 'Required';
    if (form.cost && parseFloat(form.cost) < 0) e.cost = 'Cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/maintenance', {
        ...form, vehicleId: parseInt(form.vehicleId), cost: parseFloat(form.cost) || 0,
      });
      toast.success('Maintenance record created');
      navigate(`/maintenance/${res.data.data.maintenance.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/maintenance')}><ArrowLeft size={16} /></button>
          <div><h1 className="page-title">New Maintenance</h1><p className="page-subtitle">Log a maintenance record</p></div>
        </div>
      </div>
      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            <select className="form-control" value={form.vehicleId} onChange={set('vehicleId')} style={errors.vehicleId ? { borderColor: '#ef4444' } : {}}>
              <option value="">Select vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registrationNumber} — {v.name} ({v.status})</option>)}
            </select>
            {errors.vehicleId && <div className="form-error">{errors.vehicleId}</div>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Maintenance Type *</label>
              <input className="form-control" placeholder="e.g. Oil Change, Tyre Replacement" value={form.type} onChange={set('type')} style={errors.type ? { borderColor: '#ef4444' } : {}} />
              {errors.type && <div className="form-error">{errors.type}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Cost (₹)</label>
              <input className="form-control" type="number" value={form.cost} onChange={set('cost')} />
              {errors.cost && <div className="form-error">{errors.cost}</div>}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-control" rows={3} placeholder="Describe the maintenance work..." value={form.description} onChange={set('description')} style={errors.description ? { borderColor: '#ef4444' } : {}} />
            {errors.description && <div className="form-error">{errors.description}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Technician</label>
            <input className="form-control" placeholder="Technician or garage name" value={form.technician} onChange={set('technician')} />
          </div>
          <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 13 }}>
            ℹ️ Record will be created as <strong>DRAFT</strong>. Activate it to set the vehicle to IN_SHOP.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/maintenance')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Wrench size={14} /> {loading ? 'Creating...' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
