import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const SettingTelegram = ({ user }) => {
  const [configs, setConfigs] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('Telegram Admin');
  const [formData, setFormData] = useState({
    bot_token: '',
    chat_id: '',
    is_enabled: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState(null);

  const fetchConfigs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/settings/telegram`);
      if (!res.ok) throw new Error('Gagal mengambil data dari server');
      
      const data = await res.json();
      if (Array.isArray(data)) {
        setConfigs(data);
        const current = data.find(c => c.outlet_name === selectedOutlet) || data[0];
        if (current) {
          setSelectedOutlet(current.outlet_name);
          setFormData({
            bot_token: current.bot_token || '',
            chat_id: current.chat_id || '',
            is_enabled: !!current.is_enabled
          });
        }
      } else {
        throw new Error('Format data tidak valid');
      }
    } catch (err) {
      console.error('Telegram Config Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Update form data when selectedOutlet changes
  useEffect(() => {
    if (configs.length > 0) {
      const current = configs.find(c => c.outlet_name === selectedOutlet);
      if (current) {
        setFormData({
          bot_token: current.bot_token || '',
          chat_id: current.chat_id || '',
          is_enabled: !!current.is_enabled
        });
      }
    }
  }, [selectedOutlet, configs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/settings/telegram`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_name: selectedOutlet,
          bot_token: formData.bot_token,
          chat_id: formData.chat_id,
          is_enabled: formData.is_enabled ? 1 : 0
        })
      });

      if (!res.ok) throw new Error('Gagal menyimpan konfigurasi');
      toast.success('Konfigurasi Telegram berhasil disimpan');
      fetchConfigs();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    if (!formData.bot_token || !formData.chat_id) {
      toast.warning('Token Bot dan Chat ID harus diisi');
      return;
    }
    setIsTesting(true);
    setTestStatus('Mengirim...');
    try {
      const res = await fetch(`/api/settings/telegram/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_token: formData.bot_token,
          chat_id: formData.chat_id
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus('Sukses! Silakan cek Telegram Anda.');
        toast.success('Notifikasi uji coba berhasil dikirim!');
      } else {
        throw new Error(data.error || 'Gagal mengirim pesan');
      }
    } catch (err) {
      setTestStatus(`Gagal: ${err.message}`);
      toast.error(`Gagal mengirim: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'white' }}>
        <span className="material-symbols-rounded spin" style={{ fontSize: '2rem', marginRight: '10px' }}>sync</span>
        Memuat Konfigurasi...
      </div>
    );
  }

  return (
    <div className="telegram-settings" style={{ color: 'white' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '800', color: 'white' }}>
          Pengaturan Multi-Bot Telegram
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Atur bot yang berbeda untuk setiap Outlet
        </p>
      </div>

      {error && (
        <div style={{ padding: '15px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '10px', color: '#f87171', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px' }}>
        
        {/* Left Column: Form Config */}
        <div className="glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="form-group">
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
              Pilih Outlet
            </label>
            <select 
              value={selectedOutlet} 
              onChange={e => setSelectedOutlet(e.target.value)}
              className="form-input-premium"
              style={{ width: '100%', padding: '12px', background: 'var(--bg-input, rgba(255,255,255,0.05))', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
            >
              {configs.sort((a, b) => a.outlet_name === 'Telegram Admin' ? -1 : 1).map(c => (
                <option key={c.outlet_name} value={c.outlet_name} style={{ background: '#1e1b4b', color: 'white' }}>
                  {c.outlet_name} {c.is_enabled ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>Aktifkan Bot untuk {selectedOutlet}</h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kirim notifikasi untuk outlet ini</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={formData.is_enabled}
                  onChange={e => setFormData({ ...formData, is_enabled: e.target.checked })}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
              Bot Token Telegram
            </label>
            <input 
              type="text" 
              className="form-input-premium" 
              placeholder="Masukkan Token Bot Telegram"
              value={formData.bot_token} 
              onChange={e => setFormData({ ...formData, bot_token: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
              Chat ID Telegram
            </label>
            <input 
              type="text" 
              className="form-input-premium" 
              placeholder="Masukkan Chat ID / Group ID"
              value={formData.chat_id} 
              onChange={e => setFormData({ ...formData, chat_id: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button 
              type="button" 
              onClick={handleTestNotification}
              disabled={isTesting}
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '12px', borderRadius: '10px', fontWeight: '600' }}
            >
              {isTesting ? 'KIRIM...' : 'TES NOTIF'}
            </button>
            <button 
              type="button" 
              onClick={handleSubmit}
              disabled={isSaving}
              className="btn btn-primary" 
              style={{ flex: 2, padding: '12px', borderRadius: '8px', fontWeight: '600', border: 'none', color: 'white' }}
            >
              {isSaving ? 'MENYIMPAN...' : 'SIMPAN'}
            </button>
          </div>

          {testStatus && (
            <p style={{ margin: 0, fontSize: '0.8rem', color: testStatus.startsWith('Sukses') ? '#10b981' : '#ef4444', fontWeight: '600' }}>
              {testStatus}
            </p>
          )}

        </div>

        {/* Right Column: Status Bot per Outlet */}
        <div className="glass-card" style={{ padding: '25px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: '#a78bfa' }}>assignment</span>
            Status Bot per Outlet
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {configs.sort((a, b) => a.outlet_name === 'Telegram Admin' ? -1 : 1).map(c => (
              <div 
                key={c.outlet_name}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '16px', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px' 
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>{c.outlet_name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {c.bot_token ? 'Bot Ready' : 'Belum Diatur'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span 
                    className="badge" 
                    style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: '800', 
                      padding: '4px 8px', 
                      borderRadius: '6px',
                      background: c.is_enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                      color: c.is_enabled ? '#10b981' : 'var(--text-secondary)'
                    }}
                  >
                    {c.is_enabled ? 'AKTIF' : 'OFF'}
                  </span>
                  <button className="btn-glass-edit" 
                    onClick={() => setSelectedOutlet(c.outlet_name)}
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      background: 'rgba(99, 102, 241, 0.15)', 
                      border: 'none', 
                      color: '#a5b4fc', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ color: '#f59e0b', fontSize: '1.1rem' }}>edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .form-input-premium { width: 100%; padding: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; outline: none; }
        .form-input-premium:focus { border-color: #6366f1; }
        .btn-edit:hover { background: rgba(99, 102, 241, 0.3) !important; }
        
        /* Switch slider styling */
        .switch { position: relative; display: inline-block; width: 46px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); transition: .4s; border-radius: 24px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #6366f1; }
        input:focus + .slider { box-shadow: 0 0 1px #6366f1; }
        input:checked + .slider:before { transform: translateX(22px); }
      `}} />
    </div>
  );
};

export default SettingTelegram;

