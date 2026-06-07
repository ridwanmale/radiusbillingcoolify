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
    <div style={{ 
      backgroundColor: '#010102', 
      minHeight: '100vh', 
      color: '#f7f8f8', 
      fontFamily: 'Inter, SF Pro Display, -apple-system, sans-serif',
      padding: '48px 32px'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        <header style={{ marginBottom: '48px' }}>
          <h1 style={{ 
            fontSize: '40px', 
            fontWeight: 600, 
            lineHeight: 1.15, 
            letterSpacing: '-1.0px', 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span className="material-symbols-rounded" style={{ color: '#5e6ad2', fontSize: '36px' }}>forum</span>
            WhatsApp Gateway Hub
          </h1>
          <p style={{ 
            color: '#d0d6e0', 
            fontSize: '20px', 
            fontWeight: 400, 
            lineHeight: 1.4, 
            letterSpacing: '-0.2px',
            marginTop: '16px',
            maxWidth: '600px'
          }}>
            Pilih engine pengiriman pesan. Gunakan API Pihak Ketiga untuk server ringan, atau Internal Engine untuk pengiriman gratis dari nomor Anda sendiri.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          
          {/* Settings Panel */}
          <div style={{ 
            backgroundColor: '#0f1011', 
            border: '1px solid #23252a', 
            borderRadius: '12px', 
            padding: '24px' 
          }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: 500, 
              lineHeight: 1.25, 
              letterSpacing: '-0.4px', 
              margin: '0 0 24px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span className="material-symbols-rounded" style={{ color: '#8a8f98', fontSize: '20px' }}>settings</span>
              Konfigurasi Utama
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                cursor: 'pointer',
                fontSize: '16px',
                color: '#f7f8f8'
              }}>
                <input 
                  type="checkbox" 
                  checked={settings.is_enabled === 1}
                  onChange={(e) => setSettings({...settings, is_enabled: e.target.checked ? 1 : 0})}
                  style={{ 
                    width: '18px', 
                    height: '18px', 
                    accentColor: '#5e6ad2',
                    cursor: 'pointer'
                  }}
                />
                Aktifkan WhatsApp Gateway
              </label>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: 500, 
                color: '#d0d6e0', 
                marginBottom: '8px' 
              }}>Pilih Provider Engine</label>
              <select 
                value={settings.provider_type} 
                onChange={(e) => setSettings({...settings, provider_type: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  backgroundColor: '#0f1011', 
                  color: '#f7f8f8', 
                  border: '1px solid #34343a', 
                  borderRadius: '8px',
                  fontSize: '16px',
                  lineHeight: 1.5,
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.border = '1px solid #5e69d1'}
                onBlur={(e) => e.target.style.border = '1px solid #34343a'}
              >
                <option value="baileys">Internal Engine (Baileys - Gratis)</option>
                <option value="fonnte">API Fonnte (Ringan di Server)</option>
                <option value="wablas">API Wablas</option>
                <option value="watzap">API Watzap</option>
                <option value="ruangwa">API RuangWA</option>
              </select>
            </div>

            {settings.provider_type !== 'baileys' && (
              <>
                {settings.provider_type === 'wablas' && (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: 500, 
                      color: '#d0d6e0', 
                      marginBottom: '8px' 
                    }}>API URL Endpoint (Khusus Wablas)</label>
                    <input 
                      type="text" 
                      value={settings.api_url}
                      onChange={(e) => setSettings({...settings, api_url: e.target.value})}
                      placeholder="Contoh: https://kudus.wablas.com"
                      style={{ 
                        width: '100%', 
                        padding: '8px 12px', 
                        backgroundColor: '#0f1011', 
                        color: '#f7f8f8', 
                        border: '1px solid #34343a', 
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.border = '1px solid #5e69d1';
                        e.target.style.boxShadow = '0 0 0 2px rgba(94, 105, 209, 0.5)';
                      }}
                      onBlur={(e) => {
                        e.target.style.border = '1px solid #34343a';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                )}
                
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: 500, 
                    color: '#d0d6e0', 
                    marginBottom: '8px' 
                  }}>API Token / Key</label>
                  <input 
                    type="text" 
                    value={settings.api_token}
                    onChange={(e) => setSettings({...settings, api_token: e.target.value})}
                    placeholder="Masukkan Token / Key dari Provider"
                    style={{ 
                      width: '100%', 
                      padding: '8px 12px', 
                      backgroundColor: '#0f1011', 
                      color: '#f7f8f8', 
                      border: '1px solid #34343a', 
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '1px solid #5e69d1';
                      e.target.style.boxShadow = '0 0 0 2px rgba(94, 105, 209, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid #34343a';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </>
            )}

            <button 
              onClick={handleSave} 
              disabled={isLoading}
              style={{ 
                width: '100%', 
                padding: '8px 14px', 
                backgroundColor: '#5e6ad2', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '8px', 
                fontSize: '14px', 
                fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#828fff'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#5e6ad2'}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>save</span>
              {isLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>

          {/* Engine Status Panel */}
          {settings.provider_type === 'baileys' ? (
            <div style={{ 
              backgroundColor: '#0f1011', 
              border: '1px solid #23252a', 
              borderRadius: '12px', 
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: 500, 
                lineHeight: 1.25, 
                letterSpacing: '-0.4px', 
                margin: '0 0 24px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%'
              }}>
                <span className="material-symbols-rounded" style={{ color: '#8a8f98', fontSize: '20px' }}>memory</span>
                Internal Engine Status
              </h2>
              
              <div style={{ 
                padding: '12px', 
                borderRadius: '6px', 
                backgroundColor: status.isConnected ? 'rgba(39, 166, 68, 0.1)' : '#141516',
                border: status.isConnected ? '1px solid rgba(39, 166, 68, 0.3)' : '1px solid #34343a',
                color: status.isConnected ? '#27a644' : '#8a8f98',
                width: '100%',
                textAlign: 'center',
                fontWeight: 500,
                fontSize: '14px',
                marginBottom: '24px'
              }}>
                {status.isConnected ? '● TERHUBUNG' : '○ TERPUTUS'}
              </div>

              {!status.isConnected && !status.qrBase64 && (
                <button 
                  onClick={handleStartBaileys}
                  style={{ 
                    backgroundColor: '#0f1011', 
                    color: '#f7f8f8', 
                    border: '1px solid #34343a', 
                    padding: '8px 14px', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'border 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.border = '1px solid #62666d'}
                  onMouseOut={(e) => e.currentTarget.style.border = '1px solid #34343a'}
                >
                  Nyalakan Engine & Minta QR
                </button>
              )}

              {status.qrBase64 && !status.isConnected && (
                <div style={{ 
                  backgroundColor: '#ffffff', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  marginBottom: '16px' 
                }}>
                  <img src={status.qrBase64} alt="QR Code" style={{ width: '240px', height: '240px', display: 'block' }} />
                  <p style={{ 
                    color: '#010102', 
                    textAlign: 'center', 
                    fontSize: '13px', 
                    marginTop: '12px', 
                    fontWeight: 500 
                  }}>
                    Scan QR via WhatsApp perangkat tautan
                  </p>
                </div>
              )}

              {status.isConnected && (
                <button 
                  onClick={handleStopBaileys}
                  style={{ 
                    backgroundColor: '#141516', 
                    color: '#d0d6e0', 
                    border: '1px solid #3e3e44', 
                    padding: '8px 14px', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#18191a'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#141516'}
                >
                  Logout & Matikan Engine
                </button>
              )}
            </div>
          ) : (
            <div style={{ 
              backgroundColor: '#0f1011', 
              border: '1px solid #23252a', 
              borderRadius: '12px', 
              padding: '48px 32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#62666d', marginBottom: '16px' }}>cloud_done</span>
              <h3 style={{ fontSize: '20px', fontWeight: 400, color: '#f7f8f8', margin: '0 0 8px 0' }}>API Pihak Ketiga Aktif</h3>
              <p style={{ color: '#8a8f98', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                Mesin WhatsApp tidak berjalan di server ini. Semua pesan akan didelegasikan ke provider pilihan Anda. VPS Anda 100% aman dari beban background process.
              </p>
            </div>
          )}

        </div>

        {/* Test Message Panel */}
        <div style={{ 
          backgroundColor: '#0f1011', 
          border: '1px solid #23252a', 
          borderRadius: '12px', 
          padding: '24px', 
          marginTop: '24px' 
        }}>
          <h2 style={{ 
            fontSize: '22px', 
            fontWeight: 500, 
            lineHeight: 1.25, 
            letterSpacing: '-0.4px', 
            margin: '0 0 24px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span className="material-symbols-rounded" style={{ color: '#8a8f98', fontSize: '20px' }}>send</span>
            Kirim Pesan Uji Coba
          </h2>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#d0d6e0', marginBottom: '8px' }}>Nomor Tujuan</label>
              <input 
                type="text" 
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  backgroundColor: '#0f1011', 
                  color: '#f7f8f8', 
                  border: '1px solid #34343a', 
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid #5e69d1';
                  e.target.style.boxShadow = '0 0 0 2px rgba(94, 105, 209, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid #34343a';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <div style={{ flex: '2 1 400px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#d0d6e0', marginBottom: '8px' }}>Pesan</label>
              <input 
                type="text" 
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  backgroundColor: '#0f1011', 
                  color: '#f7f8f8', 
                  border: '1px solid #34343a', 
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid #5e69d1';
                  e.target.style.boxShadow = '0 0 0 2px rgba(94, 105, 209, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid #34343a';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <div>
              <button 
                onClick={handleSendTest}
                disabled={isLoading || settings.is_enabled === 0}
                style={{ 
                  padding: '8px 14px', 
                  backgroundColor: '#0f1011', 
                  color: '#f7f8f8', 
                  border: '1px solid #34343a', 
                  borderRadius: '8px', 
                  fontSize: '14px', 
                  fontWeight: 500,
                  cursor: (isLoading || settings.is_enabled === 0) ? 'not-allowed' : 'pointer',
                  opacity: settings.is_enabled === 0 ? 0.5 : 1,
                  height: '38px',
                  transition: 'border 0.2s'
                }}
                onMouseOver={(e) => { if (settings.is_enabled !== 0 && !isLoading) e.currentTarget.style.border = '1px solid #62666d'; }}
                onMouseOut={(e) => { if (settings.is_enabled !== 0 && !isLoading) e.currentTarget.style.border = '1px solid #34343a'; }}
              >
                Kirim Test
              </button>
            </div>
          </div>
          {settings.is_enabled === 0 && (
            <p style={{ color: '#62666d', fontSize: '13px', marginTop: '12px', marginBottom: 0 }}>
              * WA Gateway harus diaktifkan dan disimpan terlebih dahulu sebelum mengirim test.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppGateway;
