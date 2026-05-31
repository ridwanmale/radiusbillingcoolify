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
    pppoe_online: 0, // Ditambahkan: pppoe_online state
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

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Card Pemasukan Fisik */}
        <div className="glass-card" style={{ borderTop: '2px solid rgba(16, 185, 129, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '12px', borderRadius: '14px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>payments</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Voucher Fisik</div>
              <div className="stat-value" style={{ fontSize: '2rem', fontWeight: '800' }}>{formatRupiah(stats.daily_income || 0)}</div>
            </div>
          </div>
        </div>

        {/* Card Pemasukan Online */}
        <div className="glass-card" style={{ borderTop: '2px solid rgba(6, 182, 212, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', padding: '12px', borderRadius: '14px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(6, 182, 212, 0.2)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>shopping_cart_checkout</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Voucher Online</div>
              <div className="stat-value" style={{ fontSize: '2rem', fontWeight: '800' }}>{formatRupiah(stats.online_income || 0)}</div>
            </div>
          </div>
        </div>

        {/* Card Hotspot Online */}
        <div 
          className="glass-card" 
          onClick={() => navigate('/voucher-online')}
          style={{ 
            borderTop: '2px solid rgba(245, 158, 11, 0.5)', 
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '12px', borderRadius: '14px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(245, 158, 11, 0.2)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>online_prediction</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Hotspot Aktif</div>
              <div className="stat-value" style={{ fontSize: '2rem', fontWeight: '800' }}>{stats.voucher_online || 0} <span style={{ fontSize: '1.2rem', fontWeight: '400', opacity: 0.5 }}>aktif</span></div>
            </div>
          </div>
        </div>

        {/* Card PPPoE Online - BARU */}
        <div 
          className="glass-card" 
          onClick={() => navigate('/pppoe-online')}
          style={{ 
            borderTop: '2px solid rgba(139, 92, 246, 0.5)', 
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(139, 92, 246, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', padding: '12px', borderRadius: '14px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(139, 92, 246, 0.2)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>router</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>PPPoE Aktif</div>
              <div className="stat-value" style={{ fontSize: '2rem', fontWeight: '800' }}>{stats.pppoe_online || 0} <span style={{ fontSize: '1.2rem', fontWeight: '400', opacity: 0.5 }}>aktif</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* CHART DAN TRANSAKSI TETAP SAMA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Konten Chart dan Transaksi Bulan ini... */}
        {/* (Sama seperti kode asli Anda) */}
      </div>

      {/* LOG AKTIVITAS TETAP SAMA */}
      <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Konten Log Aktivitas... */}
        {/* (Sama seperti kode asli Anda) */}
      </div>

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