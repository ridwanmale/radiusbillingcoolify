import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const OnlineStoreCenter = () => {
  const [loading, setLoading] = useState(false);

  // --- STATE FOR SETTINGS (Online Store) ---
  const [settings, setSettings] = useState({
    portal_title: 'Wi-Fi Voucher Store',
    portal_description: 'Beli voucher internet instan 24 jam',
    primary_color: '#6366f1',
    qris_static_string: '',
    is_active: true,
    enable_payment_bridge: true,
    enable_midtrans: false,
    enable_duitku: false,
    enable_tripay: false,
    hotspot_login_url: 'http://10.5.50.1/login',
    enable_schedule: false,
    open_time: '08:00',
    close_time: '22:00',
    success_message_html: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/online-store/settings');
      const settingsRes = await res.json();
      if (settingsRes) setSettings(settingsRes);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- HANDLERS (Settings) ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.post('/api/online-store/settings', settings);
      toast.success('Pengaturan disimpan!');
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="online-store-center" style={{ padding: '20px', color: 'white' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.5px', background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Voucher Store Hub
          </h1>
          <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>Manajemen Konfigurasi & Pengaturan Toko Online</p>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <a href="/portal" target="_blank" className="btn-glass" style={{ padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'white', fontWeight: '700' }}>
            <span className="material-symbols-rounded" style={{ color: '#10b981' }}>open_in_new</span> Lihat Toko
          </a>
        </div>
      </div>

      {/* SETTINGS CONTENT */}
      <div className="fade-in">
        <form onSubmit={handleSaveSettings}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '25px' }}>
            {/* PORTAL DESIGN */}
            <div className="glass-card" style={{ padding: '30px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ color: '#818cf8' }}>palette</span>
                Kustomisasi Portal
              </h2>
              
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Judul Portal</label>
                <input type="text" className="form-input-premium" value={settings.portal_title} onChange={e => setSettings({...settings, portal_title: e.target.value})} required />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Deskripsi Toko</label>
                <textarea className="form-input-premium" style={{ height: '80px', resize: 'none' }} value={settings.portal_description} onChange={e => setSettings({...settings, portal_description: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Warna Utama</label>
                  <input type="color" className="form-input-premium" style={{ height: '42px', padding: '2px' }} value={settings.primary_color} onChange={e => setSettings({...settings, primary_color: e.target.value})} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Pesan Sukses (Setelah Pembayaran)</label>
                <div className="quill-dark">
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
                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '5px' }}>Pesan ini akan ditampilkan di halaman voucher setelah pembeli berhasil membayar.</p>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Pesan Luar Jaringan (HTML)</label>
                <div className="quill-dark">
                  <ReactQuill 
                    theme="snow" 
                    value={settings.outside_network_message_html || ''} 
                    onChange={val => setSettings({...settings, outside_network_message_html: val})} 
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
                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '5px' }}>Pesan ini ditampilkan menggantikan teks peringatan default jika pelanggan terdeteksi berada di luar jaringan Wi-Fi Hotspot.</p>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>IP MikroTik / DNS Hotspot</label>
                <input type="text" className="form-input-premium" placeholder="Contoh: 10.5.50.1 atau wifi.hotspot" value={settings.hotspot_login_url} onChange={e => setSettings({...settings, hotspot_login_url: e.target.value})} />
              </div>
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '-10px', marginBottom: '20px' }}>* Cukup isi IP atau DNS saja (Contoh: 10.5.50.1). Sistem akan otomatis mengarahkan ke /login.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Status Toko</label>
                  <select className="form-input-premium" value={settings.is_active ? '1' : '0'} onChange={e => setSettings({...settings, is_active: e.target.value === '1'})}>
                    <option value="1">Buka (Aktif)</option>
                    <option value="0">Tutup (Maintenance)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Scheduler Operasional</label>
                  <select className="form-input-premium" value={settings.enable_schedule ? '1' : '0'} onChange={e => setSettings({...settings, enable_schedule: e.target.value === '1'})}>
                    <option value="0">Nonaktif</option>
                    <option value="1">Aktif</option>
                  </select>
                </div>
              </div>

              {!!settings.enable_schedule && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Jam Buka</label>
                    <input type="time" className="form-input-premium" value={settings.open_time || '08:00'} onChange={e => setSettings({...settings, open_time: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Jam Tutup</label>
                    <input type="time" className="form-input-premium" value={settings.close_time || '22:00'} onChange={e => setSettings({...settings, close_time: e.target.value})} required />
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '12px', display: 'block' }}>Metode Pembayaran Aktif</label>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'enable_payment_bridge', label: 'Payment Bridge', icon: 'account_balance_wallet', color: '#38bdf8' },
                    { id: 'enable_midtrans', label: 'Midtrans', icon: 'account_balance', color: '#10b981' },
                    { id: 'enable_duitku', label: 'Duitku', icon: 'payments', color: '#f59e0b' },
                    { id: 'enable_tripay', label: 'Tripay', icon: 'credit_card', color: '#ec4899' }
                  ].map(method => (
                    <div 
                      key={method.id}
                      onClick={() => setSettings({...settings, [method.id]: !settings[method.id]})}
                      style={{ 
                        flex: 1,
                        minWidth: '140px',
                        padding: '12px',
                        borderRadius: '12px',
                        background: settings[method.id] ? `${method.color}11` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${settings[method.id] ? method.color : 'rgba(255,255,255,0.1)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ color: settings[method.id] ? method.color : '#64748b', fontSize: '20px' }}>{method.icon}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: settings[method.id] ? 'white' : '#94a3b8' }}>{method.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '30px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Data QRIS Statis (String) - Bisa Multi QRIS</label>
                <textarea 
                  className="form-input-premium" 
                  style={{ height: '100px', fontSize: '0.75rem', fontFamily: 'monospace' }} 
                  placeholder="Masukkan string data QRIS Anda... (Pisahkan dengan baris baru/ENTER jika lebih dari satu)"
                  value={settings.qris_static_string} 
                  onChange={e => setSettings({...settings, qris_static_string: e.target.value})} 
                />
                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '8px' }}>* Sistem akan menyuntikkan nominal otomatis ke string ini. Jika Anda memasukkan lebih dari satu (tiap baris), sistem akan memilih secara acak untuk pelanggan.</p>
              </div>

              <button type="submit" disabled={isSaving} className="btn-success-premium" style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '1rem', fontWeight: '800' }}>
                {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>

            {/* PREVIEW / TIPS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <div className="glass-card" style={{ padding: '25px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '15px', color: '#38bdf8' }}>Status Integrasi</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <span className="material-symbols-rounded" style={{ color: '#10b981' }}>check_circle</span>
                  <span style={{ fontSize: '0.9rem' }}>Payment Bridge Aktif</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5' }}>
                  Otomatisasi pembayaran kini dikelola sepenuhnya melalui <strong>Payment Bridge Center</strong>. Pastikan perangkat Android Anda terhubung dan berstatus online untuk memproses transaksi secara otomatis.
                </p>
              </div>

              <div className="glass-card" style={{ padding: '25px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '10px' }}>Petunjuk Cepat</h3>
                <ul style={{ fontSize: '0.8rem', color: '#94a3b8', paddingLeft: '18px', lineHeight: '1.6' }}>
                  <li>Judul Portal akan muncul di halaman depan pelanggan.</li>
                  <li>Warna Utama akan menyesuaikan tombol & aksen portal.</li>
                  <li>Sistem menggunakan kode unik 1-200 untuk validasi otomatis.</li>
                  <li>Pastikan string QRIS memiliki tag 5802ID untuk nominal otomatis.</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .online-store-center { animation: fadeIn 0.5s ease-out; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .glass-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; }
        
        .btn-glass { background: rgba(255, 255, 255, 0.05); color: white; border: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer; transition: all 0.2s; }
        .btn-glass:hover { background: rgba(255, 255, 255, 0.1); }
        
        .form-input-premium { width: 100%; padding: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); borderRadius: 10px; color: white; outline: none; transition: border 0.3s; }
        .form-input-premium:focus { border-color: #10b981; }
        .form-input-premium option { background-color: #1e1e24; color: white; }
        
        .btn-success-premium { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2); }
        .btn-success-premium:hover { transform: translateY(-2px); }
        .btn-success-premium:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-danger-small { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); cursor: pointer; border-radius: 8px; font-weight: 700; transition: all 0.2s; }
        .btn-danger-small:hover { background: #ef4444; color: white; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }

        .quill-dark .ql-toolbar { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-top-left-radius: 8px; border-top-right-radius: 8px; }
        .quill-dark .ql-toolbar .ql-stroke { stroke: #94a3b8; }
        .quill-dark .ql-toolbar .ql-fill { fill: #94a3b8; }
        .quill-dark .ql-toolbar .ql-picker { color: #94a3b8; }
        .quill-dark .ql-toolbar button:hover .ql-stroke { stroke: white; }
        .quill-dark .ql-container { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.1); border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; color: white; min-height: 100px; font-size: 0.9rem; }
      `}} />
    </div>
  );
};

export default OnlineStoreCenter;
