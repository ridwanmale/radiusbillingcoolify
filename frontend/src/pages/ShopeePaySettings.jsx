import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateTime } from '../utils/dateFormatter';

const ShopeePaySettings = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ device_name: '', device_id: '', api_token: '' });
  const [copyStatus, setCopyStatus] = useState({});
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/payment-detections/devices');
      const data = await res.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomString = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const openAddModal = () => {
    setFormData({
      device_name: '',
      device_id: 'DEV-' + generateRandomString(8).toUpperCase(),
      api_token: generateRandomString(32)
    });
    setShowModal(true);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payment-detections/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchDevices();
      } else {
        alert('Gagal: ' + (data.error || data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi ke server');
    }
  };

  const handleDelete = async (id, name) => {
    triggerConfirm(`Hapus perangkat "${name}"? Tindakan ini tidak dapat dibatalkan.`, async () => {
      try {
        const res = await fetch(`/api/payment-detections/devices/${id}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          fetchDevices();
        } else {
          alert('Gagal menghapus: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Terjadi kesalahan koneksi ke server');
      }
    });
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopyStatus({ ...copyStatus, [key]: true });
    setTimeout(() => {
      setCopyStatus({ ...copyStatus, [key]: false });
    }, 2000);
  };

  const isOnline = (lastSeen) => {
    if (!lastSeen) return false;
    const diff = new Date() - new Date(lastSeen);
    return diff < 5 * 60 * 1000; // Online if seen in last 5 minutes
  };

  return (
    <div className="animate-fade-in">
      {/* Header Section */}
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="page-title" style={{
            background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '2.5rem'
          }}>
            Payment Bridge
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
            Kelola perangkat Android untuk deteksi otomatis pembayaran .
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ color: '#10b981' }}>add_circle</span>
          TAMBAH DEVICE
        </button>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid" style={{ marginBottom: '3rem' }}>
        <div className="glass-card">
          <div className="stat-label">Total Perangkat</div>
          <div className="stat-value">{devices.length}</div>
          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--success)' }}>●</span> Terdaftar di sistem
          </div>
        </div>
        <div className="glass-card">
          <div className="stat-label">Perangkat Aktif</div>
          <div className="stat-value" style={{ color: 'var(--success)', WebkitTextFillColor: 'var(--success)' }}>
            {devices.filter(d => isOnline(d.last_seen_at)).length}
          </div>
          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--success)' }}>●</span> Terkoneksi saat ini
          </div>
        </div>
      </div>

      {/* Device List Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {loading ? (
          <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
            <span className="material-symbols-rounded spin" style={{ fontSize: '3rem', color: 'var(--accent-primary)' }}>refresh</span>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Memuat data perangkat...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '4rem', opacity: 0.2 }}>smartphone</span>
            <h3 style={{ marginTop: '1rem', opacity: 0.5 }}>Belum ada perangkat terdaftar</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Daftarkan HP Android Anda untuk mulai mendeteksi pembayaran otomatis.</p>
          </div>
        ) : devices.map(device => (
          <div key={device.id} className="glass-card animate-slide-up" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Status Indicator Bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: isOnline(device.last_seen_at) ? 'var(--success)' : 'var(--danger)',
              opacity: 0.6
            }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)'
                }}>
                  <span className="material-symbols-rounded">smartphone</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>{device.device_name}</h3>
                  <span className={`badge ${isOnline(device.last_seen_at) ? 'badge-success' : 'badge-danger'}`} style={{ marginTop: '4px' }}>
                    {isOnline(device.last_seen_at) ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>
              <button className="btn-glass-delete" 
                onClick={() => handleDelete(device.id, device.device_name)}
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  borderRadius: '10px', 
                  padding: '8px', 
                  color: '#ef4444', 
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                title="Hapus Perangkat"
              >
                <span className="material-symbols-rounded" style={{ color: '#ef4444', fontSize: '20px' }}>delete</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Device ID</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <code style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#a5b4fc',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {device.device_id}
                  </code>
                  <button onClick={() => copyToClipboard(device.device_id, device.id + '_id')} style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    color: 'white',
                    cursor: 'pointer'
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                      {copyStatus[device.id + '_id'] ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">API Token</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <code style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#f472b6',
                    border: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {device.api_token}
                  </code>
                  <button onClick={() => copyToClipboard(device.api_token, device.id + '_token')} style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    color: 'white',
                    cursor: 'pointer'
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                      {copyStatus[device.id + '_token'] ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 'auto',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)'
            }}>
              <span>Last Active</span>
              <span>{device.last_seen_at ? formatDateTime(device.last_seen_at) : 'Belum pernah aktif'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modern Modal */}
      {showModal && (
        <div className="modal-overlay open">
          <div className="modal-content animate-slide-up" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Register Device Baru</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Nama Perangkat</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: HP Kasir Utama"
                  value={formData.device_name}
                  onChange={e => setFormData({ ...formData, device_name: e.target.value })}
                  required
                  autoFocus
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Berikan nama unik untuk mempermudah identifikasi perangkat di log.
                </p>
              </div>

              <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', marginBottom: '2rem', padding: '1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Generated Device ID</label>
                  <code style={{ color: 'var(--accent-secondary)', fontSize: '1rem', fontWeight: 'bold' }}>{formData.device_id}</code>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Generated API Token</label>
                  <code style={{ color: 'var(--accent-pink)', fontSize: '0.85rem', wordBreak: 'break-all' }}>{formData.api_token}</code>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                  BATAL
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  SIMPAN & AKTIFKAN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
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

export default ShopeePaySettings;
