import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api/client';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TripEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  
  const [form, setForm] = useState({
    source: '', destination: '', vehicleId: '', driverId: '',
    cargoWeight: '', plannedDistance: '',
  });
  const [errors, setErrors] = useState({});
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  useEffect(() => {
    Promise.all([
      apiClient.get(`/trips/${id}`),
      apiClient.get('/vehicles/available'),
      apiClient.get('/drivers/available'),
    ]).then(([tRes, vRes, dRes]) => {
      const trip = tRes.data.data.trip;
      
      if (trip.status !== 'DRAFT') {
        toast.error('Only DRAFT trips can be edited');
        navigate(`/trips/${id}`);
        return;
      }
      
      setForm({
        source: trip.source,
        destination: trip.destination,
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
        cargoWeight: trip.cargoWeight,
        plannedDistance: trip.plannedDistance,
      });

      // Include current vehicle/driver in lists if not present in available
      let availVehicles = vRes.data.data.vehicles;
      if (trip.vehicle && !availVehicles.find(v => v.id === trip.vehicle.id)) {
        availVehicles = [...availVehicles, trip.vehicle];
      }
      
      let availDrivers = dRes.data.data.drivers;
      if (trip.driver && !availDrivers.find(d => d.id === trip.driver.id)) {
        availDrivers = [...availDrivers, trip.driver];
      }

      setVehicles(availVehicles);
      setDrivers(availDrivers);
      setInitialLoading(false);
    }).catch(() => {
      toast.error('Failed to load trip data');
      navigate('/trips');
    });
  }, [id, navigate]);

  const selectedVehicle = vehicles.find(v => v.id === parseInt(form.vehicleId));

  const validate = () => {
    const e = {};
    if (!form.source.trim()) e.source = 'Required';
    if (!form.destination.trim()) e.destination = 'Required';
    if (!form.vehicleId) e.vehicleId = 'Required';
    if (!form.driverId) e.driverId = 'Required';
    if (!form.cargoWeight || parseFloat(form.cargoWeight) <= 0) e.cargoWeight = 'Must be > 0';
    if (!form.plannedDistance || parseFloat(form.plannedDistance) <= 0) e.plannedDistance = 'Must be > 0';
    if (selectedVehicle && parseFloat(form.cargoWeight) > selectedVehicle.maxLoadCapacity) {
      e.cargoWeight = `Exceeds vehicle capacity of ${selectedVehicle.maxLoadCapacity} kg`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await apiClient.put(`/trips/${id}`, {
        ...form,
        vehicleId: parseInt(form.vehicleId),
        driverId: parseInt(form.driverId),
        cargoWeight: parseFloat(form.cargoWeight),
        plannedDistance: parseFloat(form.plannedDistance),
      });
      toast.success('Trip updated successfully');
      navigate(`/trips/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update trip');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate(`/trips/${id}`)}><ArrowLeft size={16} /></button>
          <div><h1 className="page-title">Edit Trip</h1><p className="page-subtitle">Update draft trip details</p></div>
        </div>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Source *</label>
              <input id="trip-source" className="form-control" placeholder="Departure city/location" value={form.source} onChange={set('source')} style={errors.source ? { borderColor: '#ef4444' } : {}} />
              {errors.source && <div className="form-error">{errors.source}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Destination *</label>
              <input id="trip-destination" className="form-control" placeholder="Arrival city/location" value={form.destination} onChange={set('destination')} style={errors.destination ? { borderColor: '#ef4444' } : {}} />
              {errors.destination && <div className="form-error">{errors.destination}</div>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vehicle *</label>
              <select id="trip-vehicle" className="form-control" value={form.vehicleId} onChange={set('vehicleId')} style={errors.vehicleId ? { borderColor: '#ef4444' } : {}}>
                <option value="">Select available vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} — {v.name} ({v.maxLoadCapacity?.toLocaleString()} kg)
                  </option>
                ))}
              </select>
              {errors.vehicleId && <div className="form-error">{errors.vehicleId}</div>}
              {selectedVehicle && (
                <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4 }}>
                  Max capacity: {selectedVehicle.maxLoadCapacity?.toLocaleString()} kg | Region: {selectedVehicle.region}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Driver *</label>
              <select id="trip-driver" className="form-control" value={form.driverId} onChange={set('driverId')} style={errors.driverId ? { borderColor: '#ef4444' } : {}}>
                <option value="">Select available driver</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.licenseCategory} — Score: {d.safetyScore}
                  </option>
                ))}
              </select>
              {errors.driverId && <div className="form-error">{errors.driverId}</div>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cargo Weight (kg) *</label>
              <input id="trip-cargo" className="form-control" type="number" placeholder="e.g. 5000" value={form.cargoWeight} onChange={set('cargoWeight')} style={errors.cargoWeight ? { borderColor: '#ef4444' } : {}} />
              {errors.cargoWeight && <div className="form-error">{errors.cargoWeight}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Planned Distance (km) *</label>
              <input id="trip-distance" className="form-control" type="number" placeholder="e.g. 500" value={form.plannedDistance} onChange={set('plannedDistance')} style={errors.plannedDistance ? { borderColor: '#ef4444' } : {}} />
              {errors.plannedDistance && <div className="form-error">{errors.plannedDistance}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/trips/${id}`)}>Cancel</button>
            <button id="save-trip-btn" type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={14} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
