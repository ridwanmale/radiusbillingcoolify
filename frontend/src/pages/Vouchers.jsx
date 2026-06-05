import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const Vouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });
  const [formData, setFormData] = useState({
    qty: 10,
    profile: '',
    length: 6,
    prefix: ''
  });

  const fetchData = () => {
    const host = window.location.hostname;
    fetch(`/api/vouchers`)
      .then(res => res.json())
      .then(data => setVouchers(data))
      .catch(console.error);
      
    fetch(`/api/profiles`)
      .then(res => res.json())
      .then(data => {
        setProfiles(data);
        if (data.length > 0 && !formData.profile) {
          setFormData(prev => ({ ...prev, profile: data[0].groupname }));
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/vouchers/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchData();
        alert('Vouchers generated successfully!');
      } else {
        const error = await res.json();
        alert('Error: ' + error.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate vouchers');
    }
  };

  const handleDelete = async (username) => {
    triggerConfirm(`Delete voucher ${username}?`, async () => {
      try {
        const host = window.location.hostname;
        await fetch(`/api/vouchers/${username}`, { method: 'DELETE' });
        fetchData();
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Voucher Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Generate and manage hotspot vouchers</p>
        </div>
        <button 
          className="btn" 
          onClick={fetchData} 
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            color: 'white', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '50px', 
            padding: '0.6rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#3b82f6' }}>refresh</span> 
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <div className="glass-card" style={{ flex: '1', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Generate Vouchers</h2>
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input type="number" name="qty" className="form-input" value={formData.qty} onChange={handleChange} min="1" max="1000" required />
            </div>
            <div className="form-group">
              <label className="form-label">Profile / Package</label>
              <select name="profile" className="form-input" value={formData.profile} onChange={handleChange} required>
                <option value="" disabled>Select Profile</option>
                {profiles.map((p, i) => (
                  <option key={i} value={p.groupname}>{p.groupname}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Code Length</label>
              <input type="number" name="length" className="form-input" value={formData.length} onChange={handleChange} min="4" max="16" required />
            </div>
            <div className="form-group">
              <label className="form-label">Prefix (Optional)</label>
              <input type="text" name="prefix" className="form-input" value={formData.prefix} onChange={handleChange} placeholder="e.g. VIP-" />
            </div>
            <button 
              type="submit" 
              className="btn" 
              style={{ 
                width: '100%', 
                marginTop: '1rem', 
                background: 'rgba(255, 255, 255, 0.03)', 
                color: '#3b82f6', 
                border: '1px solid rgba(59, 130, 246, 0.2)', 
                borderRadius: '50px', 
                padding: '0.8rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
            >
              <span className="material-symbols-rounded" style={{ color: '#10b981' }}>add_circle</span>
              Generate
            </button>
          </form>
        </div>

        <div className="glass-card" style={{ flex: '2' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '800' }}>Active Vouchers ({vouchers.length})</h2>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code (Username)</th>
                  <th>Password</th>
                  <th>Profile</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v, i) => (
                  <tr key={i}>
                    <td><strong style={{ color: '#3b82f6' }}>{v.voucher_code}</strong></td>
                    <td>{v.password}</td>
                    <td><span className="badge" style={{ background: 'var(--accent-primary)', minWidth: '80px', textAlign: 'center' }}>{v.profile}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn" 
                        style={{ 
                          padding: '0.5rem 1rem', 
                          fontSize: '0.9rem', 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          color: '#ef4444', 
                          border: '1px solid rgba(239, 68, 68, 0.2)', 
                          borderRadius: '50px',
                          cursor: 'pointer',
                          fontWeight: '700',
                          transition: 'all 0.2s'
                        }} 
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        onClick={() => handleDelete(v.voucher_code)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

export default Vouchers;
