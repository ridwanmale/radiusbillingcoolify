import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateTime } from '../utils/dateFormatter';

const AdminUsers = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'admin' });
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
      // Filter out superadmins
      const regularAdmins = data.filter(u => u.role !== 'superadmin');
      setUsers(regularAdmins);
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
        setNewUser({ username: '', password: '', role: 'admin' });
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert('Gagal menambah user');
    }
  };

  const handleDeleteUser = async (id) => {
    triggerConfirm('Yakin ingin menghapus user ini?', async () => {
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
      } else {
        alert('Gagal mengubah password');
      }
    } catch (err) {
      alert('Gagal mengubah password');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Manajemen User Admin</h1>
          <p className="page-subtitle">Kelola akses akun administrator aplikasi</p>
        </div>
        <button 
          className="btn" 
          onClick={() => setShowAddModal(true)}
          style={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            color: '#3b82f6', 
            border: '1px solid rgba(59, 130, 246, 0.2)', 
            borderRadius: '50px', 
            padding: '0.6rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>person_add</span>
          TAMBAH USER
        </button>
      </div>

      <div className="glass-card" style={{ padding: '0' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Dibuat Pada</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada user admin</td></tr>
            ) : (
              users.map(adminUser => (
                <tr key={adminUser.id}>
                  <td>#{adminUser.id}</td>
                  <td style={{ fontWeight: '600' }}>{adminUser.username}</td>
                  <td>
                    <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>{adminUser.role}</span>
                  </td>
                  <td>{formatDateTime(adminUser.created_at)}</td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
                      onClick={() => handleDeleteUser(adminUser.id)}
                      disabled={
                        adminUser.username === user?.username ||
                        (adminUser.role === 'superadmin' || adminUser.username === 'superadmin') ||
                        (user?.role !== 'superadmin' && (adminUser.role === 'admin' || adminUser.username === 'admin'))
                      }
                      style={{ 
                        opacity: (
                          adminUser.username === user?.username || 
                          adminUser.role === 'superadmin' || 
                          (user?.role !== 'superadmin' && adminUser.role === 'admin')
                        ) ? 0.3 : 1 
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

      {showAddModal && (
        <div className="modal-overlay open" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Tambah User Admin</h2>
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
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Role</label>
                <select 
                  className="form-input" 
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }}
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                  required
                >
                  <option value="admin" style={{ background: '#0f172a' }}>Admin</option>
                  <option value="mitra" style={{ background: '#0f172a' }}>Mitra</option>
                  <option value="operator" style={{ background: '#0f172a' }}>Operator</option>
                  <option value="demo" style={{ background: '#0f172a' }}>Demo</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    color: 'white', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '50px', 
                    padding: '0.6rem 1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }} 
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  onClick={() => setShowAddModal(false)}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn" 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    color: '#10b981', 
                    border: '1px solid rgba(16, 185, 129, 0.2)', 
                    borderRadius: '50px', 
                    padding: '0.6rem 1.5rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                >
                  Simpan User
                </button>
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
              <h2>Ganti Password User Admin</h2>
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

export default AdminUsers;
