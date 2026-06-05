import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'react-toastify';

const MikrotikScriptTemplate = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });

  const [formData, setFormData] = useState({
    name: '',
    ros_version: 'v7',
    script_content: '',
    parameters: '',
    description: ''
  });

  // Linear Design Tokens (Canonical values from DESIGN.md)
  const tokens = {
    canvas: "#010102",
    surface1: "#0f1011",
    surface2: "#141516",
    surface3: "#18191a",
    surface4: "#191a1b",
    primary: "#5e6ad2",
    primaryHover: "#828fff",
    primaryFocus: "#5e69d1",
    hairline: "#23252a",
    hairlineStrong: "#34343a",
    hairlineTertiary: "#3e3e44",
    ink: "#f7f8f8",
    inkMuted: "#d0d6e0",
    inkSubtle: "#8a8f98",
    inkTertiary: "#62666d",
    success: "#27a644",
    roundedXs: "4px",
    roundedSm: "6px",
    roundedMd: "8px",
    roundedLg: "12px",
    roundedXl: "16px"
  };

  const parameters = [
    { code: '#nasname#', label: 'IP Address / Nasname' },
    { code: '#shortname#', label: 'Router Name' },
    { code: '#secret#', label: 'Radius Secret' },
    { code: '#auth_port#', label: 'Auth Port (1812)' },
    { code: '#acct_port#', label: 'Acct Port (1813)' },
    { code: '#vpn_user#', label: 'VPN Username' },
    { code: '#vpn_pass#', label: 'VPN Password' },
    { code: '#vpn_psk#', label: 'VPN L2TP PSK' },
    { code: '#server_ip#', label: 'Billing Server IP' },
    { code: '#vpn_local_ip#', label: 'VPN Local Gateway IP' }
  ];

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/mikrotik-scripts');
      const data = await res.json();
      setTemplates(data);
      if (data.length > 0 && selectedId === null) {
        handleSelect(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSelect = (t) => {
    setSelectedId(t.id);
    setFormData({
      name: t.name,
      ros_version: t.ros_version,
      script_content: t.script_content,
      parameters: t.parameters || '',
      description: t.description || ''
    });
  };

  const handleNew = () => {
    setSelectedId(null);
    setFormData({
      name: '',
      ros_version: 'v7',
      script_content: '',
      parameters: '',
      description: ''
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.script_content) {
      toast.error('Nama dan isi script harus diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const method = selectedId ? 'PUT' : 'POST';
      const url = selectedId ? `/api/mikrotik-scripts/${selectedId}` : '/api/mikrotik-scripts';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success('Template berhasil disimpan!');
        fetchTemplates();
        if (!selectedId) {
            const data = await res.json();
            setSelectedId(data.id);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || 'Gagal menyimpan template');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    if (!formData.script_content) {
      toast.warn('Isi script masih kosong!');
      return;
    }
    const blob = new Blob([formData.script_content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      message: 'Yakin ingin menghapus template ini?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/mikrotik-scripts/${id}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success('Template berhasil dihapus');
            handleNew();
            fetchTemplates();
          }
        } catch (err) {
          toast.error('Gagal menghapus template');
        }
        setConfirmModal({ ...confirmModal, isOpen: false });
      }
    });
  };

  return (
    <div className="page-container" style={{ 
      animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)', 
      background: tokens.canvas, 
      color: tokens.ink,
      minHeight: '100vh',
      padding: '48px'
    }}>
      {/* HEADER SECTION */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '48px',
        borderBottom: `1px solid ${tokens.hairline}`,
        paddingBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '16px', 
            background: tokens.surface1,
            border: `1px solid ${tokens.hairlineStrong}`,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            <span className="material-symbols-rounded" style={{ color: tokens.primary, fontSize: '32px' }}>terminal</span>
          </div>
          <div>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: '500', 
              margin: 0, 
              letterSpacing: '-1.2px',
              color: tokens.ink,
              lineHeight: 1.1
            }}>Script Studio</h1>
            <p style={{ margin: '8px 0 0 0', color: tokens.inkSubtle, fontSize: '1rem', letterSpacing: '-0.2px' }}>
              Design technical Mikrotik ROS 6 & 7 scripts with dynamic variables
            </p>
          </div>
        </div>
        <button 
          className="btn-primary" 
          onClick={handleNew} 
          style={{ 
            gap: '8px', 
            background: tokens.primary,
            borderRadius: tokens.roundedMd,
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 0 1px ${tokens.primaryHover}20, 0 4px 12px rgba(94, 106, 210, 0.2)`
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = tokens.primaryHover;
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = tokens.primary;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span className="material-symbols-rounded" style={{ color: '#10b981', fontSize: '20px' }}>add</span> New Template
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', height: 'calc(100vh - 280px)' }}>
        {/* MAIN AREA: DIRECTORY + EDITOR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', overflow: 'hidden' }}>
          
          {/* TOP PANEL: DIRECTORY (Moved & Updated) */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            background: tokens.surface1,
            borderRadius: tokens.roundedLg,
            border: `1px solid ${tokens.hairline}`,
            overflow: 'hidden',
            maxHeight: '180px'
          }}>
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: `1px solid ${tokens.hairline}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ 
                fontSize: '10px', 
                color: tokens.inkSubtle, 
                textTransform: 'uppercase', 
                letterSpacing: '0.8px',
                fontWeight: '600',
                margin: 0
              }}>Templates Directory</h3>
              <span style={{ fontSize: '10px', color: tokens.inkTertiary }}>{templates.length} saved scripts</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', display: 'flex', gap: '8px', flexWrap: 'wrap', alignContent: 'flex-start' }}>
              {templates.map(t => (
                <div 
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: tokens.roundedMd,
                    background: selectedId === t.id ? tokens.surface2 : 'transparent',
                    border: '1px solid',
                    borderColor: selectedId === t.id ? tokens.hairlineStrong : tokens.hairline,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '180px'
                  }}
                >
                  <div style={{ 
                    padding: '2px 8px', 
                    background: selectedId === t.id ? tokens.primary : tokens.surface4,
                    color: selectedId === t.id ? '#ffffff' : tokens.inkSubtle,
                    fontSize: '10px',
                    fontWeight: '600',
                    borderRadius: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    flexShrink: 0
                  }}>
                    {t.ros_version}
                  </div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ 
                      fontWeight: '500', 
                      fontSize: '13px', 
                      color: selectedId === t.id ? tokens.ink : tokens.inkMuted,
                      whiteSpace: 'nowrap', 
                      textOverflow: 'ellipsis', 
                      overflow: 'hidden' 
                    }}>{t.name}</div>
                  </div>
                  {selectedId === t.id && (
                    <button className="btn-glass-delete" 
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                      style={{ background: 'transparent', border: 'none', color: tokens.inkSubtle, cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '4px' }}
                      onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseOut={e => e.currentTarget.style.color = tokens.inkSubtle}
                    >
                      <span className="material-symbols-rounded" style={{ color: '#ef4444', fontSize: '16px' }}>delete</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        {/* CENTER PANEL: EDITOR CORE */}
        <div style={{ 
          display: 'flex', flex: 1, 
          flexDirection: 'column',
          background: tokens.surface1,
          borderRadius: tokens.roundedLg,
          border: `1px solid ${tokens.hairline}`,
          position: 'relative'
        }}>
          {/* Editor Header */}
          <div style={{ 
            padding: '1.25rem 1.5rem', 
            borderBottom: `1px solid ${tokens.hairline}`,
            display: 'grid',
            gridTemplateColumns: '1fr 160px',
            gap: '1.5rem',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ fontSize: '11px', color: tokens.inkSubtle, textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Template Identity</label>
              <input 
                type="text" 
                style={{ 
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: tokens.ink,
                  fontSize: '1.25rem',
                  fontWeight: '500',
                  outline: 'none',
                  padding: 0,
                  letterSpacing: '-0.2px'
                }}
                placeholder="Name your template..." 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: tokens.inkSubtle, textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>RouterOS</label>
              <select 
                style={{ 
                  width: '100%',
                  background: tokens.surface2,
                  border: `1px solid ${tokens.hairlineStrong}`,
                  borderRadius: tokens.roundedMd,
                  padding: '6px 12px',
                  color: tokens.ink,
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                value={formData.ros_version}
                onChange={e => setFormData({...formData, ros_version: e.target.value})}
              >
                <option value="v7">Version 7.x</option>
                <option value="v6">Version 6.x</option>
                <option value="v6/v7">Universal</option>
              </select>
            </div>
          </div>

          {/* Script Area */}
          <div style={{ flex: 1, padding: '1.5rem', position: 'relative' }}>
            <textarea 
              style={{ 
                width: '100%',
                height: '100%',
                background: 'transparent',
                border: 'none',
                color: tokens.ink,
                fontSize: '13px',
                fontFamily: '"SF Mono", "Fira Code", monospace',
                resize: 'none',
                lineHeight: '1.7',
                outline: 'none'
              }}
              placeholder="# Enter Mikrotik terminal commands here..."
              value={formData.script_content}
              onChange={e => setFormData({...formData, script_content: e.target.value})}
            ></textarea>
          </div>

          {/* Footer Metadata & Actions */}
          <div style={{ 
            padding: '1.25rem 1.5rem', 
            borderTop: `1px solid ${tokens.hairline}`,
            background: 'rgba(0,0,0,0.2)'
          }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '11px', color: tokens.inkSubtle, textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Internal Documentation</label>
              <input 
                type="text" 
                style={{ 
                  width: '100%',
                  background: tokens.surface2,
                  border: `1px solid ${tokens.hairlineStrong}`,
                  borderRadius: tokens.roundedMd,
                  padding: '8px 14px',
                  color: tokens.inkMuted,
                  fontSize: '13px',
                  outline: 'none'
                }}
                placeholder="What does this script accomplish?" 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={handlePreview}
                style={{ 
                  background: tokens.surface2,
                  borderRadius: tokens.roundedMd,
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: '500',
                  border: `1px solid ${tokens.hairlineStrong}`,
                  color: tokens.ink,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={e => e.currentTarget.style.background = tokens.surface3}
                onMouseOut={e => e.currentTarget.style.background = tokens.surface2}
              >
                <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)', fontSize: '18px' }}>visibility</span>
                Live Preview
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                style={{ 
                  background: tokens.primary,
                  borderRadius: tokens.roundedMd,
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: '500',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: isSaving ? 0.6 : 1
                }}
                onMouseOver={e => { if(!isSaving) e.currentTarget.style.background = tokens.primaryHover }}
                onMouseOut={e => { if(!isSaving) e.currentTarget.style.background = tokens.primary }}
              >
                {isSaving ? 'Synchronizing...' : (selectedId ? 'Update' : 'Save Template')}
              </button>
            </div>
          </div>
        </div>

        
        </div>{/* RIGHT PANEL: TECHNICAL PARAMETERS */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          background: tokens.surface1,
          borderRadius: tokens.roundedLg,
          border: `1px solid ${tokens.hairline}`,
          padding: '1.5rem'
        }}>
          <h3 style={{ 
            fontSize: '11px', 
            color: tokens.inkSubtle, 
            textTransform: 'uppercase', 
            letterSpacing: '0.8px',
            fontWeight: '500',
            marginBottom: '0.75rem'
          }}>Variables</h3>
          <p style={{ fontSize: '14px', color: tokens.inkSubtle, marginBottom: '24px', lineHeight: '1.5' }}>
            Inject dynamic parameters into your script. Resolved per Router during deployment.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            {parameters.map((p, i) => (
              <div 
                key={i} 
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    script_content: prev.script_content + p.code
                  }));
                }}
                style={{ 
                  padding: '12px 14px', 
                  borderRadius: tokens.roundedMd, 
                  background: tokens.surface2, 
                  border: `1px solid ${tokens.hairlineStrong}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => { 
                  e.currentTarget.style.borderColor = tokens.primary; 
                  e.currentTarget.style.background = 'rgba(94, 106, 210, 0.05)'; 
                }}
                onMouseOut={e => { 
                  e.currentTarget.style.borderColor = tokens.hairlineStrong; 
                  e.currentTarget.style.background = tokens.surface2; 
                }}
              >
                <code style={{ color: tokens.primary, fontWeight: '500', fontSize: '13px', display: 'block', marginBottom: '4px' }}>{p.code}</code>
                <div style={{ fontSize: '11px', color: tokens.inkSubtle }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${tokens.hairlineStrong}; borderRadius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${tokens.inkSubtle}; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MikrotikScriptTemplate;

