import React, { useState, useEffect } from 'react';

const AccessRules = ({ user }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enableDemoMode, setEnableDemoMode] = useState(true);
  const host = window.location.hostname;

  const roles = ['superadmin', 'admin', 'mitra', 'operator', 'demo'];
  const menus = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'voucher_stock', label: 'Stock Voucher' },
    { id: 'voucher_sold', label: 'Voucher Terjual' },
    { id: 'online_store', label: 'Online Store' },
    { id: 'settings_branding', label: 'Branding & App' },
    { id: 'settings_telegram', label: 'Bot Telegram' },
    { id: 'admin_users', label: 'User Admin' },
    { id: 'superadmin_panel', label: 'Superadmin Panel (Group)' },
    { id: 'admin_superadmin', label: 'User Superadmin' },
    { id: 'access_rules', label: 'Access Rules' },
    { id: 'vpn_remote', label: 'VPN Remote' },
    { id: 'device_control', label: 'Device Control' },
    { id: 'reply_messages', label: 'Reply Messages' },
    { id: 'master_data', label: 'Master Data' },
    { id: 'ui_layout', label: 'UI Layout' }
  ];

  const fetchRules = async () => {
    try {
      const resRules = await fetch(`/api/vouchers/access-rules`);
      const dataRules = await resRules.json();
      setRules(dataRules);

      const resSettings = await fetch(`/api/settings`);
      const dataSettings = await resSettings.json();
      setEnableDemoMode(dataSettings.enable_demo_mode === 1 || dataSettings.enable_demo_mode === true);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = (role, menu_id) => {
    if (role === 'superadmin') return; // Cannot modify superadmin
    if (user?.role === 'demo') {
      alert('Fitur dinonaktifkan pada akun demo.');
      return;
    }

    setRules(rules.map(r => 
      (r.role === role && r.menu_id === menu_id) 
        ? { ...r, is_allowed: r.is_allowed ? 0 : 1 } 
        : r
    ));
  };

  const handleSave = async () => {
    if (user?.role === 'demo') {
      alert('Fitur dinonaktifkan pada akun demo.');
      return;
    }
    setSaving(true);
    try {
      const resRules = await fetch(`/api/vouchers/access-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules)
      });

      const resSettings = await fetch(`/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_demo_mode: enableDemoMode ? 1 : 0 })
      });

      if (resRules.ok && resSettings.ok) {
        alert('Access rules & settings saved successfully! Please refresh or re-login to see changes.');
      } else {
        alert('Error saving some settings.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving rules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading access rules...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Access Rules Management</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Atur hak akses menu sidebar berdasarkan peran user.</p>
      </div>

      {/* Alert / Notice for Demo Role */}
      <div style={{
        background: 'rgba(192, 132, 252, 0.1)',
        border: '1px solid rgba(192, 132, 252, 0.2)',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1.5rem',
        color: '#c084fc',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)', fontSize: '20px' }}>info</span>
        <span>
          <strong>Informasi Peran Demo:</strong> Role <strong>demo</strong> dirancang untuk kebutuhan demonstrasi. Pengguna dengan peran ini dapat menjelajahi menu yang diizinkan, tetapi <strong>tidak memiliki izin untuk menambah (Create) atau menghapus (Delete) data</strong> di seluruh aplikasi.
        </span>
      </div>

      {/* Demo Mode Setting Switch */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'white', marginBottom: '0.25rem' }}>
              Tombol Akses Demo di Halaman Login
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Aktifkan atau nonaktifkan tombol "COBA AKUN DEMO" pada halaman login utama.
            </p>
          </div>
          <div 
            onClick={() => {
              if (user?.role === 'demo') {
                alert('Fitur dinonaktifkan pada akun demo.');
                return;
              }
              setEnableDemoMode(!enableDemoMode);
            }}
            style={{ 
              display: 'inline-flex',
              width: '50px',
              height: '28px',
              background: enableDemoMode ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
              borderRadius: '20px',
              position: 'relative',
              cursor: user?.role === 'demo' ? 'not-allowed' : 'pointer',
              opacity: user?.role === 'demo' ? 0.6 : 1,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <div style={{ 
              width: '22px',
              height: '22px',
              background: 'white',
              borderRadius: '50%',
              position: 'absolute',
              top: '3px',
              left: enableDemoMode ? '25px' : '3px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Role-Based Access Control (RBAC)</h3>
            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Tentukan menu apa saja yang bisa dilihat oleh masing-masing level user.</p>
          </div>
          <button 
            onClick={handleSave} 
            className="btn btn-primary" 
            disabled={saving || user?.role === 'demo'}
            style={{ padding: '0.8rem 2rem' }}
          >
            {saving ? 'MENYIMPAN...' : 'SIMPAN'}
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '200px' }}>NAMA MENU</th>
                {roles.map(r => (
                  <th key={r} style={{ textAlign: 'center', textTransform: 'uppercase' }}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {menus.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: '600' }}>{m.label}</td>
                  {roles.map(role => {
                    const rule = rules.find(r => r.role === role && r.menu_id === m.id);
                    let isAllowed = rule ? (rule.is_allowed === 1 || rule.is_allowed === true) : false;
                    // Superadmin always shows as allowed
                    if (role === 'superadmin') isAllowed = true;
                    
                    const isToggleDisabled = role === 'superadmin' || 
                                             user?.role === 'demo';
                    
                    return (
                      <td key={role} style={{ textAlign: 'center' }}>
                        <div 
                          onClick={() => handleToggle(role, m.id)}
                          style={{ 
                            display: 'inline-flex',
                            width: '40px',
                            height: '24px',
                            background: isAllowed ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                            borderRadius: '20px',
                            position: 'relative',
                            cursor: isToggleDisabled ? 'not-allowed' : 'pointer',
                            opacity: isToggleDisabled ? 0.6 : 1,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}
                        >
                          <div style={{ 
                            width: '18px',
                            height: '18px',
                            background: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: isAllowed ? '19px' : '2px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccessRules;
