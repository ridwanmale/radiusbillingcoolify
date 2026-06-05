import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'react-toastify';
import { formatDateTime } from '../utils/dateFormatter';

const VoucherTerjual = () => {
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVouchers, setSelectedVouchers] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });
  
  // Filters
  const [filterMitra, setFilterMitra] = useState('');
  const [filterRouter, setFilterRouter] = useState('ALL ROUTER');
  const [filterServer, setFilterServer] = useState('ALL SERVER');
  const [filterProfile, setFilterProfile] = useState('ALL PROFILE');
  const [filterOutlet, setFilterOutlet] = useState('ALL OUTLET');
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'sold_at', direction: 'desc' });

  const [deleteFilter, setDeleteFilter] = useState({
    outlet: 'Semua Outlet',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [outlets, setOutlets] = useState([]);
  const [viewVoucher, setViewVoucher] = useState(null);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
  const [autoDeleteInterval, setAutoDeleteInterval] = useState('1_month');
  const [isSavingAutoDelete, setIsSavingAutoDelete] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data) {
        setAutoDeleteEnabled(!!data.voucher_auto_delete_enabled);
        setAutoDeleteInterval(data.voucher_auto_delete_interval || '1_month');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSaveAutoDelete = async () => {
    setIsSavingAutoDelete(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucher_auto_delete_enabled: autoDeleteEnabled ? 1 : 0,
          voucher_auto_delete_interval: autoDeleteInterval
        })
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Pengaturan Auto Delete berhasil disimpan!');
      } else {
        toast.error('Gagal menyimpan pengaturan: ' + (result.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal koneksi ke server');
    } finally {
      setIsSavingAutoDelete(false);
    }
  };
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importProfile, setImportProfile] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [exportType, setExportType] = useState('ALL'); // 'ALL' or 'ONLINE_INVOICE'
  const [exportProfile, setExportProfile] = useState('ALL'); // 'ALL' or specific profile name

  const fetchTerjual = async () => {
    setIsLoading(true);
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/vouchers/terjual`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setVouchers(data);
      } else {
        setVouchers([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOutlets = async () => {
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/outlets`);
      const data = await res.json();
      setOutlets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const [currentTime, setCurrentTime] = useState(new Date().getTime());
  
  useEffect(() => {
    fetchTerjual();
    fetchOutlets();
    fetchSettings();
    const interval = setInterval(() => {
      setCurrentTime(new Date().getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleBulkAction = async (action, targetUsernames) => {
    const usernamesToProcess = targetUsernames || selectedVouchers;
    if (usernamesToProcess.length === 0) {
      toast.warning('Pilih setidaknya satu voucher!');
      return;
    }

    let confirmMsg = `Yakin ingin melakukan ${action.replace('_', ' ').toUpperCase()} pada ${usernamesToProcess.length} voucher?`;
    if (action === 'refund') confirmMsg = `PENTING: Voucher akan DIHAPUS PERMANEN dari sistem dan total penjualan akan berkurang. Lanjutkan Refund?`;
    
    triggerConfirm(confirmMsg, async () => {
      try {
      const host = window.location.hostname;
      const res = await fetch(`/api/vouchers/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, usernames: usernamesToProcess })
      });
      
      const result = await res.json().catch(() => ({ error: 'Gagal membaca respon server' }));
      
      if (res.ok) {
        toast.success(result.message || 'Aksi berhasil dilakukan!');
        if (!targetUsernames) setSelectedVouchers([]);
        fetchTerjual();
      } else {
        toast.error('Gagal: ' + (result.error || 'Terjadi kesalahan pada server'));
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal koneksi ke server: ' + err.message);
      } finally {
        setActiveActionMenu(null);
      }
    });
  };

  const toggleSelect = (id) => {
    setSelectedVouchers(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const calculateTimeLeft = (startTime, value, unit) => {
    if (!startTime || !value) return 0;
    
    let durationSeconds = 0;
    const val = parseInt(value);
    
    if (unit === 'Hari') durationSeconds = val * 86400;
    else if (unit === 'Jam') durationSeconds = val * 3600;
    else if (unit === 'Menit') durationSeconds = val * 60;
    else durationSeconds = val;

    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const elapsed = Math.floor((now - start) / 1000);
    
    return Math.max(0, durationSeconds - elapsed);
  };

  const formatDuration = (seconds) => {
    if (seconds <= 0) return 'EXPIRED';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return formatDateTime(dateString);
  };

  const formatHMS = (seconds) => {
    const s = parseInt(seconds || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return [h, m, sec].map(v => v.toString().padStart(2, '0')).join(':');
  };

  const formatLimit = (seconds) => {
    const s = parseInt(seconds);
    if (!s || s <= 0) return 'UNLIMITED';
    return formatHMS(s);
  };

  const formatBytes = (bytes) => {
    const b = parseFloat(bytes);
    if (isNaN(b) || b <= 0) return 'UNLIMITED';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

    const handleExportCSV = () => {
    const start = new Date(exportDateRange.startDate);
    const end = new Date(exportDateRange.endDate);
    end.setHours(23, 59, 59, 999);

    let dataToExport = vouchers.filter(v => {
      const dateStr = v.acctstarttime || v.expiration_date || v.created_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= start && d <= end;
    });

    if (exportType === 'ONLINE_INVOICE') {
      dataToExport = dataToExport.filter(v => {
        const isOnline = v.outlet_name === 'Online' || v.outlet_name === 'Online Store' || v.print_code === 'ONLINE-STORE';
        const matchesProfile = exportProfile === 'ALL' || v.profile === exportProfile;
        return isOnline && matchesProfile;
      });
    }

    if (dataToExport.length === 0) {
      toast.warning('Tidak ada data yang sesuai dengan kriteria export pada rentang tanggal tersebut!');
      return;
    }

    let headers = [];
    let csvRows = [];
    let fileName = '';

    if (exportType === 'ONLINE_INVOICE') {
      headers = ['No Invoice / Voucher Code', 'Tanggal Transaksi', 'Kategori Paket (Profile)', 'Router', 'HPP', 'Komisi', 'Harga', 'Status'];
      csvRows = [
        headers.join(','),
        ...dataToExport.map(v => [
          v.voucher_code || v.username,
          v.acctstarttime || v.created_at,
          v.profile,
          v.router || '-',
          v.hpp,
          v.komisi,
          v.harga,
          v.status
        ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
      ];
      fileName = `Invoice_Voucher_Online_${exportProfile === 'ALL' ? 'Semua_Profile' : exportProfile.replace(/\s+/g, '_')}_${exportDateRange.startDate}_to_${exportDateRange.endDate}.csv`;
    } else {
      headers = ['Voucher Code', 'Profile', 'Router', 'Mitra', 'Outlet', 'HPP', 'Komisi', 'Harga', 'Start Time', 'Expiration Date', 'Status'];
      csvRows = [
        headers.join(','),
        ...dataToExport.map(v => [
          v.voucher_code || v.username,
          v.profile,
          v.router,
          v.mitra_name,
          v.outlet_name,
          v.hpp,
          v.komisi,
          v.harga,
          v.acctstarttime,
          v.expiration_date,
          v.status
        ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
      ];
      fileName = `Rincian_Transaksi_Voucher_${exportDateRange.startDate}_to_${exportDateRange.endDate}.csv`;
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportModalOpen(false);
  };

  const handleDeleteExpired = async () => {
    triggerConfirm(`Yakin ingin menghapus voucher expired sesuai filter? Tindakan ini tidak dapat dibatalkan.`, async () => {
      try {
      const host = window.location.hostname;
      const res = await fetch(`/api/vouchers/delete-expired`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleteFilter)
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
        setShowDeleteModal(false);
        fetchTerjual();
      } else {
        toast.error('Gagal: ' + result.error);
      }
    } catch (err) {
      console.error(err);
        toast.error('Gagal koneksi ke server');
      }
    });
  };

  const getExpiryText = (startTime, timeout) => {
    if (!startTime || !timeout) return '-';
    const expiry = new Date(new Date(startTime).getTime() + parseInt(timeout) * 1000);
    return formatDate(expiry);
  };

  const isExpired = (startTime, timeout) => {
    if (!startTime || !timeout) return false;
    const expiry = new Date(new Date(startTime).getTime() + parseInt(timeout) * 1000);
    return new Date() > expiry;
  };

  const routers = ['ALL ROUTER', ...new Set((vouchers || []).map(v => v && v.router).filter(Boolean))];
  const profiles = ['ALL PROFILE', ...new Set((vouchers || []).map(v => v && v.profile).filter(Boolean))];
  const uniqueOutlets = Array.from(new Set((vouchers || []).map(v => v && v.outlet_name).filter(Boolean)));
  const filterOutlets = ['ALL OUTLET', ...uniqueOutlets];
  if (vouchers.some(v => v && (!v.outlet_name || v.outlet_name === '-'))) {
    if (!filterOutlets.includes('Tanpa Outlet')) {
      filterOutlets.push('Tanpa Outlet');
    }
  }
  const exportProfilesList = ['ALL', ...new Set((vouchers || [])
    .filter(v => v && (v.outlet_name === 'Online' || v.outlet_name === 'Online Store' || v.print_code === 'ONLINE-STORE'))
    .map(v => v.profile)
    .filter(Boolean)
  )];

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <span style={{ opacity: 0.3, fontSize: '0.7rem', marginLeft: '5px' }}>?</span>;
    return <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', marginLeft: '5px' }}>{sortConfig.direction === 'asc' ? '?' : '?'}</span>;
  };

  const filteredVouchers = vouchers
    .filter(v => {
      if (!v) return false;
      const query = searchQuery.toLowerCase();
      const matchesSearch = (v.voucher_code || v.username || '').toLowerCase().includes(query) || (v.profile || '').toLowerCase().includes(query);
      const matchesRouter = filterRouter === 'ALL ROUTER' || v.router === filterRouter;
      const matchesProfile = filterProfile === 'ALL PROFILE' || v.profile === filterProfile;
      const matchesMitra = !filterMitra || (v.mitra_name || '').toLowerCase().includes(filterMitra.toLowerCase());
      const matchesOutlet = filterOutlet === 'ALL OUTLET' || 
                            (v.outlet_name === filterOutlet) || 
                            ((!v.outlet_name || v.outlet_name === '-') && filterOutlet === 'Tanpa Outlet');
      return matchesSearch && matchesRouter && matchesProfile && matchesMitra && matchesOutlet;
    })
    .sort((a, b) => {
      if (!sortConfig || !sortConfig.key || !a || !b) return 0;
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

  const currentItems = (filteredVouchers || []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage) || 1;

  return (
    <div className="voucher-terjual">
      <style>{`
        .password-reveal {
          cursor: pointer;
          min-width: 100px;
          text-align: left;
          padding-left: 5px;
        }
        .password-reveal .masked {
          color: #ffffff !important;
          font-weight: 900 !important;
          letter-spacing: 2px !important;
          display: inline-block !important;
        }
        .password-reveal .unmasked {
          display: none !important;
        }
        .password-reveal:hover .masked {
          display: none !important;
        }
        .password-reveal:hover .unmasked {
          display: inline-block !important;
          font-weight: 800 !important;
          color: #00ffcc !important;
          font-family: monospace !important;
          text-shadow: 0 0 10px rgba(0, 255, 204, 0.6) !important;
        }

        .premium-stat-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
          position: relative;
          overflow: hidden;
        }

        .premium-stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
        }

        .btn-glass-premium {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50px;
          color: white;
          font-weight: 700;
          font-size: 0.95rem;
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

        .btn-blue:hover { border-color: #3b82f6 !important; background: rgba(59, 130, 246, 0.1) !important; color: #3b82f6 !important; }
        .btn-red:hover { border-color: #ef4444 !important; background: rgba(239, 68, 68, 0.1) !important; color: #ef4444 !important; }
        .btn-amber:hover { border-color: #f59e0b !important; background: rgba(245, 158, 11, 0.1) !important; color: #f59e0b !important; }
        .btn-green:hover { border-color: #10b981 !important; background: rgba(16, 185, 129, 0.1) !important; color: #10b981 !important; }

        .btn-blue .material-symbols-rounded { color: #3b82f6; }
        .btn-red .material-symbols-rounded { color: #ef4444; }
        .btn-amber .material-symbols-rounded { color: #f59e0b; }
        .btn-green .material-symbols-rounded { color: #10b981; }
      `}</style>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Rincian Transaksi Voucher</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Monitoring penjualan dan status aktif voucher</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* JUMLAH TERJUAL */}
        <div className="glass-card premium-stat-card" style={{ borderTop: '3px solid rgba(59, 130, 246, 0.5)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', padding: '14px', borderRadius: '16px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.25)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>shopping_cart</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Jumlah Terjual</div>
              <div className="stat-value" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
                {vouchers.length.toLocaleString('id-ID')} <span style={{ fontSize: '1.1rem', fontWeight: '400', opacity: 0.6 }}>pcs</span>
              </div>
            </div>
          </div>
        </div>

        {/* TOTAL PENJUALAN */}
        <div className="glass-card premium-stat-card" style={{ borderTop: '3px solid rgba(16, 185, 129, 0.5)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '14px', borderRadius: '16px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>payments</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Total Penjualan</div>
              <div className="stat-value" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
                {formatRupiah(vouchers.reduce((acc, curr) => acc + Number(curr.harga || 0), 0))}
              </div>
            </div>
          </div>
        </div>

        {/* TOTAL BULANAN */}
        <div className="glass-card premium-stat-card" style={{ borderTop: '3px solid rgba(6, 182, 212, 0.5)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', padding: '14px', borderRadius: '16px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(6, 182, 212, 0.25)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>calendar_month</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>
                Total {new Date().toLocaleString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase()}
              </div>
              <div className="stat-value" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
                {formatRupiah(vouchers.filter(v => {
                  if (!v) return false;
                  const dateStr = v.acctstarttime || v.expiration_date;
                  if (!dateStr) return false;
                  const d = new Date(dateStr);
                  if (isNaN(d.getTime())) return false;
                  return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                }).reduce((acc, curr) => acc + Number(curr.harga || 0), 0))}
              </div>
            </div>
          </div>
        </div>

        {/* JUMLAH EXPIRED */}
        <div className="glass-card premium-stat-card" style={{ borderTop: '3px solid rgba(244, 63, 94, 0.5)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', padding: '14px', borderRadius: '16px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(244, 63, 94, 0.25)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>event_busy</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Jumlah Expired</div>
              <div className="stat-value" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
                {vouchers.filter(v => {
                  if (!v) return false;
                  const now = new Date();
                  const dateStr = v.acctstarttime || v.expiration_date;
                  let expiryDate = v.expiration_date ? new Date(v.expiration_date) : null;
                  if (!expiryDate && v.acctstarttime && v.session_timeout) {
                    const sTime = new Date(v.acctstarttime);
                    if (!isNaN(sTime.getTime())) {
                       expiryDate = new Date(sTime.getTime() + parseInt(v.session_timeout) * 1000);
                    }
                  }
                  return v.status === 'Expired' || (expiryDate && !isNaN(expiryDate.getTime()) && now > expiryDate);
                }).length.toLocaleString('id-ID')} <span style={{ fontSize: '1.1rem', fontWeight: '400', opacity: 0.6 }}>pcs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
        <button className="btn-glass-premium btn-blue" onClick={fetchTerjual}>
          <span className="material-symbols-rounded" style={{ color: '#3b82f6' }}>refresh</span>
          Refresh
        </button>

        <button className="btn-glass-premium btn-amber" onClick={() => handleBulkAction('refund')}>
          <span className="material-symbols-rounded">currency_exchange</span> 
          Refund
        </button>

        <button className="btn-glass-delete" onClick={() => setShowDeleteModal(true)}>
          <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>delete</span> 
          Hapus
        </button>

                <button className="btn-glass-premium btn-green" onClick={() => setIsExportModalOpen(true)}>
          <span className="material-symbols-rounded" style={{ color: '#3b82f6' }}>download</span> 
          Export
        </button>
      </div><div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
            Show 
            <select value={itemsPerPage} onChange={(e) => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}} className="form-input" style={{ width: '70px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}>
              <option value="10" style={{ background: '#1e1b1e' }}>10</option>
              <option value="25" style={{ background: '#1e1b1e' }}>25</option>
              <option value="50" style={{ background: '#1e1b1e' }}>50</option>
            </select>
            entries
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select className="form-input" value={filterRouter} onChange={e => setFilterRouter(e.target.value)} style={{ width: '140px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}>
              {routers.map(r => <option key={r} value={r} style={{ background: '#1e1b1e' }}>{r}</option>)}
            </select>
            <select className="form-input" value={filterProfile} onChange={e => setFilterProfile(e.target.value)} style={{ width: '140px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}>
              {profiles.map(p => <option key={p} value={p} style={{ background: '#1e1b1e' }}>{p}</option>)}
            </select>
            <select className="form-input" value={filterOutlet} onChange={e => setFilterOutlet(e.target.value)} style={{ width: '140px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}>
              {filterOutlets.map(o => <option key={o} value={o} style={{ background: '#1e1b1e' }}>{o === 'Online Store' || o === 'Online' ? '⚡ ' + o : o}</option>)}
            </select>
            <input type="text" placeholder="Cari voucher..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="form-input" style={{ width: '180px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}><input type="checkbox" checked={currentItems.length > 0 && selectedVouchers.length === currentItems.length} onChange={(e) => setSelectedVouchers(e.target.checked ? currentItems.map(v => v.voucher_code || v.username) : [])} /></th>
                  <th onClick={() => requestSort('voucher_code')} style={{ cursor: 'pointer' }}>Voucher {getSortIcon('voucher_code')}</th>
                  <th onClick={() => requestSort('profile')} style={{ cursor: 'pointer' }}>Paket {getSortIcon('profile')}</th>
                  <th onClick={() => requestSort('harga')} style={{ cursor: 'pointer' }}>Harga {getSortIcon('harga')}</th>
                  <th onClick={() => requestSort('acctstarttime')} style={{ cursor: 'pointer' }}>Aktif {getSortIcon('acctstarttime')}</th>
                  <th onClick={() => requestSort('status')} style={{ textAlign: 'center', cursor: 'pointer' }}>Status {getSortIcon('status')}</th>
                  <th onClick={() => requestSort('outlet_name')} style={{ cursor: 'pointer' }}>Outlet {getSortIcon('outlet_name')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>Memuat data...</td></tr>
                ) : currentItems.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>Tidak ada data ditemukan.</td></tr>
                ) : (
                  <>
                    {currentItems.map((v, i) => {
                      const now = new Date();
                      let expiryDate = v.expiration_date ? new Date(v.expiration_date) : null;
                      if (!expiryDate && v.acctstarttime && v.session_timeout) {
                        const sTime = new Date(v.acctstarttime);
                        if (!isNaN(sTime.getTime())) {
                           expiryDate = new Date(sTime.getTime() + parseInt(v.session_timeout) * 1000);
                        }
                      }
                      const isExpiredRealtime = v.status === 'Expired' || (expiryDate && !isNaN(expiryDate.getTime()) && now > expiryDate);
                      
                      return (
                        <tr 
                          key={i} 
                          onClick={() => { setViewVoucher(v); setIsViewModalOpen(true); }}
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.05)', 
                            opacity: isExpiredRealtime ? 0.6 : 1,
                            cursor: 'pointer'
                          }}
                          className="hoverable-row"
                        >
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedVouchers.includes(v.voucher_code || v.username)} onChange={(e) => { e.stopPropagation(); toggleSelect(v.voucher_code || v.username); }} /></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {v.status === 'Aktif' && <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }}></span>}
                              <strong style={{ fontWeight: '700', color: 'white' }}>{v.voucher_code || v.username}</strong>
                            </div>
                          </td>
                          <td><span className="badge" style={{ background: 'var(--accent-primary)', color: 'white', minWidth: '80px', textAlign: 'center' }}>{v.profile || '-'}</span></td>
                          <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{formatRupiah(v.harga)}</td>
                          <td style={{ fontSize: '0.85rem', opacity: 0.8 }}>{formatDate(v.acctstarttime)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${v.status === 'Aktif' ? 'badge-success' : isExpiredRealtime ? 'badge-danger' : 'badge-warning'}`} style={{ minWidth: '70px', textAlign: 'center' }}>
                              {isExpiredRealtime ? 'Expired' : (v.status || 'Aktif')}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.9rem' }}>{v.outlet_name || '-'}</td>
                          
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1.5rem' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Menampilkan {filteredVouchers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(filteredVouchers.length, currentPage * itemsPerPage)} dari {filteredVouchers.length} Voucher
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '4px'
          }}>
            <button 
              className="btn-glass-premium" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '6px 16px',
                background: currentPage === 1 ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                opacity: currentPage === 1 ? 0.2 : 1,
                cursor: currentPage === 1 ? 'default' : 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '600',
                fontSize: '0.9rem',
                boxShadow: 'none'
              }}
            >
              Prev
            </button>
            <div style={{
              padding: '0 16px',
              color: 'white',
              fontWeight: '700',
              fontSize: '0.95rem',
              letterSpacing: '1px',
              fontFamily: 'monospace'
            }}>
              {currentPage} / {totalPages}
            </div>
            <button 
              className="btn-glass-premium" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              style={{
                padding: '6px 16px',
                background: currentPage >= totalPages ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                opacity: currentPage >= totalPages ? 0.2 : 1,
                cursor: currentPage >= totalPages ? 'default' : 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '600',
                fontSize: '0.9rem',
                boxShadow: 'none'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

        {/* MODAL VIEW DETAILS */}
        {isViewModalOpen && viewVoucher && (
          <div className="modal-overlay open" onClick={() => setIsViewModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)' }}>visibility</span>
                  Detail Voucher
                </h2>
                <button className="modal-close" onClick={() => setIsViewModalOpen(false)}>&times;</button>
              </div>
              <div className="detail-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Voucher Code</span>
                  <span style={{ fontWeight: '700', color: '#3b82f6' }}>{viewVoucher.voucher_code || viewVoucher.username}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>PASSWORD</div>
                    <div style={{ fontWeight: '600', fontFamily: 'monospace' }}>{viewVoucher.password || '-'}</div>
                  </div>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>HARGA / HPP</div>
                    <div style={{ fontWeight: '700', color: 'var(--success)' }}>{formatRupiah(viewVoucher.harga)} / {formatRupiah(viewVoucher.hpp)}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>PROFILE (PAKET)</div>
                    <div style={{ fontWeight: '600' }}>{viewVoucher.profile}</div>
                  </div>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>OUTLET</div>
                    <div style={{ fontWeight: '600' }}>{viewVoucher.outlet_name || '-'}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>STATUS</div>
                    <div style={{ fontWeight: '600' }}>{viewVoucher.status}</div>
                  </div>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>KUOTA DATA</div>
                    <div style={{ fontWeight: '700' }}>{formatBytes(viewVoucher.total_quota)}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>DURASI VOUCHER</div>
                    <div style={{ fontWeight: '600' }}>{viewVoucher.value} {viewVoucher.satuan}</div>
                  </div>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>PRINT BATCH CODE</div>
                    <div style={{ fontWeight: '600', fontFamily: 'monospace' }}>{viewVoucher.print_code || '-'}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>WAKTU TERPAKAI / LIMIT</div>
                    <div style={{ fontWeight: '700', fontSize: '1rem', fontFamily: 'monospace' }}>
                       {formatHMS(viewVoucher.used_time)} / {formatLimit(viewVoucher.session_timeout)}
                    </div>
                  </div>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>MAC ADDRESS</div>
                    <div style={{ fontWeight: '600', fontFamily: 'monospace' }}>{viewVoucher.mac_address || '-'}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>TGL AKTIF</div>
                    <div style={{ fontSize: '0.85rem' }}>{formatDate(viewVoucher.acctstarttime)}</div>
                  </div>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>TGL EXPIRED</div>
                    <div style={{ fontSize: '0.85rem' }}>{viewVoucher.expiration_date ? formatDate(viewVoucher.expiration_date) : getExpiryText(viewVoucher.acctstarttime, viewVoucher.session_timeout)}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>SISA WAKTU</div>
                    <div style={{ fontWeight: '700', color: '#38bdf8', fontFamily: 'monospace' }}>
                      {viewVoucher.acctstarttime ? formatDuration(calculateTimeLeft(viewVoucher.acctstarttime, viewVoucher.value, viewVoucher.satuan)) : '-'}
                    </div>
                  </div>
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>MITRA</div>
                    <div style={{ fontWeight: '600' }}>{viewVoucher.mitra_name || '-'}</div>
                  </div>
                </div>
                
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={() => setIsViewModalOpen(false)}>Tutup</button>
              </div>
            </div>
          </div>
        )}

      {/* MODAL HAPUS BERKALA */}
      {showDeleteModal && (
        <div className="modal-overlay open" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>delete</span>
                Hapus Data Expired
              </h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '1.25rem 0 0.5rem 0' }}>
              {/* === HAPUS MANUAL SECTION === */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#ef4444' }}>delete</span>
                  Hapus Manual (Sesuai Filter)
                </h3>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Filter Outlet</label>
                  <select 
                    className="form-input" 
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)' }}
                    value={deleteFilter.outlet}
                    onChange={e => setDeleteFilter({...deleteFilter, outlet: e.target.value})}
                  >
                    <option value="Semua Outlet" style={{ background: '#1e1b1e' }}>Semua Outlet</option>
                    {outlets.map(o => <option key={o.id} value={o.name} style={{ background: '#1e1b1e' }}>{o.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Mulai</label>
                    <input type="date" className="form-input" style={{ width: '100%', background: 'rgba(255,255,255,0.03)' }} value={deleteFilter.startDate} onChange={e => setDeleteFilter({...deleteFilter, startDate: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Sampai</label>
                    <input type="date" className="form-input" style={{ width: '100%', background: 'rgba(255,255,255,0.03)' }} value={deleteFilter.endDate} onChange={e => setDeleteFilter({...deleteFilter, endDate: e.target.value})} />
                  </div>
                </div>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>warning</span>
                  Voucher yang belum expired tidak akan terhapus.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-glass-premium btn-amber" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={handleDeleteExpired}>
                    Eksekusi Hapus
                  </button>
                </div>
              </div>

              {/* === AUTO DELETE BERKALA SECTION === */}
              <div style={{ marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#ef4444' }}>delete</span>
                  Auto Delete Berkala (Otomatis)
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                  <input 
                    type="checkbox" 
                    id="autoDeleteToggle" 
                    checked={autoDeleteEnabled}
                    onChange={e => setAutoDeleteEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="autoDeleteToggle" style={{ fontSize: '0.85rem', color: 'white', cursor: 'pointer', fontWeight: '600' }}>
                    Aktifkan Auto Delete Berkala
                  </label>
                </div>
                
                {autoDeleteEnabled && (
                  <div style={{ marginBottom: '1.25rem', animation: 'fadeIn 0.3s ease' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Hapus Data yang Berumur Lebih Dari</label>
                    <select 
                      className="form-input" 
                      style={{ width: '100%', background: 'rgba(255,255,255,0.03)' }}
                      value={autoDeleteInterval}
                      onChange={e => setAutoDeleteInterval(e.target.value)}
                    >
                      <option value="1_week" style={{ background: '#1e1b1e' }}>1 Minggu</option>
                      <option value="1_month" style={{ background: '#1e1b1e' }}>1 Bulan</option>
                      <option value="2_months" style={{ background: '#1e1b1e' }}>2 Bulan</option>
                      <option value="3_months" style={{ background: '#1e1b1e' }}>3 Bulan</option>
                      <option value="6_months" style={{ background: '#1e1b1e' }}>6 Bulan</option>
                    </select>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn-glass-premium btn-green" 
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }} 
                    onClick={handleSaveAutoDelete}
                    disabled={isSavingAutoDelete}
                  >
                    {isSavingAutoDelete ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                  </button>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', marginTop: '1rem' }}>
              <button className="btn-glass-premium btn-blue" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setShowDeleteModal(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL EXPORT DATA */}
      {isExportModalOpen && (
        <div className="modal-overlay open" onClick={() => setIsExportModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)' }}>csv</span>
                EXPORT DATA
              </h2>
              <button className="modal-close" onClick={() => setIsExportModalOpen(false)}>&times;</button>
            </div>
            <div style={{ padding: '1.5rem 0' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Tipe Export</label>
                <select
                  className="form-input"
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  value={exportType}
                  onChange={e => {
                    setExportType(e.target.value);
                    if (e.target.value !== 'ONLINE_INVOICE') setExportProfile('ALL');
                  }}
                >
                  <option value="ALL" style={{ background: '#1e1b1e' }}>Semua Voucher Terjual (Format Standar)</option>
                  <option value="ONLINE_INVOICE" style={{ background: '#1e1b1e' }}>Invoice Khusus Voucher Online (Outlet Online)</option>
                </select>
              </div>

              {exportType === 'ONLINE_INVOICE' && (
                <div style={{ marginBottom: '1.5rem', animation: 'slideDown 0.3s ease' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Kategori Profile Voucher</label>
                  <select
                    className="form-input"
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                    value={exportProfile}
                    onChange={e => setExportProfile(e.target.value)}
                  >
                    <option value="ALL" style={{ background: '#1e1b1e' }}>Semua Profile Online</option>
                    {exportProfilesList.filter(p => p !== 'ALL').map(p => (
                      <option key={p} value={p} style={{ background: '#1e1b1e' }}>{p}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Dari Tanggal</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    style={{ width: '100%', padding: '10px' }}
                    value={exportDateRange.startDate}
                    onChange={e => setExportDateRange({...exportDateRange, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sampai Tanggal</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    style={{ width: '100%', padding: '10px' }}
                    value={exportDateRange.endDate}
                    onChange={e => setExportDateRange({...exportDateRange, endDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-glass-premium btn-red" onClick={() => setIsExportModalOpen(false)}>Batal</button>
              <button className="btn-glass-premium btn-green" onClick={handleExportCSV}>
                <span className="material-symbols-rounded" style={{ color: '#3b82f6' }}>download</span>
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hoverable-row:hover {
          background: rgba(255,255,255,0.03) !important;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
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

export default VoucherTerjual;






