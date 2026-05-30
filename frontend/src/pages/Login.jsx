import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin, appSettings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoButton, setShowDemoButton] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkDemoMode = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        setShowDemoButton(data.enable_demo_mode === 1 || data.enable_demo_mode === true);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    };
    checkDemoMode();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        onLogin(data.user);
        navigate('/'); // Redirect to dashboard
      } else {
        setError(data.error || 'Login gagal');
      }
    } catch (err) {
      setError('Koneksi ke server gagal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'demo' })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        onLogin(data.user);
        navigate('/');
      } else {
        setError(data.error || 'Login demo gagal');
      }
    } catch (err) {
      setError('Koneksi ke server gagal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'radial-gradient(circle at top left, #2c112c, #000000)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div className="glass-card" style={{ 
        width: '100%', 
        maxWidth: '400px', 
        padding: '2.5rem',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          {appSettings?.app_logo_base64 ? (
            <img 
              src={appSettings.app_logo_base64} 
              alt="Logo" 
              style={{ width: '150px', height: '150px', objectFit: 'contain', marginBottom: '0.5rem' }} 
            />
          ) : (
            <div style={{ 
              width: '100px', 
              height: '100px', 
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
              borderRadius: '24px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 10px 25px -3px rgba(59, 130, 246, 0.5)'
            }}>
              <span className="material-symbols-rounded" style={{ color: 'white', fontSize: '48px' }}>lock</span>
            </div>
          )}
        </div>


        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              padding: '0.75rem', 
              borderRadius: '12px', 
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-rounded" style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.3)',
                fontSize: '20px'
              }}>person</span>
              <input 
                type="text" 
                className="form-input" 
                style={{ width: '100%', paddingLeft: '40px', background: 'rgba(255,255,255,0.05)' }} 
                placeholder="Masukkan username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-rounded" style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.3)',
                fontSize: '20px'
              }}>lock</span>
              <input 
                type="password" 
                className="form-input" 
                style={{ width: '100%', paddingLeft: '40px', background: 'rgba(255,255,255,0.05)' }} 
                placeholder="Masukkan password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isLoading}
            style={{ 
              width: '100%', 
              padding: '1rem', 
              borderRadius: '12px', 
              fontWeight: '700',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: showDemoButton ? '1rem' : '0'
            }}
          >
            {isLoading ? (
              <span className="material-symbols-rounded spinning">refresh</span>
            ) : (
              <>
                MASUK APLIKASI
                <span className="material-symbols-rounded">arrow_forward</span>
              </>
            )}
          </button>

          {showDemoButton && (
            <button 
              type="button" 
              onClick={handleDemoLogin}
              disabled={isLoading}
              style={{ 
                width: '100%', 
                padding: '1rem', 
                borderRadius: '12px', 
                fontWeight: '600',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#c084fc',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <span className="material-symbols-rounded">pageview</span>
              COBA AKUN DEMO
            </button>
          )}
        </form>

        <p style={{ 
          textAlign: 'center', 
          color: 'rgba(255,255,255,0.6)', 
          marginTop: '2rem', 
          fontSize: '0.75rem' 
        }}>
          &copy; 2026 Radius Billing by Ridwan x KHP. All rights reserved.
        </p>
      </div>

      <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
