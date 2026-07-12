import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { ArrowLeft, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['HGV', 'LMV', 'HTV', 'PSV', 'MCWG'];

export default function DriverCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', licenseNumber: '', licenseCategory: 'HGV',
    licenseExpiryDate: '', contactNumber: '', email: '',
    safetyScore: 100, region: '',
  });
  const [errors, setErrors] = useState({});
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.licenseNumber.trim()) e.licenseNumber = 'Required';
    if (!form.licenseExpiryDate) e.licenseExpiryDate = 'Required';
    if (!form.contactNumber.trim()) e.contactNumber = 'Required';
    if (!form.region.trim()) e.region = 'Required';
    if (form.safetyScore < 0 || form.safetyScore > 100) e.safetyScore = '0–100';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/drivers', { ...form, safetyScore: parseFloat(form.safetyScore) });
      toast.success('Driver created successfully!');
      navigate(`/drivers/${res.data.data.driver.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create driver');
    } finally {
      setLoading(false);
    }
  };

  const inp = (field, type = 'text', placeholder = '') => (
    <div>
      <input
        id={`driver-${field}`}
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
          <button className="btn btn-ghost" onClick={() => navigate('/drivers')}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title">Add Driver</h1>
            <p className="page-subtitle">Register a new driver</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              {inp('name', 'text', 'Driver full name')}
            </div>
            <div className="form-group">
              <label className="form-label">License Number *</label>
              {inp('licenseNumber', 'text', 'e.g. MH-DL-001-2021')}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">License Category *</label>
              <select className="form-control" value={form.licenseCategory} onChange={set('licenseCategory')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">License Expiry Date *</label>
              {inp('licenseExpiryDate', 'date')}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Contact Number *</label>
              {inp('contactNumber', 'text', '10-digit mobile')}
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              {inp('email', 'email', 'optional')}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Safety Score (0–100)</label>
              {inp('safetyScore', 'number', '100')}
            </div>
            <div className="form-group">
              <label className="form-label">Region *</label>
              {inp('region', 'text', 'e.g. Maharashtra')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/drivers')}>Cancel</button>
            <button id="create-driver-btn" type="submit" className="btn btn-primary" disabled={loading}>
              <Users size={14} /> {loading ? 'Creating...' : 'Create Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
