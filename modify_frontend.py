import re

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add States
old_states = "const [spamBlocklist, setSpamBlocklist] = useState([]);"
new_states = '''const [spamBlocklist, setSpamBlocklist] = useState([]);
  const [permanentBlocklist, setPermanentBlocklist] = useState([]);
  const [topSpammers, setTopSpammers] = useState([]);
  const [newUuidBlacklist, setNewUuidBlacklist] = useState('');'''
c = c.replace(old_states, new_states)

# 2. Add fetches
old_fetch = '''const resBlocklist = await fetch('/api/online-store/spam-blocklist');
      const blocklistData = await resBlocklist.json();
      setSpamBlocklist(Array.isArray(blocklistData) ? blocklistData : []);
    } catch (err) {'''
new_fetch = '''const resBlocklist = await fetch('/api/online-store/spam-blocklist');
      const blocklistData = await resBlocklist.json();
      setSpamBlocklist(Array.isArray(blocklistData) ? blocklistData : []);
      
      const resPerm = await fetch('/api/online-store/blacklist-uuid');
      const permData = await resPerm.json();
      setPermanentBlocklist(Array.isArray(permData) ? permData : []);

      const resTop = await fetch('/api/online-store/top-spammers');
      const topData = await resTop.json();
      setTopSpammers(Array.isArray(topData) ? topData : []);
    } catch (err) {'''
c = c.replace(old_fetch, new_fetch)

# 3. Add handlers
old_handlers = '''  const handleUnlock = async (id) => {
    try {
      await axios.delete(/api/online-store/spam-blocklist/);
      toast.success('Blokir berhasil dibuka!');
      fetchData();
    } catch (err) {
      toast.error('Gagal membuka blokir');
    }
  };'''
new_handlers = '''  const handleUnlock = async (id) => {
    try {
      await axios.delete(/api/online-store/spam-blocklist/);
      toast.success('Blokir berhasil dibuka!');
      fetchData();
    } catch (err) {
      toast.error('Gagal membuka blokir');
    }
  };

  const handleAddPermanentBlacklist = async (device_id) => {
    if (!device_id) return toast.error('UUID tidak boleh kosong');
    try {
      await axios.post('/api/online-store/blacklist-uuid', { device_id, reason: 'Diblokir oleh Admin' });
      toast.success('Perangkat berhasil diblokir permanen');
      setNewUuidBlacklist('');
      fetchData();
    } catch (err) {
      toast.error('Gagal menambahkan ke blacklist permanen');
    }
  };

  const handleRemovePermanentBlacklist = async (id) => {
    try {
      await axios.delete(/api/online-store/blacklist-uuid/);
      toast.success('Perangkat berhasil dihapus dari blacklist permanen');
      fetchData();
    } catch (err) {
      toast.error('Gagal menghapus blacklist');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('UUID disalin ke clipboard');
  };'''
c = c.replace(old_handlers, new_handlers)

# 4. Add Tab Button
old_tab_array = '''[
          { id: 'pengaturan', label: 'Pengaturan Portal', icon: 'settings' },
          { id: 'keamanan', label: 'Keamanan & Anti Spam', icon: 'shield' }
        ]'''
new_tab_array = '''[
          { id: 'pengaturan', label: 'Pengaturan Portal', icon: 'settings' },
          { id: 'keamanan', label: 'Keamanan & Anti Spam', icon: 'shield' },
          { id: 'blacklist', label: 'Blacklist Permanen', icon: 'block' }
        ]'''
c = c.replace(old_tab_array, new_tab_array)

# 5. Add Copy Button in Auto Spam
old_auto_row = '''<td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', fontFamily: 'monospace' }}>{b.device_id || '-'}</td>'''
new_auto_row = '''<td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', fontFamily: 'monospace' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{b.device_id || '-'}</span>
                                {b.device_id && (
                                  <button type="button" onClick={() => copyToClipboard(b.device_id)} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '0', display: 'flex' }} title="Copy UUID">
                                    <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>content_copy</span>
                                  </button>
                                )}
                              </div>
                            </td>'''
c = c.replace(old_auto_row, new_auto_row)

# 6. Add Blacklist Tab Content
old_closing = '''              {activeTab === 'pengaturan' && (
                <button type="submit" disabled={isSaving} className="btn-success-premium" style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '1rem', fontWeight: '800' }}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              )}
        </form>
      </div>'''

new_closing = '''              {activeTab === 'pengaturan' && (
                <button type="submit" disabled={isSaving} className="btn-success-premium" style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '1rem', fontWeight: '800' }}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              )}
        </form>
      </div>
      
      {/* SECTION: BLACKLIST PERMANEN */}
      {activeTab === 'blacklist' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Top Spammers */}
          <div className="glass-card" style={{ padding: '25px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              <span className="material-symbols-rounded" style={{ color: '#fbbf24' }}>warning</span>
              Sistem Deteksi Pintar: Top Spammer Saat Ini
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '15px' }}>Tabel ini menampilkan perangkat (UUID) yang sedang memiliki jumlah transaksi PENDING terbanyak (belum dibayar) dan belum masuk ke Blacklist Permanen.</p>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                  <tr>
                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Device ID (UUID)</th>
                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Jumlah Transaksi PENDING</th>
                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {topSpammers.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Belum ada aktivitas spammer terdeteksi.</td></tr>
                  ) : (
                    topSpammers.map((ts, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white', fontFamily: 'monospace' }}>{ts.device_id}</td>
                        <td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ef4444', fontWeight: 'bold' }}>{ts.spam_count} transaksi</td>
                        <td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                          <button type="button" onClick={() => handleAddPermanentBlacklist(ts.device_id)} className="btn-danger-small" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Blokir Permanen</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Permanent Blacklist Table */}
          <div className="glass-card" style={{ padding: '25px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>block</span>
              Daftar Blacklist Perangkat (Permanen)
            </h3>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Masukkan UUID secara manual..." 
                className="form-input-premium" 
                style={{ flex: 1 }}
                value={newUuidBlacklist}
                onChange={e => setNewUuidBlacklist(e.target.value)}
              />
              <button 
                type="button" 
                onClick={() => handleAddPermanentBlacklist(newUuidBlacklist)}
                className="btn-success-premium" 
                style={{ padding: '0 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
                Tambahkan ke Blacklist
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                  <tr>
                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Device ID (UUID)</th>
                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Tanggal Diblokir</th>
                    <th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {permanentBlocklist.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Belum ada perangkat di daftar hitam permanen.</td></tr>
                  ) : (
                    permanentBlocklist.map(b => (
                      <tr key={b.id}>
                        <td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white', fontFamily: 'monospace' }}>{b.device_id}</td>
                        <td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8' }}>{formatDateTime(b.created_at)}</td>
                        <td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                          <button type="button" onClick={() => handleRemovePermanentBlacklist(b.id)} className="btn-success-premium" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}>Unblock</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}'''
c = c.replace(old_closing, new_closing)

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("Updated frontend!")
