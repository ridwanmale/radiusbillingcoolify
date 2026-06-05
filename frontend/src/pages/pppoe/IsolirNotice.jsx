import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const IsolirNotice = () => {
  const [settings, setSettings] = useState({
    redirect_message: 'Akses Internet Dihentikan Sementara',
    custom_message: 'Mohon maaf, layanan internet Anda (PPPoE) saat ini sedang terisolir. Hal ini biasanya disebabkan oleh tagihan yang belum diselesaikan setelah melewati masa tenggang.',
    accent_color: '#ef4444',
    cs_contact: '081234567890',
    redirect_footer: 'Sistem Redirect PPPoE - Radius Billing'
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/pppoe/redirect-settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Failed to fetch isolir settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleHubungiCS = () => {
    let phone = settings.cs_contact.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }
    window.location.href = `https://wa.me/${phone}?text=Halo%20Admin%2C%20layanan%20internet%20saya%20terisolir.%20Mohon%20bantuan%20untuk%20proses%20pembukaan%20isolir.`;
  };

  return (
    <div className="isolir-container">
      <div className="isolir-card" style={{ borderTop: `6px solid ${settings.accent_color || '#ef4444'}` }}>
        <div className="isolir-icon-wrapper" style={{ background: `${settings.accent_color || '#ef4444'}22` }}>
          <span className="material-symbols-rounded" style={{ color: settings.accent_color || '#ef4444', fontSize: '40px' }}>
            wifi_off
          </span>
        </div>
        
        <h1 className="isolir-title">
          {settings.redirect_message}
        </h1>
        
        <p className="isolir-desc">
          {settings.custom_message}
        </p>
        
        <div className="isolir-actions">
          <button 
            onClick={() => navigate('/pay-invoice')}
            className="btn-glass"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '1.05rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease'
            }}
          >
            <span className="material-symbols-rounded">payment</span>
            Bayar Tagihan Sekarang
          </button>

          <button 
            onClick={handleHubungiCS}
            className="btn-glass"
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              color: '#38bdf8',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '1.05rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease'
            }}
          >
            <span className="material-symbols-rounded">support_agent</span>
            Hubungi CS / Admin
          </button>
        </div>
        
        <div className="isolir-footer">
          <p>
            {settings.redirect_footer}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IsolirNotice;