import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    stock_count: 0,
    total_sold: 0,
    voucher_online: 0,
    total_profiles: 0,
    daily_income: 0,
    online_income: 0,
    chart_data: []
  });
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [recent, setRecent] = useState([]);
  const [logs, setLogs] = useState([]);
  const [financialStats, setFinancialStats] = useState({
    totalPemasukan: 0,
    totalPengeluaran: 0,
    laba: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });

  const fetchStats = () => {
    const host = window.location.hostname;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    Promise.all([
      fetch(`/api/dashboard/stats?month=${filter.month}&year=${filter.year}`).then(res => res.json()),
      fetch(`/api/dashboard/recent`).then(res => res.json()),
      fetch(`/api/logs`).then(res => res.json()),
      fetch(`/api/transactions?month=${currentMonth}&year=${currentYear}`).then(res => res.json())
    ])
    .then(([statsData, recentData, logsData, transData]) => {
      setStats(statsData);
      setRecent(recentData);
      setLogs(logsData);
      setFinancialStats(transData.summary || { totalPemasukan: 0, totalPengeluaran: 0, laba: 0 });
      setIsLoading(false);
    })
    .catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [filter.month, filter.year]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Memuat Dashboard...</div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 className="page-title">Dashboard Radius</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Statistik dan performa Hotspot secara Real-time</p>
        </div>
        <div style={{ textAlign: 'right', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', minWidth: '180px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '2px' }}>WAKTU SEKARANG (WIB)</div>
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-primary)', letterSpacing: '0.5px' }}>
            {currentTime.toLocaleString('id-ID', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'monospace' }}>
            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')}
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ borderTop: '2px solid rgba(16, 185, 129, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '12px', borderRadius: '14px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>payments</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Voucher Fisik</div>
              <div className="stat-value" style={{ fontSize: '2.2rem', fontWeight: '800' }}>{formatRupiah(stats.daily_income || 0)}</div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ borderTop: '2px solid rgba(6, 182, 212, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', padding: '12px', borderRadius: '14px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(6, 182, 212, 0.2)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>shopping_cart_checkout</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Voucher Online</div>
              <div className="stat-value" style={{ fontSize: '2.2rem', fontWeight: '800' }}>{formatRupiah(stats.online_income || 0)}</div>
            </div>
          </div>
        </div>

        <div 
          className="glass-card" 
          onClick={() => navigate('/voucher-online')}
          style={{ 
            borderTop: '2px solid rgba(245, 158, 11, 0.5)', 
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(245, 158, 11, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '12px', borderRadius: '14px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(245, 158, 11, 0.2)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>online_prediction</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Online</div>
              <div className="stat-value" style={{ fontSize: '2.2rem', fontWeight: '800' }}>{stats.voucher_online || 0} <span style={{ fontSize: '1.2rem', fontWeight: '400', opacity: 0.5 }}>aktif</span></div>
            </div>
          </div>
          <button 
            onClick={async (e) => {
              e.stopPropagation(); // Cegah redirect ke halaman voucher online saat tombol sinkron diklik
              const method = prompt(
                "Pilih Metode Sinkronisasi Sesi:\n" +
                "1. Sinkronisasi Cerdas (Hanya bersihkan sesi yang tidak aktif > 5 menit)\n" +
                "2. Reset Sesi ke 0 (Paksa semua sesi aktif menjadi Offline/0 agar tidak ganda)\n\n" +
                "Ketik angka 1 atau 2:",
                "1"
              );
              if (method === "1") {
                const res = await fetch(`/api/dashboard/sync?mode=stale`, { method: 'POST' });
                if (res.ok) {
                  const data = await res.json();
                  alert(`Sinkronisasi Cerdas berhasil! ${data.cleaned} sesi mati dibersihkan.`);
                  fetchStats();
                }
              } else if (method === "2") {
                triggerConfirm("PERINGATAN: Seluruh sesi aktif akan di-set Offline (0).\nMikroTik akan memperbarui kembali status sesi yang benar-benar aktif secara otomatis dalam 5 menit.\n\nLanjutkan reset sesi total?", async () => {
                  const res = await fetch(`/api/dashboard/sync?mode=reset`, { method: 'POST' });
                  if (res.ok) {
                    const data = await res.json();
                    alert(`Reset Total berhasil! ${data.cleaned} sesi di-reset menjadi Offline (0).`);
                    fetchStats();
                  }
                });
              }
            }}
            style={{ 
              position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.05)', 
              border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)'
            }}
            title="Sinkron Sesi (Hapus Sesi Nyangkut)"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>sync</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* CHART SECTION */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', height: '450px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.4rem', color: '#38bdf8' }}>insights</span> ANALISA PEMASUKAN
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select 
                value={filter.year} 
                onChange={(e) => setFilter({ ...filter, year: Number(e.target.value) })}
                style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', cursor: 'pointer', minWidth: '80px' }}
              >
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y} style={{ background: '#1e293b', color: 'white' }}>{y}</option>;
                })}
              </select>
              <select 
                value={filter.month} 
                onChange={(e) => setFilter({ ...filter, month: Number(e.target.value) })}
                style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', cursor: 'pointer', minWidth: '80px' }}
              >
                {['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'].map((m, i) => (
                  <option key={i+1} value={i+1} style={{ background: '#1e293b', color: 'white' }}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ padding: '1.5rem', width: '100%', flex: 1, minHeight: 0 }}>
            {stats.chart_data && stats.chart_data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chart_data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-secondary)" 
                    tick={{fontSize: 9}} 
                    interval={0}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', padding: '12px', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                            <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Pendapatan</div>
                            <div style={{ color: 'white', fontWeight: '900', fontSize: '1.3rem' }}>{formatRupiah(payload[0].value)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sessions" 
                    stroke="#3b82f6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#fff', stroke: '#3b82f6', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Belum ada data pendapatan untuk bulan ini.
              </div>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 0, height: '450px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.2rem', color: '#fbbf24' }}>calendar_month</span> TRANSAKSI BULAN INI
            </h2>
          </div>
          <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center' }}>
            <div>
               <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#10b981', marginBottom: '4px' }}>
                  {formatRupiah(financialStats.totalPemasukan)}
               </div>
               <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Total pemasukan bulan ini</div>
               <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginTop: '1rem' }}></div>
            </div>

            <div>
               <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#ef4444', marginBottom: '4px' }}>
                  {formatRupiah(financialStats.totalPengeluaran)}
               </div>
               <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Total pengeluaran bulan ini</div>
               <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginTop: '1rem' }}></div>
            </div>

            <div>
               <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#3b82f6', marginBottom: '4px' }}>
                  {formatRupiah(financialStats.laba)}
               </div>
               <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Total profit bulan ini</div>
               <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginTop: '1rem' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVITY LOG SECTION */}
      <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>history</span> 
            LOG AKTIVITAS TERKINI
          </h2>
          <button 
            onClick={fetchStats}
            className="btn" 
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              color: 'white',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '0.4rem 0.8rem', 
              fontSize: '0.75rem', 
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '1rem', color: 'var(--accent-primary)' }}>refresh</span> Perbarui
          </button>
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: '800px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-secondary)' }}>
              <tr>
                <th>Waktu</th>
                <th>Admin</th>
                <th>Aksi</th>
                <th>Detail</th>
                <th>Alamat IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada log aktivitas tercatat</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(log.created_at).toLocaleString('id-ID', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      }).replace(',', '').replace(/\./g, ':')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white', fontWeight: 'bold' }}>
                          {log.admin_username ? log.admin_username[0].toUpperCase() : '?'}
                        </div>
                        <span style={{ fontWeight: '600' }}>{log.admin_username || 'System'}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.7rem', 
                        fontWeight: '700',
                        background: (log.action || '').includes('Delete') || (log.action || '').includes('Refund') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: (log.action || '').includes('Delete') || (log.action || '').includes('Refund') ? '#ef4444' : '#10b981',
                        textTransform: 'uppercase'
                      }}>
                        {log.action || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{log.details || '-'}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', opacity: 0.5 }}>{log.ip_address || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .page-header {
            flex-direction: column !important;
          }
          .stats-grid {
            gap: 1rem !important;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .page-title {
            font-size: 1.5rem;
          }
          .page-subtitle {
            font-size: 0.9rem;
          }
          .stats-grid {
            gridTemplateColumns: repeat(auto-fit, minmax(150px, 1fr)) !important;
            gap: 1rem !important;
          }
          .glass-card {
            padding: 1rem !important;
          }
          .stat-value {
            font-size: 1.5rem !important;
          }
          .data-table th,
          .data-table td {
            padding: 0.5rem !important;
            font-size: 0.75rem !important;
          }
          .data-table code {
            font-size: 0.7rem;
          }
        }

        @media (max-width: 480px) {
          .page-header {
            gap: 0.5rem !important;
          }
          .stats-grid {
            gridTemplateColumns: 1fr !important;
          }
          .data-table th,
          .data-table td {
            padding: 0.3rem !important;
            font-size: 0.7rem !important;
          }
          .material-symbols-rounded {
            font-size: 1rem !important;
          }
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

export default Dashboard;
