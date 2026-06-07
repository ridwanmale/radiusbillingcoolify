import re

with open('frontend/src/pages/pppoe/IsolirDesign.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_preview = """            <div style={{
              background: '#0f172a',
              borderRadius: '20px',
              padding: '20px',
              minHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#1e293b',
                padding: '30px',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                maxWidth: '450px',
                width: '100%',
                textAlign: 'center',
                borderTop: `6px solid ${settings.accent_color || '#ef4444'}`,
                border: '1px solid rgba(255,255,255,0.05)',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: `${settings.accent_color || '#ef4444'}22`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 15px'
                }}>
                  <span className="material-symbols-rounded" style={{ color: settings.accent_color || '#ef4444', fontSize: '30px' }}>
                    wifi_off
                  </span>
                </div>
                
                <h1 style={{ color: 'white', fontSize: '20px', marginBottom: '8px', fontWeight: '800' }}>
                  {settings.redirect_message}
                </h1>
                
                <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>
                  {settings.custom_message}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                  <button 
                    disabled
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      padding: '12px',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: 0.8
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>payment</span>
                    Bayar Tagihan Sekarang
                  </button>

                  <button 
                    disabled
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      padding: '12px',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: 0.8
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>support_agent</span>
                    Hubungi CS / Admin
                  </button>
                </div>
                
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', marginTop: '20px' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                    {settings.redirect_footer}
                  </p>
                </div>
              </div>
            </div>"""

content = re.sub(r'<div style=\{\{\s*background: \'linear-gradient.*?</div>\s*</div>\s*</div>\s*</div>\s*</div>', new_preview, content, flags=re.DOTALL)

with open('frontend/src/pages/pppoe/IsolirDesign.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced Live Preview")
