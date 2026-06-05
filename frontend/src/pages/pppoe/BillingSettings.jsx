import React, { useState, useEffect } from 'react';

const PppoeBillingSettings = ({ user }) => {
  const [settings, setSettings] = useState({
    pppoe_invoice_lead_days: '7',
    pppoe_grace_period_days: '0',
    pppoe_isolir_group: 'ARM_ISOLIR'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/pppoe-billing/settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
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
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/pppoe-billing/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, admin_username: user?.username })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
      } else {
        setMessage({ type: 'danger', text: 'Gagal menyimpan pengaturan.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'danger', text: 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="page-pppoe"><div className="glass-card">Memuat pengaturan...</div></div>;

  return (
    <div className="page-pppoe">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengaturan Billing PPPoE</h1>
          <p className="page-subtitle">Konfigurasi otomatisasi penagihan dan isolir pelanggan.</p>
        </div>
      </div>

      <div style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2rem' }}>
          {message.text && (
            <div className={`badge badge-${message.type}`} style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="form-group">
              <label style={{ color: 'var(--accent-primary)', fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>
                H- Generate Invoice
              </label>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
                Berapa hari sebelum jatuh tempo invoice otomatis diterbitkan.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="number" 
                  className="form-input" 
                  value={settings.pppoe_invoice_lead_days} 
                  onChange={e => setSettings({...settings, pppoe_invoice_lead_days: e.target.value})}
                  required
                />
                <span>Hari</span>
              </div>
            </div>

            <div className="form-group">
              <label style={{ color: 'var(--accent-primary)', fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>
                Masa Tenggang (Grace Period)
              </label>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
                Berapa hari tambahan setelah jatuh tempo sebelum isolir dilakukan.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="number" 
                  className="form-input" 
                  value={settings.pppoe_grace_period_days} 
                  onChange={e => setSettings({...settings, pppoe_grace_period_days: e.target.value})}
                  required
                />
                <span>Hari</span>
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ color: 'var(--accent-primary)', fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>
                Nama Group Isolir RADIUS
              </label>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
                Nama group di RADIUS yang akan digunakan untuk pelanggan terisolir (profile bandwidth terbatas).
              </p>
              <input 
                type="text" 
                className="form-input" 
                value={settings.pppoe_isolir_group} 
                onChange={e => setSettings({...settings, pppoe_isolir_group: e.target.value})}
                required
                placeholder="Contoh: ARM_ISOLIR"
              />
            </div>
          </div>

          <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
            <button type="submit" className="btn-glass-premium" disabled={isSaving} style={{ width: '200px' }}>
              <span className="material-symbols-rounded">{isSaving ? 'sync' : 'save'}</span>
              <span>{isSaving ? 'MENYIMPAN...' : 'SIMPAN'}</span>
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .btn-glass-premium {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.4s ease;
          backdrop-filter: blur(12px);
        }
        .btn-glass-premium:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--accent-primary);
          transform: translateY(-2px);
        }
        .btn-glass-premium:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-glass-premium .material-symbols-rounded {
          color: var(--accent-primary);
          transition: transform 0.6s ease;
        }
        .btn-glass-premium:hover .material-symbols-rounded {
          transform: rotate(360deg);
        }
      `}</style>
    </div>
  );
};

export default PppoeBillingSettings;


