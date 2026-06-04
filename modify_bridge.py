import re

with open('frontend/src/pages/PaymentBridgeCenter.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Remove state
c = re.sub(r"  const \[showCleanupModal, setShowCleanupModal\] = useState\(false\);\n  const \[cleanupDays, setCleanupDays\] = useState\(3\);\n", "", c)

# Remove handleCleanup function
handle_cleanup = """  const handleCleanup = async () => {
    try {
      const res = await axios.post('/api/online-store/admin/transactions/cleanup', { days: cleanupDays });
      toast.success(res.data.message);
      setShowCleanupModal(false);
      fetchData();
    } catch (err) {
      toast.error('Gagal melakukan pembersihan');
    }
  };\n"""
c = c.replace(handle_cleanup, "")

# Remove Auto Cleanup Button
button_str = """            <button 
              onClick={() => setShowCleanupModal(true)}
              className="btn-glass"
              style={{ padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)' }}
            >
              <span className="material-symbols-rounded">auto_delete</span>
              Auto Cleanup
            </button>\n"""
c = c.replace(button_str, "")

# Remove Modal UI
modal_str = """      {showCleanupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '30px', animation: 'scaleUp 0.3s ease-out' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '15px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded">auto_delete</span>
              Pembersihan Otomatis
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.5' }}>
              Hapus transaksi dengan status <strong>PENDING</strong> yang sudah melewati batas waktu tertentu.
            </p>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '700', marginBottom: '10px', display: 'block' }}>Hapus transaksi yang lebih tua dari:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <input 
                  type="number" 
                  value={cleanupDays} 
                  onChange={(e) => setCleanupDays(e.target.value)}
                  style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', outline: 'none', fontSize: '1.1rem', fontWeight: '800', textAlign: 'center' }}
                />
                <div style={{ fontWeight: '700', color: '#94a3b8' }}>HARI</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowCleanupModal(false)}
                style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '700', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button 
                onClick={handleCleanup}
                className="btn-success-premium"
                style={{ flex: 2, padding: '12px', borderRadius: '12px', color: 'white', fontWeight: '800', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
              >
                Mulai Pembersihan
              </button>
            </div>
          </div>
        </div>
      )}\n"""
c = c.replace(modal_str, "")

with open('frontend/src/pages/PaymentBridgeCenter.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
