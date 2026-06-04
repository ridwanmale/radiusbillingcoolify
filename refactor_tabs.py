import re

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Add activeTab state if not present (it is present, so this won't do anything)
if "const [activeTab, setActiveTab] = useState('pengaturan');" not in c:
    c = c.replace("const [isSaving, setIsSaving] = useState(false);", "const [activeTab, setActiveTab] = useState('pengaturan');\n  const [isSaving, setIsSaving] = useState(false);")

# Add Tabs UI before SETTINGS CONTENT
tabs_ui = """      {/* TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', width: 'fit-content' }}>
        {[
          { id: 'pengaturan', label: 'Pengaturan Portal', icon: 'settings' },
          { id: 'keamanan', label: 'Keamanan & Anti Spam', icon: 'shield' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '12px',
              background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === tab.id ? '#38bdf8' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* SETTINGS CONTENT */}"""

if "{/* TAB NAVIGATION */}" not in c:
    c = c.replace("{/* SETTINGS CONTENT */}", tabs_ui)

# Update the main grid container to toggle display
old_grid = "<div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '25px' }}>"
new_grid = "<div style={{ display: activeTab === 'pengaturan' ? 'grid' : 'none', gridTemplateColumns: '1.5fr 1fr', gap: '25px' }}>"
c = c.replace(old_grid, new_grid)

# Remove the broken jsx fragments {activeTab === 'keamanan' && (<> and </>)}
c = c.replace("{activeTab === 'keamanan' && (<>", "<div style={{ display: activeTab === 'keamanan' ? 'block' : 'none' }}>")
c = c.replace("</>)}", "</div>")

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
