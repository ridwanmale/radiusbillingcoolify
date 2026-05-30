import React, { useState, useEffect } from 'react';
import ConfirmModal from '../../components/ConfirmModal';

const PppoeIsolirList = ({ user }) => {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });

  const fetchIsolir = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/pppoe-customers?status=isolir');
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIsolir();
  }, []);

  const handleActivate = async (id, name) => {
    triggerConfirm(`Aktifkan kembali layanan untuk ${name}?`, async () => {

      try {
        const res = await fetch(`/api/pppoe-customers/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active', admin_username: user?.username })
        });
        if (res.ok) {
          fetchIsolir();
        }
      } catch (err) {
        console.error(err);
      }
      });
  };

  return (
    <div className="page-pppoe">
      <div className="page-header">
        <div>
          <h1 className="page-title">Daftar Isolir PPPoE</h1>
          <p className="page-subtitle">Pelanggan yang sedang di-isolir karena tunggakan atau expired.</p>
        </div>
        <button className="btn-refresh-glass" onClick={fetchIsolir}>
          <span className="material-symbols-rounded">refresh</span>
          <span>Refresh Data</span>
        </button>
      </div>

      <style>{`
        .btn-refresh-glass {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .btn-refresh-glass:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--accent-primary);
          transform: translateY(-2px);
        }

        .btn-refresh-glass:hover .material-symbols-rounded {
          transform: rotate(180deg);
        }

        .btn-refresh-glass .material-symbols-rounded {
          font-size: 20px;
          transition: transform 0.5s ease;
          color: var(--accent-primary);
        }
      `}</style>


      <div className="glass-card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Pelanggan</th>
              <th>Username</th>
              <th>Router</th>
              <th>Jatuh Tempo</th>
              <th>Status Billing</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Memuat data...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Tidak ada pelanggan yang sedang di-isolir</td></tr>
            ) : (
              customers.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong><br/><small>{c.customer_code}</small></td>
                  <td><code>{c.pppoe_username}</code></td>
                  <td>{c.router_name}</td>
                  <td>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                      {new Date(c.next_isolir_date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-danger">TERISOLIR</span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm btn-success" 
                      onClick={() => handleActivate(c.id, c.name)}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check_circle</span>
                      Buka Isolir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

export default PppoeIsolirList;
