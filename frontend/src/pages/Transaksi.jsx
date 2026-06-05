import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const Transaksi = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalPemasukan: 0, totalPengeluaran: 0, laba: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });
  
  // Filters
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  // Pagination & Search State
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    kategori: 'Pemasukan',
    jenis: '',
    deskripsi: '',
    qty: 1,
    total: '',
    admin: 'Admin'
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    kategori: 'Pemasukan',
    jenis: '',
    deskripsi: '',
    qty: 1,
    total: ''
  });

  const filteredTransactions = transactions.filter(t => 
    t.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.jenis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.kategori?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const currentItems = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/transactions?month=${filterMonth}&year=${filterYear}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      setSummary(data.summary || { totalPemasukan: 0, totalPengeluaran: 0, laba: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setCurrentPage(1);
  }, [filterMonth, filterYear]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ ...formData, deskripsi: '', total: '', qty: 1 });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    triggerConfirm('Hapus transaksi ini?', async () => {
      try {
      const host = window.location.hostname;
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
        console.error(err);
      }
    });
  };

  const handleEditClick = (t) => {
    setEditFormData({
      id: t.id,
      kategori: t.kategori || 'Pemasukan',
      jenis: t.jenis || '',
      deskripsi: t.deskripsi || '',
      qty: t.qty || 1,
      total: t.total || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/transactions/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kategori: editFormData.kategori,
          jenis: editFormData.jenis,
          deskripsi: editFormData.deskripsi,
          qty: Number(editFormData.qty),
          total: Number(editFormData.total)
        })
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];



  return (
    <div className="transaksi-page">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Jurnal Keuangan</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Monitoring keuangan dan arus kas sistem</p>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card finance-card finance-card-blue">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#2563eb', padding: '10px', borderRadius: '8px' }}>💰</div>
            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 'bold' }}>Pemasukan {months[filterMonth-1]}</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold' }}>{formatCurrency(summary.totalPemasukan)}</div>
            </div>
          </div>
        </div>
        
        <div className="glass-card finance-card finance-card-orange">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#f59e0b', padding: '10px', borderRadius: '8px' }}>📅</div>
            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 'bold' }}>Pengeluaran {months[filterMonth-1]}</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold' }}>{formatCurrency(summary.totalPengeluaran)}</div>
            </div>
          </div>
        </div>

        <div className="glass-card finance-card finance-card-green">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#10b981', padding: '10px', borderRadius: '8px' }}>✅</div>
            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 'bold' }}>Laba {months[filterMonth-1]}</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold' }}>{formatCurrency(summary.laba)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
        <button 
          className="btn" 
          onClick={() => setIsModalOpen(true)} 
          style={{ 
            background: 'var(--accent-primary)', 
            color: 'white', 
            borderRadius: '8px', 
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--accent-primary-hover)'}
          onMouseOut={e => e.currentTarget.style.background = 'var(--accent-primary)'}
        >
          <span className="material-symbols-rounded" style={{ color: '#10b981' }}>add_circle</span> TAMBAH
        </button>
        <button 
          className="btn" 
          onClick={fetchData} 
          style={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            color: 'white', 
            borderRadius: '8px', 
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
        >
          <span className="material-symbols-rounded" style={{ color: '#3b82f6', fontSize: '20px' }}>refresh</span>
        </button>
      </div><div style={{ marginBottom: '2rem' }}>
        {/* ACTION BAR ABOVE TABLE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
            Show 
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="form-input"
              style={{ width: '70px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}
            >
              <option value="10" style={{ background: '#1e1b1e' }}>10</option>
              <option value="25" style={{ background: '#1e1b1e' }}>25</option>
              <option value="50" style={{ background: '#1e1b1e' }}>50</option>
              <option value="100" style={{ background: '#1e1b1e' }}>100</option>
            </select>
            entries
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select className="form-input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: '150px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}>
                {months.map((m, i) => <option key={i} value={i + 1} style={{ background: '#1e1b1e' }}>{m}</option>)}
              </select>
              <select className="form-input" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ width: '100px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y} style={{ background: '#1e1b1e' }}>{y}</option>)}
              </select>
            </div>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Search:</span>
            <input 
              type="text" 
              placeholder="Cari transaksi..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input"
              style={{ width: '200px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}
            />
          </div>
        </div>

        {/* TRANSACTIONS TABLE */}
        <div className="glass-card" style={{ padding: '0' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>TANGGAL</th>
                  <th>KATEGORI</th>
                  <th>JENIS</th>
                  <th>ADMIN</th>
                  <th>DESKRIPSI</th>
                  <th>QTY</th>
                  <th>TOTAL</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? 
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>Memuat jurnal keuangan...</td></tr>
                : currentItems.length === 0 ? 
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>Belum ada data jurnal yang sesuai.</td></tr>
                : 
                  currentItems.map((t, i) => (
                    <tr key={t.id}>
                      <td>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                      <td>{t.tanggal ? new Date(t.tanggal).toLocaleDateString('id-ID') : '-'}</td>
                      <td>
                        <span className="badge" style={{ 
                          background: t.kategori?.toUpperCase() === 'PEMASUKAN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: t.kategori?.toUpperCase() === 'PEMASUKAN' ? '#10b981' : '#ef4444',
                          fontWeight: 'bold',
                          fontSize: '0.7rem'
                        }}>
                          {t.kategori ? t.kategori.toUpperCase() : '-'}
                        </span>
                      </td>
                      <td>{t.jenis || '-'}</td>
                      <td>{t.admin || '-'}</td>
                      <td>{t.deskripsi || '-'}</td>
                      <td>{t.qty || 0}</td>
                      <td style={{ fontWeight: 'bold' }}>{formatCurrency(t.total || 0)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          {t.id && t.jenis?.toUpperCase() !== 'VOUCHER ONLINE' && t.jenis?.toUpperCase() !== 'VOUCHER' && t.jenis?.toUpperCase() !== 'REFUND' && (
                            <>
                              <button onClick={() => handleEditClick(t)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '1.1rem', padding: 0 }} title="Edit Transaksi Manual">✏️</button>
                              <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', padding: 0 }} title="Hapus">🗑️</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1.5rem' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Menampilkan {filteredTransactions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(filteredTransactions.length, currentPage * itemsPerPage)} dari {filteredTransactions.length} Jurnal
            </p>
<div className="pagination-wrapper">
  <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>Prev</button>
  <div className="pagination-text">{currentPage} / {totalPages}</div>
  <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages}>Next</button>
</div>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH */}
      <div className={`modal-overlay ${isModalOpen ? 'open' : ''}`} onClick={() => setIsModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          <div className="modal-header">
            <h2>Tambah Transaksi</h2>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select className="form-input" value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})}>
                <option value="Pemasukan">Pemasukan</option>
                <option value="Pengeluaran">Pengeluaran</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Jenis</label>
              <input type="text" className="form-input" value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value})} placeholder="Contoh: VOUCHER, LISTRIK, DLL" />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea className="form-input" value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})} placeholder="Keterangan transaksi..." required></textarea>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Quantity</label>
                <input type="number" className="form-input" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} required />
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Total Harga (Rp)</label>
                <input type="number" className="form-input" value={formData.total} onChange={e => setFormData({...formData, total: e.target.value})} required />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                type="submit" 
                className="btn" 
                style={{ 
                  width: '100%', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  color: '#10b981', 
                  border: '1px solid rgba(16, 185, 129, 0.2)', 
                  borderRadius: '50px', 
                  padding: '0.8rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
              >
                <span className="material-symbols-rounded" style={{ color: '#10b981' }}>check_circle</span>SIMPAN</button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL EDIT */}
      <div className={`modal-overlay ${isEditModalOpen ? 'open' : ''}`} onClick={() => setIsEditModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          <div className="modal-header">
            <h2>Edit Transaksi Manual</h2>
            <button className="modal-close" onClick={() => setIsEditModalOpen(false)}>&times;</button>
          </div>
          <form onSubmit={handleEditSubmit}>
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select className="form-input" value={editFormData.kategori} onChange={e => setEditFormData({...editFormData, kategori: e.target.value})}>
                <option value="Pemasukan">Pemasukan</option>
                <option value="Pengeluaran">Pengeluaran</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Jenis</label>
              <input type="text" className="form-input" value={editFormData.jenis} onChange={e => setEditFormData({...editFormData, jenis: e.target.value})} placeholder="Contoh: LISTRIK, OPERASIONAL, DLL" required />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea className="form-input" value={editFormData.deskripsi} onChange={e => setEditFormData({...editFormData, deskripsi: e.target.value})} placeholder="Keterangan transaksi..." required></textarea>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Quantity</label>
                <input type="number" className="form-input" value={editFormData.qty} onChange={e => setEditFormData({...editFormData, qty: e.target.value})} required />
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Total Harga (Rp)</label>
                <input type="number" className="form-input" value={editFormData.total} onChange={e => setEditFormData({...editFormData, total: e.target.value})} required />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                type="submit" 
                className="btn" 
                style={{ 
                  width: '100%', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  color: '#3b82f6', 
                  border: '1px solid rgba(59, 130, 246, 0.2)', 
                  borderRadius: '50px', 
                  padding: '0.8rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
              >
                <span className="material-symbols-rounded" style={{ color: '#10b981' }}>save</span>SIMPAN</button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .transaksi-page {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
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

export default Transaksi;
