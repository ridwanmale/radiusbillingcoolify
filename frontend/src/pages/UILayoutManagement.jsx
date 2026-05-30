import React, { useState, useEffect } from 'react';

const UILayoutManagement = () => {
  const [configs, setConfigs] = useState([]);
  const [pageSync, setPageSync] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const host = window.location.hostname;

  const fetchData = async () => {
    try {
      const resConfig = await fetch(`/api/vouchers/ui-config`);
      const dataConfig = await resConfig.json();
      setConfigs(dataConfig);

      const resSync = await fetch(`/api/vouchers/ui-page-sync`);
      const dataSync = await resSync.json();
      setPageSync(dataSync);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLabelChange = (field_id, newLabel) => {
    setConfigs(configs.map(c => c.field_id === field_id ? { ...c, display_label: newLabel } : c));
  };

  const handleVisibilityChange = (field_id, isVisible) => {
    setConfigs(configs.map(c => c.field_id === field_id ? { ...c, is_visible: isVisible } : c));
  };

  const handleSyncChange = (page_id, isSynced) => {
    setPageSync(pageSync.map(p => p.page_id === page_id ? { ...p, is_synced: isSynced } : p));
  };
  
  const handlePositionChange = (page_id, position) => {
    setPageSync(pageSync.map(p => p.page_id === page_id ? { ...p, table_position: position } : p));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save Field Config
      await fetch(`/api/vouchers/ui-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configs)
      });

      // Save Page Sync
      await fetch(`/api/vouchers/ui-page-sync`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageSync)
      });

      alert('All settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error connecting to server');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading layout config...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">UI Layout Management</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Kustomisasi Label Tabel & Visibilitas Kolom Secara Global</p>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Sinkronisasi Halaman</h3>
        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1.5rem' }}>Pilih halaman yang akan menggunakan konfigurasi label dan visibilitas di bawah ini.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {pageSync.map(p => (
            <div key={p.page_id} className="glass-card" style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{p.page_id.replace(/_/g, ' ').toUpperCase()}</span>
                <input 
                  type="checkbox" 
                  checked={p.is_synced === 1 || p.is_synced === true}
                  onChange={(e) => handleSyncChange(p.page_id, e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>Posisi Tabel</label>
                <select 
                  className="form-input" 
                  style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  value={p.table_position || 'center'}
                  onChange={(e) => handlePositionChange(p.page_id, e.target.value)}
                >
                  <option value="left" style={{ background: '#0f172a' }}>Kiri (Left)</option>
                  <option value="center" style={{ background: '#0f172a' }}>Tengah (Center)</option>
                  <option value="right" style={{ background: '#0f172a' }}>Kanan (Right)</option>
                  <option value="full" style={{ background: '#0f172a' }}>Lebar Penuh (Full Width)</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card">
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Konfigurasi Kolom Master Data</h3>
            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Tentukan nama kolom dan apakah kolom tersebut ingin ditampilkan atau disembunyikan.</p>
          </div>
          <button 
            onClick={handleSave} 
            className="btn btn-primary" 
            disabled={saving}
            style={{ padding: '0.8rem 2rem' }}
          >
            {saving ? 'Menyimpan...' : 'SIMPAN PERUBAHAN'}
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>FIELD ID</th>
                <th>DISPLAY LABEL (CUSTOM NAME)</th>
                <th style={{ textAlign: 'center' }}>VISIBLE</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr key={c.field_id}>
                  <td style={{ opacity: 0.5, fontSize: '0.8rem' }}><code>{c.field_id}</code></td>
                  <td>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ width: '100%', fontSize: '0.9rem' }}
                      value={c.display_label}
                      onChange={(e) => handleLabelChange(c.field_id, e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={c.is_visible === 1 || c.is_visible === true}
                        onChange={(e) => handleVisibilityChange(c.field_id, e.target.checked)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UILayoutManagement;
