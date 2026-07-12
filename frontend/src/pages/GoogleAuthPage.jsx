import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

export default function GoogleAuthPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'login';
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Name/Role (if register)
  const [role, setRole] = useState('FLEET_MANAGER');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleNext = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter an email');
      return;
    }
    if (!email.endsWith('@gmail.com') && !email.includes('@')) {
      setEmail(email + '@gmail.com');
    }
    
    if (mode === 'login') {
      handleGoogleLogin(email + (email.includes('@') ? '' : '@gmail.com'));
    } else {
      setStep(2);
    }
  };

  const handleGoogleLogin = async (googleEmail) => {
    setLoading(true);
    try {
      // For mock Google login, we call a backend login/register endpoint or mock it
      // Let's call the backend to sign in/up with this Google email
      const res = await apiClient.post('/auth/login', {
        email: googleEmail,
        password: 'password123', // Demo password
        isGoogle: true
      });
      
      const { token, user } = res.data.data;
      localStorage.setItem('transitops_token', token);
      localStorage.setItem('transitops_user', JSON.stringify(user));
      window.location.href = '/dashboard';
      toast.success('Successfully signed in with Google!');
    } catch (err) {
      // If user doesn't exist, automatically switch to register step
      if (err.response?.status === 404) {
        toast.error('No account found with this Google email. Redirecting to sign up...');
        setStep(2);
      } else {
        toast.error('Google sign in failed. Creating a new demo account for you...');
        setStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const googleEmail = email.includes('@') ? email : email + '@gmail.com';
    const displayName = name || googleEmail.split('@')[0];
    
    try {
      // Try to register the user
      await apiClient.post('/auth/register', {
        name: displayName,
        email: googleEmail,
        password: 'password123',
        role: role
      });
      
      // Auto login after register
      await login(googleEmail, 'password123');
      toast.success('Google account registered and logged in!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Google registration failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectSuggested = (suggestedEmail, suggestedName, suggestedRole) => {
    setEmail(suggestedEmail);
    setName(suggestedName);
    setRole(suggestedRole);
    if (mode === 'login') {
      handleGoogleLogin(suggestedEmail);
    } else {
      setStep(2);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f4f9',
      fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
      color: '#1f1f1f',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '450px',
        background: '#fff',
        borderRadius: '28px',
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid #e0e0e0'
      }}>
        {/* Google Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="40" height="40" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69c-.29 1.5-.1.13-2.58 3.19l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.42z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.1-2.4c-.86.58-1.97.93-3.08.93-3.1 0-5.74-2.1-6.68-4.91l-3.2 2.5C5.8 21.1 8.6 24 12 24z" />
            <path fill="#FBBC05" d="M5.32 14.71a7.2 7.2 0 0 1 0-4.54l-3.2-2.5a11.9 11.9 0 0 0 0 9.54l3.2-2.5z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 8.6 0 5.8 2.9 3.8 6.71l3.2 2.5c.94-2.8 3.58-4.91 6.68-4.91z" />
          </svg>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 24, fontWeight: 400, textAlign: 'center', marginBottom: 8, color: '#1f1f1f' }}>
          {step === 1 ? (mode === 'login' ? 'Sign in with Google' : 'Create Google Account') : 'Choose Role & Name'}
        </h2>
        <p style={{ fontSize: 14, color: '#5f6368', textAlign: 'center', marginBottom: 28 }}>
          to continue to <span style={{ fontWeight: 600, color: '#10b981' }}>TransitOps</span>
        </p>

        {step === 1 ? (
          <form onSubmit={handleNext}>
            {/* Email Input */}
            <div style={{ marginBottom: 24 }}>
              <input
                type="text"
                required
                placeholder="Email or phone"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  height: '56px',
                  padding: '0 16px',
                  border: '1px solid #747775',
                  borderRadius: '4px',
                  fontSize: '16px',
                  color: '#1f1f1f',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#0b57d0'}
                onBlur={(e) => e.target.style.borderColor = '#747775'}
              />
            </div>

            {/* Quick selectors for demo ease */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#5f6368', display: 'block', marginBottom: 10 }}>
                Choose a Google Account to test:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => selectSuggested('safety@transitops.com', 'Safety Officer', 'SAFETY_OFFICER')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                    border: '1px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                    background: '#fff', fontSize: 13, fontWeight: 500
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Safety Officer</div>
                    <div style={{ fontSize: 11, color: '#5f6368' }}>safety@transitops.com</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => selectSuggested('fleet@transitops.com', 'Fleet Manager', 'FLEET_MANAGER')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                    border: '1px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                    background: '#fff', fontSize: 13, fontWeight: 500
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Fleet Manager</div>
                    <div style={{ fontSize: 11, color: '#5f6368' }}>fleet@transitops.com</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => navigate(mode === 'login' ? '/login' : '/register')}
                style={{ fontSize: 14, fontWeight: 500, color: '#0b57d0', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: '40px',
                  padding: '0 24px',
                  borderRadius: '20px',
                  background: '#0b57d0',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                {loading ? 'Connecting...' : 'Next'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleGoogleRegister}>
            {/* Name Input */}
            <div style={{ marginBottom: 20 }}>
              <input
                type="text"
                required
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%', height: '56px', padding: '0 16px', border: '1px solid #747775', borderRadius: '4px',
                  fontSize: '16px', color: '#1f1f1f', outline: 'none'
                }}
              />
            </div>

            {/* Role Dropdown */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: '#5f6368', display: 'block', marginBottom: 6 }}>Select your TransitOps role:</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%', height: '56px', padding: '0 16px', border: '1px solid #747775', borderRadius: '4px',
                  fontSize: '16px', color: '#1f1f1f', outline: 'none', background: '#fff'
                }}
              >
                <option value="FLEET_MANAGER">Fleet Manager</option>
                <option value="SAFETY_OFFICER">Safety Officer</option>
                <option value="DRIVER">Driver</option>
                <option value="FINANCIAL_ANALYST">Financial Analyst</option>
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ fontSize: 14, fontWeight: 500, color: '#0b57d0', cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: '40px', padding: '0 24px', borderRadius: '20px', background: '#0b57d0',
                  color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none'
                }}
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
