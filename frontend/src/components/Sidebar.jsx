import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ onLogout, user, appSettings, onCloseMobile }) => {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});
  const [accessRules, setAccessRules] = useState([]);
  const host = window.location.hostname;

  const [dbStatus, setDbStatus] = useState({
    isPrimaryAlive: true,
    primaryHost: 'LXC 1',
    backupHost: 'LXC 3',
    backupActive: false
  });

  useEffect(() => {
    const fetchDbStatus = async () => {
      try {
        const res = await fetch('/api/settings/db-status');
        const data = await res.json();
        setDbStatus(data);
      } catch (err) {
        console.error('Failed to fetch DB status:', err);
      }
    };
    
    fetchDbStatus();
    const interval = setInterval(fetchDbStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await fetch(`/api/vouchers/access-rules`);
        const data = await res.json();
        console.log('Access Rules Loaded:', data);
        console.log('Current User:', user);
        setAccessRules(data);
      } catch (err) {
        console.error('Failed to fetch access rules:', err);
      }
    };
    fetchRules();
  }, [user]);

  const isAllowed = (menuId) => {
    if (!user) return false;
    // Superadmin role always has full access to everything (God Mode)
    if (user.role && user.role.toLowerCase() === 'superadmin') return true;
    
    // For other roles (including regular admin), check the database rules
    const rule = accessRules.find(r => r.role === user.role && r.menu_id === menuId);
    return rule ? (rule.is_allowed === 1 || rule.is_allowed === true) : false;
  };

  const toggleMenu = (menuName) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const isPathActive = (path) => location.pathname === path;
  
  const isGroupActive = (paths) => paths.some(p => location.pathname.startsWith(p));

  return (
    <div className="sidebar" style={{ 
      background: 'transparent'
    }}>
      <div className="sidebar-logo" style={{ padding: '2rem 1.2rem', justifyContent: 'flex-start' }}>
        <span style={{ 
          color: appSettings?.sidebar_color || 'white',
          fontSize: '1.3rem',
          fontWeight: '900',
          letterSpacing: '-0.5px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '180px'
        }}>
          {appSettings?.hotspot_name || (
            <>Radius<span style={{ color: 'var(--accent-primary)' }}>Bill</span></>
          )}
        </span>
      </div>
      
      <nav className="nav-container" style={{ padding: '0 0.8rem' }}>
        
        <div className="nav-group-title" style={{ opacity: 0.5, fontSize: '0.7rem' }}>RADIUS Server</div>
        
        {isAllowed('dashboard') && (
          <Link to="/" className={`nav-link ${isPathActive('/') ? 'active' : ''}`} style={{ borderRadius: '12px', marginBottom: '4px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)' }}>grid_view</span> Dashboard
          </Link>
        )}

        {/* Superadmin Panel Group */}
        {(user?.role?.toLowerCase() === 'superadmin' || isAllowed('superadmin_panel')) && (
          <div className="nav-item-dropdown">
            <button 
              className={`nav-link dropdown-toggle ${isGroupActive(['/access-rules', '/vpn-remote', '/device-control', '/reply-messages', '/ui-layout']) ? 'active' : ''}`}
              onClick={() => toggleMenu('superadminGroup')}
              style={{ borderRadius: '12px', marginBottom: '4px', width: '100%' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)' }}>security</span>
                <span>Superadmin Panel</span>
              </div>
              <span className={`material-symbols-rounded chevron ${openMenus['superadminGroup'] ? 'open' : ''}`}>expand_more</span>
            </button>
            
            <div className={`dropdown-menu ${openMenus['superadminGroup'] ? 'show' : ''}`} style={{ marginLeft: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
              {isAllowed('admin_superadmin') && (
                <Link to="/superadmin-users" className={`nav-link nested-link ${isPathActive('/superadmin-users') ? 'active' : ''}`}>
                   User Superadmin
                </Link>
              )}

              {(user?.role?.toLowerCase() === 'superadmin') && (
                <Link to="/mikrotik-script-template" className={`nav-link nested-link ${isPathActive('/mikrotik-script-template') ? 'active' : ''}`}>
                   Mikrotik Script Template
                </Link>
              )}
              {isAllowed('access_rules') && (
                <Link to="/access-rules" className={`nav-link nested-link ${isPathActive('/access-rules') ? 'active' : ''}`}>
                   Access Rules
                </Link>
              )}
              {isAllowed('vpn_remote') && (
                <Link to="/vpn-remote" className={`nav-link nested-link ${isPathActive('/vpn-remote') ? 'active' : ''}`}>
                   VPN Remote
                </Link>
              )}
              {isAllowed('device_control') && (
                <Link to="/device-control" className={`nav-link nested-link ${isPathActive('/device-control') ? 'active' : ''}`}>
                   Device Control
                </Link>
              )}
              {isAllowed('reply_messages') && (
                <Link to="/reply-messages" className={`nav-link nested-link ${isPathActive('/reply-messages') ? 'active' : ''}`}>
                   Reply Messages
                </Link>
              )}

            </div>
          </div>
        )}

        {(isAllowed('voucher_stock') || isAllowed('voucher_sold') || isAllowed('online_store')) && (
          <div className="nav-item-dropdown">
            <button 
              className={`nav-link dropdown-toggle ${isGroupActive(['/voucher-online', '/stock-voucher', '/rekap-voucher', '/profiles']) ? 'active' : ''}`}
              onClick={() => toggleMenu('voucherGroup')}
              style={{ borderRadius: '12px', marginBottom: '4px', width: '100%' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ color: '#3b82f6' }}>confirmation_number</span>
                <span>Voucher Fisik</span>
              </div>
              <span className={`material-symbols-rounded chevron ${openMenus['voucherGroup'] ? 'open' : ''}`}>expand_more</span>
            </button>
            
            <div className={`dropdown-menu ${openMenus['voucherGroup'] ? 'show' : ''}`} style={{ marginLeft: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
              {isAllowed('online_store') && (
                <Link to="/voucher-online" className={`nav-link nested-link ${isPathActive('/voucher-online') ? 'active' : ''}`}>
                   Voucher Online
                </Link>
              )}

              {isAllowed('voucher_stock') && (
                <Link to="/stock-voucher" className={`nav-link nested-link ${isPathActive('/stock-voucher') ? 'active' : ''}`}>
                   Stock Voucher
                </Link>
              )}
              {isAllowed('voucher_sold') && (
                <Link to="/rekap-voucher" className={`nav-link nested-link ${isPathActive('/rekap-voucher') ? 'active' : ''}`}>
                   Rekap Voucher
                </Link>
              )}
              <Link to="/profiles" className={`nav-link nested-link ${isPathActive('/profiles') ? 'active' : ''}`}>
                 Profile Voucher
              </Link>
            </div>
          </div>
        )}

        <Link to="/template-voucher" className={`nav-link ${isPathActive('/template-voucher') ? 'active' : ''}`} style={{ borderRadius: '12px', marginBottom: '4px' }}>
          <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)' }}>palette</span> Design Template
        </Link>

        {/* PPPoE Management Group */}
        {isAllowed('pppoe_management') && (
          <div className="nav-item-dropdown">
            <button 
              className={`nav-link dropdown-toggle ${isGroupActive(['/pppoe']) ? 'active' : ''}`}
              onClick={() => toggleMenu('pppoeGroup')}
              style={{ borderRadius: '12px', marginBottom: '4px', width: '100%' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)' }}>router</span>
                <span>PPPoE Management</span>
              </div>
              <span className={`material-symbols-rounded chevron ${openMenus['pppoeGroup'] ? 'open' : ''}`}>expand_more</span>
            </button>
            
            <div className={`dropdown-menu ${openMenus['pppoeGroup'] ? 'show' : ''}`} style={{ marginLeft: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
              {isAllowed('pppoe_packages') && (
                <Link to="/pppoe/packages" className={`nav-link nested-link ${isPathActive('/pppoe/packages') ? 'active' : ''}`}>
                   Paket PPPoE
                </Link>
              )}
              {isAllowed('pppoe_customers') && (
                <Link to="/pppoe/customers" className={`nav-link nested-link ${isPathActive('/pppoe/customers') ? 'active' : ''}`}>
                   Pelanggan PPPoE
                </Link>
              )}
              {isAllowed('pppoe_monitoring') && (
                <Link to="/pppoe/monitoring" className={`nav-link nested-link ${isPathActive('/pppoe/monitoring') ? 'active' : ''}`}>
                   Monitoring Online
                </Link>
              )}
              {isAllowed('pppoe_history') && (
                <Link to="/pppoe/history" className={`nav-link nested-link ${isPathActive('/pppoe/history') ? 'active' : ''}`}>
                   Riwayat Koneksi
                </Link>
              )}
              
              {/* Nested Billing Group */}
              {isAllowed('pppoe_billing') && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ padding: '0.4rem 1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', textTransform: 'uppercase' }}>Billing PPPoE</div>
                  <Link to="/pppoe/billing/invoices" className={`nav-link nested-link ${isPathActive('/pppoe/billing/invoices') ? 'active' : ''}`} style={{ fontSize: '0.8rem', paddingLeft: '1.5rem' }}>
                     Invoice
                  </Link>
                  <Link to="/pppoe/billing/payments" className={`nav-link nested-link ${isPathActive('/pppoe/billing/payments') ? 'active' : ''}`} style={{ fontSize: '0.8rem', paddingLeft: '1.5rem' }}>
                     Pembayaran
                  </Link>
                  <Link to="/pppoe/billing/cycles" className={`nav-link nested-link ${isPathActive('/pppoe/billing/cycles') ? 'active' : ''}`} style={{ fontSize: '0.8rem', paddingLeft: '1.5rem' }}>
                     Siklus Penagihan
                  </Link>
                  <Link to="/pppoe/billing/isolir-list" className={`nav-link nested-link ${isPathActive('/pppoe/billing/isolir-list') ? 'active' : ''}`} style={{ fontSize: '0.8rem', paddingLeft: '1.5rem' }}>
                     Daftar Isolir
                  </Link>
                  <Link to="/pppoe/billing/settings" className={`nav-link nested-link ${isPathActive('/pppoe/billing/settings') ? 'active' : ''}`} style={{ fontSize: '0.8rem', paddingLeft: '1.5rem' }}>
                     Pengaturan Billing
                  </Link>
                  <Link to="/pppoe/billing/isolir-design" className={`nav-link nested-link ${isPathActive('/pppoe/billing/isolir-design') ? 'active' : ''}`} style={{ fontSize: '0.8rem', paddingLeft: '1.5rem' }}>
                     Desain Hal. Isolir
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <Link to="/nas" className={`nav-link ${isPathActive('/nas') ? 'active' : ''}`} style={{ borderRadius: '12px', marginBottom: '4px' }}>
          <span className="material-symbols-rounded" style={{ color: '#f59e0b' }}>router</span> NAS / MikroTik
        </Link>
        
        <div className="nav-divider" style={{ background: 'rgba(255,255,255,0.05)' }}></div>

        {isAllowed('voucher_sold') && (
          <div className="nav-item-dropdown">
            <button 
              className={`nav-link dropdown-toggle ${isGroupActive(['/online-store', '/transaksi', '/voucher-terjual']) ? 'active' : ''}`}
              onClick={() => toggleMenu('financeGroup')}
              style={{ borderRadius: '12px', marginBottom: '4px', width: '100%' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ color: '#10b981' }}>account_balance_wallet</span>
                <span>Keuangan & Transaksi</span>
              </div>
              <span className={`material-symbols-rounded chevron ${openMenus['financeGroup'] ? 'open' : ''}`}>expand_more</span>
            </button>
            
            <div className={`dropdown-menu ${openMenus['financeGroup'] ? 'show' : ''}`} style={{ marginLeft: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
              <Link to="/voucher-terjual" className={`nav-link nested-link ${isPathActive('/voucher-terjual') ? 'active' : ''}`}>
                 Rincian Transaksi Voucher
              </Link>
              {isAllowed('online_store') && (
                <>
                  <Link to="/online-store-hub" className={`nav-link nested-link ${isPathActive('/online-store-hub') ? 'active' : ''}`}>
                     Online Store Hub
                  </Link>
                </>
              )}
              {(user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'admin') && (
                <>
                  <Link to="/transaksi" className={`nav-link nested-link ${isPathActive('/transaksi') ? 'active' : ''}`}>
                     Jurnal Keuangan
                  </Link>
                  <Link to="/payment-bridge-center" className={`nav-link nested-link ${isPathActive('/payment-bridge-center') ? 'active' : ''}`}>
                     Payment Bridge Center
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        {(user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'admin') && (
          <>
            <div className="nav-item-dropdown">
              <button 
                className={`nav-link dropdown-toggle ${isGroupActive(['/setting-midtrans', '/setting-tripay']) ? 'active' : ''}`}
                onClick={() => toggleMenu('paymentGroup')}
                style={{ borderRadius: '12px', marginBottom: '4px', width: '100%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-rounded" style={{ color: '#facc15' }}>account_balance</span>
                  <span>Payment Gateway</span>
                </div>
                <span className={`material-symbols-rounded chevron ${openMenus['paymentGroup'] ? 'open' : ''}`}>expand_more</span>
              </button>
              
              <div className={`dropdown-menu ${openMenus['paymentGroup'] ? 'show' : ''}`} style={{ marginLeft: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                <Link to="/setting-midtrans" className={`nav-link nested-link ${isPathActive('/setting-midtrans') ? 'active' : ''}`}>
                   Setting Midtrans
                </Link>
                <Link to="/setting-duitku" className={`nav-link nested-link ${isPathActive('/setting-duitku') ? 'active' : ''}`}>
                   Setting Duitku
                </Link>
                <Link to="/setting-tripay" className={`nav-link nested-link ${isPathActive('/setting-tripay') ? 'active' : ''}`}>
                   Setting Tripay
                </Link>

              </div>
            </div>

            <div className="nav-item-dropdown">
              <button 
                className={`nav-link dropdown-toggle ${isGroupActive(['/settings-telegram', '/admin-users', '/settings', '/gdrive-backup']) ? 'active' : ''}`}
                onClick={() => toggleMenu('adminGroup')}
                style={{ borderRadius: '12px', marginBottom: '4px', width: '100%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)' }}>admin_panel_settings</span>
                  <span>Admin Panel</span>
                </div>
                <span className={`material-symbols-rounded chevron ${openMenus['adminGroup'] ? 'open' : ''}`}>expand_more</span>
              </button>
              
              <div className={`dropdown-menu ${openMenus['adminGroup'] ? 'show' : ''}`} style={{ marginLeft: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                {isAllowed('settings_branding') && (
                  <Link to="/settings" className={`nav-link nested-link ${isPathActive('/settings') ? 'active' : ''}`}>
                     Branding & App
                  </Link>
                )}
                {isAllowed('settings_telegram') && (
                  <Link to="/settings-telegram" className={`nav-link nested-link ${isPathActive('/settings-telegram') ? 'active' : ''}`}>
                     Bot Telegram
                  </Link>
                )}
                {isAllowed('admin_users') && (
                  <Link to="/admin-users" className={`nav-link nested-link ${isPathActive('/admin-users') ? 'active' : ''}`}>
                      User Admin
                   </Link>
                )}
                {isAllowed('gdrive_backup') && (
                  <Link to="/gdrive-backup" className={`nav-link nested-link ${isPathActive('/gdrive-backup') ? 'active' : ''}`}>
                     Backup GDrive
                  </Link>
                )}
                <Link to="/audit-trail" className={`nav-link nested-link ${isPathActive('/audit-trail') ? 'active' : ''}`}>
                   Audit Trail
                </Link>
              </div>
            </div>
          </>
        )}

        <div className="nav-divider"></div>

        <div className="sidebar-footer" style={{ padding: '0 1.2rem 1.2rem' }}>
          {/* DB Failover Monitoring Indicator */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Database Host</span>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: dbStatus.isPrimaryAlive ? '#10b981' : '#f59e0b',
                boxShadow: dbStatus.isPrimaryAlive ? '0 0 10px rgba(16, 185, 129, 0.4)' : '0 0 10px rgba(245, 158, 11, 0.4)',
                display: 'inline-block'
              }}></span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px', color: dbStatus.isPrimaryAlive ? '#10b981' : '#f59e0b' }}>
                {dbStatus.isPrimaryAlive ? 'database' : 'cloud_sync'}
              </span>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: 'white', fontSize: '0.8rem', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  {dbStatus.isPrimaryAlive ? 'LXC 1 (Lokal)' : 'LXC 3 (Cloud)'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  IP: {dbStatus.isPrimaryAlive ? dbStatus.primaryHost : dbStatus.backupHost}
                </div>
              </div>
            </div>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '12px',
            marginBottom: '10px'
          }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.username}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Administrator</div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '10px', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              background: 'rgba(239, 68, 68, 0.05)', 
              color: '#ef4444', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>logout</span> Logout
          </button>
        </div>

      </nav>
    </div>
  );
};

export default Sidebar;
