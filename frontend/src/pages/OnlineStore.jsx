import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { formatDateTime } from '../utils/dateFormatter';

const OnlineStore = () => {
  const [settings, setSettings] = useState({
    portal_title: 'Wi-Fi Voucher Store',
    portal_description: 'Beli voucher internet instan 24 jam',
    primary_color: '#6366f1',
    qris_static_string: '',
    notification_token: '',
    is_active: true,
    enable_schedule: false,
    open_time: '08:00',
    close_time: '22:00',
    success_message_html: ''
  });
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchOnlineData = async () => {
    const host = window.location.hostname;
    try {
      const [settingsRes, transRes] = await Promise.all([
        fetch(`/api/online-store/settings`).then(r => r.json()),
        fetch(`/api/transactions`).then(r => r.json()) // Existing transactions route
      ]);
      if (settingsRes) setSettings(settingsRes);
      if (Array.isArray(transRes)) setTransactions(transRes.slice(0, 10)); // Top 10
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlineData();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const host = window.location.hostname;
    try {
      const res = await fetch(`/api/online-store/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        toast.success('Pengaturan Online Store berhasil disimpan!');
      } else {
        toast.error('Gagal menyimpan pengaturan.');
      }
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const generateToken = () => {
    const token = Math.random().toString(36).substr(2, 16).toUpperCase();
    setSettings({ ...settings, notification_token: token });
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  return (
    <div className="online-store-admin" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Online Voucher Store</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Kelola penjualan voucher otomatis via QRIS</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <a 
              href="/portal" 
              target="_blank" 
              rel="noreferrer" 
              className="btn" 
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                color: 'white', 
                border: '1px solid rgba(255, 255, 255, 0.1)', 
                borderRadius: '50px', 
                padding: '0.6rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textDecoration: 'none'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#10b981' }}>open_in_new</span> Lihat Portal
            </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        
        {/* SETTINGS CARD */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)' }}>palette</span>
            Tampilan & Konfigurasi Portal
          </h2>
          
          <form onSubmit={handleSaveSettings}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Judul Portal</label>
              <input type="text" className="form-input" value={settings.portal_title} onChange={e => setSettings({...settings, portal_title: e.target.value})} required />
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Deskripsi / Slogan</label>
              <textarea className="form-input" style={{ height: '80px', resize: 'none' }} value={settings.portal_description} onChange={e => setSettings({...settings, portal_description: e.target.value})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                    <label className="form-label">Warna Utama</label>
                    <input type="color" className="form-input" style={{ height: '42px', padding: '2px' }} value={settings.primary_color} onChange={e => setSettings({...settings, primary_color: e.target.value})} />
                </div>
                <div className="form-group">
                    <label className="form-label">Status Toko</label>
                    <select className="form-input" value={settings.is_active ? '1' : '0'} onChange={e => setSettings({...settings, is_active: e.target.value === '1'})}>
                        <option value="1">Buka (Aktif)</option>
                        <option value="0">Tutup (Maintenance)</option>
                    </select>
                </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Pesan Sukses (Setelah Pembayaran)</label>
              <div style={{ background: 'white', borderRadius: '8px', color: 'black' }}>
                <ReactQuill 
                  theme="snow" 
                  value={settings.success_message_html || ''} 
                  onChange={val => setSettings({...settings, success_message_html: val})} 
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'align': [] }],
                      ['clean']
                    ]
                  }}
                />
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Pesan ini akan ditampilkan di halaman voucher setelah pembeli berhasil membayar.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--accent-primary)' }}>schedule</span>
                Scheduler Jam Operasional
              </h3>
              
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={!!settings.enable_schedule} 
                    onChange={e => setSettings({...settings, enable_schedule: e.target.checked})} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  Aktifkan Scheduler Jam Operasional
                </label>
              </div>

              {settings.enable_schedule && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Jam Buka</label>
                    <input 
                      type="time" 
                      className="form-input" 
                      value={settings.open_time || '08:00'} 
                      onChange={e => setSettings({...settings, open_time: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jam Tutup</label>
                    <input 
                      type="time" 
                      className="form-input" 
                      value={settings.close_time || '22:00'} 
                      onChange={e => setSettings({...settings, close_time: e.target.value})} 
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">QRIS Static String (Raw Data)</label>
              <textarea 
                className="form-input" 
                style={{ height: '100px', fontSize: '0.75rem', fontFamily: 'monospace' }} 
                placeholder="00020101021126570011ID.CO.QRIS.WWW0215ID10202213768850303ID.CO.QRIS.WWW..."
                value={settings.qris_static_string} 
                onChange={e => setSettings({...settings, qris_static_string: e.target.value})} 
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                * Dapatkan string ini dengan melakukan scan QRIS statis Anda menggunakan aplikasi 'QR Scanner'.
              </p>
            </div>

            <button 
              type="submit" 
              className="btn" 
              style={{ 
                width: '100%', 
                background: 'rgba(255, 255, 255, 0.03)', 
                color: '#3b82f6', 
                border: '1px solid rgba(59, 130, 246, 0.2)', 
                borderRadius: '50px', 
                padding: '0.8rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              disabled={isSaving}
              onMouseOver={e => !isSaving && (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)')}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>save</span>
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Portal'}
            </button>
          </form>
        </div>

        {/* NOTIFICATION LISTENER INFO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="material-symbols-rounded" style={{ color: '#10b981' }}>notifications_active</span>
                    Notification Listener (Otomatisasi)
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                    Agar sistem bisa mendeteksi pembayaran, Anda perlu menginstal aplikasi <strong>Notification Forwarder</strong> di HP Anda dan arahkan ke URL Webhook di bawah ini:
                </p>
                
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Webhook URL</label>
                    <div style={{ background: '#000', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', color: '#4ade80', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        http://{window.location.hostname}:5000/api/online-store/webhook-notification
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Security Token</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" className="form-input" style={{ fontFamily: 'monospace' }} value={settings.notification_token} readOnly />
                        <button 
                          className="btn" 
                          onClick={generateToken} 
                          style={{ 
                            background: 'rgba(255, 255, 255, 0.05)', 
                            color: 'white', 
                            border: '1px solid rgba(255, 255, 255, 0.1)', 
                            borderRadius: '50px', 
                            padding: '0.5rem 1.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#10b981' }}>autorenew</span>
                          Generate
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '0.75rem' }}>
                    <strong>Cara Setup:</strong> Masukkan URL & Token di atas pada aplikasi forwarder notifikasi di HP Anda. Setiap kali ada notifikasi uang masuk, sistem akan memprosesnya.
                </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '1rem' }}>💡 Tips Penjualan</h3>
                <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                    <li>Gunakan warna primer yang kontras dengan latar belakang.</li>
                    <li>Pastikan nominal unik (Rp 1 - Rp 500) sudah diatur untuk akurasi.</li>
                    <li>Uji coba dengan nominal kecil sebelum dipublikasikan.</li>
                </ul>
            </div>
        </div>

      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="glass-card" style={{ marginTop: '2.5rem', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.5rem' }}>Transaksi Terbaru</h2>
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>ORDER ID</th>
                        <th>WAKTU</th>
                        <th>PELANGGAN</th>
                        <th>NOMINAL</th>
                        <th>STATUS</th>
                        <th>VOUCHER</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada transaksi online.</td></tr>
                    ) : (
                        transactions.map((t, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 'bold' }}>{t.order_id}</td>
                                <td style={{ fontSize: '0.8rem' }}>{formatDateTime(t.created_at)}</td>
                                <td>{t.customer_name || 'Anonymous'}</td>
                                <td>{formatRupiah(t.total_amount)}</td>
                                <td>
                                    <span className={`badge ${t.status === 'PAID' ? 'success' : 'warning'}`}>
                                        {t.status}
                                    </span>
                                </td>
                                <td><code style={{ color: '#10b981' }}>{t.voucher_code || '-'}</code></td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .badge.success { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .badge.warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
      `}</style>
    </div>
  );
};

export default OnlineStore;
