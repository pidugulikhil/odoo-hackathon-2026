import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['HGV', 'LMV', 'HTV', 'PSV', 'MCWG'];

export default function DriverEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    name: '', licenseNumber: '', licenseCategory: 'HGV',
    licenseExpiryDate: '', contactNumber: '', email: '',
    safetyScore: 100, region: '',
  });
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  useEffect(() => {
    apiClient.get(`/drivers/${id}`).then(res => {
      const d = res.data.data.driver;
      setForm({
        name: d.name, licenseNumber: d.licenseNumber,
        licenseCategory: d.licenseCategory,
        licenseExpiryDate: d.licenseExpiryDate?.split('T')[0] || '',
        contactNumber: d.contactNumber, email: d.email || '',
        safetyScore: d.safetyScore, region: d.region,
      });
    }).catch(() => { toast.error('Driver not found'); navigate('/drivers'); })
    .finally(() => setFetching(false));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.put(`/drivers/${id}`, { ...form, safetyScore: parseFloat(form.safetyScore) });
      toast.success('Driver updated');
      navigate(`/drivers/${id}`);
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
          <button className="btn btn-ghost" onClick={() => navigate(`/drivers/${id}`)}><ArrowLeft size={16} /></button>
          <div><h1 className="page-title">Edit Driver</h1><p className="page-subtitle">{form.name}</p></div>
        </div>
      </div>
      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-control" value={form.name} onChange={set('name')} /></div>
            <div className="form-group"><label className="form-label">License Number</label><input className="form-control" value={form.licenseNumber} onChange={set('licenseNumber')} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">License Category</label>
              <select className="form-control" value={form.licenseCategory} onChange={set('licenseCategory')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">License Expiry</label><input className="form-control" type="date" value={form.licenseExpiryDate} onChange={set('licenseExpiryDate')} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Contact Number</label><input className="form-control" value={form.contactNumber} onChange={set('contactNumber')} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={form.email} onChange={set('email')} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Safety Score</label><input className="form-control" type="number" value={form.safetyScore} onChange={set('safetyScore')} min="0" max="100" /></div>
            <div className="form-group"><label className="form-label">Region</label><input className="form-control" value={form.region} onChange={set('region')} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/drivers/${id}`)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
