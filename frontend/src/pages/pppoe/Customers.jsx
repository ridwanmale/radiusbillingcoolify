import React, { useState, useEffect } from 'react';
import ConfirmModal from '../../components/ConfirmModal';

const PppoeCustomers = ({ user }) => {
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [nasList, setNasList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });
  const [formData, setFormData] = useState({
    name: '', pppoe_username: '', pppoe_password: '',
    phone: '', address: '', router_id: '', package_id: '',
    billing_cycle_type: 'profile', billing_start_date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      const [resCust, resPkg, resNas] = await Promise.all([
        fetch('/api/pppoe-customers'),
        fetch('/api/pppoe-packages'),
        fetch('/api/nas')
      ]);
      setCustomers(await resCust.json());
      setPackages(await resPkg.json());
      setNasList(await resNas.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleShowDetail = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };


  const handleAdd = () => {
    setFormData({
      name: '', pppoe_username: '', pppoe_password: '',
      phone: '', address: '', router_id: '', package_id: '',
      billing_cycle_type: 'profile', 
      billing_start_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsEdit(false);
    setEditId(null);
    setShowModal(true);
  };

  const handleEdit = (customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      pppoe_username: customer.pppoe_username,
      pppoe_password: customer.pppoe_password,
      router_id: customer.router_id,
      package_id: customer.package_id,
      billing_cycle_type: customer.billing_cycle_type,
      billing_start_date: new Date(customer.billing_start_date).toISOString().split('T')[0],
      notes: customer.notes || ''
    });
    setEditId(customer.id);
    setIsEdit(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isEdit ? `/api/pppoe-customers/${editId}` : '/api/pppoe-customers';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, admin_username: user?.username })
      });
      if (res.ok) {
        setShowModal(false);
        setIsEdit(false);
        setEditId(null);
        setFormData({
          name: '', pppoe_username: '', pppoe_password: '',
          phone: '', address: '', router_id: '', package_id: '',
          billing_cycle_type: 'profile', billing_start_date: new Date().toISOString().split('T')[0]
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatSpeed = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    return raw.toUpperCase().endsWith('M') ? raw.toUpperCase() : `${raw}M`;
  };

  const formatCustomerRateLimit = (customer) => {
    if (customer.upload_speed || customer.download_speed) {
      return `${formatSpeed(customer.upload_speed)}/${formatSpeed(customer.download_speed)}`;
    }
    const [upload, download] = String(customer.package_rate_limit || '').split('/');
    if (!upload && !download) return '-';
    return `${formatSpeed(upload)}/${formatSpeed(download)}`;
  };

  const handleDelete = async (customer) => {
    triggerConfirm(`Hapus pelanggan "${customer.name}"? Data PPPoE dan sesi radius terkait juga akan dihapus.`, async () => {

    try {
      const res = await fetch(`/api/pppoe-customers/${customer.id}?admin_username=${user?.username || 'admin'}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Gagal menghapus pelanggan');
        return;
      }
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer(null);
        setShowDetailModal(false);
      }
      if (editId === customer.id) {
        setEditId(null);
        setIsEdit(false);
        setShowModal(false);
      }
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal menghubungi server.');
    }
    });
  };

  const handleStatusChange = async (customer, status) => {
    const label = status === 'isolir' ? 'isolir manual' : 'aktifkan kembali';
    triggerConfirm(`Yakin ingin ${label} pelanggan "${customer.name}"?`, async () => {

    try {
      const res = await fetch(`/api/pppoe-customers/${customer.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_username: user?.username || 'admin' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Gagal mengubah status pelanggan');
        return;
      }
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal menghubungi server.');
    }
    });
  };

  return (
    <div className="page-pppoe">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Pelanggan PPPoE</h1>
          <p className="page-subtitle">Daftar pelanggan internet PPPoE aktif.</p>
        </div>
        <button 
          className="btn-glass-premium" 
          onClick={handleAdd}
        >
          <span className="material-symbols-rounded">person_add</span>
          <span>Tambah Pelanggan</span>
        </button>
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
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .btn-glass-premium:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: var(--accent-primary);
          box-shadow: 0 0 25px rgba(14, 165, 233, 0.3);
          transform: translateY(-2px);
        }

        .btn-glass-premium .material-symbols-rounded {
          font-size: 22px;
          color: var(--accent-primary);
        }

        @media (max-width: 640px) {
          .btn-glass-premium {
            padding: 10px 16px;
            font-size: 0.85rem;
          }
          .btn-glass-premium .material-symbols-rounded {
            font-size: 18px;
          }
          .page-header h1 {
            font-size: 1.5rem;
          }
        }

        .badge { padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; }
        .badge-success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .badge-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
      `}</style>



      <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Username</th>
              <th>Router</th>
              <th>Paket</th>
              <th>Status</th>
              <th>Billing</th>
              <th>Next Isolir</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong><br/><small>{c.customer_code}</small></td>
                <td><code>{c.pppoe_username}</code></td>
                <td>{c.router_name || c.router_ip}</td>
                <td>
                  <strong>{c.package_name}</strong>
                  <br />
                  <small style={{ color: '#10b981', fontWeight: 700 }}>{formatCustomerRateLimit(c)}</small>
                </td>
                <td><span className={`badge badge-${c.status === 'active' ? 'success' : 'danger'}`}>{c.status}</span></td>
                <td>{c.billing_status}</td>
                <td>{c.next_isolir_date ? new Date(c.next_isolir_date).toLocaleDateString() : '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                    <button 
                      className="btn btn-sm btn-info" 
                      onClick={() => handleShowDetail(c)}
                      title="Detail"
                    >
                      <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)', fontSize: '18px' }}>visibility</span>
                    </button>
                    <button 
                      className="btn-glass-edit" 
                      onClick={() => handleEdit(c)}
                      title="Edit"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}
                    >
                      <span className="material-symbols-rounded" style={{ color: '#f59e0b', fontSize: '18px' }}>edit</span>
                    </button>
                    <button 
                      className="btn-glass-delete" 
                      onClick={() => handleDelete(c)}
                      title="Hapus"
                    >
                      <span className="material-symbols-rounded" style={{ color: '#ef4444', fontSize: '18px' }}>delete</span>
                    </button>
                    {c.status === 'isolir' ? (
                      <button 
                        className="btn btn-sm" 
                        onClick={() => handleStatusChange(c, 'active')}
                        title="Aktifkan"
                        style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
                      >
                        <span className="material-symbols-rounded" style={{ color: '#10b981', fontSize: '18px' }}>check_circle</span>
                      </button>
                    ) : (
                      <button 
                        className="btn btn-sm" 
                        onClick={() => handleStatusChange(c, 'isolir')}
                        title="Isolir Manual"
                        style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}
                      >
                        <span className="material-symbols-rounded" style={{ color: '#ef4444', fontSize: '18px' }}>block</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="pppoe-modal-overlay">
          <div className="glass-card pppoe-modal-content" style={{ maxWidth: '600px', width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent-primary)', fontSize: '1.5rem' }}>
              {isEdit ? 'Edit Data Pelanggan' : 'Tambah Pelanggan PPPoE Baru'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label>Nama Lengkap</label>
                  <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Nama Pelanggan" />
                </div>
                <div className="form-group">
                  <label>No HP</label>
                  <input type="text" className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="0812..." />
                </div>
                <div className="form-group">
                  <label>Username PPPoE</label>
                  <input type="text" className="form-input" value={formData.pppoe_username} onChange={e => setFormData({...formData, pppoe_username: e.target.value})} required placeholder="username" />
                </div>
                <div className="form-group">
                  <label>Password PPPoE</label>
                  <input type="text" className="form-input" value={formData.pppoe_password} onChange={e => setFormData({...formData, pppoe_password: e.target.value})} required placeholder="password" />
                </div>
                <div className="form-group">
                  <label>Router MikroTik</label>
                  <select className="form-input" value={formData.router_id} onChange={e => setFormData({...formData, router_id: e.target.value})} required>
                    <option value="">Pilih Router</option>
                    {nasList.map(n => <option key={n.id} value={n.id}>{n.shortname} ({n.nasname})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Paket Internet</label>
                  <select className="form-input" value={formData.package_id} onChange={e => setFormData({...formData, package_id: e.target.value})} required>
                    <option value="">Pilih Paket</option>
                    {packages.map(p => <option key={p.id} value={p.id}>{p.name} - Rp {parseFloat(p.price).toLocaleString()}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Siklus Penagihan</label>
                  <select className="form-input" value={formData.billing_cycle_type} onChange={e => setFormData({...formData, billing_cycle_type: e.target.value})}>
                    <option value="profile">Siklus Profile (Aktif)</option>
                    <option value="fixed">Siklus Tetap (Tgl Pasang)</option>
                    <option value="monthly">Siklus Bulanan (Pasca)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tanggal Pasang</label>
                  <input type="date" className="form-input" value={formData.billing_start_date} onChange={e => setFormData({...formData, billing_start_date: e.target.value})} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Alamat</label>
                <textarea className="form-input" rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Alamat lengkap..."></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                <button type="submit" className="btn-glass-premium" style={{ flex: 1, justifyContent: 'center', minWidth: '120px' }}>
                  <span className="material-symbols-rounded">{isEdit ? 'check_circle' : 'person_add'}</span>
                  <span>{isEdit ? 'Simpan Perubahan' : 'Simpan Pelanggan'}</span>
                </button>
                <button type="button" className="btn-glass-premium" style={{ flex: 1, justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', minWidth: '120px' }} onClick={() => { setShowModal(false); setIsEdit(false); }}>
                  <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>cancel</span>
                  <span>Batal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Detail Pelanggan */}
      {showDetailModal && selectedCustomer && (
        <div className="pppoe-modal-overlay">
          <div className="glass-card pppoe-modal-content" style={{ maxWidth: '500px', width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ color: 'var(--accent-primary)', margin: 0 }}>Detail Pelanggan</h2>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <label>Nama Pelanggan</label>
                <div className="detail-value">{selectedCustomer.name}</div>
              </div>
              <div className="detail-item">
                <label>Kode Pelanggan</label>
                <div className="detail-value"><code>{selectedCustomer.customer_code}</code></div>
              </div>
              <div className="detail-item">
                <label>Username PPPoE</label>
                <div className="detail-value"><code>{selectedCustomer.pppoe_username}</code></div>
              </div>
              <div className="detail-item">
                <label>Password PPPoE</label>
                <div className="detail-value"><code>{selectedCustomer.pppoe_password}</code></div>
              </div>
              <div className="detail-item">
                <label>Paket Internet</label>
                <div className="detail-value">{selectedCustomer.package_name} <br /><small style={{ color: '#10b981' }}>{formatCustomerRateLimit(selectedCustomer)}</small></div>
              </div>
              <div className="detail-item">
                <label>Router / NAS</label>
                <div className="detail-value">{selectedCustomer.router_name} ({selectedCustomer.router_ip})</div>
              </div>
              <div className="detail-divider"></div>
              <div className="detail-item">
                <label>Status Layanan</label>
                <div className="detail-value">
                  <span className={`badge badge-${selectedCustomer.status === 'active' ? 'success' : 'danger'}`}>
                    {selectedCustomer.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="detail-item">
                <label>Billing Status</label>
                <div className="detail-value">{selectedCustomer.billing_status.toUpperCase()}</div>
              </div>
              <div className="detail-item">
                <label>Jatuh Tempo (Isolir)</label>
                <div className="detail-value">{new Date(selectedCustomer.next_isolir_date).toLocaleDateString('id-ID', { dateStyle: 'full' })}</div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" style={{ flex: 1, minWidth: '100px' }} onClick={() => setShowDetailModal(false)}>Tutup</button>
              {selectedCustomer.status === 'isolir' ? (
                <button className="btn" style={{ flex: 1, minWidth: '100px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }} onClick={() => { handleStatusChange(selectedCustomer, 'active'); setShowDetailModal(false); }}>
                  Aktifkan
                </button>
              ) : (
                <button className="btn" style={{ flex: 1, minWidth: '100px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }} onClick={() => { handleStatusChange(selectedCustomer, 'isolir'); setShowDetailModal(false); }}>
                  Isolir Manual
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1.5rem;
        }
        @media (max-width: 600px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }
          .detail-divider {
            grid-column: 1 !important;
          }
        }
        .detail-item label {
          display: block;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .detail-value {
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .detail-divider {
          grid-column: span 2;
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin: 0.5rem 0;
        }
        .btn-close {
          background: rgba(255,255,255,0.05);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        .btn-close:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
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

export default PppoeCustomers;

