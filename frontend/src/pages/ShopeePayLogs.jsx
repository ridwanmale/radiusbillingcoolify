import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const ShopeePayLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/payment-detections/logs');
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (orderId) => {
    triggerConfirm(`Setujui pembayaran untuk Order: ${orderId}?`, async () => {
      try {
        const res = await fetch('/api/online-store/admin/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId })
        });
        const data = await res.json();
        if (data.voucher_code) {
          alert(`Berhasil! Voucher: ${data.voucher_code}`);
          fetchLogs();
        } else {
          alert(data.error || 'Gagal menyetujui');
        }
      } catch (err) {
        alert('Terjadi kesalahan server');
      }
      });
  };

  const filteredLogs = Array.isArray(logs) ? logs.filter(log => {
    if (filter === 'all') return true;
    return log.match_status === filter;
  }) : [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'matched': return <span className="badge badge-success">MATCHED</span>;
      case 'unmatched': return <span className="badge badge-danger">UNMATCHED</span>;
      case 'need_manual_review': return <span className="badge badge-info">REVIEW</span>;
      default: return <span className="badge">{status}</span>;
    }
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
            Payment Bridge Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
            Monitoring real-time notifikasi pembayaran QRIS Statik dari perangkat Android.
          </p>
        </div>
        <button className="btn btn-primary" onClick={fetchLogs} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded">refresh</span>
          REFRESH DATA
        </button>
      </div>

      {/* Filter Stats */}
      <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
        <div className={`glass-card ${filter === 'all' ? 'active-filter' : ''}`} 
             onClick={() => setFilter('all')} 
             style={{ cursor: 'pointer', border: filter === 'all' ? '1px solid var(--accent-primary)' : 'var(--glass-border)' }}>
          <div className="stat-label">Total Notifikasi</div>
          <div className="stat-value">{logs.length}</div>
        </div>
        <div className={`glass-card ${filter === 'matched' ? 'active-filter' : ''}`} 
             onClick={() => setFilter('matched')} 
             style={{ cursor: 'pointer', border: filter === 'matched' ? '1px solid var(--success)' : 'var(--glass-border)' }}>
          <div className="stat-label">Matched</div>
          <div className="stat-value" style={{ color: 'var(--success)', WebkitTextFillColor: 'var(--success)' }}>
            {logs.filter(l => l.match_status === 'matched').length}
          </div>
        </div>
        <div className={`glass-card ${filter === 'unmatched' ? 'active-filter' : ''}`} 
             onClick={() => setFilter('unmatched')} 
             style={{ cursor: 'pointer', border: filter === 'unmatched' ? '1px solid var(--danger)' : 'var(--glass-border)' }}>
          <div className="stat-label">Unmatched</div>
          <div className="stat-value" style={{ color: 'var(--danger)', WebkitTextFillColor: 'var(--danger)' }}>
            {logs.filter(l => l.match_status === 'unmatched').length}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container animate-slide-up">
        <table className="data-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Device</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Matched Order</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '4rem' }}>
                <span className="material-symbols-rounded spin" style={{ fontSize: '2rem', color: 'var(--accent-primary)' }}>refresh</span>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Memuat data...</p>
              </td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '4rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '3rem', opacity: 0.2 }}>history</span>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Tidak ada data yang ditemukan untuk filter ini.</p>
              </td></tr>
            ) : filteredLogs.map(log => (
              <tr key={log.id}>
                <td>
                  <div style={{ fontWeight: '600' }}>{new Date(log.received_at).toLocaleTimeString('id-ID')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(log.received_at).toLocaleDateString('id-ID')}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px', opacity: 0.5 }}>smartphone</span>
                    {log.device_id}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--accent-secondary)' }}>
                    Rp {Number(log.amount_detected).toLocaleString('id-ID', { minimumFractionDigits: 0 })}
                  </div>
                </td>
                <td>{getStatusBadge(log.match_status)}</td>
                <td>
                  {log.matched_order_id ? (
                    <code style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                      #{log.matched_order_id}
                    </code>
                  ) : (
                    <span style={{ opacity: 0.3 }}>-</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {log.match_status === 'matched' && (
                    <button className="btn btn-primary" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                            onClick={() => handleApprove(log.matched_order_id)}>
                      APPROVE
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .active-filter {
          background: rgba(255, 255, 255, 0.08) !important;
          transform: translateY(-5px);
        }
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

export default ShopeePayLogs;
