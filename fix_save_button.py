import re

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Wrap the main submit button
old_submit = '''<button type="submit" disabled={isSaving} className="btn-success-premium" style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '1rem', fontWeight: '800' }}>
                {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>'''
new_submit = '''{activeTab === 'pengaturan' && (
                <button type="submit" disabled={isSaving} className="btn-success-premium" style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '1rem', fontWeight: '800' }}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              )}'''
if old_submit in c:
    c = c.replace(old_submit, new_submit)

# 2. Update the Security Modal to actually save
old_modal_footer = '''<div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setIsSecurityModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#38bdf8', color: '#0a0a0c', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' }}>Terapkan & Tutup</button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '15px', textAlign: 'center' }}>* Pastikan menekan tombol "Simpan Konfigurasi" di bagian bawah layar utama untuk menyimpan permanen.</p>'''

new_modal_footer = '''<div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setIsSecurityModalOpen(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>Batal</button>
              <button type="button" onClick={(e) => { setIsSecurityModalOpen(false); handleSaveSettings(e); }} style={{ flex: 1, padding: '12px', background: '#38bdf8', color: '#0a0a0c', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' }}>Simpan Pengaturan</button>
            </div>'''

if old_modal_footer in c:
    c = c.replace(old_modal_footer, new_modal_footer)

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
print("Fix applied")
