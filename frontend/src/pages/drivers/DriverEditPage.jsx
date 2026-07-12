import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { ArrowLeft, Users, Shield, Phone, Mail, MapPin, Calendar, AlertCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['HGV', 'LMV', 'HTV', 'PSV', 'MCWG'];

function FormField({ label, error, children, hint }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {hint && !error && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
      {error && (
        <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={11} /> {error}
        </div>
      )}
    </div>
  );
}

export default function DriverEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState({
    name: '', licenseNumber: '', licenseCategory: 'HGV',
    licenseExpiryDate: '', contactNumber: '', email: '',
    safetyScore: 100, region: '',
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  useEffect(() => {
    apiClient.get(`/drivers/${id}`)
      .then(res => {
        const d = res.data.data.driver;
        setOriginal(d);
        setForm({
          name: d.name,
          licenseNumber: d.licenseNumber,
          licenseCategory: d.licenseCategory,
          licenseExpiryDate: d.licenseExpiryDate?.split('T')[0] || '',
          contactNumber: d.contactNumber,
          email: d.email || '',
          safetyScore: d.safetyScore,
          region: d.region,
        });
      })
      .catch(() => { toast.error('Driver not found'); navigate('/drivers'); })
      .finally(() => setFetching(false));
  }, [id]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.licenseNumber.trim()) e.licenseNumber = 'License number is required';
    if (!form.licenseExpiryDate) e.licenseExpiryDate = 'Expiry date is required';
    if (!form.contactNumber.trim()) e.contactNumber = 'Contact number is required';
    if (!form.region.trim()) e.region = 'Region is required';
    const score = parseFloat(form.safetyScore);
    if (isNaN(score) || score < 0 || score > 100) e.safetyScore = '0–100 only';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Fix the errors before saving');
      return;
    }
    setLoading(true);
    try {
      await apiClient.put(`/drivers/${id}`, {
        ...form,
        licenseNumber: form.licenseNumber.trim().toUpperCase(),
        safetyScore: parseFloat(form.safetyScore),
      });
      toast.success('Driver updated successfully!');
      navigate(`/drivers/${id}`);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Update failed';
      toast.error(msg);
      if (msg.toLowerCase().includes('license')) {
        setErrors(p => ({ ...p, licenseNumber: 'License number already in use by another driver' }));
      }
    } finally {
      setLoading(false);
    }
  };

  // License status preview
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = form.licenseExpiryDate ? new Date(form.licenseExpiryDate) : null;
  const expiryStatus = expiry
    ? expiry < today ? 'EXPIRED' : expiry <= new Date(today.getTime() + 30 * 86400000) ? 'EXPIRING_SOON' : 'VALID'
    : null;
  const expiryColor = expiryStatus === 'EXPIRED' ? '#ef4444' : expiryStatus === 'EXPIRING_SOON' ? '#f59e0b' : '#10b981';

  if (fetching) {
    return (
      <div style={{ padding: 24 }}>
        <div className="skeleton" style={{ height: 60, marginBottom: 16, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate(`/drivers/${id}`)} style={{ padding: '8px 10px' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Edit Driver</h1>
            <p className="page-subtitle">{original?.name} · {original?.licenseNumber}</p>
          </div>
        </div>
      </div>

      {expiryStatus === 'EXPIRED' && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} /> This license date is in the past — the driver will be ineligible for trips.
        </div>
      )}
      {expiryStatus === 'EXPIRING_SOON' && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} /> License expires within 30 days — consider scheduling a renewal.
        </div>
      )}

      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit} noValidate>
          {/* Personal Details */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--surface-border)' }}>
              Personal Details
            </div>
            <div className="form-row">
              <FormField label="Full Name *" error={errors.name}>
                <input id="edit-driver-name" className="form-control" value={form.name} onChange={set('name')}
                  style={errors.name ? { borderColor: '#ef4444' } : {}} />
              </FormField>
              <FormField label="Region *" error={errors.region}>
                <input id="edit-driver-region" className="form-control" placeholder="e.g. Maharashtra" value={form.region} onChange={set('region')}
                  style={errors.region ? { borderColor: '#ef4444' } : {}} />
              </FormField>
            </div>
            <div className="form-row">
              <FormField label="Contact Number *" error={errors.contactNumber}>
                <input id="edit-driver-contact" className="form-control" value={form.contactNumber} onChange={set('contactNumber')}
                  style={errors.contactNumber ? { borderColor: '#ef4444' } : {}} />
              </FormField>
              <FormField label="Email" error={errors.email} hint="Optional">
                <input id="edit-driver-email" className="form-control" type="email" value={form.email} onChange={set('email')}
                  style={errors.email ? { borderColor: '#ef4444' } : {}} />
              </FormField>
            </div>
          </div>

          {/* License Details */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--surface-border)' }}>
              License Information
            </div>
            <div className="form-row">
              <FormField label="License Number *" error={errors.licenseNumber} hint="Will be saved in uppercase">
                <input
                  id="edit-driver-license"
                  className="form-control"
                  value={form.licenseNumber}
                  onChange={set('licenseNumber')}
                  style={{ fontFamily: 'monospace', ...errors.licenseNumber ? { borderColor: '#ef4444' } : {} }}
                />
              </FormField>
              <FormField label="License Category *">
                <select id="edit-driver-category" className="form-control" value={form.licenseCategory} onChange={set('licenseCategory')}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
            </div>
            <div className="form-row">
              <FormField label="License Expiry Date *" error={errors.licenseExpiryDate}>
                <input
                  id="edit-driver-expiry"
                  className="form-control"
                  type="date"
                  value={form.licenseExpiryDate}
                  onChange={set('licenseExpiryDate')}
                  style={{
                    borderColor: expiryStatus === 'VALID' ? '#10b981' : expiryStatus ? '#ef4444' : undefined,
                    ...errors.licenseExpiryDate ? { borderColor: '#ef4444' } : {}
                  }}
                />
                {expiryStatus && (
                  <div style={{ fontSize: 11, color: expiryColor, marginTop: 4, fontWeight: 500 }}>
                    {expiryStatus === 'VALID' ? '✓ Valid license date' : expiryStatus === 'EXPIRING_SOON' ? '⚠ Expiring soon' : '✕ Already expired'}
                  </div>
                )}
              </FormField>
              <FormField label="Safety Score (0–100)" error={errors.safetyScore}>
                <input
                  id="edit-driver-score"
                  className="form-control"
                  type="number"
                  min="0"
                  max="100"
                  value={form.safetyScore}
                  onChange={set('safetyScore')}
                  style={errors.safetyScore ? { borderColor: '#ef4444' } : {}}
                />
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
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/drivers/${id}`)} disabled={loading}>
              Cancel
            </button>
            <button id="save-driver-btn" type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={14} />
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
