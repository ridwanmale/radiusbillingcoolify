import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateTime } from '../utils/dateFormatter';

const RekapVoucher = () => {
  const [rekapList, setRekapList] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const today = new Date();
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState((today.getMonth() + 1).toString());
  const [filterYear, setFilterYear] = useState(today.getFullYear().toString());
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal State
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRekap = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/rekap`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRekapList(data);
      } else {
        console.error('Rekap API error:', data);
        setRekapList([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`/api/settings/templates`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTemplates(data);
        if (data.length > 0) setSelectedTemplate(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch templates', err);
    }
  };

  useEffect(() => {
    fetchRekap();
    fetchTemplates();
  }, []);

  const openModal = (batch) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedBatch(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (statusType) => {
    if (!selectedBatch) return;
    
    const count = statusType === 'sisa' ? selectedBatch.sisa_stock : selectedBatch.terjual;
    if (count === 0) {
      alert(`Tidak ada voucher dengan status ${statusType === 'sisa' ? 'Sisa Stock' : 'Terjual'} pada batch ini.`);
      return;
    }

    triggerConfirm(`Yakin ingin MENGHAPUS PERMANEN ${count} voucher (${statusType === 'sisa' ? 'Sisa Stock' : 'Terjual'}) pada Kode Print ${selectedBatch.kode_print}? Aksi ini tidak dapat dibatalkan.`, async () => {

    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/rekap/${selectedBatch.kode_print}/${statusType}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        closeModal();
        fetchRekap(); // Refresh data
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
    });
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const dDate = new Date(dateString);
    return formatDateTime(dDate);
  };

  // Filter and Pagination Logic
  const filteredList = rekapList.filter(item => {
    const matchSearch = item.kode_print?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.outlet_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.profile?.toLowerCase().includes(searchQuery.toLowerCase());
                        
    let matchDate = true;
    let matchMonth = true;
    let matchYear = true;

    if (item.created_at && (filterDate || filterMonth || filterYear)) {
      const itemDate = new Date(item.created_at);
      if (filterDate) matchDate = itemDate.getDate().toString() === filterDate;
      if (filterMonth) matchMonth = (itemDate.getMonth() + 1).toString() === filterMonth;
      if (filterYear) matchYear = itemDate.getFullYear().toString() === filterYear;
    }

    return matchSearch && matchDate && matchMonth && matchYear;
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const currentItems = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Rekap Voucher</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Rekapitulasi total pembuatan voucher berdasarkan Kode Print</p>
        </div>
        <button 
          className="btn" 
          onClick={fetchRekap} 
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            color: 'white', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '50px', 
            padding: '0.6rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#10b981' }}>refresh</span> Refresh
        </button>
      </div>


      <div style={{ marginBottom: '2rem' }}>
        {/* ACTION BAR ABOVE TABLE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
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
            <select value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} className="form-input" style={{ width: '90px', padding: '6px 8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
              <option value="" style={{ background: '#1e1b1e' }}>Semua Tgl</option>
              {[...Array(31)].map((_, i) => <option key={i+1} value={i+1} style={{ background: '#1e1b1e' }}>{i+1}</option>)}
            </select>

            <select value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }} className="form-input" style={{ width: '90px', padding: '6px 8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
              <option value="" style={{ background: '#1e1b1e' }}>Semua Bln</option>
              {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) => (
                <option key={i+1} value={i+1} style={{ background: '#1e1b1e' }}>{m}</option>
              ))}
            </select>

            <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }} className="form-input" style={{ width: '90px', padding: '6px 8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
              <option value="" style={{ background: '#1e1b1e' }}>Semua Thn</option>
              {[...Array(5)].map((_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y} style={{ background: '#1e1b1e' }}>{y}</option>; })}
            </select>

            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input"
              style={{ width: '150px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}
            />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0' }}>
          {isLoading ? (
            <p style={{ padding: '2rem', textAlign: 'center' }}>Memuat data rekap...</p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode Print</th>
                    <th>Tgl Pembuatan</th>
                    <th>Outlet</th>
                    <th>Profile</th>
                    <th style={{ textAlign: 'center' }}>QTY</th>
                    <th style={{ textAlign: 'center' }}>Sisa Stock</th>
                    <th style={{ textAlign: 'center' }}>Terjual</th>
                    <th>Total HPP</th>
                    <th>Total Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>Data tidak ditemukan.</td>
                    </tr>
                  ) : (
                    currentItems.map((row, i) => (
                      <tr 
                        key={i} 
                        onClick={() => openModal(row)} 
                        style={{ cursor: 'pointer', verticalAlign: 'middle' }}
                      >
                        <td><strong>{row.kode_print}</strong></td>
                        <td style={{ fontSize: '0.8rem', opacity: 0.8 }}>{formatDate(row.created_at)}</td>
                        <td>{row.outlet_name || '-'}</td>
                        <td><span className="badge" style={{ background: 'var(--accent-primary)', minWidth: '80px', textAlign: 'center' }}>{row.profile}</span></td>
                        <td style={{ textAlign: 'center' }}><strong>{row.qty}</strong></td>
                        <td style={{ textAlign: 'center', color: row.sisa_stock > 0 ? 'inherit' : 'var(--text-secondary)' }}>{row.sisa_stock}</td>
                        <td style={{ textAlign: 'center', color: row.terjual > 0 ? 'var(--success)' : 'inherit' }}>{row.terjual}</td>
                        <td>{formatRupiah(row.total_hpp)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{formatRupiah(row.total_harga)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) }
        </div>
      </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Menampilkan {filteredList.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(filteredList.length, currentPage * itemsPerPage)} dari {filteredList.length} Batch
          </p>
<div className="pagination-wrapper">
  <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>Prev</button>
  <div className="pagination-text">{currentPage} / {totalPages}</div>
  <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages}>Next</button>
</div>
        </div>
      {/* MODAL RINCIAN */}
      <div className={`modal-overlay ${isModalOpen ? 'open' : ''}`} onClick={closeModal}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          <div className="modal-header">
            <h2>Rincian Rekap: {selectedBatch?.kode_print}</h2>
            <button className="modal-close" onClick={closeModal}>&times;</button>
          </div>
          
          {selectedBatch && (
            <div style={{ marginTop: '1rem' }}>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', lineHeight: '1.8' }}>
                <li><strong>Profile:</strong> {selectedBatch.profile}</li>
                <li><strong>Outlet:</strong> {selectedBatch.outlet_name || 'Tidak ada'}</li>
                <li><strong>Tanggal:</strong> {formatDate(selectedBatch.created_at)}</li>
                <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', margin: '1rem 0' }} />
                <li><strong>Total Tercetak (QTY):</strong> {selectedBatch.qty} pcs</li>
                <li><strong style={{ color: 'var(--success)' }}>Total Terjual:</strong> {selectedBatch.terjual} pcs</li>
                <li><strong style={{ color: 'var(--warning)' }}>Sisa Stock:</strong> {selectedBatch.sisa_stock} pcs</li>
                <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', margin: '1rem 0' }} />
                <li><strong>Total HPP (Modal):</strong> {formatRupiah(selectedBatch.total_hpp)}</li>
                <li><strong>Total Harga (Jual):</strong> <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{formatRupiah(selectedBatch.total_harga)}</span></li>
                <li><strong>Total Laba (Potensi):</strong> <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{formatRupiah(selectedBatch.total_laba)}</span></li>
              </ul>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Cetak Ulang (Reprint)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select 
                      className="form-input" 
                      value={selectedTemplate} 
                      onChange={e => setSelectedTemplate(e.target.value)}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem', padding: '0.6rem' }}
                    >
                      {templates.length === 0 && <option value="">Memuat template...</option>}
                      {templates.map(t => (
                        <option key={t.id} value={t.id} style={{ background: '#1e1b1e' }}>{t.template_name || `Template ${t.id}`}</option>
                      ))}
                    </select>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      onClick={() => {
                        window.open(`/print?batch_id=${encodeURIComponent(selectedBatch.kode_print)}&template_id=${selectedTemplate}`, '_blank');
                      }}
                      disabled={!selectedTemplate}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>print</span> Print
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    className="btn btn-danger" 
                    style={{ flex: 1, padding: '1rem', background: '#d97706' }} 
                    onClick={() => handleDelete('sisa')}
                    disabled={selectedBatch.sisa_stock === 0}
                  >
                    🗑️ Hapus Sisa Stock
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ flex: 1, padding: '1rem' }} 
                    onClick={() => handleDelete('terjual')}
                    disabled={selectedBatch.terjual === 0}
                  >
                    🗑️ Hapus Terjual
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
          .data-table th, .data-table td {
            white-space: nowrap;
            padding: 14px 18px;
            vertical-align: middle;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.03);
          }
          .data-table th {
            font-weight: 800;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-primary);
            background: rgba(255,255,255,0.05);
          }
          .data-table td {
            font-size: 1rem;
            font-weight: 500;
            color: var(--text-primary);
          }
          .table-container {
            overflow-x: auto;
            width: 100%;
            border-radius: 12px;
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

export default RekapVoucher;
