import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Dashboard from './pages/Dashboard';
import Vouchers from './pages/Vouchers';
import Profiles from './pages/Profiles';
import VoucherOnline from './pages/VoucherOnline';
import VoucherTerjual from './pages/VoucherTerjual';
import StockVoucher from './pages/StockVoucher';
import RekapVoucher from './pages/RekapVoucher';
import NasMikrotik from './pages/NasMikrotik';
import TripayVendor from './pages/TripayVendor';
import Transaksi from './pages/Transaksi';

import SettingTripayGlobal from './pages/SettingTripayGlobal';
import TemplateVoucher from './pages/TemplateVoucher';
import PrintPage from './pages/PrintPage';
import Login from './pages/Login';
import AdminUsers from './pages/AdminUsers';
import AuditTrail from './pages/AuditTrail';
import AppSettings from './pages/AppSettings';
import SettingTelegram from './pages/SettingTelegram';
import VpnRemote from './pages/VpnRemote';
import OnlineStore from './pages/OnlineStore';
import StoreTransactions from './pages/StoreTransactions';
import CustomerPortal from './pages/CustomerPortal';
import SettingDuitku from './pages/SettingDuitku';
import SettingMidtrans from './pages/SettingMidtrans';
import DeviceControl from './pages/DeviceControl';
import AccessRules from './pages/AccessRules';
import SuperadminUsers from './pages/SuperadminUsers';
import ReplyMessages from './pages/ReplyMessages';
import PppoePackages from './pages/pppoe/Packages';
import PppoeCustomers from './pages/pppoe/Customers';
import PppoeMonitoring from './pages/pppoe/Monitoring';
import PppoeInvoices from './pages/pppoe/Invoices';
import PppoeCycles from './pages/pppoe/Cycles';
import PppoeIsolirList from './pages/pppoe/IsolirList';
import PppoePayments from './pages/pppoe/Payments';
import PppoeBillingSettings from './pages/pppoe/BillingSettings';
import OnlineStoreCenter from './pages/OnlineStoreCenter';
import PppoeIsolirDesign from './pages/pppoe/IsolirDesign';
import PaymentBridgeCenter from './pages/PaymentBridgeCenter';
import MikrotikScriptTemplate from './pages/MikrotikScriptTemplate';
import Backup from './pages/Backup';



