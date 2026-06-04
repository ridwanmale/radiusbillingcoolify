import re

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add activeTab
c = c.replace("  const [isSaving, setIsSaving] = useState(false);", "  const [activeTab, setActiveTab] = useState('pengaturan');\n  const [isSaving, setIsSaving] = useState(false);")

# 2. Add Tabs UI
tabs = """        {/* TABS */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
          <button 
            type="button" onClick={() => setActiveTab('pengaturan')}
            style={{ 
              padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem',
              background: activeTab === 'pengaturan' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === 'pengaturan' ? '#fff' : '#94a3b8',
              border: 'none', transition: 'all 0.2s'
            }}
          >Pengaturan Portal</button>
          <button 
            type="button" onClick={() => setActiveTab('keamanan')}
            style={{ 
              padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem',
              background: activeTab === 'keamanan' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              color: activeTab === 'keamanan' ? '#ef4444' : '#94a3b8',
              border: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          ><span className="material-symbols-rounded" style={{ fontSize: '20px' }}>shield</span> Keamanan & Anti Spam</button>
        </div>
"""
c = c.replace("        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>", tabs + "\n        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>")

# 3. Wrap Pengaturan
c = c.replace("            <form onSubmit={handleSave}>\n              <div className=\"glass-card fade-in\" style={{ padding: '25px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px' }}>", 
              "            <form onSubmit={handleSave}>\n              {activeTab === 'pengaturan' && (\n              <div className=\"glass-card fade-in\" style={{ padding: '25px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px' }}>")

first_card_end = """                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '12px' }}>* Sistem akan menyuntikkan nominal otomatis. Jika ada lebih dari 1 QRIS, sistem akan merotasinya secara acak ke pembeli.</p>
              </div>"""
c = c.replace(first_card_end, first_card_end + "\n              )}")

# 4. Wrap Keamanan
keamanan_start = """              {/* SECTION: KEAMANAN & SPAM */}
              <div className="glass-card fade-in" style={{ padding: '25px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px' }}>"""
c = c.replace(keamanan_start, "              {activeTab === 'keamanan' && (\n" + keamanan_start)

keamanan_end = """                  </table>
                </div>
              </div>"""
c = c.replace(keamanan_end, keamanan_end + "\n              )}")

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
