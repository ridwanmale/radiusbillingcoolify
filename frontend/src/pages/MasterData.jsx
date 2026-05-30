import React, { useState, useEffect } from 'react';

const MasterData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOutlet, setFilterOutlet] = useState('All');
  const [filterProfile, setFilterProfile] = useState('All');

  const [uiConfig, setUiConfig] = useState({});
  const [tablePosition, setTablePosition] = useState('center');
  const host = window.location.hostname;

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/vouchers/master`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
      
      const configRes = await fetch(`/api/vouchers/ui-config`);
      const configData = await configRes.json();
      const configArray = Array.isArray(configData) ? configData : [];
      const configMap = configArray.reduce((acc, curr) => {
        if (curr.field_id) {
          acc[curr.field_id] = curr;
        }
        return acc;
      }, {});
      setUiConfig(configMap);
      
      const syncRes = await fetch(`/api/vouchers/ui-page-sync`);
      const syncData = await syncRes.json();
      const mySync = syncData.find(p => p.page_id === 'master_data');
      if (mySync) setTablePosition(mySync.table_position || 'center');
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.startsWith('0000')) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      
      return `${day}:${month}:${year} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return '-';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const outlets = ['All', ...new Set(data.map(v => v.outlet_name).filter(Boolean))];
  const profiles = ['All', ...new Set(data.map(v => v.profile).filter(Boolean))];

  const filteredData = data.filter(v => {
    const matchesSearch = v.voucher_code?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.print_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOutlet = filterOutlet === 'All' || v.outlet_name === filterOutlet;
    const matchesProfile = filterProfile === 'All' || v.profile === filterProfile;
    return matchesSearch && matchesOutlet && matchesProfile;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Master Data Voucher</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Keseragaman Penulisan & Pemantauan Data Terpadu</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>TOTAL VOUCHER</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#3b82f6' }}>{data.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>STOK AKTIF</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981' }}>{data.filter(v => v.voucher_status === 'Aktif').length}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>TERJUAL</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f59e0b' }}>{data.filter(v => v.voucher_status === 'Terjual').length}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>EXPIRED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ef4444' }}>{data.filter(v => v.voucher_status === 'Expired').length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Cari Voucher / Kode Print</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Masukkan kode..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Outlet</label>
            <select className="form-input" value={filterOutlet} onChange={(e) => setFilterOutlet(e.target.value)}>
              {outlets.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Profile</label>
            <select className="form-input" value={filterProfile} onChange={(e) => setFilterProfile(e.target.value)}>
              {profiles.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Master Table */}
      <div style={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 
          tablePosition === 'left' ? 'flex-start' : 
          tablePosition === 'right' ? 'flex-end' : 
          'center' 
      }}>
        <div className="glass-card" style={{ 
          padding: '0', 
          overflow: 'hidden',
          width: tablePosition === 'full' ? '100%' : 'auto',
          minWidth: tablePosition === 'full' ? '100%' : '800px',
          maxWidth: '100%'
        }}>
          <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
          <table className="data-table master-table">
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15, 23, 42, 0.95)' }}>
              <tr>
                {uiConfig.voucher_code?.is_visible !== 0 && <th style={{ minWidth: '150px' }}>{uiConfig.voucher_code?.display_label || 'KODE VOUCHER'}</th>}
                {uiConfig.password?.is_visible !== 0 && <th>{uiConfig.password?.display_label || 'PASSWORD'}</th>}
                {uiConfig.profile?.is_visible !== 0 && <th style={{ minWidth: '150px' }}>{uiConfig.profile?.display_label || 'PROFILE'}</th>}
                {uiConfig.shared_users?.is_visible !== 0 && <th>{uiConfig.shared_users?.display_label || 'SHARED'}</th>}
                {uiConfig.created_at?.is_visible !== 0 && <th style={{ minWidth: '150px' }}>{uiConfig.created_at?.display_label || 'TGL PEMBUATAN'}</th>}
                {uiConfig.outlet_name?.is_visible !== 0 && <th style={{ minWidth: '120px' }}>{uiConfig.outlet_name?.display_label || 'OUTLET'}</th>}
                {uiConfig.print_code?.is_visible !== 0 && <th>{uiConfig.print_code?.display_label || 'KODE PRINT'}</th>}
                {uiConfig.hpp?.is_visible !== 0 && <th style={{ minWidth: '100px' }}>{uiConfig.hpp?.display_label || 'HPP'}</th>}
                {uiConfig.komisi?.is_visible !== 0 && <th style={{ minWidth: '100px' }}>{uiConfig.komisi?.display_label || 'KOMISI'}</th>}
                {uiConfig.harga?.is_visible !== 0 && <th style={{ minWidth: '100px' }}>{uiConfig.harga?.display_label || 'HARGA'}</th>}
                {uiConfig.masa_aktif?.is_visible !== 0 && <th>{uiConfig.masa_aktif?.display_label || 'MASA AKTIF'}</th>}
                {uiConfig.activated_at?.is_visible !== 0 && <th style={{ minWidth: '150px' }}>{uiConfig.activated_at?.display_label || 'TGL AKTIF'}</th>}
                {uiConfig.expiration_date?.is_visible !== 0 && <th style={{ minWidth: '150px' }}>{uiConfig.expiration_date?.display_label || 'TGL EXPIRED'}</th>}
                {uiConfig.mac_status?.is_visible !== 0 && <th>{uiConfig.mac_status?.display_label || 'MAC STATUS'}</th>}
                {uiConfig.voucher_status?.is_visible !== 0 && <th>{uiConfig.voucher_status?.display_label || 'STATUS VOUCHER'}</th>}
                {uiConfig.selling_status?.is_visible !== 0 && <th>{uiConfig.selling_status?.display_label || 'STATUS SELLING'}</th>}
                {uiConfig.mikrotik_group?.is_visible !== 0 && <th style={{ minWidth: '150px' }}>{uiConfig.mikrotik_group?.display_label || 'GROUP MIKROTIK'}</th>}
                {uiConfig.rate_limit?.is_visible !== 0 && <th style={{ minWidth: '120px' }}>{uiConfig.rate_limit?.display_label || 'RATE LIMIT'}</th>}
                {uiConfig.router?.is_visible !== 0 && <th style={{ minWidth: '120px' }}>{uiConfig.router?.display_label || 'ROUTER'}</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="21" style={{ textAlign: 'center', padding: '3rem' }}>Memuat data master...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="21" style={{ textAlign: 'center', padding: '3rem' }}>Tidak ada data ditemukan.</td></tr>
              ) : (
                filteredData.map((v, i) => (
                  <tr key={i} className="hover-row">
                    {uiConfig.voucher_code?.is_visible !== 0 && <td><strong style={{ color: '#3b82f6' }}>{v.voucher_code}</strong></td>}
                    {uiConfig.password?.is_visible !== 0 && <td><code>{v.password}</code></td>}
                    {uiConfig.profile?.is_visible !== 0 && <td><span className="badge badge-info">{v.profile}</span></td>}
                    {uiConfig.shared_users?.is_visible !== 0 && <td style={{ textAlign: 'center' }}>{v.shared_users}</td>}
                    {uiConfig.created_at?.is_visible !== 0 && <td style={{ fontSize: '0.8rem' }}>{formatDate(v.created_at)}</td>}
                    {uiConfig.outlet_name?.is_visible !== 0 && <td>{v.outlet_name || '-'}</td>}
                    {uiConfig.print_code?.is_visible !== 0 && <td style={{ fontSize: '0.8rem', opacity: 0.7 }}>{v.print_code || '-'}</td>}
                    {uiConfig.hpp?.is_visible !== 0 && <td>{formatCurrency(v.hpp)}</td>}
                    {uiConfig.komisi?.is_visible !== 0 && <td>{formatCurrency(v.komisi)}</td>}
                    {uiConfig.harga?.is_visible !== 0 && <td style={{ fontWeight: '700' }}>{formatCurrency(v.harga)}</td>}
                    {uiConfig.masa_aktif?.is_visible !== 0 && <td style={{ whiteSpace: 'nowrap' }}>{v.masa_aktif} {v.masa_aktif_satuan}</td>}
                    {uiConfig.activated_at?.is_visible !== 0 && <td style={{ fontSize: '0.8rem' }}>{formatDate(v.activated_at)}</td>}
                    {uiConfig.expiration_date?.is_visible !== 0 && <td style={{ fontSize: '0.8rem' }}>{formatDate(v.expiration_date)}</td>}
                    {uiConfig.mac_status?.is_visible !== 0 && (
                      <td>
                        <span className={`badge ${v.mac_status === 'LOCKED' ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                          {v.mac_status}
                        </span>
                      </td>
                    )}
                    {uiConfig.voucher_status?.is_visible !== 0 && (
                      <td>
                        <span className={`badge ${
                          v.voucher_status === 'Aktif' ? 'badge-info' : 
                          v.voucher_status === 'Expired' ? 'badge-danger' : 'badge-success'
                        }`}>
                          {v.voucher_status?.toUpperCase()}
                        </span>
                      </td>
                    )}
                    {uiConfig.selling_status?.is_visible !== 0 && (
                      <td>
                        <span className={`badge ${v.sold_at ? 'badge-warning' : 'badge-info'}`}>
                          {v.sold_at ? 'TERJUAL' : 'STOK'}
                        </span>
                      </td>
                    )}
                    {uiConfig.mikrotik_group?.is_visible !== 0 && <td>{v.mikrotik_group || '-'}</td>}
                    {uiConfig.rate_limit?.is_visible !== 0 && <td style={{ fontWeight: '600', color: '#10b981' }}>{v.rate_limit || '-'}</td>}
                    {uiConfig.router?.is_visible !== 0 && <td style={{ fontWeight: '600', color: '#f59e0b' }}>{v.router || '-'}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <style dangerouslySetInnerHTML={{ __html: `
        .master-table th {
          font-size: 0.7rem !important;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .master-table td {
          font-size: 0.85rem !important;
          padding: 0.75rem 1rem !important;
        }
        .hover-row:hover {
          background: rgba(255,255,255,0.03) !important;
        }
        .badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }
      `}} />
    </div>
  );
};

export default MasterData;
