import React, { useState, useEffect } from 'react';

const WhatsAppGateway = () => {
  const [settings, setSettings] = useState({
    provider_type: 'baileys',
    api_url: '',
    api_token: '',
    is_enabled: 0
  });
  
  const [status, setStatus] = useState({
    isConnected: false,
    qrBase64: null
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Halo dari RadiusBilling WhatsApp Gateway!');

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    let interval;
    if (settings.provider_type === 'baileys') {
      fetchBaileysStatus();
      interval = setInterval(fetchBaileysStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [settings.provider_type]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/whatsapp/settings');
      const data = await res.json();
      setSettings({
        provider_type: data.provider_type || 'baileys',
        api_url: data.api_url || '',
        api_token: data.api_token || '',
        is_enabled: data.is_enabled || 0
      });
    } catch (err) {
      console.error('Error fetching WA settings', err);
    }
  };

  const fetchBaileysStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/baileys/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {}
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/whatsapp/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        alert('Pengaturan berhasil disimpan!');
      } else {
        alert('Gagal menyimpan pengaturan.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBaileys = async () => {
    try {
      await fetch('/api/whatsapp/baileys/start', { method: 'POST' });
      alert('Engine Baileys sedang dipanaskan. Mohon tunggu beberapa detik untuk QR Code...');
      fetchBaileysStatus();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleStopBaileys = async () => {
    if (!window.confirm('Yakin ingin mematikan engine dan logout dari WhatsApp?')) return;
    try {
      await fetch('/api/whatsapp/baileys/stop', { method: 'POST' });
      fetchBaileysStatus();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone) return alert('Nomor HP tujuan wajib diisi!');
    setIsLoading(true);
    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, message: testMessage })
      });
      const data = await res.json();
      if (data.success) {
        alert('Pesan test berhasil dikirim!');
      } else {
        alert('Gagal mengirim pesan: ' + data.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="settings-container" style={{ padding: '2rem' }}>
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '2rem', color: '#10b981' }}>forum</span>
        WhatsApp Gateway Hub
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Pilih engine pengiriman WhatsApp Anda. Gunakan <b>API Pihak Ketiga</b> untuk meringankan server, atau gunakan <b>Internal Engine (Baileys)</b> untuk pengiriman gratis dari nomor Anda sendiri.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Settings Panel */}
        <div className="card glass-card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)' }}>settings</span>
            Konfigurasi Utama
          </h2>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={settings.is_enabled === 1}
                onChange={(e) => setSettings({...settings, is_enabled: e.target.checked ? 1 : 0})}
                style={{ width: '20px', height: '20px', accentColor: '#10b981' }}
              />
              <span style={{ fontWeight: 'bold' }}>Aktifkan WhatsApp Gateway</span>
            </label>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Pilih Provider Engine</label>
            <select 
              value={settings.provider_type} 
              onChange={(e) => setSettings({...settings, provider_type: e.target.value})}
              className="form-control"
              style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', width: '100%' }}
            >
              <option value="baileys">Internal Engine (Baileys - Gratis)</option>
              <option value="fonnte">API Fonnte (Ringan di Server)</option>
            </select>
          </div>

          {settings.provider_type === 'fonnte' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Fonnte API Token</label>
                <input 
                  type="text" 
                  value={settings.api_token}
                  onChange={(e) => setSettings({...settings, api_token: e.target.value})}
                  className="form-control"
                  placeholder="Masukkan Token dari fonnte.com"
                />
              </div>
            </div>
          )}

          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={isLoading}
            style={{ width: '100%', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}
          >
            <span className="material-symbols-rounded">save</span>
            {isLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>

        {/* Engine Status Panel */}
        {settings.provider_type === 'baileys' ? (
          <div className="card glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <span className="material-symbols-rounded" style={{ color: '#3b82f6' }}>memory</span>
              Internal Engine Status
            </h2>
            
            <div style={{ 
              padding: '1rem', 
              borderRadius: '8px', 
              background: status.isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${status.isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: status.isConnected ? '#10b981' : '#ef4444',
              width: '100%',
              textAlign: 'center',
              fontWeight: 'bold',
              marginBottom: '1.5rem'
            }}>
              {status.isConnected ? '✅ TERHUBUNG' : '❌ TERPUTUS'}
            </div>

            {!status.isConnected && !status.qrBase64 && (
              <button 
                onClick={handleStartBaileys}
                className="btn"
                style={{ background: '#3b82f6', color: 'white', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold' }}
              >
                Nyalakan Engine & Minta QR
              </button>
            )}

            {status.qrBase64 && !status.isConnected && (
              <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
                <img src={status.qrBase64} alt="QR Code" style={{ width: '250px', height: '250px' }} />
                <p style={{ color: 'black', textAlign: 'center', fontSize: '0.9rem', marginTop: '10px', fontWeight: 'bold' }}>Scan QR via WhatsApp Tersambung</p>
              </div>
            )}

            {status.isConnected && (
              <button 
                onClick={handleStopBaileys}
                className="btn"
                style={{ background: '#ef4444', color: 'white', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold' }}
              >
                Logout & Matikan Engine
              </button>
            )}
          </div>
        ) : (
          <div className="card glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '4rem', color: '#10b981', opacity: 0.8 }}>cloud_done</span>
            <h3 style={{ marginTop: '1rem' }}>API Pihak Ketiga Aktif</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Mesin WhatsApp tidak berjalan di server ini. Semua pesan akan didelegasikan ke provider pilihan Anda. VPS Anda 100% aman dari beban *background process*.
            </p>
          </div>
        )}

      </div>

      {/* Test Message Panel */}
      <div className="card glass-card" style={{ padding: '1.5rem', marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ color: '#f59e0b' }}>send</span>
          Kirim Pesan Uji Coba
        </h2>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1 1 200px' }}>
            <label>Nomor Tujuan (Contoh: 08123...)</label>
            <input 
              type="text" 
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              className="form-control"
              placeholder="08xxxxxxxxxx"
            />
          </div>
          <div className="form-group" style={{ flex: '2 1 400px' }}>
            <label>Pesan</label>
            <input 
              type="text" 
              value={testMessage}
              onChange={e => setTestMessage(e.target.value)}
              className="form-control"
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={handleSendTest}
              disabled={isLoading || settings.is_enabled === 0}
              className="btn btn-primary"
              style={{ padding: '0.8rem 2rem', borderRadius: '8px', height: '42px', opacity: settings.is_enabled === 0 ? 0.5 : 1 }}
            >
              Kirim Test
            </button>
          </div>
        </div>
        {settings.is_enabled === 0 && (
          <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '10px' }}>* WA Gateway harus diaktifkan dan disimpan terlebih dahulu sebelum mengirim test.</p>
        )}
      </div>

    </div>
  );
};

export default WhatsAppGateway;
