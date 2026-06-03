import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateTime } from '../utils/dateFormatter';

const DeviceControl = ({ user }) => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [policy, setPolicy] = useState({
    device_mode: 'none',
    max_shared_session: 1,
    registered_mac: null
  });
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.startsWith('0000')) return '-';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '-' : formatDateTime(d);
    } catch (e) {
      return '-';
    }
  };

  const host = window.location.hostname;

  const fetchVouchers = async () => {
    try {
      const resStock = await fetch(`/api/vouchers`);
      const dataStock = await resStock.json();
      
      const resSold = await fetch(`/api/vouchers/terjual`);
      const dataSold = await resSold.json();
      
      let allVouchers = [];
      if (Array.isArray(dataStock)) {
        allVouchers = [...allVouchers, ...dataStock.map(v => ({ ...v, type: 'Stock' }))];
      }
      if (Array.isArray(dataSold)) {
        allVouchers = [...allVouchers, ...dataSold.map(v => ({ ...v, type: 'Sold' }))];
      }
      
      // Remove duplicates (by voucher_code)
      const uniqueVouchers = allVouchers.reduce((acc, current) => {
        const x = acc.find(item => item.voucher_code === current.voucher_code);
        if (!x) {
          return acc.concat([current]);
        } else {
          // If duplicate, prefer Sold type because it's more relevant for device control
          if (current.type === 'Sold') {
            return acc.filter(a => a.voucher_code !== current.voucher_code).concat([current]);
          }
          return acc;
        }
      }, []);

      setVouchers(uniqueVouchers);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setVouchers([]);
      setLoading(false);
    }
  };

  const fetchPolicy = async (username) => {
    try {
      const res = await fetch(`/api/device-control/${username}`);
      const data = await res.json();
      if (data && !data.error) {
        setPolicy(data);
      }
      
      const logRes = await fetch(`/api/device-control/${username}/logs`);
      const logData = await logRes.json();
      if (Array.isArray(logData)) {
        setLogs(logData);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error(err);
      setLogs([]);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleSelectUser = (v) => {
    setSelectedUser(v.voucher_code);
    fetchPolicy(v.voucher_code);
  };

  const handleUpdatePolicy = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/device-control/${selectedUser}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_mode: policy.device_mode,
          max_shared_session: policy.max_shared_session
        })
      });
      if (res.ok) {
        alert('Policy updated successfully');
        fetchPolicy(selectedUser);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnlock = async () => {
    triggerConfirm('Unlock MAC for this user?', async () => {
      try {
        const res = await fetch(`/api/device-control/${selectedUser}/unlock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_name: user?.username })
        });
        if (res.ok) {
          alert('MAC address unlocked');
          fetchPolicy(selectedUser);
        }
      } catch (err) {
        console.error(err);
      }
      });
  };

  const filteredVouchers = vouchers.filter(v => 
    v.voucher_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Device Control</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage MAC locking and simultaneous sessions for vouchers</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        
        {/* User List */}
        <div className="glass-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 250px)' }}>
          <div style={{ padding: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search voucher code..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ borderRadius: '50px' }}
              />
            </div>
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading...</div>
            ) : (
              <div className="user-list">
                {filteredVouchers.map((v, i) => (
                  <div 
                    key={i} 
                    onClick={() => handleSelectUser(v)}
                    className={`user-item ${selectedUser === v.voucher_code ? 'active' : ''}`}
                    style={{
                      padding: '1rem 1.5rem',
                      cursor: 'pointer',
                      borderLeft: selectedUser === v.voucher_code ? '4px solid #3b82f6' : '4px solid transparent',
                      background: selectedUser === v.voucher_code ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      transition: 'all 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: '700', color: selectedUser === v.voucher_code ? '#3b82f6' : 'white' }}>{v.voucher_code}</div>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginTop: '4px' }}>
                        <span className={`badge ${v.type === 'Stock' ? 'badge-info' : 'badge-success'}`} style={{ padding: '2px 6px', fontSize: '0.6rem' }}>
                          {v.type.toUpperCase()}
                        </span>
                        {v.device_mode && v.device_mode !== 'none' && (
                          <span className="badge" style={{ padding: '2px 6px', fontSize: '0.6rem', background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>
                            {v.device_mode === 'shared_1_device' ? 'SHARED 1' : 
                             v.device_mode === 'lock_mac' ? 'LOCKED' : 'AUTO-LOCK'}
                          </span>
                        )}
                        <span className="badge" style={{ padding: '2px 6px', fontSize: '0.6rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                          SESSIONS: {v.max_shared_session || v.shared_users || 1}
                        </span>
                        <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{v.profile}</div>
                      </div>
                    </div>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px', opacity: 0.3 }}>chevron_right</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Policy Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {selectedUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Session Control Card */}
              <div className="glass-card animate-slide-up">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-rounded" style={{ color: '#3b82f6' }}>groups</span>
                  Session Control
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Shared Mode</label>
                    <select 
                      className="form-input" 
                      value={policy.device_mode === 'shared_1_device' ? 'shared_1_device' : 'custom'} 
                      onChange={(e) => {
                        if (e.target.value === 'shared_1_device') {
                          setPolicy({...policy, device_mode: 'shared_1_device', max_shared_session: 1});
                        } else {
                          // Keep existing if it was auto_lock or lock_mac
                          if (policy.device_mode === 'shared_1_device') setPolicy({...policy, device_mode: 'none'});
                        }
                      }}
                    >
                      <option value="custom">Regular / Custom Sessions</option>
                      <option value="shared_1_device">Strict Shared (1 Device Only)</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Max Simultaneous Sessions</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={policy.max_shared_session}
                      onChange={(e) => setPolicy({...policy, max_shared_session: e.target.value})}
                      disabled={policy.device_mode === 'shared_1_device'}
                      min="1"
                    />
                  </div>
                </div>
                
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleUpdatePolicy} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '50px', fontSize: '0.9rem' }}>
                    Save Session Policy
                  </button>
                </div>
              </div>

              {/* MAC Locking Card */}
              <div className="glass-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="material-symbols-rounded" style={{ color: '#8b5cf6' }}>vpn_key</span>
                    MAC Address Locking
                  </h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {policy.registered_mac && (
                      <button 
                        onClick={handleUnlock}
                        className="btn" 
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.1)', 
                          color: '#ef4444', 
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          padding: '0.4rem 1rem',
                          fontSize: '0.8rem',
                          borderRadius: '50px'
                        }}
                      >
                        Unlock MAC
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Locking Mode</label>
                    <select 
                      className="form-input" 
                      value={policy.device_mode === 'shared_1_device' ? 'none' : policy.device_mode} 
                      onChange={(e) => setPolicy({...policy, device_mode: e.target.value})}
                      disabled={policy.device_mode === 'shared_1_device'}
                    >
                      <option value="none">No MAC Lock</option>
                      <option value="lock_mac">Manual Lock (Must register MAC)</option>
                      <option value="auto_lock_mac">Auto Lock (Bind on first login)</option>
                    </select>
                    {policy.device_mode === 'shared_1_device' && (
                      <p style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '0.5rem' }}>
                        * MAC Lock is disabled when Strict Shared 1 is active.
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Registered MAC</label>
                      <div style={{ 
                        padding: '0.8rem 1rem', 
                        background: 'rgba(0,0,0,0.2)', 
                        borderRadius: '8px', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: policy.registered_mac ? '#8b5cf6' : 'rgba(255,255,255,0.3)',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem'
                      }}>
                        {policy.registered_mac || 'NOT REGISTERED'}
                        {policy.locked_at && formatDate(policy.locked_at) !== '-' && (
                          <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '4px' }}>Locked: {formatDate(policy.locked_at)}</div>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Last Seen MAC</label>
                      <div style={{ 
                        padding: '0.8rem 1rem', 
                        background: 'rgba(0,0,0,0.2)', 
                        borderRadius: '8px', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: policy.last_seen_mac ? '#10b981' : 'rgba(255,255,255,0.3)',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem'
                      }}>
                        {policy.last_seen_mac || 'NEVER SEEN'}
                        {policy.last_login_at && formatDate(policy.last_login_at) !== '-' && (
                          <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '4px' }}>Seen: {formatDate(policy.last_login_at)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleUpdatePolicy} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                    Save MAC Policy
                  </button>
                </div>
              </div>

              {/* Login Logs Card */}
              <div className="glass-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-rounded" style={{ color: '#10b981' }}>history</span>
                  Device Login History
                </h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>MAC Address</th>
                        <th>Status</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', opacity: 0.3 }}>No history found</td></tr>
                      ) : (
                        logs.map((log, i) => (
                          <tr key={i}>
                            <td style={{ fontSize: '0.8rem' }}>{formatDate(log.created_at)}</td>
                            <td style={{ fontFamily: 'monospace' }}>{log.calling_station_id}</td>
                            <td>
                              <span className={`badge ${log.login_status === 'success' ? 'badge-success' : 'badge-danger'}`}>
                                {log.login_status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: '#ef4444' }}>{log.reject_reason || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', opacity: 0.5 }}>
              <span className="material-symbols-rounded" style={{ fontSize: '48px', marginBottom: '1rem' }}>touch_app</span>
              <p>Select a user from the list to manage device policy</p>
            </div>
          )}
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

export default DeviceControl;
