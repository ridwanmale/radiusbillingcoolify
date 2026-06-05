import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const SettingDuitku = () => {
  const [settings, setSettings] = useState({
    duitku_merchant_code: '',
    duitku_api_key: '',
    duitku_is_sandbox: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/online-store/settings`);
      const data = await res.json();
      setSettings({
        duitku_merchant_code: data.duitku_merchant_code || '',
        duitku_api_key: data.duitku_api_key || '',
        duitku_is_sandbox: !!data.duitku_is_sandbox
      });
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/online-store/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        toast.success('Pengaturan Duitku berhasil disimpan!');
      } else {
        toast.error('Gagal menyimpan pengaturan.');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ color: 'white', padding: '2rem' }}>Memuat pengaturan...</div>;

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Konfigurasi Duitku</h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Hubungkan sistem voucher dengan Payment Gateway Duitku</p>
        </div>
      </div>

      <div className="glass-card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>Merchant Code</label>
            <input 
              type="text" 
              className="form-input" 
              style={{ width: '100%' }}
              value={settings.duitku_merchant_code}
              onChange={e => setSettings({...settings, duitku_merchant_code: e.target.value})}
              placeholder="Masukkan Merchant Code dari Dashboard Duitku"
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>API Key / Merchant Key</label>
            <input 
              type="password" 
              className="form-input" 
              style={{ width: '100%' }}
              value={settings.duitku_api_key}
              onChange={e => setSettings({...settings, duitku_api_key: e.target.value})}
              placeholder="Masukkan API Key Duitku"
              required
            />
          </div>

          <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Mode Sandbox (Testing)</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gunakan untuk simulasi pembayaran tanpa uang asli</p>
            </div>
            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
              <input 
                type="checkbox" 
                checked={settings.duitku_is_sandbox} 
                onChange={e => setSettings({...settings, duitku_is_sandbox: e.target.checked})}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span className="slider" style={{ 
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: settings.duitku_is_sandbox ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                transition: '.4s', borderRadius: '24px'
              }}>
                <span style={{ 
                  position: 'absolute', content: '""', height: '18px', width: '18px', left: settings.duitku_is_sandbox ? '28px' : '4px', bottom: '3px',
                  backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                }}></span>
              </span>
            </label>
          </div>

          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }}>info</span>
              Informasi Callback
            </h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
              Pastikan Anda mengatur URL Callback berikut di Dashboard Duitku:<br/>
              <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', display: 'block', marginTop: '4px', color: '#fff' }}>
                {window.location.origin + '/api/online-store/duitku/callback'}
              </code>
            </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isSaving}
            style={{ width: '100%', fontWeight: '700', padding: '12px' }}
          >
            {isSaving ? 'MENYIMPAN...' : 'SIMPAN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingDuitku;
