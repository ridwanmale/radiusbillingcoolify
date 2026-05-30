import React, { useState, useEffect } from 'react';

const PppoeHistory = ({ user }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(10);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/pppoe-monitoring/history?username=${search}&limit=${limit}`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [limit]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}j ${m}m ${s}s`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="page-pppoe">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Riwayat Koneksi PPPoE</h1>
          <p className="page-subtitle">Log aktivitas login dan logout pelanggan.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: 'auto' }}>
          <select 
            className="form-input" 
            value={limit} 
            onChange={(e) => setLimit(e.target.value)}
            style={{ width: '120px', minWidth: '100px' }}
          >
            <option value="10">10 Baris</option>
            <option value="25">25 Baris</option>
            <option value="50">50 Baris</option>
            <option value="100">100 Baris</option>
          </select>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Cari username..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '250px', minWidth: '150px', flex: '1 1 auto', maxWidth: '400px' }}
          />
          <button className="btn-glass-premium" onClick={fetchHistory}>
            <span className="material-symbols-rounded">search</span>
            <span>Cari</span>
          </button>
        </div>
      </div>

      <style>{`
        .btn-glass-premium {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .btn-glass-premium:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: var(--accent-primary);
          box-shadow: 0 0 20px rgba(14, 165, 233, 0.2);
          transform: translateY(-2px);
        }

        .btn-glass-premium .material-symbols-rounded {
          font-size: 22px;
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          color: var(--accent-primary);
        }

        .btn-glass-premium:hover .material-symbols-rounded {
          transform: rotate(360deg);
        }

        @media (max-width: 1024px) {
          .page-header {
            flex-direction: column !important;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .page-header > div:last-child {
            flex-direction: column;
            width: 100%;
          }
          .page-header input,
          .page-header select {
            width: 100% !important;
          }
          .page-header .btn-glass-premium {
            width: 100%;
            justify-content: center;
          }
          .data-table th,
          .data-table td {
            padding: 0.5rem;
            font-size: 0.8rem;
          }
          .data-table code {
            font-size: 0.7rem;
            word-break: break-all;
          }
          .btn-glass-premium .material-symbols-rounded {
            font-size: 18px;
          }
          .btn-glass-premium {
            padding: 8px 16px;
            font-size: 0.85rem;
          }
          .page-title {
            font-size: 1.5rem;
          }
          .page-subtitle {
            font-size: 0.85rem;
          }
        }

        @media (max-width: 480px) {
          .data-table th,
          .data-table td {
            padding: 0.3rem 0.5rem;
            font-size: 0.75rem;
          }
          .btn-glass-premium {
            padding: 6px 12px;
            font-size: 0.75rem;
          }
        }
      `}</style>


      <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: '1000px' }}>
          <thead>
            <tr>
              <th>Username / Pelanggan</th>
              <th>Router</th>
              <th>IP Address</th>
              <th>Waktu Connect</th>
              <th>Waktu Disconnect</th>
              <th>Durasi</th>
              <th>Traffic (In/Out)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Memuat data...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Tidak ada riwayat ditemukan</td></tr>
            ) : (
              history.map(h => (
                <tr key={h.radacctid}>
                  <td>
                    <strong>{h.username}</strong><br/>
                    <small>{h.customer_name || 'N/A'}</small>
                  </td>
                  <td>{h.router_name || h.nasipaddress}</td>
                  <td>{h.framedipaddress}</td>
                  <td>{formatDate(h.acctstarttime)}</td>
                  <td>{formatDate(h.acctstoptime)}</td>
                  <td>{formatDuration(h.acctsessiontime)}</td>
                  <td>
                    <span style={{ color: '#10b981' }}>↑ {formatBytes(h.acctoutputoctets)}</span><br/>
                    <span style={{ color: '#ef4444' }}>↓ {formatBytes(h.acctinputoctets)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default PppoeHistory;
