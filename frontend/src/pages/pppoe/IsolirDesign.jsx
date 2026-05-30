import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const PppoeIsolirDesign = () => {
  const [settings, setSettings] = useState({
    redirect_message: 'Mohon lunasi tagihan Anda',
    custom_message: 'Akses internet Anda ditangguhkan sementara karena ada tunggakan pembayaran.',
    redirect_delay: 5,
    accent_color: '#ef4444',
    cs_contact: '0812-3456-7890',
    redirect_footer: 'Sistem Redirect PPPoE - Radius Billing'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/pppoe/redirect-settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          redirect_message: data.redirect_message || 'Mohon lunasi tagihan Anda',
          custom_message: data.custom_message || '',
          redirect_delay: data.redirect_delay || 5,
          accent_color: data.accent_color || '#ef4444',
          cs_contact: data.cs_contact || '0812-3456-7890',
          redirect_footer: data.redirect_footer || 'Sistem Redirect PPPoE - Radius Billing'
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil pengaturan desain');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/pppoe/redirect-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          admin_username: 'admin'
        })
      });
      if (res.ok) {
        toast.success('Desain halaman isolir berhasil disimpan!');
        fetchSettings();
      } else {
        throw new Error('Gagal menyimpan desain');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ color: 'white', padding: '30px', textAlign: 'center' }}>
        Memuat pengaturan desain...
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', color: 'white' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 8px' }}>Desain Halaman Peringatan Isolir</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
          Sesuaikan judul, pesan, warna aksen, dan kontak bantuan halaman isolir yang dilihat pelanggan.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '30px' }}>
        
        {/* Editor Form */}
        <div className="glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', fontWeight: '700', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded">edit_note</span> Editor Desain
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                Judul Utama Halaman
              </label>
              <input 
                type="text" 
                className="form-input-premium" 
                value={settings.redirect_message}
                onChange={e => setSettings({ ...settings, redirect_message: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                Pesan Peringatan / Deskripsi Tambahan
              </label>
              <textarea 
                className="form-input-premium" 
                rows="4"
                style={{ resize: 'none' }}
                value={settings.custom_message}
                onChange={e => setSettings({ ...settings, custom_message: e.target.value })}
                placeholder="Masukkan pesan peringatan untuk pelanggan..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Warna Aksen Halaman
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={settings.accent_color}
                    onChange={e => setSettings({ ...settings, accent_color: e.target.value })}
                    style={{ border: 'none', width: '42px', height: '42px', borderRadius: '10px', cursor: 'pointer', background: 'transparent' }}
                  />
                  <input 
                    type="text" 
                    className="form-input-premium" 
                    value={settings.accent_color}
                    onChange={e => setSettings({ ...settings, accent_color: e.target.value })}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Kontak Bantuan / CS
                </label>
                <input 
                  type="text" 
                  className="form-input-premium" 
                  value={settings.cs_contact}
                  onChange={e => setSettings({ ...settings, cs_contact: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Teks Footer Halaman
                </label>
                <input 
                  type="text" 
                  className="form-input-premium" 
                  value={settings.redirect_footer}
                  onChange={e => setSettings({ ...settings, redirect_footer: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Countdown (Detik)
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max="60"
                  className="form-input-premium" 
                  value={settings.redirect_delay}
                  onChange={e => setSettings({ ...settings, redirect_delay: parseInt(e.target.value) || 3 })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              <button 
                type="submit" 
                disabled={isSaving}
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontWeight: '600', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                {isSaving ? 'MENYIMPAN...' : 'SIMPAN DESAIN'}
              </button>

              <button 
                type="button" 
                onClick={() => window.open('/api/pppoe/warning-page', '_blank')}
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontWeight: '600', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.3s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>open_in_new</span>
                Buka Preview di Tab Baru
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ margin: '0 0 5px', fontSize: '1.1rem', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded">visibility</span> Live Preview Pelanggan
          </h3>

          <div style={{ 
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
            borderRadius: '20px', 
            padding: '20px', 
            minHeight: '400px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              background: 'white', 
              borderRadius: '16px', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
              width: '100%', 
              maxWidth: '450px',
              border: `3px solid ${settings.accent_color}`,
              overflow: 'hidden',
              fontFamily: 'Segoe UI, Helvetica, sans-serif'
            }}>
              <div style={{ 
                background: settings.accent_color, 
                color: 'white', 
                padding: '20px', 
                textAlign: 'center' 
              }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>⚠️</div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>{settings.redirect_message}</h2>
              </div>

              <div style={{ padding: '20px', color: '#334155' }}>
                <div style={{ 
                  background: '#fff3e0', 
                  borderLeft: `4px solid ${settings.accent_color}`, 
                  padding: '12px', 
                  borderRadius: '6px', 
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  marginBottom: '15px'
                }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 'bold', color: '#1e293b' }}>Pelanggan Yth,</p>
                  <p style={{ margin: 0 }}>{settings.custom_message || 'Akses internet Anda saat ini ditangguhkan sementara karena ada tunggakan pembayaran.'}</p>
                </div>

                <div style={{ 
                  fontSize: '1.8rem', 
                  fontWeight: 'bold', 
                  color: '#3b82f6', 
                  textAlign: 'center', 
                  margin: '15px 0' 
                }}>
                  {settings.redirect_delay}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button 
                    type="button" 
                    onClick={() => window.open('/api/pppoe/pay-invoice', '_blank')}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#22c55e', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Bayar Sekarang
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      let phone = settings.cs_contact || '6281234567890';
                      phone = phone.replace(/\D/g, '');
                      if (phone.startsWith('0')) {
                        phone = '62' + phone.substring(1);
                      }
                      window.open(`https://wa.me/${phone}?text=Halo%20Admin%2C%20layanan%20internet%20saya%20terisolir.%20Mohon%20bantuan%20untuk%20proses%20pembukaan%20isolir.`, '_blank');
                    }}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Hubungi CS
                  </button>
                </div>

                <div style={{ 
                  textAlign: 'center', 
                  marginTop: '20px', 
                  color: '#94a3b8', 
                  fontSize: '0.75rem', 
                  borderTop: '1px solid #e2e8f0', 
                  paddingTop: '15px' 
                }}>
                  <p style={{ margin: '4px 0' }}>{settings.redirect_footer || 'Sistem Redirect PPPoE - Radius Billing'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .form-input-premium { 
          width: 100%; 
          padding: 12px; 
          background: rgba(255, 255, 255, 0.04) !important; 
          border: 1px solid rgba(255, 255, 255, 0.1) !important; 
          border-radius: 10px; 
          color: white !important; 
          outline: none; 
          transition: all 0.3s;
        }
        .form-input-premium:focus { 
          border-color: #6366f1 !important; 
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); 
        }
      `}} />
    </div>
  );
};

export default PppoeIsolirDesign;
