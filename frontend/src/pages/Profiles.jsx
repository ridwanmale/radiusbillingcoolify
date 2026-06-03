import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const Profiles = () => {
  const [profiles, setProfiles] = useState([]);
  const [activeTab, setActiveTab] = useState('fisik'); // 'fisik' or 'online'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

    const initialFormData = {
      name: '',
      warna: '#3b82f6', 
      mikrotikGroup: 'ARMRADIUS',
      rateLimit: '',
      masaAktif: '',
      satuan: 'Jam',
      harga: '',
      hpp: '',
      komisi: '',
      sharedUsers: 1,
      showInStore: true,
      prefix: '',
      codeCombination: '',
      codeLength: '',
      uniqueCodeMin: 1,
      uniqueCodeMax: 200
    };
  
    const [formData, setFormData] = useState(initialFormData);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });
  
  // Pagination & Search State
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProfiles = Array.isArray(profiles) ? profiles.filter(p => {
    const isOnline = p.show_in_store === 1 || p.show_in_store === true;
    if (activeTab === 'online' && !isOnline) return false;
    if (activeTab === 'fisik' && isOnline) return false;

    const groupName = p.groupname || '';
    const mikrotikGroup = p.mikrotik_group || '';
    const search = searchQuery.toLowerCase();
    return groupName.toLowerCase().includes(search) || mikrotikGroup.toLowerCase().includes(search);
  }) : [];

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage) || 1;
  const currentItems = filteredProfiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchProfiles = () => {
    const host = window.location.hostname;
    fetch(`/api/profiles`)
      .then(res => res.json())
      .then(data => {
        setProfiles(data);
        setCurrentPage(1);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // Auto calculate Harga ONLY for Physical profiles (not online store)
    if (!formData.showInStore && (name === 'hpp' || name === 'komisi')) {
      const hpp = parseFloat(name === 'hpp' ? value : formData.hpp) || 0;
      const komisi = parseFloat(name === 'komisi' ? value : formData.komisi) || 0;
      newFormData.harga = hpp + komisi;
    }

    setFormData(newFormData);
  };

  const handleOpenCreate = (isOnline = false) => {
    setIsEdit(false);
    setFormData({ ...initialFormData, showInStore: isOnline });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setIsEdit(true);
    setFormData({
      name: p.groupname,
      warna: p.warna || '#3b82f6',
      mikrotikGroup: p.mikrotik_group || '',
      rateLimit: p.rate_limit || '',
      masaAktif: p.masa_aktif || '',
      satuan: p.satuan || 'Jam',
      harga: p.harga || '',
      hpp: p.hpp || '',
      komisi: p.komisi || '',
      sharedUsers: p.shared_users || 1,
      showInStore: p.show_in_store === 1 || p.show_in_store === true,
      prefix: p.prefix || '',
      codeCombination: p.code_combination || '',
      codeLength: p.code_length || '',
      uniqueCodeMin: p.unique_code_min || 1,
      uniqueCodeMax: p.unique_code_max || 200
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalName = formData.showInStore && !formData.name.startsWith('E-') 
        ? `E-${formData.name}` 
        : formData.name;

      const payload = {
        name: finalName,
        warna: formData.warna,
        mikrotikGroup: formData.mikrotikGroup,
        rateLimit: formData.rateLimit,
        masaAktif: formData.masaAktif ? parseInt(formData.masaAktif) : 0,
        satuan: formData.satuan,
        harga: formData.harga ? parseFloat(formData.harga) : 0,
        hpp: formData.showInStore ? (formData.harga ? parseFloat(formData.harga) : 0) : (formData.hpp ? parseFloat(formData.hpp) : 0),
        komisi: formData.showInStore ? 0 : (formData.komisi ? parseFloat(formData.komisi) : 0),
        sharedUsers: formData.sharedUsers === '' ? 1 : parseInt(formData.sharedUsers),
        showInStore: formData.showInStore,
        prefix: formData.prefix || '',
        codeCombination: formData.codeCombination || '',
        codeLength: formData.codeLength ? parseInt(formData.codeLength) : null,
        uniqueCodeMin: formData.uniqueCodeMin ? parseInt(formData.uniqueCodeMin) : 1,
        uniqueCodeMax: formData.uniqueCodeMax ? parseInt(formData.uniqueCodeMax) : 200
      };

      const host = window.location.hostname;
      const res = await fetch(`/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setFormData(initialFormData);
        setIsModalOpen(false);
        fetchProfiles();
        alert(isEdit ? 'Profile berhasil diperbarui!' : 'Profile berhasil ditambahkan!');
      } else {
        const error = await res.json();
        alert('Gagal: ' + error.error);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (name) => {
    triggerConfirm(`Yakin ingin menghapus profile ${name}?`, async () => {
      try {
        const host = window.location.hostname;
        await fetch(`/api/profiles/${name}`, { method: 'DELETE' });
        fetchProfiles();
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleToggleStatus = async (name, currentStatus) => {
    const host = window.location.hostname;
    const newStatus = currentStatus === 'Aktif' ? 'Nonaktif' : 'Aktif';
    try {
      const res = await fetch(`/api/profiles/${name}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchProfiles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(number);
  };

  return (
    <div>
      <style>{`
        .profiles-table th, .profiles-table td {
          text-align: center !important;
          vertical-align: middle !important;
        }
        
        .btn-glass-premium {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50px;
          color: white;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .btn-glass-premium:hover {
          transform: translateY(-2px);
        }
        
        .btn-green:hover {
          border-color: #10b981 !important;
          background: rgba(16, 185, 129, 0.15) !important;
          color: #10b981 !important;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2);
        }

        .btn-blue {
          color: #3b82f6 !important;
          border-color: rgba(59, 130, 246, 0.2) !important;
        }

        .btn-blue:hover {
          border-color: #3b82f6 !important;
          background: rgba(59, 130, 246, 0.15) !important;
          color: #3b82f6 !important;
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);
        }

        .btn-green {
          color: #10b981 !important;
          border-color: rgba(16, 185, 129, 0.2) !important;
        }

        .btn-red:hover {
          border-color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.15) !important;
          color: #ef4444 !important;
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.2);
        }

        .btn-glass-premium:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      `}</style>
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Profile Voucher</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Daftar paket internet dan pengaturannya</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'fisik' ? (
            <button 
              className="btn-glass-premium btn-blue" 
              onClick={() => handleOpenCreate(false)}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>confirmation_number</span>
              Tambah Profile Fisik
            </button>
          ) : (
            <button 
              className="btn-glass-premium btn-green" 
              onClick={() => handleOpenCreate(true)}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>shopping_bag</span>
              Tambah Profile Online
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Show 
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="form-input"
              style={{ width: '70px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)' }}
            >
              <option value="10" style={{ background: '#1e1b1e' }}>10</option>
              <option value="25" style={{ background: '#1e1b1e' }}>25</option>
              <option value="50" style={{ background: '#1e1b1e' }}>50</option>
              <option value="100" style={{ background: '#1e1b1e' }}>100</option>
            </select>
            entries
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Search:</span>
            <input 
              type="text" 
              placeholder="Cari profile..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input"
              style={{ width: '200px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)' }}
            />
          </div>
        </div>

      {/* Sub-Tab Navigation for Physical vs Online Vouchers */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
        <button
          onClick={() => { setActiveTab('fisik'); setCurrentPage(1); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            background: activeTab === 'fisik' ? 'rgba(94, 106, 210, 0.15)' : 'transparent',
            color: activeTab === 'fisik' ? '#818cf8' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '0.85rem',
            transition: 'all 0.3s ease'
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>confirmation_number</span>
          Voucher Fisik (Lokal)
        </button>
        <button
          onClick={() => { setActiveTab('online'); setCurrentPage(1); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            background: activeTab === 'online' ? 'rgba(94, 106, 210, 0.15)' : 'transparent',
            color: activeTab === 'online' ? '#818cf8' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '0.85rem',
            transition: 'all 0.3s ease'
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>shopping_bag</span>
          Voucher Online (Store)
        </button>
      </div>

      <div className="glass-card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="data-table profiles-table">
            <thead>
              {activeTab === 'fisik' ? (
                <tr>
                  <th>PROFILE NAME</th>
                  <th>GROUP MIKROTIK</th>
                  <th>RATE LIMIT</th>
                  <th style={{ textAlign: 'center' }}>SHARED</th>
                  <th>MASA AKTIF</th>
                  <th>HPP (MODAL)</th>
                  <th>KOMISI</th>
                  <th>HARGA JUAL</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'center' }}>AKSI</th>
                </tr>
              ) : (
                <tr>
                  <th>PROFILE NAME</th>
                  <th>GROUP MIKROTIK</th>
                  <th>RATE LIMIT</th>
                  <th style={{ textAlign: 'center' }}>SHARED</th>
                  <th>MASA AKTIF</th>
                  <th>HARGA JUAL</th>
                  <th style={{ textAlign: 'center' }}>RENTANG KODE UNIK</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'center' }}>AKSI</th>
                </tr>
              )}
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr><td colSpan={activeTab === 'fisik' ? 10 : 8} style={{textAlign: 'center', padding: '3rem'}}>Belum ada data profile yang sesuai.</td></tr>
              ) : (
                <>
                  {currentItems.map((p, i) => (
                    <tr key={i}>
                      <td>
                        <span className="badge" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                          {p.groupname}
                        </span>
                      </td>
                      <td>{p.mikrotik_group || '-'}</td>
                      <td>{p.rate_limit || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{p.shared_users || 1}</td>
                      <td>{p.masa_aktif} {p.satuan}</td>
                      
                      {activeTab === 'fisik' && (
                        <>
                          <td>{formatRupiah(p.hpp || 0)}</td>
                          <td>{formatRupiah(p.komisi || 0)}</td>
                        </>
                      )}
                      
                      <td style={{ fontWeight: 'bold' }}>{formatRupiah(p.harga)}</td>
                      
                      {activeTab === 'online' && (
                        <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{p.unique_code_min || 1} - {p.unique_code_max || 200}</span>
                        </td>
                      )}
                      
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ background: p.status === 'Aktif' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: p.status === 'Aktif' ? '#10b981' : '#ef4444' }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: '#3b82f6', color: 'white', fontWeight: '600' }} onClick={() => handleOpenEdit(p)}>Edit</button>
                          <button 
                            className="btn" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: p.status === 'Aktif' ? '#ef4444' : '#10b981', color: 'white', fontWeight: '600' }}
                            onClick={() => handleToggleStatus(p.groupname, p.status)}
                          >
                            {p.status === 'Aktif' ? 'Off' : 'On'}
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleDelete(p.groupname)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1.5rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Menampilkan {filteredProfiles.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(filteredProfiles.length, currentPage * itemsPerPage)} dari {filteredProfiles.length} Profile
            </p>
<div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '4px'
          }}>
            <button 
              className="btn-glass-premium" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '6px 16px',
                background: currentPage === 1 ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                opacity: currentPage === 1 ? 0.2 : 1,
                cursor: currentPage === 1 ? 'default' : 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '600',
                fontSize: '0.9rem',
                boxShadow: 'none'
              }}
            >
              Prev
            </button>
            <div style={{
              padding: '0 16px',
              color: 'white',
              fontWeight: '700',
              fontSize: '0.95rem',
              letterSpacing: '1px',
              fontFamily: 'monospace'
            }}>
              {currentPage} / {totalPages}
            </div>
            <button 
              className="btn-glass-premium" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              style={{
                padding: '6px 16px',
                background: currentPage >= totalPages ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                opacity: currentPage >= totalPages ? 0.2 : 1,
                cursor: currentPage >= totalPages ? 'default' : 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '600',
                fontSize: '0.9rem',
                boxShadow: 'none'
              }}
            >
              Next
            </button>
          </div>
          </div>
        </div>
      </div>

      <div className={`modal-overlay ${isModalOpen ? 'open' : ''}`} onClick={() => !isSubmitting && setIsModalOpen(false)}>
        <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{isEdit ? '✏️ Edit Profile' : (formData.showInStore ? '🌐 Tambah Profile Online' : '🎟️ Tambah Profile Fisik')}</h2>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
          </div>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nama Profile {formData.showInStore && <span style={{ color: 'var(--accent-primary)' }}>(Auto Prefix: E-)</span>}</label>
                <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} placeholder={formData.showInStore ? "Contoh: 1 Jam" : "Contoh: Paket 1 Jam"} required disabled={isEdit} />
              </div>
              <div className="form-group">
                <label className="form-label">Warna</label>
                <input type="color" name="warna" className="form-input" value={formData.warna} onChange={handleChange} style={{ height: '42px', padding: '2px' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">MikroTik Group</label>
                <input type="text" name="mikrotikGroup" className="form-input" value={formData.mikrotikGroup} onChange={handleChange} placeholder="Sesuai User Profile di MikroTik" required />
              </div>
              <div className="form-group">
                <label className="form-label">Rate Limit</label>
                <input type="text" name="rateLimit" className="form-input" value={formData.rateLimit} onChange={handleChange} placeholder="Contoh: 1M/1M" required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Masa Aktif</label>
                <input type="number" name="masaAktif" className="form-input" value={formData.masaAktif} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Satuan</label>
                <select name="satuan" className="form-input" value={formData.satuan} onChange={handleChange}>
                  <option value="Menit">Menit</option>
                  <option value="Jam">Jam</option>
                  <option value="Hari">Hari</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Shared Users</label>
                <input type="number" name="sharedUsers" className="form-input" value={formData.sharedUsers} onChange={handleChange} required />
              </div>
            </div>
            {formData.showInStore ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Harga Jual (Rp)</label>
                    <input type="number" name="harga" className="form-input" value={formData.harga} onChange={handleChange} placeholder="Contoh: 5000" required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Prefix Awalan</label>
                    <input type="text" name="prefix" className="form-input" value={formData.prefix || ''} onChange={handleChange} placeholder="Contoh: NET-" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Panjang Karakter</label>
                    <input type="number" name="codeLength" className="form-input" value={formData.codeLength || ''} onChange={handleChange} placeholder="Bawaan: 6" min="4" max="16" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kode Kombinasi</label>
                    <select name="codeCombination" className="form-input" value={formData.codeCombination || ''} onChange={handleChange}>
                      <option value="">(Otomatis Bawaan)</option>
                      <option value="numeric">Hanya Angka (123456789)</option>
                      <option value="alpha">Hanya Huruf Kecil (abcdefg...)</option>
                      <option value="uppercase">Hanya Huruf Besar (ABCDEFG...)</option>
                      <option value="upalpha">Huruf Besar + Angka</option>
                      <option value="alphanumeric">Huruf Kecil + Angka</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Kode Unik Minimal</label>
                    <input type="number" name="uniqueCodeMin" className="form-input" value={formData.uniqueCodeMin} onChange={handleChange} min="1" max="999" placeholder="Contoh: 1" />
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Angka nominal unik batas bawah (misal: 1)</small>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kode Unik Maksimal</label>
                    <input type="number" name="uniqueCodeMax" className="form-input" value={formData.uniqueCodeMax} onChange={handleChange} min="1" max="999" placeholder="Contoh: 200" />
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Angka nominal unik batas atas (misal: 200)</small>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">HPP (Modal)</label>
                  <input type="number" name="hpp" className="form-input" value={formData.hpp} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Komisi Mitra</label>
                  <input type="number" name="komisi" className="form-input" value={formData.komisi} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Harga Jual</label>
                  <input type="number" name="harga" className="form-input" value={formData.harga} readOnly style={{ background: 'rgba(255,255,255,0.05)' }} />
                </div>
              </div>
            )}
            


            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button type="button" className="btn-glass-premium btn-red" onClick={() => setIsModalOpen(false)}>Batal</button>
              <button type="submit" className="btn-glass-premium btn-green" disabled={isSubmitting}>
                {isSubmitting ? '⌛ Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
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

export default Profiles;
