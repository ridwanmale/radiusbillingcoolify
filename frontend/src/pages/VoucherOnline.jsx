import React, { useState, useEffect } from 'react';

const VoucherOnline = () => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRouter, setFilterRouter] = useState('ALL ROUTER');
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'acctstarttime', direction: 'desc' });

  const [currentTime, setCurrentTime] = useState(new Date().getTime());
  
  const fetchOnline = async () => {
    setIsLoading(true);
    try {
      // Jalankan sinkronisasi latar belakang otomatis secara asinkron (tidak di-await)
      fetch(`/api/dashboard/sync`, { method: 'POST' }).catch(err => console.error('Auto-sync failed:', err));

      const host = window.location.hostname;
      const res = await fetch(`/api/dashboard/online`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOnline();
    const fetchInterval = setInterval(fetchOnline, 30000);
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().getTime());
    }, 1000);

    return () => {
      clearInterval(fetchInterval);
      clearInterval(timeInterval);
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const dDate = new Date(dateString);
    return dDate.toLocaleString('id-ID', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit' 
    }).replace(',', '').replace(/\./g, ':');
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const formatBytes = (bytes) => {
    const b = parseFloat(bytes);
    if (isNaN(b) || b <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const s = parseInt(seconds);
    if (isNaN(s) || s < 0) return '0s';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const calculateTimeLeft = (expirationDateStr, startTimeStr, masaAktif, satuan) => {
    if (expirationDateStr) {
      const expiryTime = new Date(expirationDateStr).getTime();
      const remaining = Math.max(0, Math.floor((expiryTime - currentTime) / 1000));
      return remaining;
    }

    if (!startTimeStr || !masaAktif) return 0;
    
    const startTime = new Date(startTimeStr).getTime();
    let totalSeconds = 0;
    const val = parseInt(masaAktif);
    
    if (satuan === 'Jam') totalSeconds = val * 3600;
    else if (satuan === 'Hari') totalSeconds = val * 86400;
    else if (satuan === 'Menit') totalSeconds = val * 60;
    else totalSeconds = val; // Default seconds if unknown

    const expiryTime = startTime + (totalSeconds * 1000);
    const remaining = Math.max(0, Math.floor((expiryTime - currentTime) / 1000));
    return remaining;
  };

  // Pagination State
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);


  const routers = [...new Set(sessions.map(s => s.router || s.nasipaddress))];

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <span style={{ opacity: 0.3, fontSize: '0.7rem', marginLeft: '5px' }}>↕</span>;
    return <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', marginLeft: '5px' }}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
  };

  const filteredSessions = sessions
    .filter(s => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (s.username || '').toLowerCase().includes(query) || (s.profile && s.profile.toLowerCase().includes(query));
      const matchesRouter = filterRouter === 'ALL ROUTER' || s.router === filterRouter || s.nasipaddress === filterRouter;
      return matchesSearch && matchesRouter;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage) || 1;
  const currentItems = filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedSessions.length === currentItems.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(currentItems.map(s => s.username));
    }
  };

  const toggleSelect = (username) => {
    if (selectedSessions.includes(username)) {
      setSelectedSessions(selectedSessions.filter(u => u !== username));
    } else {
      setSelectedSessions([...selectedSessions, username]);
    }
  };


  const handleBulkAction = async (action) => {
    if (selectedSessions.length === 0) {
      alert('Pilih minimal satu user!');
      return;
    }
    const confirmMsg = `Yakin ingin melakukan ${action} pada ${selectedSessions.length} user?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const host = window.location.hostname;
      const endpoint = action === 'KICK' ? 'kick' : 'delete-session';
      const res = await fetch(`/api/dashboard/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: selectedSessions })
      });
      if (res.ok) {
        alert('Aksi berhasil dilakukan!');
        setSelectedSessions([]);
        fetchOnline();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Voucher Online</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitoring real-time user yang sedang aktif</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-glass-premium btn-blue" onClick={fetchOnline}>
            <span className="material-symbols-rounded">refresh</span>
            <span>Refresh</span>
          </button>

          <button className="btn-glass-premium btn-red" onClick={() => handleBulkAction('KICK')}>
            <span className="material-symbols-rounded">no_accounts</span>
            <span>Kick</span>
          </button>

          <button 
            className="btn-glass-premium btn-amber" 
            onClick={async () => {
              const res = await fetch(`/api/dashboard/sync`, { method: 'POST' });
              if (res.ok) {
                const data = await res.json();
                alert(`Sinkronisasi berhasil! ${data.cleaned} sesi hantu berhasil dibersihkan.`);
                fetchOnline();
              }
            }}
          >
            <span className="material-symbols-rounded">sync</span>
            <span>Sinkron Sesi</span>
          </button>

          <button className="btn-glass-premium btn-red" onClick={() => handleBulkAction('HAPUS')}>
            <span className="material-symbols-rounded">delete</span>
            <span>Hapus</span>
          </button>
        </div>
      </div>


      {/* SUMMARY CARDS - Only Sesi Aktif (Dashboard Card Style) */}
      <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 350px))' }}>
        <div className="glass-card" style={{ borderTop: '2px solid rgba(59, 130, 246, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', padding: '12px', borderRadius: '14px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>online_prediction</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Sesi Aktif</div>
              <div className="stat-value" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
                {filteredSessions.length} <span style={{ fontSize: '1.2rem', fontWeight: '400', opacity: 0.5 }}>Online</span>
              </div>
            </div>
          </div>
        </div>
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
              <option value="10" style={{ background: '#1d0f15' }}>10</option>
              <option value="25" style={{ background: '#1d0f15' }}>25</option>
              <option value="50" style={{ background: '#1d0f15' }}>50</option>
              <option value="100" style={{ background: '#1d0f15' }}>100</option>
            </select>
            entries
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select className="form-input" value={filterRouter} onChange={e => {setFilterRouter(e.target.value); setCurrentPage(1);}} style={{ width: '150px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}>
                <option value="ALL ROUTER" style={{ background: '#1d0f15' }}>ALL ROUTER</option>
                {routers.map(r => <option key={r} value={r} style={{ background: '#1d0f15' }}>{r}</option>)}
              </select>
            </div>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Search:</span>
            <input 
              type="text" 
              placeholder="Cari user..." 
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

        <div className="glass-card" style={{ padding: '0' }}>
          <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}><input type="checkbox" checked={currentItems.length > 0 && selectedSessions.length === currentItems.length} onChange={toggleSelectAll} /></th>
                <th onClick={() => requestSort('username')} style={{ cursor: 'pointer', textAlign: 'left' }}>Username {getSortIcon('username')}</th>
                <th onClick={() => requestSort('profile')} style={{ cursor: 'pointer' }}>Profile {getSortIcon('profile')}</th>
                <th onClick={() => requestSort('framedipaddress')} style={{ cursor: 'pointer' }}>IP Address {getSortIcon('framedipaddress')}</th>
                <th onClick={() => requestSort('mac_address')} style={{ cursor: 'pointer' }}>MAC Address {getSortIcon('mac_address')}</th>
                <th onClick={() => requestSort('download')} style={{ cursor: 'pointer' }}>Download {getSortIcon('download')}</th>
                <th onClick={() => requestSort('upload')} style={{ cursor: 'pointer' }}>Upload {getSortIcon('upload')}</th>
                <th onClick={() => requestSort('duration')} style={{ cursor: 'pointer' }}>Waktu Aktif {getSortIcon('duration')}</th>
                <th style={{ color: '#38bdf8' }}>Sisa Waktu</th>
                <th onClick={() => requestSort('acctstarttime')} style={{ cursor: 'pointer' }}>Tgl Aktif {getSortIcon('acctstarttime')}</th>
                <th onClick={() => requestSort('acctupdatetime')} style={{ cursor: 'pointer' }}>Last Update {getSortIcon('acctupdatetime')}</th>
                <th onClick={() => requestSort('router')} style={{ cursor: 'pointer' }}>Router {getSortIcon('router')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && sessions.length === 0 ? (
                <tr><td colSpan="15" style={{ textAlign: 'center', padding: '3rem' }}>Memuat data...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan="15" style={{ textAlign: 'center', padding: '3rem' }}>Tidak ada voucher online ditemukan.</td></tr>
              ) : (
                <>
                  {currentItems.map((s, i) => {
                    const startTime = new Date(s.acctstarttime).getTime();
                    const now = new Date().getTime();
                    const realDuration = Math.floor((now - startTime) / 1000);
                    return (
                      <tr 
                        key={i} 
                        style={{ verticalAlign: 'middle' }} 
                        className="table-row-hover"
                      >
                        <td style={{ textAlign: 'center' }}><input type="checkbox" checked={selectedSessions.includes(s.username)} onChange={(e) => { toggleSelect(s.username); }} /></td>
                        <td style={{ textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }}></span>
                            <strong style={{ fontWeight: '800', fontSize: '1rem' }}>
                              {s.username}
                            </strong>
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'var(--accent-primary)', color: 'white', minWidth: '80px', textAlign: 'center' }}>
                            {s.profile || '-'}
                          </span>
                        </td>
                        <td>{s.framedipaddress || '-'}</td>
                        <td style={{ fontFamily: 'monospace' }}><code>{s.mac_address || '-'}</code></td>
                        <td style={{ color: '#10b981', fontWeight: 'bold' }}>↓ {formatBytes(s.download)}</td>
                        <td style={{ color: '#f43f5e', fontWeight: 'bold' }}>↑ {formatBytes(s.upload)}</td>
                        <td style={{ fontFamily: 'monospace' }}>{formatDuration(realDuration > 0 ? realDuration : s.duration)}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8' }}>
                          {formatDuration(calculateTimeLeft(s.expiration_date, s.acctstarttime, s.masa_aktif, s.satuan))}
                        </td>
                        <td>{formatDate(s.acctstarttime)}</td>
                        <td>{formatDate(s.acctupdatetime)}</td>
                        <td><span className="badge" style={{ minWidth: '80px', textAlign: 'center' }}>{s.router || s.nasipaddress}</span></td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1.5rem' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Terpilih: {selectedSessions.length} | Menampilkan {filteredSessions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(filteredSessions.length, currentPage * itemsPerPage)} dari {filteredSessions.length} Sesi Online
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: 'white', opacity: currentPage === 1 ? 0.3 : 1 }}
            >
              Prev
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px' }}>
              {currentPage} / {totalPages}
            </div>
            <button 
              className="btn" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: 'white', opacity: currentPage >= totalPages ? 0.3 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
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
          border-radius: 50px;
          color: white;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .btn-glass-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
        }

        .btn-glass-premium .material-symbols-rounded {
          font-size: 20px;
        }

        .btn-blue:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .btn-red:hover { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .btn-amber:hover { border-color: #f59e0b; background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

        .btn-blue .material-symbols-rounded { color: #3b82f6; }
        .btn-red .material-symbols-rounded { color: #ef4444; }
        .btn-amber .material-symbols-rounded { color: #f59e0b; }

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
        .table-row-hover:hover {
          background-color: rgba(59, 130, 246, 0.08);
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
          animation: fadeIn 0.3s ease-out;
        }
        .modal-content {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }
        .detail-label {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </>
  );
};

export default VoucherOnline;
