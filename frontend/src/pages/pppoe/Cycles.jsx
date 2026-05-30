import React, { useState, useEffect } from 'react';

const PppoeCycles = () => {
  const [data, setData] = useState({ stats: [], customers: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchCycles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/pppoe-billing/cycles');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const filteredCustomers = activeTab === 'all' 
    ? data.customers 
    : data.customers.filter(c => c.billing_cycle_type === activeTab);

  const getCycleName = (type) => {
    const names = {
      'profile': 'Siklus Profile (Masa Aktif)',
      'fixed': 'Siklus Tetap (Tgl Pasang)',
      'monthly': 'Siklus Bulanan (Pascabayar)'
    };
    return names[type] || type;
  };

  return (
    <div className="page-pppoe">
      <div className="page-header">
        <div>
          <h1 className="page-title">Siklus Penagihan PPPoE</h1>
          <p className="page-subtitle">Manajemen metode penagihan dan jadwal isolir pelanggan.</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="glass-card stat-card" onClick={() => setActiveTab('all')} style={{ cursor: 'pointer', border: activeTab === 'all' ? '2px solid var(--accent-primary)' : '' }}>
          <div className="stat-label">Total Pelanggan</div>
          <div className="stat-value">{data.customers.length}</div>
        </div>
        {data.stats.map(s => (
          <div key={s.billing_cycle_type} className="glass-card stat-card" onClick={() => setActiveTab(s.billing_cycle_type)} style={{ cursor: 'pointer', border: activeTab === s.billing_cycle_type ? '2px solid var(--accent-primary)' : '' }}>
            <div className="stat-label">{getCycleName(s.billing_cycle_type)}</div>
            <div className="stat-value">{s.count}</div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Daftar Pelanggan - {activeTab.toUpperCase()}</h3>
          <div className="badge badge-info">{filteredCustomers.length} Record</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Pelanggan</th>
              <th>Username</th>
              <th>Paket</th>
              <th>Siklus</th>
              <th>Tgl Pasang</th>
              <th>Next Invoice</th>
              <th>Jatuh Tempo</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Memuat data...</td></tr>
            ) : filteredCustomers.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Tidak ada pelanggan dalam kategori ini</td></tr>
            ) : (
              filteredCustomers.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong><br/><small>{c.customer_code}</small></td>
                  <td><code>{c.pppoe_username}</code></td>
                  <td>{c.package_name}</td>
                  <td>
                    <span className="badge badge-outline" style={{ fontSize: '10px' }}>
                      {c.billing_cycle_type.toUpperCase()}
                    </span>
                  </td>
                  <td>{new Date(c.billing_start_date).toLocaleDateString('id-ID')}</td>
                  <td>{c.next_invoice_date ? new Date(c.next_invoice_date).toLocaleDateString('id-ID') : '-'}</td>
                  <td>
                    <strong style={{ color: '#ef4444' }}>
                      {c.next_isolir_date ? new Date(c.next_isolir_date).toLocaleDateString('id-ID') : '-'}
                    </strong>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .badge-outline {
          border: 1px solid rgba(255,255,255,0.2);
          background: transparent;
          color: rgba(255,255,255,0.7);
        }
        .stat-card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
};

export default PppoeCycles;
