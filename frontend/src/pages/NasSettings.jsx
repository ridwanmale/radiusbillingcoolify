import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const NasSettings = () => {
  const [nasList, setNasList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });
  const [formData, setFormData] = useState({
    nasname: '',
    shortname: '',
    secret: '',
    description: ''
  });

  const fetchNas = async () => {
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/nas`);
      const data = await res.json();
      setNasList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNas();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/nas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({ nasname: '', shortname: '', secret: '', description: '' });
        await fetchNas();
        alert('Router NAS berhasil ditambahkan!');
      } else {
        const err = await res.json();
        alert('Gagal: ' + err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    triggerConfirm('Yakin ingin menghapus Router ini? FreeRADIUS akan menolak koneksi dari IP tersebut.', async () => {
      try {
        const host = window.location.hostname;
        const res = await fetch(`/api/nas/${id}`, { method: 'DELETE' });
        if (res.ok) {
          await fetchNas();
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pengaturan NAS (Router MikroTik)</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Daftarkan IP Address Router Anda agar diizinkan terhubung ke server FreeRADIUS ini.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* FORM */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>➕ Tambah Router Baru</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">IP Address Router (nasname) *</label>
              <input type="text" name="nasname" className="form-input" placeholder="Contoh: 192.168.88.1" value={formData.nasname} onChange={handleChange} required />
              <small style={{ color: 'var(--text-secondary)' }}>Gunakan `0.0.0.0/0` jika ingin mengizinkan dari IP manapun (Kurang Aman).</small>
            </div>
            <div className="form-group">
              <label className="form-label">RADIUS Secret / Password *</label>
              <input type="text" name="secret" className="form-input" placeholder="Contoh: rahasia123" value={formData.secret} onChange={handleChange} required />
              <small style={{ color: 'var(--text-secondary)' }}>Harus sama persis dengan yang diinputkan di menu RADIUS pada MikroTik Anda.</small>
            </div>
            <div className="form-group">
              <label className="form-label">Nama Pendek (Shortname)</label>
              <input type="text" name="shortname" className="form-input" placeholder="Contoh: RB750Gr3" value={formData.shortname} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <input type="text" name="description" className="form-input" placeholder="Contoh: Router Cafe Cabang Utama" value={formData.description} onChange={handleChange} />
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Simpan NAS</button>
            </div>
          </form>
        </div>

        {/* LIST */}
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>📋 Daftar Router Terdaftar</h2>
          {isLoading ? (
            <p>Memuat data...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Secret</th>
                  <th>Shortname</th>
                  <th>Deskripsi</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {nasList.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>Belum ada Router yang didaftarkan.</td></tr>
                ) : (
                  nasList.map((nas) => (
                    <tr key={nas.id}>
                      <td><strong>{nas.nasname}</strong></td>
                      <td><code>{nas.secret}</code></td>
                      <td>{nas.shortname || '-'}</td>
                      <td>{nas.description || '-'}</td>
                      <td>
                        <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleDelete(nas.id)}>
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '4px solid var(--warning)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--warning)' }}>⚠️ Penting:</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Setelah menambah NAS baru di sini, pastikan pengaturan koneksi RADIUS pada Router MikroTik Anda menunjuk ke IP Server Billing ini dengan menggunakan port `1812` (Auth) dan `1813` (Acct).</p>
          </div>
        </div>

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

export default NasSettings;
