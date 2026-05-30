import React, { useState, useEffect } from 'react';
import ConfirmModal from '../../components/ConfirmModal';

const PppoePackages = ({ user }) => {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });
  const [formData, setFormData] = useState({
    name: '',
    upload_speed: '',
    download_speed: '',
    price: '',
    active_days: 30,
    description: ''
  });

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/pppoe-packages');
      const data = await res.json();
      setPackages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isEdit ? `/api/pppoe-packages/${editId}` : '/api/pppoe-packages';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, admin_username: user?.username })
      });
      if (res.ok) {
        setFormData({ name: '', upload_speed: '', download_speed: '', price: '', active_days: 30, description: '' });
        setIsEdit(false);
        fetchPackages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatSpeed = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    return raw.toUpperCase().endsWith('M') ? raw.toUpperCase() : `${raw}M`;
  };

  const formatRateLimit = (pkg) => {
    if (pkg.upload_speed || pkg.download_speed) {
      return `${formatSpeed(pkg.upload_speed)}/${formatSpeed(pkg.download_speed)}`;
    }
    const [upload, download] = String(pkg.rate_limit || '').split('/');
    return `${formatSpeed(upload)}/${formatSpeed(download)}`;
  };

  const handleDelete = async (pkg) => {
    triggerConfirm(`Hapus paket "${pkg.name}"?`, async () => {

      try {
        const res = await fetch(`/api/pppoe-packages/${pkg.id}?admin_username=${user?.username || 'admin'}`, {
          method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.error || 'Gagal menghapus paket');
          return;
        }
        if (editId === pkg.id) {
          setIsEdit(false);
          setEditId(null);
          setFormData({ name: '', upload_speed: '', download_speed: '', price: '', active_days: 30, description: '' });
        }
        fetchPackages();
      } catch (err) {
        console.error(err);
        alert('Gagal menghubungi server.');
      }
      });
  };

  return (
    <div className="page-pppoe">
      <div className="page-header">
        <h1 className="page-title">Paket PPPoE</h1>
        <p className="page-subtitle">Kelola paket internet untuk pelanggan PPPoE.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div className="glass-card">
          <h3>{isEdit ? 'Edit Paket' : 'Tambah Paket Baru'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nama Paket</label>
              <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Contoh: Paket 10 Mbps" />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Upload Speed</label>
                <input type="text" className="form-input" value={formData.upload_speed} onChange={e => setFormData({...formData, upload_speed: e.target.value})} required placeholder="10M" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Download Speed</label>
                <input type="text" className="form-input" value={formData.download_speed} onChange={e => setFormData({...formData, download_speed: e.target.value})} required placeholder="20M" />
              </div>
            </div>
            <div className="form-group">
              <label>Harga (IDR)</label>
              <input type="number" className="form-input" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Masa Aktif (Hari)</label>
              <input type="number" className="form-input" value={formData.active_days} onChange={e => setFormData({...formData, active_days: e.target.value})} required />
            </div>
            <button type="submit" className="btn-glass-premium" style={{ width: '100%', marginTop: '1.5rem' }}>
              <span className="material-symbols-rounded">{isEdit ? 'edit' : 'save'}</span>
              <span>{isEdit ? 'Update Paket' : 'Simpan Paket'}</span>
            </button>
          </form>
        </div>

        <style>{`
          .btn-glass-premium {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px 20px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            color: white;
            font-weight: 700;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }

          .btn-glass-premium:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--accent-primary);
            box-shadow: 0 0 20px rgba(14, 165, 233, 0.2);
            transform: translateY(-2px);
          }

          .btn-glass-premium:active {
            transform: translateY(0) scale(0.98);
          }

          .btn-glass-premium .material-symbols-rounded {
            font-size: 22px;
            transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            color: var(--accent-primary);
          }

          .btn-glass-premium:hover .material-symbols-rounded {
            transform: rotate(360deg);
          }
        `}</style>


        <div className="glass-card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Paket</th>
                <th>Rate Limit</th>
                <th>Harga</th>
                <th>Masa Aktif</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(pkg => (
                <tr key={pkg.id}>
                  <td><strong>{pkg.name}</strong></td>
                  <td>{formatRateLimit(pkg)}</td>
                  <td>Rp {parseFloat(pkg.price).toLocaleString()}</td>
                  <td>{pkg.active_days} Hari</td>
                  <td>{pkg.status}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-sm" onClick={() => { setIsEdit(true); setEditId(pkg.id); setFormData(pkg); }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(pkg)}>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};

export default PppoePackages;