const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalDialog, setGlobalDialog] = useState({
    isOpen: false,
    message: '',
    title: 'Informasi',
    dialogType: 'info'
  });
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('adminUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse user:', e);
      localStorage.removeItem('adminUser');
      return null;
    }
  });
  const [appSettings, setAppSettings] = useState(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/settings`);
      const data = await res.json();
      setAppSettings(data);
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    fetchSettings();

    // Global alert override to show beautiful custom overlay dialog
    window.alert = (message) => {
      if (!message) return;
      let title = 'Informasi';
      let type = 'info';
      
      const lower = String(message).toLowerCase();
      if (lower.includes('berhasil') || lower.includes('sukses') || lower.includes('saved successfully') || lower.includes('success')) {
        title = 'Sukses';
        type = 'success';
      } else if (lower.includes('gagal') || lower.includes('error') || lower.includes('kesalahan') || lower.includes('denied') || lower.includes('tidak ada') || lower.includes('gantung') || lower.includes('failed')) {
        title = 'Gagal';
        type = 'error';
      }
      
      setGlobalDialog({
        isOpen: true,
        message: String(message),
        title: title,
        dialogType: type
      });
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <ToastContainer theme="dark" position="top-right" autoClose={3000} />
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/portal" element={<CustomerPortal />} />
        <Route path="/print" element={<PrintPage />} />
        
        {/* APP ROUTES */}
        <Route path="/*" element={!user ? <Login onLogin={setUser} appSettings={appSettings} /> : (
          <div className="app-container">
            
            {/* Mobile Header */}
            <div className="mobile-header">
              <div className="sidebar-logo" style={{ marginBottom: 0, padding: 0, color: 'white', fontWeight: '900', letterSpacing: '-0.5px' }}>
                {appSettings?.hotspot_name || 'RadiusBill'}
              </div>
              <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                {isSidebarOpen ? '✕' : '☰'}
              </button>
            </div>

            <div className={`sidebar-wrapper ${isSidebarOpen ? 'open' : ''}`}>
              <Sidebar onLogout={handleLogout} user={user} appSettings={appSettings} />
            </div>

            {isSidebarOpen && (
              <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/vouchers" element={<Vouchers user={user} />} />
                <Route path="/voucher-online" element={<VoucherOnline user={user} />} />
                <Route path="/voucher-terjual" element={<VoucherTerjual user={user} />} />
                <Route path="/stock-voucher" element={<StockVoucher user={user} />} />
                <Route path="/rekap-voucher" element={<RekapVoucher user={user} />} />
                <Route path="/profiles" element={<Profiles user={user} />} />
                <Route path="/nas" element={<NasMikrotik user={user} />} />
                <Route path="/vendor/tripay" element={<TripayVendor user={user} />} />
                <Route path="/transaksi" element={<Transaksi user={user} />} />

                <Route path="/setting-tripay" element={<SettingTripayGlobal user={user} />} />
                <Route path="/template-voucher" element={<TemplateVoucher user={user} />} />
                <Route path="/admin-users" element={<AdminUsers user={user} />} />
                <Route path="/audit-trail" element={<AuditTrail user={user} />} />
                <Route path="/settings" element={<AppSettings user={user} />} />
                <Route path="/backup" element={<Backup user={user} />} />
                <Route path="/settings-telegram" element={<SettingTelegram user={user} />} />
                <Route path="/setting-midtrans" element={<SettingMidtrans user={user} />} />
                <Route path="/setting-duitku" element={<SettingDuitku user={user} />} />
                <Route path="/vpn-remote" element={<VpnRemote user={user} />} />
                <Route path="/online-store-hub" element={<OnlineStoreCenter user={user} />} />
                <Route path="/payment-bridge-center" element={<PaymentBridgeCenter user={user} />} />
                <Route path="/device-control" element={<DeviceControl user={user} />} />
                <Route path="/access-rules" element={<AccessRules user={user} />} />
                <Route path="/superadmin-users" element={<SuperadminUsers user={user} />} />
                <Route path="/reply-messages" element={<ReplyMessages user={user} />} />
                
                {/* PPPoE Management Routes */}
                <Route path="/pppoe/packages" element={<PppoePackages user={user} />} />
                <Route path="/pppoe/customers" element={<PppoeCustomers user={user} />} />
                <Route path="/pppoe/monitoring" element={<PppoeMonitoring user={user} />} />
                <Route path="/pppoe/billing/invoices" element={<PppoeInvoices user={user} />} />
                <Route path="/pppoe/billing/payments" element={<PppoePayments user={user} />} />
                <Route path="/pppoe/billing/cycles" element={<PppoeCycles user={user} />} />
                <Route path="/pppoe/billing/isolir-list" element={<PppoeIsolirList user={user} />} />
                <Route path="/pppoe/billing/settings" element={<PppoeBillingSettings user={user} />} />
                <Route path="/pppoe/billing/isolir-design" element={<PppoeIsolirDesign user={user} />} />
                <Route path="/mikrotik-script-template" element={<MikrotikScriptTemplate user={user} />} />


              </Routes>

              <footer style={{ 
                marginTop: '3rem', 
                padding: '1.5rem 0', 
                borderTop: '1px solid rgba(255,255,255,0.05)', 
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.75rem'
              }}>
                &copy; 2026 Radius Billing by Ridwan x KHP. All rights reserved.
              </footer>
            </main>
          </div>
        )} />
      </Routes>
      {globalDialog.isOpen && (
        <div 
          className="modal-overlay open" 
          onClick={() => setGlobalDialog(prev => ({ ...prev, isOpen: false }))} 
          style={{ 
            zIndex: 99999, 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(0, 0, 0, 0.75)', 
            backdropFilter: 'blur(8px)', 
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '380px', 
              width: '90%',
              borderRadius: '20px', 
              background: '#0f1011', 
              border: '1px solid #23252a', 
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              textAlign: 'center',
              animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '1.25rem' }}>
              <div style={{ 
                background: globalDialog.dialogType === 'error' ? 'rgba(239, 68, 68, 0.1)' : globalDialog.dialogType === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(94, 106, 210, 0.1)', 
                color: globalDialog.dialogType === 'error' ? '#ef4444' : globalDialog.dialogType === 'success' ? '#10b981' : '#5e6ad2', 
                padding: '12px', 
                borderRadius: '50%', 
                display: 'flex',
                border: '1px solid ' + (globalDialog.dialogType === 'error' ? 'rgba(239, 68, 68, 0.2)' : globalDialog.dialogType === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(94, 106, 210, 0.2)')
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '32px' }}>
                  {globalDialog.dialogType === 'error' ? 'error' : globalDialog.dialogType === 'success' ? 'check_circle' : 'info'}
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
                {globalDialog.title}
              </h3>
            </div>

            <p style={{ 
              color: '#d0d6e0', 
              fontSize: '0.95rem', 
              lineHeight: '1.6', 
              margin: '0 0 1.75rem 0',
              fontWeight: '500'
            }}>
              {globalDialog.message}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                style={{ 
                  padding: '10px 32px', 
                  fontSize: '0.9rem', 
                  background: globalDialog.dialogType === 'error' ? '#ef4444' : globalDialog.dialogType === 'success' ? '#10b981' : '#5e6ad2', 
                  borderColor: globalDialog.dialogType === 'error' ? '#ef4444' : globalDialog.dialogType === 'success' ? '#10b981' : '#5e6ad2', 
                  color: 'white', 
                  borderRadius: '50px',
                  fontWeight: '700',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setGlobalDialog(prev => ({ ...prev, isOpen: false }))}
                onMouseEnter={e => {
                  e.currentTarget.style.filter = 'brightness(1.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.filter = 'none';
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
};

export default App;
