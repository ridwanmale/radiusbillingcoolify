import re

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add state variable
if 'const [isSecurityModalOpen' not in c:
    c = c.replace("const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);", 
                  "const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);\n  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);")

# 2. Extract the security settings blocks
# The settings blocks are between <h3 ... Keamanan & Anti Spam </h3> and <h4 ... Daftar Perangkat Terblokir</h4>
pattern_settings = r'(<div style=\{\{ display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: \'20px\', marginBottom: \'20px\' \}\}>.*?</div>\s*<div style=\{\{ display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: \'20px\', marginBottom: \'30px\' \}\}>.*?</div>)'

match_settings = re.search(pattern_settings, c, re.DOTALL)
if match_settings:
    extracted_settings = match_settings.group(1)
    
    # Replace the settings with the button
    btn_html = '''<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <button type="button" onClick={() => setIsSecurityModalOpen(true)} className="btn-primary-premium" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '10px 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>settings</span>
                      Pengaturan Keamanan
                    </button>
                  </div>'''
    c = c.replace(extracted_settings, btn_html)
    
    # 3. Create the Modal
    # We will inject it right before <style dangerouslySetInnerHTML
    modal_html = f'''      {{/* MODAL KEAMANAN */}}
      {{isSecurityModalOpen && (
        <div style={{{{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}}}>
          <div className="glass-card fade-in" style={{{{ width: '100%', maxWidth: '600px', padding: '25px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.1)' }}}}>
            <h3 style={{{{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}}}>
              <span className="material-symbols-rounded" style={{{{ color: '#ef4444' }}}}>shield</span>
              Pengaturan Keamanan & Anti Spam
            </h3>
            
            {extracted_settings}
            
            <div style={{{{ display: 'flex', gap: '10px', marginTop: '10px' }}}}>
              <button type="button" onClick={{() => setIsSecurityModalOpen(false)}} style={{{{ flex: 1, padding: '12px', background: '#38bdf8', color: '#0a0a0c', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' }}}}>Terapkan & Tutup</button>
            </div>
            <p style={{{{ fontSize: '0.75rem', color: '#64748b', marginTop: '15px', textAlign: 'center' }}}}>* Pastikan menekan tombol "Simpan Konfigurasi" di bagian bawah untuk menyimpan permanen.</p>
          </div>
        </div>
      )}}
'''
    c = c.replace('<style dangerouslySetInnerHTML', modal_html + '\n        <style dangerouslySetInnerHTML')
    
    with open('frontend/src/pages/OnlineStoreCenter.jsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print("UI refactored successfully.")
else:
    print("Could not match the settings block.")

