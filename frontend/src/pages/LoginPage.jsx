import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, Truck, BarChart2, Shield, Fuel, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const DEMO_ACCOUNTS = [
  { label: 'Fleet Manager', email: 'fleet@transitops.com', color: '#10b981' },
  { label: 'Driver', email: 'driver@transitops.com', color: '#3b82f6' },
  { label: 'Safety Officer', email: 'safety@transitops.com', color: '#f59e0b' },
  { label: 'Analyst', email: 'finance@transitops.com', color: '#8b5cf6' },
];

const FEATURES = [
  { icon: BarChart2, label: 'Real-time Analytics' },
  { icon: Shield, label: 'Role Based Access' },
  { icon: Fuel, label: 'Fuel & Expense Tracking' },
  { icon: Wrench, label: 'Maintenance Management' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const res = await apiClient.post('/auth/google', { token: idToken });
      const { token, user: userData } = res.data.data;
      
      localStorage.setItem('transitops_token', token);
      localStorage.setItem('transitops_user', JSON.stringify(userData));
      
      toast.success('Signed in with Google successfully!');
      window.location.href = '/dashboard';
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Google Sign-In failed or cancelled.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please enter email and password'); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Login failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
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
        {/* Background Pattern */}
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
              Welcome Back!
            </h2>
            <p style={{ fontSize: 14, color: '#64748b' }}>Sign in to your TransitOps account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={{
                    width: '100%', padding: '11px 14px 11px 42px',
                    border: '1.5px solid #e5e7eb', borderRadius: 10,
                    fontSize: 14, color: '#0f172a', background: '#f9fafb',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%', padding: '11px 42px 11px 42px',
                    border: '1.5px solid #e5e7eb', borderRadius: 10,
                    fontSize: 14, color: '#0f172a', background: '#f9fafb',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? '#6ee7b7' : '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s, transform 0.2s',
                marginBottom: 24,
              }}
              onMouseOver={e => { if (!loading) e.target.style.background = '#059669'; }}
              onMouseOut={e => { if (!loading) e.target.style.background = '#10b981'; }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            <span style={{ fontSize: 13, color: '#9ca3af', whiteSpace: 'nowrap' }}>Quick Demo Login</span>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          </div>

          {/* Demo Accounts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                onClick={() => fillDemo(acc.email)}
                style={{
                  padding: '9px 12px',
                  border: `1.5px solid ${acc.color}22`,
                  borderRadius: 8,
                  background: `${acc.color}0d`,
                  color: acc.color,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = `${acc.color}22`; }}
                onMouseOut={e => { e.currentTarget.style.background = `${acc.color}0d`; }}
              >
                {acc.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>or sign in with</span>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          </div>

          {/* Social Login */}
          {/* Social Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              border: '1.5px solid #cbd5e1', borderRadius: '8px', background: '#fff', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: '#334155', transition: 'all 0.2s'
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
            Sign in with Google
          </button>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div style={{ position: 'absolute', bottom: 20, fontSize: 11, color: '#d1d5db', textAlign: 'center' }}>
          © 2026 TransitOps. All rights reserved.
        </div>
      </div>

      {/* Responsive - hide left panel on small screens */}
      <style>{`
        @media (max-width: 768px) {
          .login-left { display: none !important; }
          .login-right { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
