import React, { useState, useEffect } from 'react';

const PppoePayments = () => {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/pppoe-billing/payments');
      const data = await res.json();
      setPayments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}:${month}:${year} ${hours}:${minutes}`;
  };

  return (
    <div className="page-pppoe">
      <div className="page-header">
        <div>
          <h1 className="page-title">Riwayat Pembayaran PPPoE</h1>
          <p className="page-subtitle">Daftar transaksi pembayaran tagihan internet pelanggan.</p>
        </div>
        <button className="btn-glass-premium" onClick={fetchPayments}>
          <span className="material-symbols-rounded" style={{ color: '#3b82f6' }}>refresh</span>
          <span>Refresh Data</span>
        </button>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Waktu Bayar</th>
              <th>No. Invoice</th>
              <th>Pelanggan</th>
              <th>Paket</th>
              <th>Metode</th>
              <th>Jumlah (IDR)</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Memuat data...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Belum ada riwayat pembayaran</td></tr>
            ) : (
              payments.map(p => (
                <tr key={p.id}>
                  <td>{formatDate(p.payment_date)}</td>
                  <td><code>{p.invoice_number}</code></td>
                  <td><strong>{p.customer_name}</strong><br/><small>{p.customer_code}</small></td>
                  <td>{p.package_name}</td>
                  <td><span className="badge badge-info">{p.payment_method.toUpperCase()}</span></td>
                  <td><strong style={{ color: '#10b981' }}>Rp {parseFloat(p.amount).toLocaleString()}</strong></td>
                  <td>{p.recorded_by || 'System'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .btn-glass-premium {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
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
      `}</style>
    </div>
  );
};

export default PppoePayments;
