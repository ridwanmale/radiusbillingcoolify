import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const SettingMidtrans = () => {
  const [midtransSettings, setMidtransSettings] = useState({
    is_enabled: false,
    merchant_id: '',
    server_key: '',
    client_key: ''
  });
  const [testingMidtrans, setTestingMidtrans] = useState(false);
  const [showServerKey, setShowServerKey] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/payment-gateway');
      const settingsRes = await res.json();
      if (settingsRes?.midtrans) {
        setMidtransSettings(settingsRes.midtrans);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Gagal mengambil data pengaturan Midtrans');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMidtrans = async () => {
    try {
      await axios.post('/api/settings/payment-gateway', { midtrans: midtransSettings });
      toast.success('Pengaturan Midtrans berhasil disimpan!');
    } catch (err) {
      toast.error('Gagal menyimpan: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleTestMidtrans = async () => {
    if (!midtransSettings.server_key || !midtransSettings.merchant_id) {
      toast.warning('Isi Server Key dan Merchant ID terlebih dahulu!');
      return;
    }
    
    setTestingMidtrans(true);
    try {
      const res = await axios.post('/api/settings/test-midtrans', { 
        server_key: midtransSettings.server_key,
        merchant_id: midtransSettings.merchant_id
      });
      toast.success(res.data.message || 'Koneksi Midtrans berhasil!');
    } catch (err) {
      toast.error('Gagal terhubung: ' + (err.response?.data?.error || err.message));
    } finally {
      setTestingMidtrans(false);
    }
  };

  return (
    <div className="setting-midtrans-container" style={{ padding: '20px', color: 'white' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.5px', background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Setting Midtrans
        </h1>
        <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>Pengaturan Payment Gateway Midtrans</p>
      </div>

      <div className="fade-in">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '25px' }}>
          {/* MIDTRANS CONFIGURATION CARD */}
          <div className="glass-card" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-rounded" style={{ color: '#6366f1', fontSize: '28px' }}>payment</span>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900' }}>Konfigurasi Midtrans</h2>
                <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Payment Gateway Terpercaya Indonesia</p>
              </div>
            </div>

            {/* STATUS BADGE */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginBottom: '10px', display: 'block', textTransform: 'uppercase' }}>Status Midtrans</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: midtransSettings.is_enabled ? '#10b981' : '#94a3b8' }}></div>
                <span style={{ fontWeight: '700', color: midtransSettings.is_enabled ? '#10b981' : '#94a3b8' }}>
                  {midtransSettings.is_enabled ? 'AKTIF' : 'TIDAK AKTIF'}
                </span>
              </div>
            </div>

            {/* FORM FIELDS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '25px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Merchant ID</label>
                <input 
                  type="text" 
                  placeholder="Masukkan Merchant ID Midtrans"
                  value={midtransSettings.merchant_id}
                  onChange={(e) => setMidtransSettings({ ...midtransSettings, merchant_id: e.target.value })}
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', outline: 'none', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Client Key</label>
                <input 
                  type="text" 
                  placeholder="Masukkan Client Key Midtrans"
                  value={midtransSettings.client_key}
                  onChange={(e) => setMidtransSettings({ ...midtransSettings, client_key: e.target.value })}
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', outline: 'none', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginBottom: '8px', display: 'flex', textTransform: 'uppercase', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Server Key (API Key)</span>
                  <button 
                    onClick={() => setShowServerKey(!showServerKey)}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}
                  >
                    {showServerKey ? 'SEMBUNYIKAN' : 'TAMPILKAN'}
                  </button>
                </label>
                <input 
                  type={showServerKey ? "text" : "password"} 
                  placeholder="Masukkan Server Key Midtrans (rahasia)"
                  value={midtransSettings.server_key}
                  onChange={(e) => setMidtransSettings({ ...midtransSettings, server_key: e.target.value })}
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', outline: 'none', fontFamily: 'monospace' }}
                />
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px', marginBottom: 0 }}>⚠️ Jangan bagikan Server Key kepada orang lain. Jauhkan dari version control.</p>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Aktifkan Midtrans</label>
                <button 
                  onClick={() => setMidtransSettings({ ...midtransSettings, is_enabled: !midtransSettings.is_enabled })}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: midtransSettings.is_enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', 
                    border: `2px solid ${midtransSettings.is_enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '12px', 
                    color: midtransSettings.is_enabled ? '#10b981' : '#94a3b8',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {midtransSettings.is_enabled ? '✓ AKTIF' : '○ NONAKTIF'}
                </button>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handleTestMidtrans}
                disabled={testingMidtrans}
                className="btn-glass"
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '700',
                  opacity: testingMidtrans ? 0.6 : 1,
                  cursor: testingMidtrans ? 'not-allowed' : 'pointer',
                  color: '#38bdf8'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '20px', animation: testingMidtrans ? 'spin 1s linear infinite' : 'none' }}>
                  {testingMidtrans ? 'sync' : 'check_circle'}
                </span>
                {testingMidtrans ? 'Menguji...' : 'Test Koneksi'}
              </button>
              <button 
                onClick={handleSaveMidtrans}
                className="btn-success-premium"
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <span className="material-symbols-rounded" style={{ color: '#10b981', fontSize: '20px' }}>save</span>SIMPAN</button>
            </div>
          </div>

          {/* INFO CARD */}
          <div className="glass-card" style={{ padding: '30px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded" style={{ color: '#6366f1' }}>info</span>
              Panduan Setup Midtrans
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '900', color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', background: '#6366f1', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                  Buat Akun Midtrans
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>Daftar di <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>dashboard.midtrans.com</code> untuk mendapatkan akun merchant.</p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '900', color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', background: '#6366f1', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                  Dapatkan API Keys
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>Kunjungi Settings → Access Keys untuk mendapatkan Merchant ID, Client Key, dan Server Key.</p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '900', color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', background: '#6366f1', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                  Isi Data di Sini
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>Salin dan tempel key yang sudah Anda dapatkan ke form di samping.</p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '900', color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', background: '#6366f1', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>4</span>
                  Test Koneksi
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>Klik tombol "Test Koneksi" untuk memverifikasi bahwa API keys Anda bekerja dengan baik.</p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '900', color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', background: '#6366f1', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>5</span>
                  Aktifkan & Simpan
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>Centang "Aktifkan Midtrans" dan klik "Simpan Pengaturan" untuk mengaktifkan payment gateway.</p>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <p style={{ fontSize: '0.8rem', color: '#fca5a5', margin: 0, fontWeight: '700' }}>
                🔒 Keamanan: Server Key disimpan terenkripsi. Jangan pernah share key dengan pihak ketiga.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingMidtrans;
