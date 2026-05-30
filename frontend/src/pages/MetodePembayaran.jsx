import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const MetodePembayaran = () => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const response = await axios.get('/api/payment-methods');
      setMethods(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Gagal mengambil data metode pembayaran');
      setLoading(false);
    }
  };

  const handleToggleStatus = async (method) => {
    try {
      const newStatus = !method.is_active;
      await axios.put(`/api/payment-methods/${method.id}`, {
        ...method,
        is_active: newStatus
      });
      setMethods(methods.map(m => m.id === method.id ? { ...m, is_active: newStatus } : m));
      toast.success(`${method.name} ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Gagal memperbarui status');
    }
  };

  const handleUpdateFee = async (method, field, value) => {
    try {
      const updatedMethod = { ...method, [field]: parseFloat(value) || 0 };
      await axios.put(`/api/payment-methods/${method.id}`, updatedMethod);
      setMethods(methods.map(m => m.id === method.id ? updatedMethod : m));
      // No toast for every change to avoid spam
    } catch (error) {
      console.error('Error updating fee:', error);
      toast.error('Gagal memperbarui biaya');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Memuat metode pembayaran...</p>
      </div>
    );
  }

  // Group methods by group_name
  const groupedMethods = methods.reduce((acc, m) => {
    if (!acc[m.group_name]) acc[m.group_name] = [];
    acc[m.group_name].push(m);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="header-info">
          <h1 className="page-title">Metode Pembayaran</h1>
          <p className="page-subtitle">Kelola metode pembayaran yang tersedia di portal voucher online</p>
        </div>
      </div>

      <div className="methods-grid" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {Object.entries(groupedMethods).map(([group, items]) => (
          <div key={group} className="method-group">
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {group}
            </h3>
            <div className="items-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {items.map(method => (
                <div key={method.id} className={`glass-card method-item ${method.is_active ? 'active' : 'inactive'}`} style={{ 
                  border: method.is_active ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                  background: method.is_active ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div className="method-icon" style={{ 
                        width: '50px', height: '50px', background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                      }}>
                        <span className="material-symbols-rounded" style={{ color: method.is_active ? '#3b82f6' : '#64748b' }}>
                          {method.code === 'CASH' ? 'payments' : 'account_balance_wallet'}
                        </span>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{method.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>
                          {method.vendor}
                        </span>
                      </div>
                    </div>
                    <div className="switch-container">
                      <input 
                        type="checkbox" 
                        id={`status-${method.id}`} 
                        checked={method.is_active}
                        onChange={() => handleToggleStatus(method)}
                      />
                      <label htmlFor={`status-${method.id}`} className="switch"></label>
                    </div>
                  </div>

                  <div className="fee-config" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Biaya Admin (Rp)</label>
                      <input 
                        type="number" 
                        className="form-control-small"
                        value={method.fee_fixed}
                        onChange={(e) => handleUpdateFee(method, 'fee_fixed', e.target.value)}
                        disabled={!method.is_active}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '8px', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Biaya Admin (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="form-control-small"
                        value={method.fee_percent}
                        onChange={(e) => handleUpdateFee(method, 'fee_percent', e.target.value)}
                        disabled={!method.is_active}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '8px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; }
        .spinner { border: 4px solid rgba(255, 255, 255, 0.1); border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 1rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .method-item:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .method-item.inactive { opacity: 0.6; grayscale: 1; }

        /* Simple Switch Style */
        .switch-container { position: relative; display: inline-block; width: 46px; height: 24px; }
        .switch-container input { opacity: 0; width: 0; height: 0; }
        .switch { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); transition: .4s; border-radius: 34px; }
        .switch:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .switch { background-color: #3b82f6; }
        input:checked + .switch:before { transform: translateX(22px); }
      `}</style>
    </div>
  );
};

export default MetodePembayaran;
