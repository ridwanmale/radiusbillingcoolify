import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import axios from 'axios';
import { toast } from 'react-toastify';

const JenisVoucher = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'confirmation_number',
    sort_order: 0,
    is_active: 1
  });

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const response = await axios.get('/api/voucher-types');
      setTypes(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching voucher types:', error);
      toast.error('Gagal mengambil data jenis voucher');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingType) {
        await axios.put(`/api/voucher-types/${editingType.id}`, formData);
        toast.success('Jenis voucher diperbarui');
      } else {
        await axios.post('/api/voucher-types', formData);
        toast.success('Jenis voucher berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingType(null);
      setFormData({ name: '', description: '', icon: 'confirmation_number', sort_order: 0, is_active: 1 });
      fetchTypes();
    } catch (error) {
      console.error('Error saving voucher type:', error);
      toast.error('Gagal menyimpan data');
    }
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData(type);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    triggerConfirm('Apakah Anda yakin ingin menghapus jenis voucher ini?', async () => {
      try {
        await axios.delete(`/api/voucher-types/${id}`);
        toast.success('Jenis voucher dihapus');
        fetchTypes();
      } catch (error) {
        console.error('Error deleting voucher type:', error);
        toast.error('Gagal menghapus data');
      }
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Memuat data jenis voucher...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="header-info">
          <h1 className="page-title">Jenis Voucher</h1>
          <p className="page-subtitle">Kategorisasi paket voucher untuk tampilan di portal online store</p>
        </div>
        <button 
          className="btn-glass-premium btn-blue" 
          onClick={() => { setEditingType(null); setFormData({ name: '', description: '', icon: 'confirmation_number', sort_order: 0, is_active: 1 }); setShowModal(true); }}
        >
          <span className="material-symbols-rounded" style={{ color: '#10b981' }}>add_circle</span>
          <span>Tambah Jenis</span>
        </button>
      </div>

      <div className="types-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {types.map(type => (
          <div key={type.id} className={`glass-card type-card ${type.is_active ? '' : 'inactive'}`} style={{ 
            position: 'relative',
            overflow: 'hidden',
            border: type.is_active ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)',
            opacity: type.is_active ? 1 : 0.7
          }}>
            <div className="card-content" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1rem' }}>
                <div style={{ 
                  width: '50px', height: '50px', borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.05)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center' 
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '28px', color: '#3b82f6' }}>{type.icon}</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{type.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Urutan: {type.sort_order}</span>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', minHeight: '3em' }}>
                {type.description || 'Tidak ada deskripsi'}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span className={`status-badge ${type.is_active ? 'active' : 'inactive'}`} style={{ 
                  fontSize: '0.7rem', padding: '4px 10px', borderRadius: '20px', 
                  background: type.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                  color: type.is_active ? '#10b981' : '#f43f5e'
                }}>
                  {type.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-glass-edit" onClick={() => handleEdit(type)} title="Edit">
                    <span className="material-symbols-rounded" style={{ color: '#f59e0b' }}>edit</span>
                  </button>
                  <button className="btn-glass-delete" onClick={() => handleDelete(type.id)} title="Hapus">
                    <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingType ? 'Edit Jenis Voucher' : 'Tambah Jenis Voucher'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label>Nama Jenis</label>
                <input 
                  type="text" 
                  className="form-control"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Contoh: Harian, Gaming, Promo"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '10px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label>Deskripsi</label>
                <textarea 
                  className="form-control"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Penjelasan singkat kategori ini"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '10px' }}
                ></textarea>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                <div className="form-group">
                  <label>Ikon (Material Symbol)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={formData.icon}
                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    placeholder="Contoh: today, bolt, etc"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '10px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Urutan Tampil</label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '10px' }}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={formData.is_active} 
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                />
                <label htmlFor="isActive" style={{ cursor: 'pointer' }}>Aktifkan kategori ini</label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-glass" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '50px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>Batal</button>
                <button type="submit" className="btn-glass-premium btn-blue" style={{ padding: '10px 30px' }}>
                  <span className="material-symbols-rounded" style={{ color: '#10b981' }}>save</span>
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .btn-glass-premium { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 50px; color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.4s; backdrop-filter: blur(12px); }
        .btn-glass-premium:hover { transform: translateY(-2px); box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
        .btn-blue:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .btn-blue .material-symbols-rounded { color: #3b82f6; }
        
        .icon-btn { width: 32px; height: 32px; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; }
        .btn-blue-sm { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .btn-blue-sm:hover { background: #3b82f6; color: white; }
        .btn-red-sm { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
        .btn-red-sm:hover { background: #f43f5e; color: white; }
        
        .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; }
        .spinner { border: 4px solid rgba(255, 255, 255, 0.1); border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 1rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
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

export default JenisVoucher;
