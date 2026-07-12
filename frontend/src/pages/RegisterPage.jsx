import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { Eye, EyeOff, Mail, Lock, User, Phone, Shield, Truck, BarChart2, Fuel, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('FLEET_MANAGER');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleRegister = async () => {
    if (!agree) {
      toast.error('You must agree to the Terms of Service and Privacy Policy');
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const res = await apiClient.post('/auth/google', { token: idToken, role: role });
      const { token, user: userData } = res.data.data;
      
      localStorage.setItem('transitops_token', token);
      localStorage.setItem('transitops_user', JSON.stringify(userData));
      
      toast.success('Signed up with Google successfully!');
      window.location.href = '/dashboard';
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Google Sign-Up failed or cancelled.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!agree) {
      toast.error('You must agree to the Terms of Service and Privacy Policy');
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Left Panel */}
      <div 
        className="register-left"
        style={{
          flex: '1 1 0',
          backgroundImage: 'linear-gradient(rgba(10, 15, 30, 0.85), rgba(10, 15, 30, 0.85)), url(https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=800)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Overlay grid */}
        <div style={{
          position: 'absolute', top: 40, right: 40,
          display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 8,
          opacity: 0.15,
        }}>
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981' }} />
          ))}
        </div>
        <div style={{
          position: 'absolute', bottom: 40, left: 40,
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
        <div style={{ position: 'relative', margin: '40px 0' }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, color: '#fff', marginBottom: 20 }}>
            Smart Fleet.<br />
            <span style={{ color: '#10b981' }}>Smarter</span> Operations.
          </h1>
          <p style={{ fontSize: 15, color: '#cbd5e1', maxWidth: 380, lineHeight: 1.7 }}>
            Manage your vehicles, drivers, trips, maintenance, fuel and expenses in one place.
          </p>
        </div>

        {/* Features list at bottom of left panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, position: 'relative' }}>
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 12,
              padding: '16px',
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(8px)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: 36, height: 36,
                background: 'rgba(16,185,129,0.15)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color="#10b981" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div 
        className="register-right"
        style={{
          flex: '1.2 1 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          overflowY: 'auto',
        }}
      >
        <div 
          style={{ 
            width: '100%', 
            maxWidth: '640px',
            background: '#fff',
            borderRadius: '20px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.02), 0 8px 10px -6px rgba(0,0,0,0.02)',
            border: '1px solid #f1f5f9',
            padding: '40px 48px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            <div style={{
              width: 48, height: 48,
              borderRadius: '50%',
              background: '#10b98115',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <User size={22} color="#10b981" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Create Your Account
            </h2>
            <p style={{ fontSize: 13, color: '#64748b' }}>
              Join TransitOps and streamline your fleet operations
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Row 1: Name and Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8, display: 'block' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    id="register-name"
                    type="text"
                    required
                    className="form-control"
                    style={{ paddingLeft: 42, height: '44px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#0f172a', background: '#fff' }}
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8, display: 'block' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    id="register-email"
                    type="email"
                    required
                    className="form-control"
                    style={{ paddingLeft: 42, height: '44px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#0f172a', background: '#fff' }}
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Password and Confirm Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8, display: 'block' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="form-control"
                    style={{ paddingLeft: 42, paddingRight: 40, height: '44px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#0f172a', background: '#fff' }}
                    placeholder="Create a password"
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
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8, display: 'block' }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="form-control"
                    style={{ paddingLeft: 42, paddingRight: 40, height: '44px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#0f172a', background: '#fff' }}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Row 3: Role and Phone Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8, display: 'block' }}>Role</label>
                <select
                  id="register-role"
                  className="form-control"
                  style={{ height: '44px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', paddingLeft: 12, color: '#0f172a', background: '#fff' }}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8, display: 'block' }}>Phone Number (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    id="register-phone"
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: 42, height: '44px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#0f172a', background: '#fff' }}
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <input
                id="register-terms"
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                style={{ width: 16, height: 16, border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
              />
              <label htmlFor="register-terms" style={{ fontSize: 13, color: '#64748b', cursor: 'pointer' }}>
                I agree to the <span style={{ color: '#10b981', fontWeight: 500 }}>Terms of Service</span> and <span style={{ color: '#10b981', fontWeight: 500 }}>Privacy Policy</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="register-btn"
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%', height: '44px',
                background: '#0e8f52',
                color: '#fff', fontWeight: 600, border: 'none',
                borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                marginTop: 10, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
              <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>or sign up with</span>
              <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
            </div>

            {/* Social Logins */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              {/* Social Login Button */}
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={loading}
                style={{
                  height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: '#334155', transition: 'all 0.2s', width: '100%'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = '#fff'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69c-.29 1.5-.1.13-2.58 3.19l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.42z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.1-2.4c-.86.58-1.97.93-3.08.93-3.1 0-5.74-2.1-6.68-4.91l-3.2 2.5C5.8 21.1 8.6 24 12 24z" />
                  <path fill="#FBBC05" d="M5.32 14.71a7.2 7.2 0 0 1 0-4.54l-3.2-2.5a11.9 11.9 0 0 0 0 9.54l3.2-2.5z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 8.6 0 5.8 2.9 3.8 6.71l3.2 2.5c.94-2.8 3.58-4.91 6.68-4.91z" />
                </svg>
                Sign up with Google
              </button>
            </div>

            {/* Footer link to sign in */}
            <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 12 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
                Sign in here
              </Link>
            </p>

          </form>
        </div>

        {/* Footer info */}
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#94a3b8', marginTop: 32 }}>
          <span>© 2025 TransitOps. All rights reserved.</span>
          <span>•</span>
          <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</a>
          <span>•</span>
          <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms of Service</a>
        </div>

      </div>

      {/* Responsive layout overrides */}
      <style>{`
        @media (max-width: 992px) {
          .register-left { display: none !important; }
          .register-right { width: 100% !important; }
        }
      `}</style>

    </div>
  );
}
