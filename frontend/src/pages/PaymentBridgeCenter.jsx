import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { formatDateTime } from '../utils/dateFormatter';

const PaymentBridgeCenter = () => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [loading, setLoading] = useState(false);

  // --- STATE FOR CUSTOM CONFIRM MODAL ---
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    title: 'Konfirmasi Tindakan',
    confirmText: 'YA, LANJUTKAN',
    confirmBg: 'var(--accent-primary)',
    confirmShadow: 'rgba(139, 92, 246, 0.3)',
    icon: 'warning',
    iconBg: 'rgba(139, 92, 246, 0.1)',
    iconColor: 'var(--accent-primary)',
    onConfirm: null
  });

  const showConfirm = ({
    message,
    title = 'Konfirmasi Tindakan',
    confirmText = 'YA, LANJUTKAN',
    confirmBg = 'var(--accent-primary)',
    confirmShadow = 'rgba(139, 92, 246, 0.3)',
    icon = 'warning',
    iconBg,
    iconColor,
    onConfirm
  }) => {
    setConfirmModal({
      isOpen: true,
      message,
      title,
      confirmText,
      confirmBg,
      confirmShadow,
      icon,
      iconBg: iconBg || 'rgba(139, 92, 246, 0.1)',
      iconColor: iconColor || 'var(--accent-primary)',
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // --- STATE FOR TRANSACTIONS (Voucher Store) ---
  const [transactions, setTransactions] = useState([]);
  const [trxSearch, setTrxSearch] = useState('');
  const [trxStatusFilter, setTrxStatusFilter] = useState('ALL');
  const [selectedTrxs, setSelectedTrxs] = useState([]);
  const [currentPageTrx, setCurrentPageTrx] = useState(1);

  // --- STATE FOR DETECTION LOGS ---
  const [logs, setLogs] = useState([]);
  const [logSearch, setLogSearch] = useState('');
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [currentPageLogs, setCurrentPageLogs] = useState(1);
  const itemsPerPage = 10;

  // --- STATE FOR SETTINGS ---
  const [portalSettings, setPortalSettings] = useState({
    history_auto_delete_enabled: false,
    history_auto_delete_days: 30,
    auto_cleanup_enabled: true,
    auto_cleanup_hours: 24
  });
  const [isAutoDeleteModalOpen, setIsAutoDeleteModalOpen] = useState(false);

  // --- STATE FOR DEVICES ---
  const [devices, setDevices] = useState([]);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');

  // --- STATE FOR MIDTRANS SETTINGS ---
  const [midtransSettings, setMidtransSettings] = useState({
    is_enabled: false,
    merchant_id: '',
    server_key: '',
    client_key: ''
  });
  const [testingMidtrans, setTestingMidtrans] = useState(false);
  const [showServerKey, setShowServerKey] = useState(false);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [trxRes, logsRes, devRes, settingsRes, portalSettingsRes] = await Promise.all([
        fetch('/api/online-store/admin/transactions').then(res => res.json()),
        fetch('/api/payment-detections/logs').then(res => res.json()),
        fetch('/api/payment-detections/devices').then(res => res.json()),
        fetch('/api/settings/payment-gateway').then(res => res.json()).catch(() => ({})),
        fetch('/api/online-store/settings').then(res => res.json()).catch(() => ({}))
      ]);
      setTransactions(trxRes);
      setLogs(logsRes);
      setDevices(devRes);
      if (settingsRes?.midtrans) {
        setMidtransSettings(settingsRes.midtrans);
      }
      if (portalSettingsRes) {
        setPortalSettings(prev => ({ ...prev, ...portalSettingsRes }));
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Auto refresh 15s
    return () => clearInterval(interval);
  }, []);

  // --- HANDLERS (Transactions) ---
  const handleApproveTrx = (orderId) => {
    showConfirm({
      message: `Apakah Anda yakin ingin menyetujui pembayaran untuk transaksi ${orderId}?`,
      title: 'Setujui Pembayaran',
      confirmText: 'SETUJUI',
      confirmBg: '#10b981',
      confirmShadow: 'rgba(16, 185, 129, 0.3)',
      icon: 'check_circle',
      iconBg: 'rgba(16, 185, 129, 0.1)',
      iconColor: '#10b981',
      onConfirm: async () => {
        try {
          const res = await axios.post('/api/online-store/admin/approve', { order_id: orderId });
          toast.success('Berhasil disetujui!');
          fetchData();
        } catch (err) {
          toast.error('Gagal: ' + (err.response?.data?.error || err.message));
        }
      }
    });
  };

  const handleDeleteTrx = (id) => {
    showConfirm({
      message: 'Apakah Anda yakin ingin menghapus transaksi ini?',
      title: 'Hapus Transaksi',
      confirmText: 'HAPUS',
      confirmBg: '#ef4444',
      confirmShadow: 'rgba(239, 68, 68, 0.3)',
      icon: 'delete',
      iconBg: 'rgba(239, 68, 68, 0.1)',
      iconColor: '#ef4444',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/online-store/admin/transactions/${id}`);
          toast.success('Transaksi berhasil dihapus');
          fetchData();
        } catch (err) {
          toast.error('Gagal menghapus');
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedTrxs.length === 0) return;
    showConfirm({
      message: `Apakah Anda yakin ingin menghapus ${selectedTrxs.length} transaksi terpilih?`,
      title: 'Hapus Transaksi',
      confirmText: 'HAPUS SEMUA',
      confirmBg: '#ef4444',
      confirmShadow: 'rgba(239, 68, 68, 0.3)',
      icon: 'delete_forever',
      iconBg: 'rgba(239, 68, 68, 0.1)',
      iconColor: '#ef4444',
      onConfirm: async () => {
        try {
          await axios.post('/api/online-store/admin/transactions/bulk-delete', { ids: selectedTrxs });
          toast.success(`${selectedTrxs.length} transaksi dihapus`);
          setSelectedTrxs([]);
          fetchData();
        } catch (err) {
          toast.error('Gagal menghapus massal');
        }
      }
    });
  };


  const toggleSelectAll = () => {
    if (selectedTrxs.length === filteredTrx.length) {
      setSelectedTrxs([]);
    } else {
      setSelectedTrxs(filteredTrx.map(t => t.id));
    }
  };

  const toggleSelectTrx = (id) => {
    setSelectedTrxs(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // --- HANDLERS (Logs) ---
  const handleDeleteLog = (id) => {
    showConfirm({
      message: 'Apakah Anda yakin ingin menghapus log deteksi ini?',
      title: 'Hapus Log Deteksi',
      confirmText: 'HAPUS',
      confirmBg: '#ef4444',
      confirmShadow: 'rgba(239, 68, 68, 0.3)',
      icon: 'delete',
      iconBg: 'rgba(239, 68, 68, 0.1)',
      iconColor: '#ef4444',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/payment-detections/logs/${id}`);
          toast.success('Log deteksi berhasil dihapus');
          fetchData();
        } catch (err) {
          toast.error('Gagal menghapus log');
        }
      }
    });
  };

  const handleBulkDeleteLogs = () => {
    if (selectedLogs.length === 0) return;
    showConfirm({
      message: `Apakah Anda yakin ingin menghapus ${selectedLogs.length} log terpilih?`,
      title: 'Hapus Log Deteksi',
      confirmText: 'HAPUS SEMUA',
      confirmBg: '#ef4444',
      confirmShadow: 'rgba(239, 68, 68, 0.3)',
      icon: 'delete_forever',
      iconBg: 'rgba(239, 68, 68, 0.1)',
      iconColor: '#ef4444',
      onConfirm: async () => {
        try {
          await axios.post('/api/payment-detections/logs/bulk-delete', { ids: selectedLogs });
          toast.success(`${selectedLogs.length} log dihapus`);
          setSelectedLogs([]);
          fetchData();
        } catch (err) {
          toast.error('Gagal menghapus massal log');
        }
      }
    });
  };

  const toggleSelectAllLogs = () => {
    if (selectedLogs.length === filteredLogs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(filteredLogs.map(l => l.id));
    }
  };

  const toggleSelectLog = (id) => {
    setSelectedLogs(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // --- HANDLERS (Devices) ---
  const handleDeleteDevice = (id) => {
    showConfirm({
      message: 'Apakah Anda yakin ingin menghapus perangkat ini?',
      title: 'Hapus Perangkat',
      confirmText: 'HAPUS',
      confirmBg: '#ef4444',
      confirmShadow: 'rgba(239, 68, 68, 0.3)',
      icon: 'delete',
      iconBg: 'rgba(239, 68, 68, 0.1)',
      iconColor: '#ef4444',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/payment-detections/devices/${id}`);
          toast.success('Perangkat dihapus');
          fetchData();
        } catch (err) {
          toast.error('Gagal menghapus perangkat');
        }
      }
    });
  };

  const handleToggleDevice = async (id, currentStatus) => {
    try {
      await axios.post(`/api/payment-detections/devices/${id}/toggle`, { 
        status: currentStatus === 'active' ? 'inactive' : 'active' 
      });
      fetchData();
    } catch (err) {
      toast.error('Gagal mengubah status');
    }
  };

  const handleAddDevice = async () => {
    if (!newDeviceName.trim()) return toast.warning('Nama perangkat tidak boleh kosong');
    const device_id = 'dev_' + Math.random().toString(36).substring(2, 10);
    const api_token = 'tok_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    try {
      await axios.post('/api/payment-detections/devices', {
        device_name: newDeviceName,
        device_id,
        api_token
      });
      toast.success('Perangkat berhasil ditambahkan');
      setNewDeviceName('');
      setShowAddDeviceModal(false);
      fetchData();
    } catch (err) {
      toast.error('Gagal menambah perangkat');
    }
  };

  // --- HANDLERS (Midtrans Settings) ---
  const handleSaveMidtrans = async () => {
    try {
      await axios.post('/api/settings/payment-gateway', { midtrans: midtransSettings });
      toast.success('Pengaturan Midtrans berhasil disimpan!');
    } catch (err) {
      toast.error('Gagal menyimpan: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleTestMidtrans = async () => {
    if (!midtransSettings.server_key || !midtransSettings.merchant_id) {
      toast.warning('Isi Server Key dan Merchant ID terlebih dahulu!');
      return;
    }
    
    setTestingMidtrans(true);
    try {
      const res = await axios.post('/api/settings/test-midtrans', { 
        server_key: midtransSettings.server_key,
        merchant_id: midtransSettings.merchant_id
      });
      toast.success(res.data.message || 'Koneksi Midtrans berhasil!');
    } catch (err) {
      toast.error('Gagal terhubung: ' + (err.response?.data?.error || err.message));
    } finally {
      setTestingMidtrans(false);
    }
  };

  const handleSaveAutoDelete = async () => {
    try {
      await axios.post('/api/online-store/settings', portalSettings);
      toast.success('Pengaturan Auto-Hapus berhasil disimpan!');
      setIsAutoDeleteModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan: ' + (err.response?.data?.error || err.message));
    }
  };

  // --- RENDER HELPERS ---
  const getStatusBadge = (status) => {
    const styles = {
      PAID: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', label: 'PAID' },
      USED: { bg: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', label: 'USED' },
      PENDING: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'PENDING' },
      matched: { bg: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', label: 'MATCHED' },
      unmatched: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'UNMATCHED' },
      online: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', label: 'ONLINE' },
      offline: { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', label: 'OFFLINE' }
    };
    const style = styles[status] || styles.offline;
    return (
      <span style={{ 
        background: style.bg, 
        color: style.color, 
        padding: '4px 10px', 
        borderRadius: '50px', 
        fontSize: '0.75rem', 
        fontWeight: '800',
        border: `1px solid ${style.color}33`
      }}>
        {style.label}
      </span>
    );
  };

  // --- FILTERING ---
  const filteredTrx = transactions.filter(t => {
    const matchesSearch = (t.order_id || '').toLowerCase().includes(trxSearch.toLowerCase());
    const matchesStatus = trxStatusFilter === 'ALL' || t.status === trxStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredLogs = logs.filter(l => 
    (l.notification_text || '').toLowerCase().includes(logSearch.toLowerCase()) ||
    (l.matched_order_id || '').toString().includes(logSearch)
  );

  const totalPagesTrx = Math.ceil(filteredTrx.length / itemsPerPage);
  const currentTrxData = filteredTrx.slice((currentPageTrx - 1) * itemsPerPage, currentPageTrx * itemsPerPage);

  const totalPagesLogs = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogsData = filteredLogs.slice((currentPageLogs - 1) * itemsPerPage, currentPageLogs * itemsPerPage);

  return (
    <div className="payment-bridge-container" style={{ padding: '20px', color: 'white' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.5px', background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Payment Bridge Center
          </h1>
          <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>Pusat Integrasi Pembayaran QRIS & Notifikasi</p>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div className="glass-card" style={{ padding: '10px 20px', textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>DEVICES</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#38bdf8' }}>{devices.length}</div>
          </div>
          <div className="glass-card" style={{ padding: '10px 20px', textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>PENDING</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f59e0b' }}>{transactions.filter(t => t.status === 'PENDING').length}</div>
          </div>
          <button 
            onClick={fetchData} 
            className="btn-glass" 
            style={{ borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span className={`material-symbols-rounded ${loading ? 'spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', width: 'fit-content' }}>
        {[
          { id: 'transactions', label: 'Transaksi Store', icon: 'shopping_cart' },
          { id: 'logs', label: 'History Deteksi', icon: 'notifications_active' },
          { id: 'devices', label: 'Kelola Perangkat', icon: 'devices' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '12px',
              background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === tab.id ? '#38bdf8' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="fade-in">
          <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span className="material-symbols-rounded" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>search</span>
              <input 
                type="text" 
                placeholder="Cari Order ID..." 
                value={trxSearch}
                onChange={(e) => setTrxSearch(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 45px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', outline: 'none' }}
              />
            </div>
            <select 
              value={trxStatusFilter} 
              onChange={(e) => setTrxStatusFilter(e.target.value)}
              className="form-select-premium"
              style={{ 
                padding: '12px 20px', 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px', 
                color: 'white', 
                outline: 'none', 
                cursor: 'pointer',
                fontWeight: '700'
              }}
            >
              <option value="ALL" style={{ background: '#0a0a0c', color: 'white' }}>Semua Status</option>
              <option value="PENDING" style={{ background: '#0a0a0c', color: 'white' }}>Pending</option>
              <option value="PAID" style={{ background: '#0a0a0c', color: 'white' }}>Paid</option>
            </select>

            <button 
              onClick={() => setIsAutoDeleteModalOpen(true)}
              className="btn-glass"
              style={{ padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
              title="Pengaturan Hapus Riwayat Otomatis"
            >
              <span className="material-symbols-rounded" style={{ color: '#38bdf8' }}>auto_delete</span>
              Auto-Delete
            </button>

            {selectedTrxs.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="btn-danger-small"
                style={{ padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="material-symbols-rounded">delete_sweep</span>
                Hapus ({selectedTrxs.length})
              </button>
            )}
          </div>

          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div className="table-container" style={{ margin: 0, border: 'none', background: 'transparent', borderRadius: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <th style={{ padding: '15px 20px', textAlign: 'left', width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={currentTrxData.length > 0 && currentTrxData.every(t => selectedTrxs.includes(t.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSelected = [...selectedTrxs];
                          currentTrxData.forEach(t => { if (!newSelected.includes(t.id)) newSelected.push(t.id) });
                          setSelectedTrxs(newSelected);
                        } else {
                          setSelectedTrxs(selectedTrxs.filter(id => !currentTrxData.find(t => t.id === id)));
                        }
                      }}
                      style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                    />
                  </th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>WAKTU</th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>ORDER ID</th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>PAKET</th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>KODE VOUCHER</th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>NOMINAL</th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>STATUS</th>
                  <th style={{ padding: '15px 20px', textAlign: 'right', color: '#94a3b8', fontSize: '0.75rem' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {currentTrxData.map(trx => (
                  <tr key={trx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: selectedTrxs.includes(trx.id) ? 'rgba(56, 189, 248, 0.05)' : 'transparent' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedTrxs.includes(trx.id)}
                        onChange={() => toggleSelectTrx(trx.id)}
                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                      />
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: '0.85rem', color: '#cbd5e1' }}>{formatDateTime(trx.created_at)}</td>
                    <td style={{ padding: '12px 20px', fontWeight: '700', color: '#38bdf8' }}>{trx.order_id}</td>
                    <td style={{ padding: '12px 20px' }}>{trx.package_id}</td>
                    <td style={{ padding: '12px 20px' }}>
                      {trx.status === 'PAID' || trx.status === 'USED' ? (
                        <code style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 8px', borderRadius: '6px', fontWeight: '800' }}>{trx.voucher_code}</code>
                      ) : (
                        <span style={{ color: '#64748b' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 20px', fontWeight: '800' }}>Rp {Number(trx.total_amount).toLocaleString('id-ID', { minimumFractionDigits: 0 })}</td>
                    <td style={{ padding: '12px 20px' }}>{getStatusBadge(trx.status)}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {trx.status === 'PENDING' && (
                          <button onClick={() => handleApproveTrx(trx.order_id)} className="btn-success-small" title="Approve">
                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check_circle</span>
                          </button>
                        )}
                        <button onClick={() => handleDeleteTrx(trx.id)} className="btn-danger-small" title="Hapus">
                          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            
            {/* PAGINATION CONTROLS */}
            {totalPagesTrx > 1 && (
              <div style={{ padding: '15px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Halaman {currentPageTrx} dari {totalPagesTrx}</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => setCurrentPageTrx(prev => Math.max(prev - 1, 1))}
                    disabled={currentPageTrx === 1}
                    className="btn-glass"
                    style={{ padding: '8px 15px', borderRadius: '8px', opacity: currentPageTrx === 1 ? 0.5 : 1, cursor: currentPageTrx === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPageTrx(prev => Math.min(prev + 1, totalPagesTrx))}
                    disabled={currentPageTrx === totalPagesTrx}
                    className="btn-glass"
                    style={{ padding: '8px 15px', borderRadius: '8px', opacity: currentPageTrx === totalPagesTrx ? 0.5 : 1, cursor: currentPageTrx === totalPagesTrx ? 'not-allowed' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: LOGS */}
      {activeTab === 'logs' && (
        <div className="fade-in">
          <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span className="material-symbols-rounded" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>search</span>
              <input 
                type="text" 
                placeholder="Cari isi notifikasi atau matched order..." 
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 45px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', outline: 'none' }}
              />
            </div>
            {selectedLogs.length > 0 && (
              <button 
                onClick={handleBulkDeleteLogs}
                className="btn-danger-small"
                style={{ padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="material-symbols-rounded">delete_sweep</span>
                Hapus ({selectedLogs.length})
              </button>
            )}
          </div>

          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div className="table-container" style={{ margin: 0, border: 'none', background: 'transparent', borderRadius: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <th style={{ padding: '15px 20px', textAlign: 'left', width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={currentLogsData.length > 0 && currentLogsData.every(l => selectedLogs.includes(l.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSelected = [...selectedLogs];
                          currentLogsData.forEach(l => { if (!newSelected.includes(l.id)) newSelected.push(l.id) });
                          setSelectedLogs(newSelected);
                        } else {
                          setSelectedLogs(selectedLogs.filter(id => !currentLogsData.find(l => l.id === id)));
                        }
                      }}
                      style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                    />
                  </th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>WAKTU</th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>DETEKSI NOMINAL</th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>NOTIFIKASI</th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>MATCHING</th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>SUMBER</th>
                  <th style={{ padding: '15px 20px', textAlign: 'right', color: '#94a3b8', fontSize: '0.75rem' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {currentLogsData.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: selectedLogs.includes(log.id) ? 'rgba(56, 189, 248, 0.05)' : 'transparent' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedLogs.includes(log.id)}
                        onChange={() => toggleSelectLog(log.id)}
                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                      />
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: '0.85rem', color: '#cbd5e1' }}>{formatDateTime(log.received_at)}</td>
                    <td style={{ padding: '12px 20px', fontWeight: '800', color: '#10b981' }}>Rp {Number(log.amount_detected).toLocaleString('id-ID', { minimumFractionDigits: 0 })}</td>
                    <td style={{ padding: '12px 20px', fontSize: '0.85rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.notification_text}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {getStatusBadge(log.match_status)}
                        {log.matched_order_id && <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: '700' }}>ID: {log.matched_order_id}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{log.source_app.split('.').pop()}</span>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <button onClick={() => handleDeleteLog(log.id)} className="btn-danger-small" style={{ width: '35px', height: '35px' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* PAGINATION CONTROLS FOR LOGS */}
            {totalPagesLogs > 1 && (
              <div style={{ padding: '15px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Halaman {currentPageLogs} dari {totalPagesLogs}</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => setCurrentPageLogs(prev => Math.max(prev - 1, 1))}
                    disabled={currentPageLogs === 1}
                    className="btn-glass"
                    style={{ padding: '8px 15px', borderRadius: '8px', opacity: currentPageLogs === 1 ? 0.5 : 1, cursor: currentPageLogs === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPageLogs(prev => Math.min(prev + 1, totalPagesLogs))}
                    disabled={currentPageLogs === totalPagesLogs}
                    className="btn-glass"
                    style={{ padding: '8px 15px', borderRadius: '8px', opacity: currentPageLogs === totalPagesLogs ? 0.5 : 1, cursor: currentPageLogs === totalPagesLogs ? 'not-allowed' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: DEVICES */}
      {activeTab === 'devices' && (
        <div className="fade-in">
          <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded">webhook</span> Webhook Endpoint
            </h3>
            <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
              Gunakan URL ini di aplikasi listener (seperti MacroDroid atau Tasker) untuk mengirimkan notifikasi pembayaran (Method: POST).
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <code style={{ flex: 1, padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', color: '#fbbf24', wordBreak: 'break-all' }}>
                {window.location.origin}/api/payment-detections/armradius
              </code>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/payment-detections/armradius`); toast.info('Endpoint disalin!'); }} className="btn-glass" style={{ padding: '10px', borderRadius: '8px' }}>
                <span className="material-symbols-rounded">content_copy</span>
              </button>
            </div>
            <p style={{ margin: '10px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              * Jangan lupa tambahkan header <code>Authorization: Bearer [API_TOKEN_PERANGKAT]</code>
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            {devices.map(device => (
              <div key={device.id} className="glass-card device-card" style={{ padding: '25px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ 
                      width: '50px', 
                      height: '50px', 
                      borderRadius: '12px', 
                      background: 'rgba(56, 189, 248, 0.1)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <span className="material-symbols-rounded" style={{ color: '#38bdf8', fontSize: '28px' }}>smartphone</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{device.device_name || 'Android Device'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ID: {device.device_id}</div>
                    </div>
                  </div>
                  {getStatusBadge(device.last_seen_at && (new Date() - new Date(device.last_seen_at) < 600000) ? 'online' : 'offline')}
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>API Access Token</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <code style={{ flex: 1, fontSize: '0.85rem', color: '#fbbf24', overflow: 'hidden', textOverflow: 'ellipsis' }}>{device.api_token}</code>
                    <button onClick={() => { navigator.clipboard.writeText(device.api_token); toast.info('Token disalin!'); }} className="btn-icon">
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>content_copy</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Terakhir Aktif:<br/>
                    <span style={{ color: '#cbd5e1' }}>{device.last_seen_at ? formatDateTime(device.last_seen_at) : 'Belum pernah'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleToggleDevice(device.id, device.status)} className="btn-glass" style={{ padding: '8px 15px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700' }}>
                      {device.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button onClick={() => handleDeleteDevice(device.id)} className="btn-danger-small" style={{ width: '35px', height: '35px', borderRadius: '8px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* ADD DEVICE PLACEHOLDER (OPTIONAL) */}
            <div onClick={() => setShowAddDeviceModal(true)} className="glass-card" style={{ border: '2px dashed rgba(255,255,255,0.1)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', cursor: 'pointer' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.1)', marginBottom: '10px' }}>add_circle</span>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>Tambah Perangkat Baru</div>
            </div>
          </div>
        </div>
      )}

      {showAddDeviceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '30px', animation: 'scaleUp 0.3s ease-out' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '15px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded">add_circle</span>
              Tambah Perangkat
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.5' }}>
              Tambahkan perangkat listener (HP Android) baru untuk mendapatkan API Token.
            </p>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', marginBottom: '10px', display: 'block' }}>NAMA PERANGKAT (MISAL: HP ADMIN 1)</label>
              <input 
                type="text" 
                value={newDeviceName} 
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="Contoh: HP Samsung M20"
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', outline: 'none', fontSize: '1rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowAddDeviceModal(false)}
                style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '700', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button 
                onClick={handleAddDevice}
                className="btn-success-premium"
                style={{ flex: 2, padding: '12px', borderRadius: '12px', color: 'white', fontWeight: '800', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' }}
              >
                Simpan Perangkat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      <div className={`modal-overlay ${confirmModal.isOpen ? 'open' : ''}`} style={{ zIndex: 10000 }}>
        <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              background: confirmModal.iconBg, 
              color: confirmModal.iconColor, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '10px'
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '32px' }}>{confirmModal.icon}</span>
            </div>
            
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: 'bold' }}>{confirmModal.title}</h3>
            
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {confirmModal.message}
            </p>
            
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '1.5rem' }}>
              <button 
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                className="btn" 
                style={{ 
                  flex: 1, 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  color: 'white', 
                  borderRadius: '50px',
                  padding: '10px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                BATAL
              </button>
              <button 
                type="button"
                onClick={confirmModal.onConfirm}
                className="btn-primary-premium" 
                style={{ 
                  flex: 1,
                  background: confirmModal.confirmBg,
                  color: 'white',
                  borderRadius: '50px',
                  padding: '10px',
                  border: 'none',
                  fontWeight: '700',
                  boxShadow: `0 4px 15px ${confirmModal.confirmShadow}`,
                  cursor: 'pointer'
                }}
                onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseOut={e => e.currentTarget.style.filter = 'brightness(1.0)'}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AUTO DELETE SETTINGS MODAL */}
      {isAutoDeleteModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '450px', padding: '30px', animation: 'scaleUp 0.3s ease-out' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '10px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded">auto_delete</span>
              Pengaturan Hapus Otomatis
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '25px', lineHeight: '1.6' }}>
              Anda dapat mengatur penghapusan transaksi PENDING (Anti-Spam) maupun penghapusan riwayat transaksi lama (PAID/USED) di sini.
            </p>
            
            {/* 1. AUTO DELETE PENDING (SPAM) */}
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', color: 'white', marginBottom: '5px' }}>Auto-Hapus Transaksi PENDING</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Mencegah penumpukan data spam transaksi gagal/belum dibayar.</div>
                </div>
                <div className={`custom-toggle ${portalSettings.auto_cleanup_enabled ? 'active' : ''}`} style={{ position: 'relative', width: '46px', height: '24px', background: portalSettings.auto_cleanup_enabled ? '#10b981' : 'rgba(255,255,255,0.1)', borderRadius: '24px', transition: '0.3s', flexShrink: 0 }}>
                  <input type="checkbox" style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }} checked={portalSettings.auto_cleanup_enabled} onChange={e => setPortalSettings({...portalSettings, auto_cleanup_enabled: e.target.checked})} />
                  <div style={{ position: 'absolute', top: '2px', left: portalSettings.auto_cleanup_enabled ? '24px' : '2px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: '0.3s' }}></div>
                </div>
              </label>
            </div>
            {portalSettings.auto_cleanup_enabled && (
              <div className="form-group fade-in" style={{ marginBottom: '25px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Hapus transaksi PENDING lebih tua dari (Jam):</label>
                <input 
                  type="number" 
                  className="form-input-premium" 
                  value={portalSettings.auto_cleanup_hours || 24} 
                  onChange={e => setPortalSettings({...portalSettings, auto_cleanup_hours: parseInt(e.target.value)})} 
                  style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', color: 'white', outline: 'none' }}
                />
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '20px 0' }} />

            {/* 2. AUTO DELETE PAID/USED (HISTORY) */}
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', color: 'white', marginBottom: '5px' }}>Aktifkan Auto-Delete</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Hapus otomatis berjalan di latar belakang setiap hari</div>
                </div>
                <div className={`custom-toggle ${portalSettings.history_auto_delete_enabled ? 'active' : ''}`} style={{ position: 'relative', width: '46px', height: '24px', background: portalSettings.history_auto_delete_enabled ? '#38bdf8' : 'rgba(255,255,255,0.1)', borderRadius: '24px', transition: '0.3s', flexShrink: 0 }}>
                  <input type="checkbox" style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }} checked={portalSettings.history_auto_delete_enabled} onChange={e => setPortalSettings({...portalSettings, history_auto_delete_enabled: e.target.checked})} />
                  <div style={{ position: 'absolute', top: '2px', left: portalSettings.history_auto_delete_enabled ? '24px' : '2px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: '0.3s' }}></div>
                </div>
              </label>
            </div>

            {portalSettings.history_auto_delete_enabled && (
              <div className="form-group fade-in" style={{ marginBottom: '25px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Hapus Transaksi Lebih Lama Dari:</label>
                <select 
                  className="form-select-premium" 
                  value={portalSettings.history_auto_delete_days}
                  onChange={(e) => setPortalSettings({...portalSettings, history_auto_delete_days: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', color: 'white', outline: 'none' }}
                >
                  <option value={7} style={{ background: '#1e1e24' }}>7 Hari (1 Minggu)</option>
                  <option value={14} style={{ background: '#1e1e24' }}>14 Hari (2 Minggu)</option>
                  <option value={30} style={{ background: '#1e1e24' }}>30 Hari (1 Bulan)</option>
                  <option value={90} style={{ background: '#1e1e24' }}>90 Hari (3 Bulan)</option>
                  <option value={180} style={{ background: '#1e1e24' }}>180 Hari (6 Bulan)</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
              <button 
                onClick={() => {
                  setIsAutoDeleteModalOpen(false);
                  fetchData(); // reload back original state if cancelled
                }}
                style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '700', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button 
                onClick={handleSaveAutoDelete}
                className="btn-primary-premium"
                style={{ flex: 2, padding: '12px', borderRadius: '12px', color: 'white', fontWeight: '800', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' }}
              >
                Simpan & Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .payment-bridge-container { animation: fadeIn 0.5s ease-out; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .glass-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; transition: all 0.3s ease; }
        .glass-card:hover { border-color: rgba(56, 189, 248, 0.3); background: rgba(255, 255, 255, 0.05); }
        
        .btn-glass { background: rgba(255, 255, 255, 0.05); color: white; border: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer; transition: all 0.2s; }
        .btn-glass:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.2); }
        
        .btn-success-small { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); padding: 6px; borderRadius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-success-small:hover { background: #10b981; color: white; }
        
        .btn-danger-small { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 6px; borderRadius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-danger-small:hover { background: #ef4444; color: white; }
        
        .btn-icon { background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 5px; display: flex; align-items: center; transition: color 0.2s; }
        .btn-icon:hover { color: #38bdf8; }
        
        .device-card { overflow: hidden; }
        .device-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #38bdf8; opacity: 0.5; }
        
        .form-select-premium option {
          background-color: #0a0a0c !important;
          color: white !important;
          padding: 10px;
        }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
};

export default PaymentBridgeCenter;
