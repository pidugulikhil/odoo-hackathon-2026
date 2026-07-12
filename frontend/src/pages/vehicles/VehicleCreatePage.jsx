import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { ArrowLeft, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

const VEHICLE_TYPES = ['TRUCK', 'VAN', 'BUS', 'MINI_TRUCK', 'TRAILER', 'OTHER'];

export default function VehicleCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    registrationNumber: '', name: '', model: '', type: 'TRUCK',
    maxLoadCapacity: '', odometer: '0', acquisitionCost: '', region: '',
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.registrationNumber.trim()) e.registrationNumber = 'Required';
    if (!form.name.trim()) e.name = 'Required';
    if (!form.model.trim()) e.model = 'Required';
    if (!form.maxLoadCapacity || parseFloat(form.maxLoadCapacity) <= 0) e.maxLoadCapacity = 'Must be > 0';
    if (parseFloat(form.odometer) < 0) e.odometer = 'Cannot be negative';
    if (form.acquisitionCost && parseFloat(form.acquisitionCost) < 0) e.acquisitionCost = 'Cannot be negative';
    if (!form.region.trim()) e.region = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/vehicles', {
        ...form,
        maxLoadCapacity: parseFloat(form.maxLoadCapacity),
        odometer: parseFloat(form.odometer) || 0,
        acquisitionCost: parseFloat(form.acquisitionCost) || 0,
      });
      toast.success('Vehicle created successfully!');
      navigate(`/vehicles/${res.data.data.vehicle.id}`);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to create vehicle';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inp = (field, type = 'text', placeholder = '') => (
    <div>
      <input
        id={`vehicle-${field}`}
        type={type}
        className="form-control"
        placeholder={placeholder}
        value={form[field]}
        onChange={set(field)}
        style={errors[field] ? { borderColor: '#ef4444' } : {}}
      />
      {errors[field] && <div className="form-error">{errors[field]}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/vehicles')}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title">Add Vehicle</h1>
            <p className="page-subtitle">Register a new vehicle to your fleet</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Registration Number *</label>
              {inp('registrationNumber', 'text', 'e.g. MH-01-TRK-001')}
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle Name *</label>
              {inp('name', 'text', 'e.g. Tata Prima')}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Model *</label>
              {inp('model', 'text', 'e.g. Prima 4028.S')}
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle Type *</label>
              <select id="vehicle-type" className="form-control" value={form.type} onChange={set('type')}>
                {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Max Load Capacity (kg) *</label>
              {inp('maxLoadCapacity', 'number', 'e.g. 5000')}
            </div>
            <div className="form-group">
              <label className="form-label">Current Odometer (km)</label>
              {inp('odometer', 'number', '0')}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Acquisition Cost (₹)</label>
              {inp('acquisitionCost', 'number', 'e.g. 3500000')}
            </div>
            <div className="form-group">
              <label className="form-label">Region *</label>
              {inp('region', 'text', 'e.g. Maharashtra')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/vehicles')}>Cancel</button>
            <button id="create-vehicle-btn" type="submit" className="btn btn-primary" disabled={loading}>
              <Truck size={14} /> {loading ? 'Creating...' : 'Create Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
