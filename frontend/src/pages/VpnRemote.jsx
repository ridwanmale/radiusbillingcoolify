import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const VpnRemote = () => {
  const [peers, setPeers] = useState([]);
  const [l2tpAccounts, setL2tpAccounts] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({ vpn_ip_pool: '', vpn_local_ip: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    psk: 'radius_vpn_secret',
    status: 'Aktif'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const host = window.location.hostname;
    try {
      const [peersRes, l2tpRes, settingsRes] = await Promise.all([
        fetch(`/api/vpn/peers`).then(r => r.json()),
        fetch(`/api/vpn/l2tp`).then(r => r.json()),
        fetch(`/api/vpn/settings`).then(r => r.json())
      ]);
      
      if (peersRes.peers) setPeers(peersRes.peers);
      if (Array.isArray(l2tpRes)) setL2tpAccounts(l2tpRes);
      if (settingsRes) setGlobalSettings(settingsRes);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data VPN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const host = window.location.hostname;
    const url = editingId ? `/api/vpn/l2tp/${editingId}` : `/api/vpn/l2tp`;
    const method = editingId ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setEditingId(null);
        setFormData({ username: '', password: '', psk: 'radius_vpn_secret', status: 'Aktif' });
        fetchData();
      }
    } catch (err) {
      alert('Gagal menyimpan data');
    }
  };

  const handleSaveGlobal = async (e) => {
    e.preventDefault();
    const host = window.location.hostname;
    try {
      const res = await fetch(`/api/vpn/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(globalSettings)
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setShowSettingsModal(false);
      }
    } catch (err) {
      alert('Gagal menyimpan pengaturan');
    }
  };

  const toggleStatus = async (acc) => {
    const newStatus = acc.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const host = window.location.hostname;
    try {
      const res = await fetch(`/api/vpn/l2tp/${acc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...acc, status: newStatus })
      });
      if (res.ok) fetchData();
    } catch (err) {
      alert('Gagal mengubah status');
    }
  };

  const handleDelete = async (id) => {
    triggerConfirm('Hapus akun VPN ini?', async () => {
      const host = window.location.hostname;
    try {
      const res = await fetch(`/api/vpn/l2tp/${id}`, { method: 'DELETE' });
        if (res.ok) fetchData();
      } catch (err) {
        alert('Gagal menghapus data');
      }
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Script MikroTik berhasil disalin!');
  };

  const generateL2tpScript = (acc) => {
    const host = window.location.hostname;
    return `/interface l2tp-client\nadd connect-to=${host} disabled=no name=VPN-${acc.username} password=${acc.password} user=${acc.username} use-ipsec=yes ipsec-secret=${acc.psk}`;
  };

  return (
    <div className="vpn-remote-container" style={{ animation: 'fadeIn 0.6s ease-out' }}>
      {/* HEADER SECTION */}
      <div className="page-header" style={{ marginBottom: '2.5rem', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>VPN Management</h1>
          <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '1.2rem', color: '#10b981' }}>check_circle</span>
            Infrastruktur Tunneling MikroTik Terpusat
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn" 
            onClick={() => setShowSettingsModal(true)}
            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span className="material-symbols-rounded">settings</span> Pool IP
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setEditingId(null);
              setFormData({ username: '', password: '', psk: 'radius_vpn_secret', status: 'Aktif' });
              setShowModal(true);
            }} 
            style={{ 
              color: 'white',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '180px',
              height: '48px',
              borderRadius: '8px', /* rounded.md = 8px */
              fontSize: '0.95rem',
              fontWeight: '700',
              boxShadow: '0 8px 20px rgba(233, 30, 99, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            <span className="material-symbols-rounded">add_circle</span> Tambah Akun
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* L2TP ACCOUNTS SECTION */}
          <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-rounded" style={{ color: '#3b82f6', fontSize: '1.4rem' }}>settings_ethernet</span>
                </div>
                Daftar Akun L2TP/IPsec (ROS v6)
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pool: {globalSettings.vpn_ip_pool}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Gateway: {globalSettings.vpn_local_ip}</span>
              </div>
            </div>

            <div className="table-container" style={{ background: 'transparent' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0 1rem 1rem', border: 'none', background: 'transparent' }}>Username</th>
                    <th style={{ padding: '0 1rem 1rem', border: 'none', background: 'transparent' }}>Kredensial</th>
                    <th style={{ padding: '0 1rem 1rem', border: 'none', background: 'transparent' }}>Status</th>
                    <th style={{ padding: '0 1rem 1rem', border: 'none', background: 'transparent', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {l2tpAccounts.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>cloud_off</span>
                        Belum ada akun VPN yang dibuat.
                      </td>
                    </tr>
                  ) : (
                    l2tpAccounts.map(acc => (
                      <tr key={acc.id} className="hover-row" style={{ background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s ease' }}>
                        <td style={{ padding: '1.2rem 1rem', borderRadius: '12px 0 0 12px', fontWeight: '700' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }}>account_circle</span>
                            {acc.username}
                          </div>
                        </td>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Pass: <code style={{ color: '#4ade80' }}>{acc.password}</code></div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>PSK: <code style={{ color: '#fbbf24' }}>{acc.psk}</code></div>
                          </div>
                        </td>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          <div 
                            onClick={() => toggleStatus(acc)}
                            className={`status-chip ${acc.status === 'Aktif' ? 'active' : 'inactive'}`}
                            style={{ cursor: 'pointer' }}
                          >
                            <span className="dot"></span>
                            {acc.status}
                          </div>
                        </td>
                        <td style={{ padding: '1.2rem 1rem', borderRadius: '0 12px 12px 0', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="action-btn" title="Salin Script" onClick={() => copyToClipboard(generateL2tpScript(acc))} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                              <span className="material-symbols-rounded">content_copy</span>
                            </button>
                            <button className="action-btn" title="Edit" onClick={() => {
                              setEditingId(acc.id);
                              setFormData({ username: acc.username, password: acc.password, psk: acc.psk, status: acc.status });
                              setShowModal(true);
                            }} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                              <span className="material-symbols-rounded">edit</span>
                            </button>
                            <button className="action-btn" title="Hapus" onClick={() => handleDelete(acc.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                              <span className="material-symbols-rounded">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* WIREGUARD PEERS */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-rounded" style={{ color: '#10b981', fontSize: '1.2rem' }}>lan</span>
              </div>
              WireGuard Peer Status (ROS v7)
            </h2>
            {isLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Memuat data...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {peers.map((peer, i) => (
                  <div key={i} className="peer-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{peer.id.toUpperCase()}</span>
                      <span className="status-badge">ONLINE</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>VPN Address: <span style={{ color: '#10b981' }}>{peer.address.split('/')[0]}</span></div>
                    <code className="key-code">{peer.publicKey}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-card info-card">
            <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: '#fbbf24' }}>lightbulb</span>
              Tips MikroTik
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Hindari bentrok IP dengan mengatur <strong>IP Pool VPN</strong> ke segmen yang tidak digunakan di MikroTik pusat maupun cabang.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(94, 106, 210, 0.05)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '1rem' }}>Status Layanan</h3>
            <div className="protocol-item active">
              <span className="material-symbols-rounded">check_circle</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>WireGuard Server</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Running on Port 51820</div>
              </div>
            </div>
            <div className="protocol-item active">
              <span className="material-symbols-rounded">check_circle</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>L2TP / IPsec</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Running on Port 500/4500</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL ACCOUNT */}
      <div className={`modal-overlay ${showModal ? 'open' : ''}`} onClick={() => setShowModal(false)}>
        <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '450px', padding: '2.5rem' }}>
          <div className="modal-header" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>{editingId ? 'Edit Akun VPN' : 'Buat Akun VPN'}</h2>
            <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleSave}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Username MikroTik</label>
              <input type="text" className="form-input" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">VPN Password</label>
              <input type="text" className="form-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">IPsec Pre-Shared Key</label>
              <input type="text" className="form-input" value={formData.psk} onChange={e => setFormData({...formData, psk: e.target.value})} required />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white' }}>Batal</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, background: 'var(--accent-primary)', color: 'white' }}>Simpan Akun</button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL SETTINGS */}
      <div className={`modal-overlay ${showSettingsModal ? 'open' : ''}`} onClick={() => setShowSettingsModal(false)}>
        <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '450px', padding: '2.5rem' }}>
          <div className="modal-header" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Pengaturan IP Pool VPN</h2>
            <button className="modal-close" onClick={() => setShowSettingsModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleSaveGlobal}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Subnet IP Pool (CIDR)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Contoh: 10.10.10.0/24"
                value={globalSettings.vpn_ip_pool} 
                onChange={e => setGlobalSettings({...globalSettings, vpn_ip_pool: e.target.value})} 
                required 
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '5px' }}>* Segmen IP yang akan diberikan ke MikroTik client.</p>
            </div>
            <div className="form-group" style={{ marginBottom: '2.5rem' }}>
              <label className="form-label">Gateway Server IP</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Contoh: 10.10.10.1"
                value={globalSettings.vpn_local_ip} 
                onChange={e => setGlobalSettings({...globalSettings, vpn_local_ip: e.target.value})} 
                required 
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '5px' }}>* IP internal server VPN (biasanya IP pertama di subnet).</p>
            </div>
            <div style={{ 
              background: 'rgba(245, 158, 11, 0.08)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(245, 158, 11, 0.3)', 
              marginBottom: '2rem',
              animation: 'pulse 2s infinite'
            }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                 <span className="material-symbols-rounded" style={{ color: '#f59e0b', fontSize: '1.8rem' }}>warning</span>
                 <strong style={{ color: '#f59e0b', fontSize: '0.9rem' }}>PENTING: RESTART DIPERLUKAN</strong>
               </div>
               <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '12px' }}>
                 Perubahan IP Pool mengubah konfigurasi inti server. Setelah menyimpan, jalankan perintah ini di terminal Anda:
               </p>
               <div style={{ background: '#000', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <code style={{ fontSize: '0.75rem', color: '#4ade80' }}>docker-compose up -d vpn-l2tp</code>
                 <button type="button" onClick={() => copyToClipboard('docker-compose up -d vpn-l2tp')} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer' }}>
                   <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>content_copy</span>
                 </button>
               </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn" onClick={() => setShowSettingsModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white' }}>Batal</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, background: '#3b82f6', color: 'white', border: 'none' }}>Simpan & Terapkan</button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
        .hover-row:hover { background: rgba(255,255,255,0.05) !important; transform: scale(1.002); }
        .action-btn { width: 34px; height: 34px; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .action-btn:hover { transform: translateY(-2px); filter: brightness(1.2); }
        .peer-box { background: rgba(0,0,0,0.2); padding: 1.2rem; border-radius: 14px; border: 1px solid rgba(255,255,255,0.03); }
        .status-badge { font-size: 0.65rem; font-weight: 800; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 2px 8px; borderRadius: 4px; }
        .key-code { display: block; background: #000; padding: 6px; border-radius: 6px; font-size: 0.7rem; color: #a08a90; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 8px; border: 1px solid rgba(255,255,255,0.05); }
        .protocol-item { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); margin-bottom: 10px; }
        .protocol-item.active { background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; }
        .protocol-item.active .material-symbols-rounded { color: #10b981; }
        .status-chip { display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; transition: all 0.3s; }
        .status-chip.active { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
        .status-chip.inactive { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .status-chip .dot { width: 6px; height: 6px; border-radius: 50%; }
        .status-chip.active .dot { background: #10b981; box-shadow: 0 0 8px #10b981; }
        .status-chip.inactive .dot { background: #ef4444; }
      `}</style>
    
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};

export default VpnRemote;
