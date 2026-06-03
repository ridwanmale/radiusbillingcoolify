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
    success_message_html: '',
    auto_cleanup_enabled: true,
    auto_cleanup_hours: 24,
    spam_protection_enabled: true,
    spam_max_pending: 3
  });
  const [spamBlocklist, setSpamBlocklist] = useState([]);
  const [activeTab, setActiveTab] = useState('pengaturan');
  const [isSaving, setIsSaving] = useState(false);
  const [qrisList, setQrisList] = useState([{ name: 'QRIS Utama', payload: '' }]);
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [editingQrisIndex, setEditingQrisIndex] = useState(-1);
  const [tempQris, setTempQris] = useState({ name: '', payload: '' });

  // --- DATA FETCHING ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/online-store/settings');
      const settingsRes = await res.json();
      if (settingsRes) {
        setSettings(settingsRes);
        let initialQrisList = [];
        try {
          initialQrisList = JSON.parse(settingsRes.qris_static_string);
          if (!Array.isArray(initialQrisList)) throw new Error('Not array');
        } catch (e) {
          if (settingsRes.qris_static_string) {
            initialQrisList = settingsRes.qris_static_string.split('\n').filter(Boolean).map((p, i) => ({ name: `QRIS ${i+1}`, payload: p.trim() }));
          } else {
            initialQrisList = [{ name: 'QRIS Utama', payload: '' }];
          }
        }
        setQrisList(initialQrisList);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Gagal mengambil data');
    }

    try {
      const resBlocklist = await fetch('/api/online-store/spam-blocklist');
      const blocklistData = await resBlocklist.json();
      setSpamBlocklist(Array.isArray(blocklistData) ? blocklistData : []);
    } catch (err) {
      console.error('Failed to fetch blocklist', err);
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
      const stringified = JSON.stringify(qrisList.filter(q => q.payload.trim() !== ''));
      await axios.post('/api/online-store/settings', { ...settings, qris_static_string: stringified });
      toast.success('Pengaturan disimpan!');
      const resBlocklist = await fetch('/api/online-store/spam-blocklist');
      const blocklistData = await resBlocklist.json();
      setSpamBlocklist(Array.isArray(blocklistData) ? blocklistData : []);

    } catch (err) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlock = async (id) => {
    try {
      await axios.delete(`/api/online-store/spam-blocklist/${id}`);
      toast.success('Blokir berhasil dibuka!');
      fetchData();
    } catch (err) {
      toast.error('Gagal membuka blokir');
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

            {/* TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', width: 'fit-content' }}>
        {[
          { id: 'pengaturan', label: 'Pengaturan Portal', icon: 'settings' },
          { id: 'keamanan', label: 'Keamanan & Anti Spam', icon: 'shield' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '12px',
              background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === tab.id ? '#38bdf8' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* SETTINGS CONTENT */}
      <div className="fade-in">
        <form onSubmit={handleSaveSettings}>
          <div style={{ display: activeTab === 'pengaturan' ? 'grid' : 'none', gridTemplateColumns: '1.5fr 1fr', gap: '25px' }}>
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
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Data QRIS Statis (Multi QRIS / Rotasi)</span>
                  <button type="button" onClick={() => { setEditingQrisIndex(-1); setTempQris({ name: '', payload: '' }); setIsQrisModalOpen(true); }} style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold', transition: 'all 0.2s' }}>+ Tambah QRIS</button>
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {qrisList.map((qris, index) => (
                    <div key={index} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
                        <div style={{ width: '35px', height: '35px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-symbols-rounded" style={{ color: '#38bdf8', fontSize: '18px' }}>qr_code_2</span>
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{qris.name || 'QRIS Tanpa Nama'}</div>
                          <div style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>lock</span> Data Tersimpan
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button type="button" onClick={() => { setEditingQrisIndex(index); setTempQris({ ...qris }); setIsQrisModalOpen(true); }} style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '6px', color: '#fbbf24', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Edit QRIS">
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span>
                        </button>
                        <button type="button" onClick={() => { const newList = [...qrisList]; newList.splice(index, 1); setQrisList(newList); }} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Hapus QRIS ini">
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '12px' }}>* Sistem akan menyuntikkan nominal otomatis. Jika ada lebih dari 1 QRIS, sistem akan merotasinya secara acak ke pembeli.</p>
              </div>
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


              <div style={{ display: activeTab === 'keamanan' ? 'block' : 'none' }}>
              {/* SECTION: KEAMANAN & SPAM */}
              <div className="glass-card fade-in" style={{ padding: '25px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                  <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>shield</span>
                  Keamanan & Anti Spam
                </h3>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                  <button type="button" onClick={() => setIsSecurityModalOpen(true)} className="btn-primary-premium" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '10px 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>settings</span>
                    Pengaturan Keamanan
                  </button>
                </div>

                <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#fca5a5' }}>Daftar Perangkat Terblokir</h4>
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                      <tr>
                        <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>IP Address</th>
                        <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Device ID</th>
                        <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Waktu Blokir</th>
                        <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spamBlocklist.length === 0 ? (
                        <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Belum ada perangkat yang terblokir.</td></tr>
                      ) : (
                        spamBlocklist.map(b => (
                          <tr key={b.id}>
                            <td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white' }}>{b.ip_address || '-'}</td>
                            <td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', fontFamily: 'monospace' }}>{b.device_id || '-'}</td>
                            <td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8' }}>{new Date(b.blocked_at).toLocaleString('id-ID')}</td>
                            <td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                              <button type="button" onClick={() => handleUnlock(b.id)} className="btn-success-premium" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}>Unlock</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>


              {activeTab === 'pengaturan' && (
                <button type="submit" disabled={isSaving} className="btn-success-premium" style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '1rem', fontWeight: '800' }}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              )}
        </form>
      </div>

      {/* MODAL QRIS */}
      {isQrisModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '450px', padding: '25px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: '#38bdf8' }}>qr_code_2</span>
              {editingQrisIndex >= 0 ? 'Edit QRIS' : 'Tambah QRIS Baru'}
            </h3>
            
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Nama Pengenal</label>
              <input 
                type="text" 
                className="form-input-premium" 
                placeholder="Misal: DANA Utama, GoPay"
                value={tempQris.name} 
                onChange={e => setTempQris({...tempQris, name: e.target.value})} 
                autoFocus
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>String Payload (000201...)</label>
              <textarea 
                className="form-input-premium" 
                style={{ height: '100px', fontSize: '0.75rem', fontFamily: 'monospace' }} 
                placeholder="Paste string QRIS Anda di sini..."
                value={tempQris.payload} 
                onChange={e => setTempQris({...tempQris, payload: e.target.value})} 
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setIsQrisModalOpen(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>Batal</button>
              <button type="button" onClick={() => {
                if (!tempQris.name || !tempQris.payload) {
                  toast.error('Nama dan Payload harus diisi!');
                  return;
                }
                const newList = [...qrisList];
                if (editingQrisIndex >= 0) {
                  newList[editingQrisIndex] = tempQris;
                } else {
                  newList.push(tempQris);
                }
                setQrisList(newList);
                setIsQrisModalOpen(false);
              }} style={{ flex: 1, padding: '12px', background: '#38bdf8', color: '#0a0a0c', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' }}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KEAMANAN */}
      {isSecurityModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '600px', padding: '25px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>shield</span>
              Pengaturan Keamanan & Anti Spam
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: '600' }}>
                  <input 
                    type="checkbox" 
                    checked={settings.auto_cleanup_enabled} 
                    onChange={e => setSettings({...settings, auto_cleanup_enabled: e.target.checked})} 
                    style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                  />
                  Aktifkan Auto-Cleanup
                </label>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '5px 0 0 26px' }}>Otomatis menghapus transaksi PENDING untuk menghindari penumpukan data.</p>
              </div>
              {settings.auto_cleanup_enabled && (
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Hapus transaksi lebih tua dari (Jam)</label>
                  <input 
                    type="number" 
                    className="form-input-premium" 
                    value={settings.auto_cleanup_hours || 24} 
                    onChange={e => setSettings({...settings, auto_cleanup_hours: parseInt(e.target.value)})} 
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: '600' }}>
                  <input 
                    type="checkbox" 
                    checked={settings.spam_protection_enabled} 
                    onChange={e => setSettings({...settings, spam_protection_enabled: e.target.checked})} 
                    style={{ width: '18px', height: '18px', accentColor: '#ef4444' }}
                  />
                  Aktifkan Proteksi Spam (Rate Limit)
                </label>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '5px 0 0 26px' }}>Memblokir perangkat yang membuat banyak transaksi PENDING berturut-turut.</p>
              </div>
              {settings.spam_protection_enabled && (
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Batas Maksimal Transaksi PENDING</label>
                  <input 
                    type="number" 
                    className="form-input-premium" 
                    value={settings.spam_max_pending || 3} 
                    onChange={e => setSettings({...settings, spam_max_pending: parseInt(e.target.value)})} 
                  />
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setIsSecurityModalOpen(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>Batal</button>
              <button type="button" onClick={(e) => { setIsSecurityModalOpen(false); handleSaveSettings(e); }} style={{ flex: 1, padding: '12px', background: '#38bdf8', color: '#0a0a0c', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' }}>Simpan Pengaturan</button>
            </div>
          </div>
        </div>
      )}

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
