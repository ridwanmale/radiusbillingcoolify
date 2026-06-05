import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'react-toastify';

const TemplateVoucher = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null); // null means "creating new"
  const [template, setTemplate] = useState({
    template_name: '',
    header_html: '',
    row_html: '',
    footer_html: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const [activeRightTab, setActiveRightTab] = useState('preview');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const triggerConfirm = (message, onConfirm) => setConfirmModal({ isOpen: true, message, onConfirm });

  const getPreviewHtml = () => {
    const mockData = {
      '#username#': 'VIP-ARMRADIUS',
      '#password#': '827489',
      '#profile#': 'Paket Gold 3 Hari',
      '#harga#': 'Rp 5.000',
      '#aktif#': '3 Hari',
      '#durasi#': '3 Hari',
      '#kuota#': 'Unlimited',
      '#color#': '#6366f1',
      '#dns#': 'hotspot.net',
      '#hsname#': 'ARMRADIUS NET',
      '#printdate#': new Date().toLocaleDateString('id-ID'),
      '#printtime#': new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      '#mitra#': 'Mitra Ridwan',
      '#outlet#': 'Outlet Utama',
      '#nomor#': '1',
      '#logo#': '<span style="font-weight:900;color:#2563eb;">⚡ ARMRADIUS</span>',
      '#kode#': 'BATCH-938',
      '#mitraphone#': '0812-3456-7890',
      '#csphone#': '0899-8888-7777'
    };

    let rowRendered = template.row_html || '';
    Object.keys(mockData).forEach(key => {
      rowRendered = rowRendered.split(key).join(mockData[key]);
    });

    let multipleRows = rowRendered;
    let rowRendered2 = template.row_html || '';
    const mockData2 = { ...mockData, '#username#': 'VIP-FIGHTER', '#password#': '193850', '#harga#': 'Rp 10.000', '#aktif#': '7 Hari', '#nomor#': '2' };
    Object.keys(mockData2).forEach(key => {
      rowRendered2 = rowRendered2.split(key).join(mockData2[key]);
    });
    multipleRows += '\\n' + rowRendered2;

    return `${template.header_html || ''}${multipleRows}${template.footer_html || ''}`;
  };

  const fetchTemplates = async () => {
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/settings/templates`);
      const data = await res.json();
      setTemplates(data);
      
      // Default to first template if nothing selected and not in "new mode"
      if (data.length > 0 && selectedId === null && template.template_name === '') {
        setSelectedId(data[0].id);
        setTemplate(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSelect = (id) => {
    const t = templates.find(item => item.id === id);
    if (t) {
      setSelectedId(id);
      setTemplate(t);
    }
  };

  const handleSave = async () => {
    if (!template.template_name) {
      alert('Nama template harus diisi!');
      return;
    }

    setIsSaving(true);
    
    try {
      const host = window.location.hostname;
      const isNew = selectedId === null;
      const url = isNew 
        ? `/api/settings/templates` 
        : `/api/settings/templates/${selectedId}`;
      
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_name: template.template_name,
          header_html: template.header_html,
          row_html: template.row_html,
          footer_html: template.footer_html
        })
      });
      
      const result = await res.json();
      
      if (res.ok) {
        toast.success(isNew ? 'Template baru berhasil ditambahkan!' : 'Perubahan berhasil disimpan!');
        
        if (isNew) {
          setSelectedId(result.id);
        }
        
        await fetchTemplates();
      } else {
        throw new Error(result.error || 'Gagal menyimpan template');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNew = () => {
    setSelectedId(null);
    setTemplate({
      template_name: '',
      header_html: '',
      row_html: '',
      footer_html: ''
    });
  };

  const handleDelete = async (id) => {
    if (templates.length <= 1) {
      alert('Minimal harus ada 1 template!');
      return;
    }
    triggerConfirm('Yakin ingin menghapus template ini?', async () => {

      try {
        const host = window.location.hostname;
        const res = await fetch(`/api/settings/templates/${id}`, { method: 'DELETE' });
        if (res.ok) {
          if (selectedId === id) {
            setSelectedId(null);
            handleNew();
          }
          fetchTemplates();
        }
      } catch (err) {
        console.error(err);
      }
      });
  };

  const handleReset = () => {
    triggerConfirm('Apakah Anda yakin ingin mengisi area kerja dengan desain default?', async () => {
      setTemplate({
        ...template,
        header_html: '<html><head><style>body{font-family:sans-serif;margin:0;padding:0;} .voucher-container{display:flex;flex-wrap:wrap;gap:10px;padding:20px;}</style></head><body><div class="voucher-container">',
        row_html: '<div style="border:1px solid #333;padding:15px;margin:5px;width:220px;border-radius:10px;background:#fff;text-align:center;box-shadow:2px 2px 5px rgba(0,0,0,0.1);">\n  <h2 style="margin:0;color:#2563eb;">#hsname#</h2>\n  <div style="font-size:0.8rem;margin-bottom:10px;">#dns#</div>\n  <div style="background:#f1f5f9;padding:10px;border-radius:5px;margin-bottom:10px;">\n    <div style="font-size:0.7rem;text-transform:uppercase;">Username</div>\n    <div style="font-size:1.4rem;font-weight:900;color:#1e293b;">#username#</div>\n    <div style="font-size:0.7rem;text-transform:uppercase;margin-top:5px;">Password</div>\n    <div style="font-size:1.1rem;font-weight:700;">#password#</div>\n  </div>\n  <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:0.9rem;">\n    <span>#harga#</span>\n    <span style="color:#10b981;">#aktif#</span>\n  </div>\n</div>',
        footer_html: '</div></body></html>'
      });
    });
  };

  const parameters = [
    { code: '#username#', label: 'Username' },
    { code: '#password#', label: 'Password' },
    { code: '#profile#', label: 'Profile' },
    { code: '#harga#', label: 'Harga jual' },
    { code: '#aktif#', label: 'Masa aktif' },
    { code: '#durasi#', label: 'Durasi' },
    { code: '#kuota#', label: 'Kuota' },
    { code: '#color#', label: 'Warna voucher' },
    { code: '#dns#', label: 'DNS Name' },
    { code: '#hsname#', label: 'Nama hotspot' },
    { code: '#printdate#', label: 'Tanggal cetak' },
    { code: '#printtime#', label: 'Jam cetak' },
    { code: '#mitra#', label: 'Nama mitra' },
    { code: '#outlet#', label: 'Nama outlet' },
    { code: '#nomor#', label: 'Nomor urut' },
    { code: '#logo#', label: 'Logo voucher' },
    { code: '#kode#', label: 'Nomor Kode pembuatan' },
    { code: '#mitraphone#', label: 'Nomor HP mitra' },
    { code: '#csphone#', label: 'Nomor HP CS' }
  ];

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .btn-glass-premium {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50px;
          color: white;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .btn-glass-premium:hover {
          transform: translateY(-2px);
        }
        
        .btn-green {
          color: #10b981 !important;
          border-color: rgba(16, 185, 129, 0.2) !important;
        }

        .btn-green:hover {
          border-color: #10b981 !important;
          background: rgba(16, 185, 129, 0.15) !important;
          color: #10b981 !important;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2);
        }

        .btn-blue {
          color: #3b82f6 !important;
          border-color: rgba(59, 130, 246, 0.2) !important;
        }

        .btn-blue:hover {
          border-color: #3b82f6 !important;
          background: rgba(59, 130, 246, 0.15) !important;
          color: #3b82f6 !important;
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);
        }

        .btn-glass-premium:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      `}</style>
      
      {/* HEADER SECTION */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 className="page-title">Design Template Voucher</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Kustomisasi desain cetak voucher Anda</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn-glass-premium btn-blue" 
            onClick={handleSave} 
            disabled={isSaving} 
          >
            {isSaving ? (
              <span className="material-symbols-rounded spinning" style={{ fontSize: '20px' }}>refresh</span>
            ) : (
              <span className="material-symbols-rounded" style={{ color: '#10b981', fontSize: '20px' }}>save</span>
            )}
            {isSaving ? 'MENYIMPAN...' : selectedId ? 'SIMPAN' : 'TAMBAH TEMPLATE'}
          </button>
          <button 
            className="btn-glass-premium btn-green" 
            onClick={handleNew} 
          >
            <span className="material-symbols-rounded" style={{ color: '#10b981' }}>add_circle</span> TAMBAH TEMPLATE BARU
          </button>
        </div>
      </div>



      {/* TOP SECTION: LIST TEMPLATES */}
      <div className="glass-card" style={{ padding: '0.75rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.7, marginRight: '0.5rem' }}>DAFTAR TEMPLATE:</span>
        {templates.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button 
              onClick={() => handleSelect(t.id)}
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '6px', 
                background: selectedId === t.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', 
                border: '1px solid ' + (selectedId === t.id ? 'var(--accent-primary)' : 'var(--border-color)'),
                color: selectedId === t.id ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: selectedId === t.id ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {t.template_name}
            </button>
            {selectedId === t.id && (
              <button className="btn-glass-delete" 
                onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} 
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: 'none', 
                  color: '#ef4444', 
                  cursor: 'pointer', 
                  borderRadius: '4px', 
                  padding: '0.3rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span className="material-symbols-rounded" style={{ color: '#ef4444', fontSize: '18px' }}>delete</span>
              </button>
            )}
          </div>
        ))}
        {templates.length === 0 && <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Belum ada template.</span>}
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        
        {/* LEFT: EDITOR SECTION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '5px' }}>
          
          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>NAMA TEMPLATE {selectedId === null && <span style={{ color: 'var(--success)', fontSize: '0.7rem', marginLeft: '5px' }}>(BARU)</span>}</h3>
            </div>
            <input 
              type="text" 
              className="form-input" 
              value={template.template_name} 
              onChange={(e) => setTemplate({ ...template, template_name: e.target.value })}
              placeholder="Masukkan nama desain (Contoh: Member Gold)"
            />
          </div>

          <div className="glass-card">
            <h3 style={{ marginTop: 0, fontSize: '0.85rem', opacity: 0.7 }}>HEADER HTML</h3>
            <textarea 
              value={template.header_html}
              onChange={(e) => setTemplate({ ...template, header_html: e.target.value })}
              style={{ width: '100%', height: '80px', background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
          </div>

          <div className="glass-card" style={{ border: '1px solid var(--accent-primary)' }}>
            <h3 style={{ marginTop: 0, fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>ROW ITEM HTML (VOUCHER)</h3>
            <textarea 
              value={template.row_html}
              onChange={(e) => setTemplate({ ...template, row_html: e.target.value })}
              style={{ width: '100%', height: '300px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '8px', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </div>

          <div className="glass-card">
            <h3 style={{ marginTop: 0, fontSize: '0.85rem', opacity: 0.7 }}>FOOTER HTML</h3>
            <textarea 
              value={template.footer_html}
              onChange={(e) => setTemplate({ ...template, footer_html: e.target.value })}
              style={{ width: '100%', height: '80px', background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', paddingBottom: '1.5rem', marginTop: '1rem' }}>
            <button 
              className="btn" 
              onClick={handleReset} 
              style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                color: '#818cf8', 
                border: '1px solid rgba(129, 140, 248, 0.2)', 
                borderRadius: '50px', 
                padding: '0.6rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                width: '100%'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(129, 140, 248, 0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>auto_fix_high</span>
              ISI DESAIN DEFAULT
            </button>
          </div>
        </div>

        {/* RIGHT: TABS PANEL (LIVE PREVIEW & PARAMETERS) */}
        <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: '1rem' }}>
          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => setActiveRightTab('preview')}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '6px',
                background: activeRightTab === 'preview' ? 'var(--accent-primary)' : 'transparent',
                border: 'none',
                color: activeRightTab === 'preview' ? 'white' : 'var(--text-secondary)',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)', fontSize: '18px' }}>visibility</span>
              LIVE PREVIEW
            </button>
            <button
              onClick={() => setActiveRightTab('parameters')}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '6px',
                background: activeRightTab === 'parameters' ? 'var(--accent-primary)' : 'transparent',
                border: 'none',
                color: activeRightTab === 'parameters' ? 'white' : 'var(--text-secondary)',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>code</span>
              PARAMETERS
            </button>
          </div>

          {activeRightTab === 'preview' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Simulasi Tampilan Kertas:</span>
                <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>2 Voucher Demo</span>
              </div>
              <iframe
                srcDoc={getPreviewHtml()}
                style={{
                  width: '100%',
                  flex: 1,
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '8px',
                  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)'
                }}
                title="Voucher Live Preview"
                sandbox="allow-scripts"
              />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', marginTop: 0 }}>Copy kode di bawah untuk memasukkan variabel dinamis ke desain Anda:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                {parameters.map((p, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '4px' }}>
                    <code style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{p.code}</code>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};

export default TemplateVoucher;
