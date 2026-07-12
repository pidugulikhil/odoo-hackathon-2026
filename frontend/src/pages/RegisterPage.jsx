import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { Eye, EyeOff, Mail, Lock, User, Shield, Truck, BarChart2, Fuel, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

const FEATURES = [
  { icon: BarChart2, label: 'Real-time Analytics' },
  { icon: Shield, label: 'Role Based Access' },
  { icon: Fuel, label: 'Fuel & Expense Tracking' },
  { icon: Wrench, label: 'Maintenance Management' },
];

const ROLES = [
  { value: 'FLEET_MANAGER', label: 'Fleet Manager' },
  { value: 'DRIVER', label: 'Driver' },
  { value: 'SAFETY_OFFICER', label: 'Safety Officer' },
  { value: 'FINANCIAL_ANALYST', label: 'Financial Analyst' },
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('FLEET_MANAGER');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/register', { name, email, password, role });
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0f1e' }}>
      {/* Left Panel */}
      <div style={{
        flex: '1 1 0',
        background: 'linear-gradient(135deg, #0d1424 0%, #0a1628 50%, #061020 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(16,185,129,0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 40%)`,
          pointerEvents: 'none',
        }} />
        
        {/* Dot Grid */}
        <div style={{
          position: 'absolute', top: 40, right: 40,
          display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 8,
          opacity: 0.15,
        }}>
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981' }} />
          ))}
        </div>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Truck size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
              Transit<span style={{ color: '#10b981' }}>Ops</span>
            </div>
          </div>
        </div>

        {/* Hero Text */}
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, color: '#fff', marginBottom: 20 }}>
            Smart Fleet.<br />
            <span style={{ color: '#10b981' }}>Smarter</span> Operations.
          </h1>
          <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 360, lineHeight: 1.7 }}>
            Manage your vehicles, drivers, trips, maintenance, fuel and expenses in one place.
          </p>
        </div>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, position: 'relative' }}>
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: 32, height: 32,
                background: 'rgba(16,185,129,0.12)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={15} color="#10b981" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{
        width: '460px',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        position: 'relative',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Get Started
            </h2>
            <p style={{ fontSize: 14, color: '#64748b' }}>Create a new TransitOps account</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Name Field */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#475569' }}>Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  id="register-name"
                  type="text"
                  required
                  className="form-control"
                  style={{ paddingLeft: 42 }}
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#475569' }}>Email Address *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  id="register-email"
                  type="email"
                  required
                  className="form-control"
                  style={{ paddingLeft: 42 }}
                  placeholder="e.g. name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#475569' }}>Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-control"
                  style={{ paddingLeft: 42, paddingRight: 40 }}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Role Dropdown */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#475569' }}>Role / Department *</label>
              <select
                id="register-role"
                className="form-control"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Register Button */}
            <button
              id="register-btn"
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%', padding: '12px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', fontWeight: 600, border: 'none',
                borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                marginTop: 8
              }}
            >
              {loading ? 'Registering...' : 'Create Account'}
            </button>

            {/* Link to Login */}
            <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 8 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
                Sign In
              </Link>
            </p>
          </form>
        </div>
        
        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 20, fontSize: 11, color: '#94a3b8' }}>
          © 2026 TransitOps. All rights reserved.
        </div>
      </div>
    </div>
  );
}
