import re

with open('frontend/src/pages/RekapVoucher.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add states
state_addition = '''  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');'''
content = content.replace("  const [searchQuery, setSearchQuery] = useState('');", state_addition)

# 2. Modify filteredList logic
old_filter_logic = '''  const filteredList = rekapList.filter(item => 
    item.kode_print?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.outlet_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.profile?.toLowerCase().includes(searchQuery.toLowerCase())
  );'''

new_filter_logic = '''  const filteredList = rekapList.filter(item => {
    const matchSearch = item.kode_print?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.outlet_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.profile?.toLowerCase().includes(searchQuery.toLowerCase());
                        
    let matchDate = true;
    let matchMonth = true;
    let matchYear = true;

    if (item.created_at && (filterDate || filterMonth || filterYear)) {
      const itemDate = new Date(item.created_at);
      if (filterDate) matchDate = itemDate.getDate().toString() === filterDate;
      if (filterMonth) matchMonth = (itemDate.getMonth() + 1).toString() === filterMonth;
      if (filterYear) matchYear = itemDate.getFullYear().toString() === filterYear;
    }

    return matchSearch && matchDate && matchMonth && matchYear;
  });'''
content = content.replace(old_filter_logic, new_filter_logic)

# 3. Modify UI
old_ui = '''          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Search:</span>
            <input 
              type="text" 
              placeholder="Kode, Outlet, Profile..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input"
              style={{ width: '250px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}
            />
          </div>'''

new_ui = '''          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} className="form-input" style={{ width: '90px', padding: '6px 8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
              <option value="" style={{ background: '#1e1b1e' }}>Tanggal</option>
              {[...Array(31)].map((_, i) => <option key={i+1} value={i+1} style={{ background: '#1e1b1e' }}>{i+1}</option>)}
            </select>

            <select value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }} className="form-input" style={{ width: '90px', padding: '6px 8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
              <option value="" style={{ background: '#1e1b1e' }}>Bulan</option>
              {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) => (
                <option key={i+1} value={i+1} style={{ background: '#1e1b1e' }}>{m}</option>
              ))}
            </select>

            <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }} className="form-input" style={{ width: '90px', padding: '6px 8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
              <option value="" style={{ background: '#1e1b1e' }}>Tahun</option>
              {[...Array(5)].map((_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y} style={{ background: '#1e1b1e' }}>{y}</option>; })}
            </select>

            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input"
              style={{ width: '150px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}
            />
          </div>'''
content = content.replace(old_ui, new_ui)

with open('frontend/src/pages/RekapVoucher.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Modification applied to RekapVoucher.jsx')
