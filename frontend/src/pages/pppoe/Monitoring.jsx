import React, { useState, useEffect } from 'react';
import ConfirmModal from '../../components/ConfirmModal';
import { formatDateTime } from '../../utils/dateFormatter';

const PppoeMonitoring = ({ user }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });

  const fetchOnline = async () => {
    try {
      const res = await fetch('/api/pppoe-monitoring');
      const data = await res.json();
      setOnlineUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOnline();
    const interval = setInterval(fetchOnline, 10000); // Auto refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async (username) => {
    triggerConfirm(`Yakin ingin memutuskan koneksi ${username}?`, async () => {
      try {
        const res = await fetch(`/api/pppoe-monitoring/${username}/disconnect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_username: user?.username })
        });
        if (res.ok) {
          alert('Perintah disconnect dikirim ke MikroTik');
          fetchOnline();
        } else {
          const err = await res.json();
          alert('Gagal: ' + err.error);
        }
      } catch (err) {
        console.error(err);
      }
      });
  };

  return (
    <div className="page-pppoe">
      <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h1 className="page-title">Monitoring Online PPPoE</h1>
        <p className="page-subtitle">Daftar pengguna yang sedang terhubung saat ini.</p>
      </div>

      <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: '900px' }}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Nama Pelanggan</th>
              <th>Router</th>
              <th>IP Address</th>
              <th>Login Sejak</th>
              <th>Uptime</th>
              <th>Paket</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {onlineUsers.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>{isLoading ? 'Memuat...' : 'Tidak ada user online'}</td></tr>
            ) : (
              onlineUsers.map(u => (
                <tr key={u.radacctid}>
                  <td><code>{u.username}</code></td>
                  <td>{u.customer_name}</td>
                  <td>{u.router_name}</td>
                  <td>{u.framedipaddress}</td>
                  <td>{formatDateTime(u.acctstarttime)}</td>
                  <td>
                    {/* Simplified Uptime calculation */}
                    {Math.floor((new Date() - new Date(u.acctstarttime)) / 60000)} menit
                  </td>
                  <td>{u.package_name}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }} onClick={() => handleDisconnect(u.username)}>Disconnect</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .page-pppoe .data-table th,
        .page-pppoe .data-table td {
          padding: 0.75rem;
        }

        @media (max-width: 1024px) {
          .page-pppoe .data-table th,
          .page-pppoe .data-table td {
            padding: 0.6rem;
            font-size: 0.9rem;
          }
        }

        @media (max-width: 768px) {
          .page-pppoe .page-header {
            padding: 1rem;
          }
          .page-pppoe .data-table th,
          .page-pppoe .data-table td {
            padding: 0.5rem;
            font-size: 0.8rem;
          }
          .page-pppoe .data-table code {
            font-size: 0.7rem;
            wordBreak: break-all;
          }
          .btn-danger {
            padding: 0.3rem 0.6rem !important;
            font-size: 0.7rem !important;
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

export default PppoeMonitoring;
