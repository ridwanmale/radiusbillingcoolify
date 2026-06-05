import re

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_block = """
              <div className="form-group" style={{ marginBottom: '20px', padding: '15px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                <label style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: '800', marginBottom: '12px', display: 'block' }}>Metode Pembayaran Khusus PPPoE (Isolir)</label>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '-5px', marginBottom: '15px' }}>Aktifkan gateway yang bisa digunakan pelanggan rumahan untuk membayar tagihan bulanan.</p>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'pppoe_enable_payment_bridge', label: 'Payment Bridge', icon: 'account_balance_wallet', color: '#38bdf8' },
                    { id: 'pppoe_enable_midtrans', label: 'Midtrans', icon: 'account_balance', color: '#10b981' },
                    { id: 'pppoe_enable_duitku', label: 'Duitku', icon: 'payments', color: '#f59e0b' },
                    { id: 'pppoe_enable_tripay', label: 'Tripay', icon: 'credit_card', color: '#ec4899' }
                  ].map(method => {
                    const isEnabled = settings[method.id] === 1 || settings[method.id] === true || (settings[method.id] === undefined && settings[method.id.replace('pppoe_', '')]);
                    return (
                    <div 
                      key={method.id}
                      onClick={() => setSettings({...settings, [method.id]: isEnabled ? 0 : 1})}
                      style={{ 
                        flex: 1,
                        minWidth: '140px',
                        padding: '12px',
                        borderRadius: '12px',
                        background: isEnabled ? `${method.color}11` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isEnabled ? method.color : 'rgba(255,255,255,0.1)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ color: isEnabled ? method.color : '#64748b', fontSize: '20px' }}>{method.icon}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: isEnabled ? 'white' : '#94a3b8' }}>{method.label}</span>
                    </div>
                  )})}
                </div>
              </div>
"""

snippet_to_find = """
                    </div>
                  ))}
                </div>
              </div>"""

content = content.replace(snippet_to_find, snippet_to_find + "\n" + new_block)

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated OnlineStoreCenter.jsx")
