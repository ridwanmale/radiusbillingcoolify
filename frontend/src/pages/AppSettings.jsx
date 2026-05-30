import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const AppSettings = ({ user }) => {
  const [settings, setSettings] = useState({
    hotspot_name: '',
    dns_name: '',
    logo_base64: '',
    app_logo_base64: '',
    cs_phone: '',
    sidebar_color: '#ffffff'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewLogo, setPreviewLogo] = useState(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/settings`);
      const data = await res.json();
      setSettings(data);
      if (data.app_logo_base64) {
        setPreviewLogo(data.app_logo_base64);
      }
    } catch (err) {
      console.error('Gagal mengambil settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setPreviewLogo(base64String);
        setSettings({ ...settings, app_logo_base64: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, admin_username: user?.username || 'admin' })
      });
      if (res.ok) {
        // Also log to activity_log table
        await fetch(`/api/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_username: user?.username || 'admin',
            action: 'Update Settings',
            details: `Mengubah pengaturan branding: ${settings.hotspot_name}`
          })
        });

        toast.success('Pengaturan berhasil disimpan!');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error('Gagal menyimpan pengaturan');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ color: 'white', padding: '2rem' }}>Memuat pengaturan...</div>;

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Pengaturan Aplikasi</h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Kelola identitas visual dan konfigurasi dasar aplikasi</p>
        </div>
      </div>

      <div className="glass-card" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
            {/* Logo Section */}
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '2rem' }}>
              <div style={{
                width: '120px',
                height: '120px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '24px',
                margin: '0 auto 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '2px dashed rgba(255,255,255,0.1)'
              }}>
                {previewLogo ? (
                  <img src={previewLogo} alt="Logo Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.1)' }}>image</span>
                )}
              </div>
              <label className="btn" style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'white',
                cursor: 'pointer',
                display: 'inline-block',
                padding: '0.6rem 1.2rem',
                borderRadius: '10px',
                fontSize: '0.85rem'
              }}>
                GANTI LOGO LOGIN
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '1rem' }}>
                Gunakan gambar PNG/JPG transparan <br /> (Disarankan 512x512px)
              </p>
            </div>

            {/* Config Section */}
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>Nama Hotspot (Sidebar)</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={settings.hotspot_name}
                  onChange={e => setSettings({ ...settings, hotspot_name: e.target.value })}
                  placeholder="Contoh: MyHotspot Radius"
                />
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
                  Nama ini akan muncul di bagian pojok kiri atas aplikasi.
                </p>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>Warna Nama Sidebar</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <input
                    type="color"
                    value={settings.sidebar_color || '#ffffff'}
                    onChange={e => setSettings({ ...settings, sidebar_color: e.target.value })}
                    style={{
                      width: '50px',
                      height: '50px',
                      padding: '0',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      borderRadius: '8px'
                    }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '120px', fontFamily: 'monospace' }}
                    value={settings.sidebar_color}
                    onChange={e => setSettings({ ...settings, sidebar_color: e.target.value })}
                  />
                </div>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
                  Warna teks Hotspot Name pada Sidebar dashboard.
                </p>
              </div>

              <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                  style={{ padding: '0.8rem 2rem', fontWeight: '700' }}
                >
                  {isSaving ? 'Menyimpan...' : 'SIMPAN PERUBAHAN'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppSettings;
