import React, { useState, useEffect } from 'react';

const PppoeInvoices = ({ user }) => {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentData, setPaymentData] = useState({ amount: '', method: 'Tunai', notes: '' });

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/pppoe-billing/invoices');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal memuat invoice:', err);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/pppoe-billing/invoices/${selectedInvoice.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentData.amount,
          payment_method: paymentData.method,
          notes: paymentData.notes,
          admin_username: user?.username
        })
      });
      if (res.ok) {
        setShowPaymentModal(false);
        fetchInvoices();
        alert('Pembayaran berhasil! Pelanggan telah diaktifkan kembali.');
      } else {
        const err = await res.json();
        alert('Gagal: ' + (err.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      console.error(err);
      alert('Gagal terhubung ke server.');
    }
  };

  return (
    <div className="page-pppoe">
      <div className="page-header">
        <h1 className="page-title">Invoice PPPoE</h1>
        <p className="page-subtitle">Kelola tagihan dan pembayaran pelanggan.</p>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>No Invoice</th>
              <th>Pelanggan</th>
              <th>Username</th>
              <th>Jumlah</th>
              <th>Jatuh Tempo</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id}>
                <td><strong>{inv.invoice_number}</strong><br/><small>{new Date(inv.invoice_date).toLocaleDateString()}</small></td>
                <td>{inv.customer_name}</td>
                <td><code>{inv.pppoe_username}</code></td>
                <td>Rp {parseFloat(inv.amount).toLocaleString()}</td>
                <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                <td>
                  <span className={`badge badge-${inv.status === 'paid' ? 'success' : inv.status === 'unpaid' ? 'warning' : 'danger'}`}>
                    {inv.status}
                  </span>
                </td>
                <td>
                  {inv.status !== 'paid' && (
                    <button className="btn btn-sm btn-primary" onClick={() => { setSelectedInvoice(inv); setPaymentData({...paymentData, amount: inv.amount}); setShowPaymentModal(true); }}>
                      Bayar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <h2>Input Pembayaran</h2>
            <p>Invoice: <strong>{selectedInvoice?.invoice_number}</strong></p>
            <form onSubmit={handlePayment}>
              <div className="form-group">
                <label>Jumlah Bayar</label>
                <input type="number" className="form-input" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Metode Pembayaran</label>
                <select className="form-input" value={paymentData.method} onChange={e => setPaymentData({...paymentData, method: e.target.value})}>
                  <option value="Tunai">Tunai</option>
                  <option value="Transfer">Transfer Bank</option>
                  <option value="E-Wallet">E-Wallet</option>
                </select>
              </div>
              <div className="form-group">
                <label>Catatan</label>
                <textarea className="form-input" value={paymentData.notes} onChange={e => setPaymentData({...paymentData, notes: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Konfirmasi Bayar</button>
                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowPaymentModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(5px);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal-content { max-width: 400px; width: 100%; }
        .badge-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
      `}</style>
    </div>
  );
};

export default PppoeInvoices;
