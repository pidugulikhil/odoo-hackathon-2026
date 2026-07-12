import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { ArrowLeft, Users, Shield, Phone, Mail, MapPin, Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['HGV', 'LMV', 'HTV', 'PSV', 'MCWG'];

const FIELD_HINTS = {
  licenseCategory: {
    HGV: 'Heavy Goods Vehicle — trucks above 7.5 tonnes',
    LMV: 'Light Motor Vehicle — cars, vans up to 7.5 tonnes',
    HTV: 'Heavy Transport Vehicle — buses & heavy transport',
    PSV: 'Public Service Vehicle — passenger transport',
    MCWG: 'Motorcycle With Gear',
  }
};

function FormField({ label, icon, error, children, hint }) {
  return (
    <div className="form-group">
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ color: 'var(--text-muted)' }}>{icon}</span>}
        {label}
      </label>
      {children}
      {hint && !error && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
      {error && <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={11} />{error}</div>}
    </div>
  );
}

export default function DriverCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    licenseNumber: '',
    licenseCategory: 'HGV',
    licenseExpiryDate: '',
    contactNumber: '',
    email: '',
    safetyScore: 100,
    region: '',
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Driver name is required';
    if (!form.licenseNumber.trim()) e.licenseNumber = 'License number is required';
    if (!form.licenseExpiryDate) e.licenseExpiryDate = 'Expiry date is required';
    if (!form.contactNumber.trim()) e.contactNumber = 'Contact number is required';
    if (!/^\d{10}$/.test(form.contactNumber.replace(/\s/g, ''))) e.contactNumber = 'Enter a valid 10-digit number';
    if (!form.region.trim()) e.region = 'Region is required';
    const score = parseFloat(form.safetyScore);
    if (isNaN(score) || score < 0 || score > 100) e.safetyScore = 'Must be between 0 and 100';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/drivers', {
        ...form,
        licenseNumber: form.licenseNumber.trim().toUpperCase(),
        safetyScore: parseFloat(form.safetyScore),
      });
      toast.success('Driver registered successfully!');
      navigate(`/drivers/${res.data.data.driver.id}`);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to create driver';
      toast.error(msg);
      if (msg.toLowerCase().includes('license')) {
        setErrors(p => ({ ...p, licenseNumber: 'This license number is already registered' }));
      }
    } finally {
      setLoading(false);
    }
  };

  // Compute preview license status
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = form.licenseExpiryDate ? new Date(form.licenseExpiryDate) : null;
  const expiryStatus = expiry
    ? expiry < today ? 'EXPIRED' : expiry <= new Date(today.getTime() + 30 * 86400000) ? 'EXPIRING_SOON' : 'VALID'
    : null;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/drivers')} style={{ padding: '8px 10px' }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(16,185,129,0.2)'
            }}>
              <Users size={20} color="#fff" />
            </div>
            <div>
              <h1 className="page-title">Add Driver</h1>
              <p className="page-subtitle">Register a new driver in the fleet</p>
            </div>
          </div>
        </div>
      </div>

      {/* License Expiry Warning Preview */}
      {expiryStatus === 'EXPIRED' && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <AlertCircle size={16} />
          Warning: The expiry date you entered is in the past — this driver will be flagged as having an expired license.
        </div>
      )}
      {expiryStatus === 'EXPIRING_SOON' && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <AlertCircle size={16} />
          Warning: This license expires within 30 days and will be marked as "Expiring Soon."
        </div>
      )}

      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit} noValidate>
          {/* Section: Identity */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--surface-border)' }}>
              Personal Details
            </div>
            <div className="form-row">
              <FormField label="Full Name *" icon={<Users size={13} />} error={errors.name}>
                <input
                  id="driver-name"
                  className="form-control"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  onChange={set('name')}
                  style={errors.name ? { borderColor: '#ef4444' } : {}}
                />
              </FormField>
              <FormField label="Region *" icon={<MapPin size={13} />} error={errors.region}>
                <input
                  id="driver-region"
                  className="form-control"
                  placeholder="e.g. Maharashtra"
                  value={form.region}
                  onChange={set('region')}
                  style={errors.region ? { borderColor: '#ef4444' } : {}}
                />
              </FormField>
            </div>
            <div className="form-row">
              <FormField label="Contact Number *" icon={<Phone size={13} />} error={errors.contactNumber}>
                <input
                  id="driver-contact"
                  className="form-control"
                  placeholder="10-digit mobile number"
                  value={form.contactNumber}
                  onChange={set('contactNumber')}
                  style={errors.contactNumber ? { borderColor: '#ef4444' } : {}}
                  maxLength={10}
                />
              </FormField>
              <FormField label="Email" icon={<Mail size={13} />} error={errors.email} hint="Optional — for notifications">
                <input
                  id="driver-email"
                  className="form-control"
                  type="email"
                  placeholder="driver@example.com"
                  value={form.email}
                  onChange={set('email')}
                  style={errors.email ? { borderColor: '#ef4444' } : {}}
                />
              </FormField>
            </div>
          </div>

          {/* Section: License */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--surface-border)' }}>
              License Information
            </div>
            <div className="form-row">
              <FormField label="License Number *" icon={<Shield size={13} />} error={errors.licenseNumber} hint="Will be saved in uppercase">
                <input
                  id="driver-license-number"
                  className="form-control"
                  placeholder="e.g. MH-14-2021-0012345"
                  value={form.licenseNumber}
                  onChange={set('licenseNumber')}
                  style={{ fontFamily: 'monospace', ...errors.licenseNumber ? { borderColor: '#ef4444' } : {} }}
                />
              </FormField>
              <FormField label="License Category *" icon={<Shield size={13} />} hint={FIELD_HINTS.licenseCategory[form.licenseCategory]}>
                <select
                  id="driver-license-category"
                  className="form-control"
                  value={form.licenseCategory}
                  onChange={set('licenseCategory')}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
            </div>
            <div className="form-row">
              <FormField label="License Expiry Date *" icon={<Calendar size={13} />} error={errors.licenseExpiryDate}
                hint={expiryStatus === 'VALID' ? '✓ Valid license date' : ''}>
                <input
                  id="driver-license-expiry"
                  className="form-control"
                  type="date"
                  value={form.licenseExpiryDate}
                  onChange={set('licenseExpiryDate')}
                  style={errors.licenseExpiryDate ? { borderColor: '#ef4444' } : expiryStatus === 'VALID' ? { borderColor: '#10b981' } : {}}
                />
              </FormField>
              <FormField label="Safety Score (0–100)" error={errors.safetyScore} hint="Default 100 — adjustable after trips">
                <div style={{ position: 'relative' }}>
                  <input
                    id="driver-safety-score"
                    className="form-control"
                    type="number"
                    min="0"
                    max="100"
                    value={form.safetyScore}
                    onChange={set('safetyScore')}
                    style={errors.safetyScore ? { borderColor: '#ef4444' } : {}}
                  />
                </div>
                <div className="progress-bar" style={{ marginTop: 6 }}>
                  <div className="progress-fill" style={{
                    width: `${Math.min(100, Math.max(0, form.safetyScore))}%`,
                    background: form.safetyScore >= 80 ? '#10b981' : form.safetyScore >= 60 ? '#f59e0b' : '#ef4444'
                  }} />
                </div>
              </FormField>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--surface-border)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/drivers')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              id="create-driver-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <Users size={14} />
              {loading ? 'Registering…' : 'Register Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
