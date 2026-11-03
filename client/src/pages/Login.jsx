import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/api';

export default function Login() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const fillLogin = (e, p) => {
    setEmail(e);
    setPassword(p);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    try {
      await login(email, password);
      showToast('Login successful! Redirecting...', 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
        padding: '1.5rem'
      }}
    >
      <div
        className="login-card"
        style={{
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          color: 'var(--text-main)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              background: 'var(--primary)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.5rem'
            }}
          >
            A
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            AttendX System
          </h1>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Sign in to access your attendance workspace
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Email Address
            </label>
            <input
              type="email"
              className="form-control"
              style={{ width: '100%' }}
              placeholder="name@office.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Password
            </label>
            <input
              type="password"
              className="form-control"
              style={{ width: '100%' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}>
            <i className="ri-login-circle-line"></i> Sign In to Portal
          </button>
        </form>

        <div
          style={{
            background: 'rgba(79, 70, 229, 0.08)',
            border: '1px dashed var(--primary)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginTop: '1.5rem',
            fontSize: '0.82rem'
          }}
        >
          <strong style={{ color: 'var(--primary)' }}>
            <i className="ri-key-line"></i> Quick Demo Accounts:
          </strong>
          <div style={{ marginTop: '0.4rem' }}>
            <span
              className="demo-chip"
              onClick={() => fillLogin('prathmesh@office.com', 'Prathmesh@1234')}
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.6rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                marginTop: '0.4rem',
                marginRight: '0.4rem',
                fontWeight: 600
              }}
            >
              🔑 Admin (prathmesh@office.com)
            </span>
            <span
              className="demo-chip"
              onClick={() => fillLogin('sagar@office.com', 'Emp@123')}
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.6rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                marginTop: '0.4rem',
                marginRight: '0.4rem',
                fontWeight: 600
              }}
            >
              👤 Employee (sagar@office.com)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
