import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const StoreTransactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedIds, setSelectedIds] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });

    useEffect(() => {
        fetchTransactions();
        const interval = setInterval(fetchTransactions, 10000); // Auto refresh tiap 10 detik
        return () => clearInterval(interval);
    }, []);

    const fetchTransactions = async () => {
        try {
            const res = await fetch('/api/online-store/admin/transactions');
            const data = await res.json();
            setTransactions(data);
            setSelectedIds([]); // Reset seleksi tiap refresh
        } catch (error) {
            console.error('Gagal mengambil transaksi:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (orderId) => {
        triggerConfirm('Setujui pembayaran untuk ' + orderId + '?', async () => {

          try {
              const res = await fetch('/api/online-store/admin/approve', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ order_id: orderId })
              });
              if (res.ok) {
                  alert('Berhasil disetujui!');
                  fetchTransactions();
              } else {
                  const err = await res.json();
                  alert('Gagal: ' + err.error);
              }
          } catch (error) {
              alert('Error: ' + error.message);
          }
          });
      };

    const handleDelete = async (id) => {
        triggerConfirm('Hapus transaksi ini secara permanen?', async () => {

          try {
              const res = await fetch('/api/online-store/admin/transactions/' + id, {
                  method: 'DELETE'
              });
              if (res.ok) {
                  fetchTransactions();
              } else {
                  alert('Gagal menghapus');
              }
          } catch (error) {
              alert('Error: ' + error.message);
          }
          });
      };

    const handleBulkDelete = async () => {
        triggerConfirm(`Hapus ${selectedIds.length} transaksi yang dipilih secara permanen?`, async () => {

          try {
              const res = await fetch('/api/online-store/admin/transactions/bulk-delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ids: selectedIds })
              });
              if (res.ok) {
                  setSelectedIds([]);
                  fetchTransactions();
              } else {
                  alert('Gagal menghapus massal');
              }
          } catch (error) {
              alert('Error: ' + error.message);
          }
          });
      };

    const handleCleanup = async () => {
        triggerConfirm('Hapus semua transaksi PENDING yang sudah lebih dari 3 hari?', async () => {

          try {
              const res = await fetch('/api/online-store/admin/transactions/cleanup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ days: 3 })
              });
              const data = await res.json();
              alert(data.message);
              fetchTransactions();
          } catch (error) {
              alert('Error: ' + error.message);
          }
          });
      };

    const toggleSelectAll = () => {
        if (selectedIds.length === currentRows.length && currentRows.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(currentRows.map(r => r.id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'PAID': return { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800', border: '1px solid rgba(16, 185, 129, 0.3)' };
            case 'PENDING': return { background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800', border: '1px solid rgba(245, 158, 11, 0.3)' };
            default: return { background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800', border: '1px solid rgba(148, 163, 184, 0.3)' };
        }
    };

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.order_id.toLowerCase().includes(search.toLowerCase()) ||
                             t.package_id.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredTransactions.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);

    // Hitung Statistik
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    const salesToday = transactions
        .filter(t => t.status === 'PAID' && t.paid_at && new Date(t.paid_at).toISOString().startsWith(today))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const salesThisMonth = transactions
        .filter(t => {
            if (t.status !== 'PAID' || !t.paid_at) return false;
            const d = new Date(t.paid_at);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return (
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '0px' }}>
                <div>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '2rem', fontWeight: '900', letterSpacing: '-1px' }}>Transaksi Store</h2>
                    <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.6)', fontWeight: '500' }}>Monitor pembayaran voucher online</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={fetchTransactions} 
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
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#3b82f6' }}>refresh</span>
                        Refresh
                    </button>

                    <button 
                        onClick={handleCleanup} 
                        style={{ 
                            background: 'rgba(255, 255, 255, 0.03)', 
                            color: '#fb923c', 
                            border: '1px solid rgba(251, 146, 60, 0.2)', 
                            borderRadius: '50px', 
                            padding: '0.6rem 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(251, 146, 60, 0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                    >
                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>delete_sweep</span>
                        Bersihkan Pending
                    </button>
                    {selectedIds.length > 0 && (
                        <button onClick={handleBulkDelete} className="btn-danger" style={{ padding: '0.6rem 1.5rem', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '800' }}>
                            Hapus {selectedIds.length}
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '12px' }}>
                        <span className="material-symbols-rounded" style={{ color: '#38bdf8', fontSize: '28px' }}>payments</span>
                    </div>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: '600' }}>PENJUALAN HARI INI</div>
                        <div style={{ color: 'white', fontSize: '1.4rem', fontWeight: '900' }}>Rp {salesToday.toLocaleString('id-ID')}</div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>
                        <span className="material-symbols-rounded" style={{ color: '#10b981', fontSize: '28px' }}>account_balance_wallet</span>
                    </div>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: '600' }}>PENJUALAN BULAN INI</div>
                        <div style={{ color: 'white', fontSize: '1.4rem', fontWeight: '900' }}>Rp {salesThisMonth.toLocaleString('id-ID')}</div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-card" style={{ display: 'flex', gap: '15px', padding: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <span className="material-symbols-rounded" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '20px' }}>search</span>
                    <input 
                        type="text" 
                        placeholder="Cari Order ID atau Paket..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '12px 12px 12px 45px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', outline: 'none' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {['ALL', 'PENDING', 'PAID'].map(s => (
                        <button 
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            style={{ 
                                padding: '10px 20px', 
                                background: statusFilter === s ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', 
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #334155', background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '15px 20px', width: '40px' }}><input type="checkbox" checked={selectedIds.length === currentRows.length && currentRows.length > 0} onChange={toggleSelectAll} /></th>
                                <th style={{ padding: '15px 20px', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Waktu</th>
                                <th style={{ padding: '15px 20px', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Order ID</th>
                                <th style={{ padding: '15px 20px', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Paket</th>
                                <th style={{ padding: '15px 20px', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Nominal</th>
                                <th style={{ padding: '15px 20px', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '15px 20px', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Voucher</th>
                                <th style={{ padding: '15px 20px', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ padding: '50px', textAlign: 'center' }}><div className="spinner"></div></td></tr>
                            ) : currentRows.length === 0 ? (
                                <tr><td colSpan="8" style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>Tidak ada data</td></tr>
                            ) : currentRows.map(trx => (
                                <tr key={trx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '15px 20px' }}><input type="checkbox" checked={selectedIds.includes(trx.id)} onChange={() => toggleSelect(trx.id)} /></td>
                                    <td style={{ padding: '15px 20px', color: '#cbd5e1', fontSize: '0.9rem' }}>{new Date(trx.created_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '').replace(/\./g, ':')}</td>
                                    <td style={{ padding: '15px 20px', fontWeight: '700', color: '#38bdf8' }}>{trx.order_id}</td>
                                    <td style={{ padding: '15px 20px', color: 'white' }}>{trx.package_id}</td>
                                    <td style={{ padding: '15px 20px', fontWeight: '700', color: 'white' }}>Rp {trx.total_amount.toLocaleString('id-ID')}</td>
                                    <td style={{ padding: '15px 20px' }}>
                                        <span style={getStatusStyle(trx.status)}>{trx.status}</span>
                                    </td>
                                    <td style={{ padding: '15px 20px', fontFamily: 'monospace', color: '#fbbf24', fontWeight: '700' }}>{trx.voucher_code || '-'}</td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            {trx.status === 'PENDING' && (
                                                <button onClick={() => handleApprove(trx.order_id)} style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>Setujui</button>
                                            )}
                                            <button onClick={() => handleDelete(trx.id)} style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)' }}>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Halaman {currentPage} dari {totalPages}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white', cursor: 'pointer' }}>Prev</button>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white', cursor: 'pointer' }}>Next</button>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .spinner { width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; animation: spin 0.8s linear infinite; margin: auto; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}} />
        
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
    );
};

export default StoreTransactions;
