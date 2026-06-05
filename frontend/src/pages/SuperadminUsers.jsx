import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateTime } from '../utils/dateFormatter';

const SuperadminUsers = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'superadmin' });
  const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/auth/users`);
      const data = await res.json();
      // Filter ONLY superadmins
      const superadmins = data.filter(u => u.role === 'superadmin');
      setUsers(superadmins);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, admin_username: user?.username || 'admin' })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewUser({ username: '', password: '', role: 'superadmin' });
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert('Gagal menambah superadmin');
    }
  };

  const handleDeleteUser = async (id, targetUsername) => {
    if (targetUsername === user?.username) {
      alert('Anda tidak dapat menghapus akun Anda sendiri');
      return;
    }
    triggerConfirm('Yakin ingin menghapus Superadmin ini?', async () => {
      try {
        const host = window.location.hostname;
      const res = await fetch(`/api/auth/users/${id}?admin_username=${user?.username || 'admin'}`, {
        method: 'DELETE'
      });
        if (res.ok) fetchUsers();
      } catch (err) {
        alert('Gagal menghapus user');
      }
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/auth/users/${selectedUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      if (res.ok) {
        setShowEditPasswordModal(false);
        setNewPassword('');
        alert('Password berhasil diubah');
      }
    } catch (err) {
      alert('Gagal mengubah password');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Manajemen User Superadmin</h1>
          <p className="page-subtitle">Kelola akses akun pemegang kendali penuh aplikasi</p>
        </div>
        <button 
          className="btn" 
          onClick={() => setShowAddModal(true)}
          style={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            color: '#ef4444', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: '50px', 
            padding: '0.6rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <span className="material-symbols-rounded">security</span>
          TAMBAH SUPERADMIN
        </button>
      </div>

      <div className="glass-card" style={{ padding: '0' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'center' }}>ID</th>
              <th style={{ textAlign: 'center' }}>Username</th>
              <th style={{ textAlign: 'center' }}>Role</th>
              <th style={{ textAlign: 'center' }}>Dibuat Pada</th>
              <th style={{ textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada user superadmin</td></tr>
            ) : (
              users.map(adminUser => (
                <tr key={adminUser.id}>
                  <td style={{ textAlign: 'center' }}>#{adminUser.id}</td>
                  <td style={{ fontWeight: '600', textAlign: 'center' }}>{adminUser.username}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>{adminUser.role}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{formatDateTime(adminUser.created_at)}</td>
                  <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      className="btn-glass-edit" 
                      onClick={() => {
                        setSelectedUserId(adminUser.id);
                        setShowEditPasswordModal(true);
                      }}
                      title="Ganti Password"
                    >
                      <span className="material-symbols-rounded" style={{ color: '#f59e0b', fontSize: '18px' }}>lock_reset</span>
                    </button>
                    <button 
                      className="btn-glass-delete" 
                      onClick={() => handleDeleteUser(adminUser.id, adminUser.username)}
                      disabled={adminUser.username === user?.username || adminUser.username === 'superadmin'}
                      style={{ 
                        opacity: (adminUser.username === user?.username || adminUser.username === 'superadmin') ? 0.3 : 1 
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ color: '#ef4444', fontSize: '18px' }}>delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add */}
      {showAddModal && (
        <div className="modal-overlay open" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Tambah Superadmin Baru</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddUser} style={{ marginTop: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: '100%' }}
                  value={newUser.username}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                  required
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ width: '100%' }}
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#ef4444' }}>SIMPAN</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Password */}
      {showEditPasswordModal && (
        <div className="modal-overlay open" onClick={() => setShowEditPasswordModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Ganti Password Superadmin</h2>
              <button className="modal-close" onClick={() => setShowEditPasswordModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleChangePassword} style={{ marginTop: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Password Baru</label>
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ width: '100%' }}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditPasswordModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};

export default SuperadminUsers;
