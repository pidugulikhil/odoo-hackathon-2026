import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0f1e' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 80, fontWeight: 800, background: 'linear-gradient(135deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1, marginBottom: 16 }}>404</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#f1f5f9' }}>Page Not Found</h2>
        <p style={{ color: '#64748b', marginBottom: 24 }}>The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="btn btn-primary">
          <Home size={16} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
