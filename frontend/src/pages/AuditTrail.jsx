import React, { useState, useEffect } from 'react';
import { formatDateTime } from '../utils/dateFormatter';

const AuditTrail = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null); // for detail modal
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Auto refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Apply filters
  useEffect(() => {
    let result = [...logs];

    // Search term filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(log => 
        (log.admin_username || '').toLowerCase().includes(term) ||
        (log.action || '').toLowerCase().includes(term) ||
        (log.details || '').toLowerCase().includes(term) ||
        (log.ip_address || '').toLowerCase().includes(term)
      );
    }

    // Action filter
    if (actionFilter !== 'ALL') {
      result = result.filter(log => {
        const act = (log.action || '').toLowerCase();
        if (actionFilter === 'CREATE') return act.includes('tambah') || act.includes('create') || act.includes('generate');
        if (actionFilter === 'UPDATE') return act.includes('edit') || act.includes('update') || act.includes('ubah');
        if (actionFilter === 'DELETE') return act.includes('hapus') || act.includes('delete') || act.includes('remove');
        if (actionFilter === 'LOGIN') return act.includes('login') || act.includes('masuk');
        return true;
      });
    }

    setFilteredLogs(result);
  }, [logs, searchTerm, actionFilter]);

  // Helper to format action badges
  const getActionBadge = (action = '') => {
    const act = action.toLowerCase();
    let bg = 'rgba(148, 163, 184, 0.1)'; // default gray
    let color = '#94a3b8';

    if (act.includes('tambah') || act.includes('create') || act.includes('generate')) {
      bg = 'rgba(16, 185, 129, 0.1)';
      color = '#10b981';
    } else if (act.includes('edit') || act.includes('update') || act.includes('ubah') || act.includes('ganti')) {
      bg = 'rgba(59, 130, 246, 0.1)';
      color = '#3b82f6';
    } else if (act.includes('hapus') || act.includes('delete') || act.includes('remove')) {
      bg = 'rgba(239, 68, 68, 0.1)';
      color = '#ef4444';
    } else if (act.includes('login') || act.includes('masuk') || act.includes('auth')) {
      bg = 'rgba(139, 92, 246, 0.1)';
      color = '#8b5cf6';
    }

    return (
      <span className="badge" style={{ background: bg, color: color, textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold' }}>
        {action}
      </span>
    );
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Audit Trail & Log Aktivitas</h1>
          <p className="page-subtitle">Daftar rekam jejak aksi yang dilakukan oleh administrator sistem</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ 
              borderRadius: '50px',
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(255,255,255,0.05)',
              background: autoRefresh ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)',
              color: autoRefresh ? '#10b981' : 'var(--text-secondary)'
            }}
          >
            <span className={`material-symbols-rounded ${autoRefresh ? 'spinning' : ''}`} style={{ fontSize: '18px' }}>
              sync
            </span>
            {autoRefresh ? 'AUTO SYNC ON (15s)' : 'AUTO SYNC OFF'}
          </button>
          <button 
            className="btn" 
            onClick={fetchLogs}
            style={{ 
              background: 'rgba(255, 255, 255, 0.03)', 
              color: '#3b82f6', 
              border: '1px solid rgba(59, 130, 246, 0.2)', 
              borderRadius: '50px', 
              padding: '0.5rem 1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: '700'
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>refresh</span>
            SEGARKAN
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1rem' }}>
          <div>
            <input 
              type="text" 
              className="form-input" 
              style={{ width: '100%' }}
              placeholder="Cari berdasarkan username, aksi, keterangan, atau IP..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select 
              className="form-input" 
              style={{ width: '100%' }}
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="ALL">Semua Aksi</option>
              <option value="CREATE">Tambah / Generate</option>
              <option value="UPDATE">Edit / Update</option>
              <option value="DELETE">Hapus / Delete</option>
              <option value="LOGIN">Sesi Login</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '180px' }}>Waktu</th>
              <th style={{ width: '130px' }}>Administrator</th>
              <th style={{ width: '150px' }}>Aksi</th>
              <th>Keterangan Aktivitas</th>
              <th style={{ width: '130px' }}>IP Address</th>
              <th style={{ width: '80px', textAlign: 'right' }}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && filteredLogs.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Memuat riwayat log sistem...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Tidak ada rekaman aktivitas yang cocok</td></tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {formatDateTime(log.created_at)}
                  </td>
                  <td>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                      {log.admin_username}
                    </span>
                  </td>
                  <td>{getActionBadge(log.action)}</td>
                  <td>
                    <div style={{ 
                      maxWidth: '400px', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      fontSize: '0.8rem',
                      opacity: 0.9 
                    }}>
                      {log.details}
                    </div>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {log.ip_address || '127.0.0.1'}
                    </code>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn-icon" 
                      onClick={() => setSelectedLog(log)}
                      title="Lihat Detail Lengkap"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>info</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="modal-overlay open" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)' }}>history_edu</span>
                Detail Log Aktivitas
              </h2>
              <button className="modal-close" onClick={() => setSelectedLog(null)}>&times;</button>
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>WAKTU</span>
                  <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                    {formatDateTime(selectedLog.created_at)}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ADMINISTRATOR</span>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                    {selectedLog.admin_username}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>AKSI</span>
                  <div style={{ marginTop: '4px' }}>{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>IP ADDRESS</span>
                  <code style={{ display: 'block', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {selectedLog.ip_address || '127.0.0.1'}
                  </code>
                </div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>KETERANGAN LENGKAP</span>
                <div style={{ 
                  background: '#0f172a', 
                  border: '1px solid #1e293b', 
                  borderRadius: '8px', 
                  padding: '1rem', 
                  color: '#e2e8f0', 
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {selectedLog.details}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>
                  TUTUP DETAIL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;
