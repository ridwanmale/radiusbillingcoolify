import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const SettingTripayGlobal = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    tripay_merchant_code: '',
    tripay_api_key: '',
    tripay_private_key: '',
    tripay_is_sandbox: true,
    // Keep other portal settings to avoid overwriting them with NULL
    portal_title: '',
    portal_description: '',
    primary_color: '',
    qris_static_string: '',
    duitku_merchant_code: '',
    duitku_api_key: '',
    duitku_is_sandbox: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/online-store/settings');
      if (response.data) {
        setSettings({
          ...response.data,
          tripay_is_sandbox: response.data.tripay_is_sandbox === 1
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Gagal mengambil pengaturan Tripay');
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/online-store/settings', settings);
      toast.success('Pengaturan Tripay berhasil disimpan');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Memuat pengaturan...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="header-info">
          <h1 className="page-title">Setting Tripay (Global)</h1>
          <p className="page-subtitle">Konfigurasi API Payment Gateway Tripay untuk seluruh outlet</p>
        </div>
      </div>

      <div className="glass-card" style={{ maxWidth: '800px' }}>
        <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(255, 138, 0, 0.1)', borderRadius: '12px' }}>
              <span className="material-symbols-rounded" style={{ color: '#ff8a00', fontSize: '24px' }}>payments</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Konfigurasi API Tripay</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Masukkan kredensial Merchant dari Dashboard Tripay</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>Merchant Code</label>
              <input 
                type="text" 
                className="form-control"
                placeholder="Contoh: T12345"
                value={settings.tripay_merchant_code || ''}
                onChange={(e) => setSettings({...settings, tripay_merchant_code: e.target.value})}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '10px', width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>API Key</label>
              <input 
                type="password" 
                className="form-control"
                placeholder="Masukkan API Key Tripay"
                value={settings.tripay_api_key || ''}
                onChange={(e) => setSettings({...settings, tripay_api_key: e.target.value})}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '10px', width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600' }}>Private Key</label>
              <input 
                type="password" 
                className="form-control"
                placeholder="Masukkan Private Key Tripay"
                value={settings.tripay_private_key || ''}
                onChange={(e) => setSettings({...settings, tripay_private_key: e.target.value})}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '10px', width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="switch-container">
                  <input 
                    type="checkbox" 
                    id="isSandbox" 
                    checked={settings.tripay_is_sandbox}
                    onChange={(e) => setSettings({...settings, tripay_is_sandbox: e.target.checked})}
                  />
                  <label htmlFor="isSandbox" className="switch"></label>
                </div>
                <div>
                  <label htmlFor="isSandbox" style={{ cursor: 'pointer', fontWeight: '600', display: 'block' }}>Mode Sandbox (Testing)</label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Aktifkan jika ingin mencoba transaksi simulasi tanpa uang asli</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn-glass-premium btn-blue"
              disabled={saving}
              style={{ padding: '12px 30px' }}
            >
              <span className="material-symbols-rounded">save</span>
              <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card" style={{ maxWidth: '800px', marginTop: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <span className="material-symbols-rounded" style={{ color: '#3b82f6' }}>info</span>
          <div>
            <h4 style={{ margin: '0 0 5px 0', color: '#3b82f6' }}>Petunjuk Konfigurasi Callback</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5', color: 'rgba(255,255,255,0.7)' }}>
              Agar voucher otomatis aktif setelah pembayaran, pastikan Anda telah mengatur URL Callback di Dashboard Tripay ke:
              <br />
              <code style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginTop: '8px', color: '#60a5fa' }}>
                {window.location.origin + '/api/online-store/tripay/callback'}
              </code>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .btn-glass-premium {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50px;
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .btn-glass-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
        }
        .btn-blue:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .btn-blue .material-symbols-rounded { color: #3b82f6; }
        
        /* Simple Switch Style */
        .switch-container {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 26px;
        }
        .switch-container input { opacity: 0; width: 0; height: 0; }
        .switch {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(255,255,255,0.1);
          transition: .4s;
          border-radius: 34px;
        }
        .switch:before {
          position: absolute;
          content: "";
          height: 18px; width: 18px;
          left: 4px; bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .switch { background-color: #3b82f6; }
        input:checked + .switch:before { transform: translateX(24px); }
      `}</style>
    </div>
  );
};

export default SettingTripayGlobal;
