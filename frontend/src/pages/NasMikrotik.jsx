
import React, { useEffect, useMemo, useState } from 'react';

const initialFormData = {
  nasname: '',
  shortname: '',
  secret: '',
  description: '',
  auth_port: 1812,
  acct_port: 1813,
  connection_mode: 'local_direct',
  vpn_protocol: 'l2tp'
};

const NasMikrotik = ({ user }) => {
  const [nasList, setNasList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [vpnSettings, setVpnSettings] = useState({ vpn_local_ip: '192.168.42.1' });

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedNasForScript, setSelectedNasForScript] = useState(null);
  const [selectedScriptProtocol, setSelectedScriptProtocol] = useState('l2tp');
  const [selectedScriptRos, setSelectedScriptRos] = useState('v7');
  const [selectedPatternTemplate, setSelectedPatternTemplate] = useState('');
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [scriptServerIp, setScriptServerIp] = useState('');

  const [selectedNasForServer, setSelectedNasForServer] = useState(null);
  const [serverList, setServerList] = useState([]);
  const [newServerName, setNewServerName] = useState('');
  const [editingServerId, setEditingServerId] = useState(null);
  const [editingServerName, setEditingServerName] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const fetchNas = async () => {
    try {
      const res = await fetch('/api/nas');
      const data = await res.json();
      setNasList(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setNasList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVpnSettings = async () => {
    try {
      const res = await fetch('/api/vpn/settings');
      if (res.ok) {
        const data = await res.json();
        setVpnSettings(data || { vpn_local_ip: '192.168.42.1' });
      }
    } catch (err) {
      console.error('Gagal mengambil pengaturan VPN:', err);
    }
  };

  useEffect(() => {
    fetchNas();
    fetchVpnSettings();
  }, []);

  const filteredNas = useMemo(() => {
    return nasList.filter((nas) =>
      nas.nasname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nas.shortname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nas.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nas.connection_mode?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [nasList, searchQuery]);

  const totalPages = Math.ceil(filteredNas.length / itemsPerPage) || 1;
  const currentItems = filteredNas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const isValidIpv4 = (value) => {
    const match = String(value || '').trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!match) return false;
    return match.slice(1).map(Number).every((octet) => octet >= 0 && octet <= 255);
  };

  const isLocalHost = (value) => {
    const host = String(value || '').trim().toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
  };

  const getDefaultScriptServerHost = () => {
    const host = window.location.hostname;
    return isLocalHost(host) ? '' : host;
  };

  const getScriptServerWarning = () => {
    if (!selectedNasForScript) return '';
    const host = String(scriptServerIp || '').trim();

    if (!host) return 'Masukkan IP publik server billing/VPS yang dapat dijangkau dari MikroTik.';
    if (isLocalHost(host)) return 'Alamat localhost tidak bisa dipakai oleh MikroTik. Gunakan IP publik server billing/VPS.';
    if (['ip_publik', 'local_direct'].includes(selectedNasForScript.connection_mode) && !isValidIpv4(host)) {
      return 'Mode direct sebaiknya memakai IPv4 server billing, bukan domain.';
    }
    return '';
  };

  const getRadiusAuthPort = (nas) => nas?.auth_port || 1812;
  const getRadiusAcctPort = (nas) => nas?.acct_port || 1813;
  const getScriptConfigKey = (nasId) => `mikrotik_script_cfg_${nasId}`;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'connection_mode' ? { auth_port: 1812, acct_port: 1813 } : {})
    }));
  };

  const openCreateModal = () => {
    setIsEdit(false);
    setEditId(null);
    setFormData(initialFormData);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (nas) => {
    setIsEdit(true);
    setEditId(nas.id);
    setFormData({
      nasname: nas.nasname,
      shortname: nas.shortname || '',
      secret: nas.secret || '',
      description: nas.description || '',
      auth_port: nas.auth_port || 1812,
      acct_port: nas.acct_port || 1813,
      connection_mode: nas.connection_mode || 'ip_publik',
      vpn_protocol: nas.vpn_protocol || 'l2tp'
    });
    setIsFormModalOpen(true);
  };

  const handleCancel = () => {
    setIsEdit(false);
    setEditId(null);
    setFormData(initialFormData);
    setIsFormModalOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = isEdit ? `/api/nas/${editId}` : '/api/nas';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, admin_username: user?.username || 'admin' })
      });

      if (res.ok) {
        const result = await res.json();
        setFormData(initialFormData);
        setIsEdit(false);
        setEditId(null);
        setIsFormModalOpen(false);
        await fetchNas();
        alert(isEdit ? 'Router NAS berhasil diperbarui!' : 'Router NAS berhasil ditambahkan!');

        if (method === 'POST' && formData.connection_mode === 'vpn') {
          const createdNas = result.nasname;
          const updatedRes = await fetch('/api/nas');
          const updatedData = await updatedRes.json();
          const newlyAdded = updatedData.find((item) => item.nasname === createdNas);
          if (newlyAdded) handleOpenScript(newlyAdded);
        }
      } else {
        const err = await res.json();
        alert('Gagal menyimpan Router: ' + err.error);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghubungi server.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus Router ini? Seluruh konfigurasi VPN terkait juga akan dihapus.')) return;
    try {
      const res = await fetch(`/api/nas/${id}?admin_username=${user?.username || 'admin'}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedNasForServer?.id === id) setSelectedNasForServer(null);
        if (selectedNasForScript?.id === id) setSelectedNasForScript(null);
        if (editId === id) {
          setEditId(null);
          setIsFormModalOpen(false);
        }
        await fetchNas();
      } else {
        const err = await res.json();
        alert('Gagal menghapus Router: ' + err.error);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghubungi server.');
    }
  };

  const loadServerList = async (nasId) => {
    try {
      const res = await fetch(`/api/nas/${nasId}/servers`);
      if (res.ok) {
        const data = await res.json();
        setServerList(Array.isArray(data) ? data : []);
      } else {
        setServerList([]);
      }
    } catch (err) {
      console.error('Gagal mengambil data server:', err);
      setServerList([]);
    }
  };

  const handleOpenScript = async (nas) => {
    setSelectedNasForScript(nas);
    setCopiedStatus(false);

    try {
      const savedConfig = localStorage.getItem(getScriptConfigKey(nas.id));
      const parsed = savedConfig ? JSON.parse(savedConfig) : null;
      setSelectedScriptProtocol(parsed?.selectedScriptProtocol || nas.vpn_protocol || 'l2tp');
      setSelectedScriptRos(parsed?.selectedScriptRos || 'v7');
      setSelectedPatternTemplate(parsed?.selectedPatternTemplate || '');
      setScriptServerIp(parsed?.scriptServerIp || getDefaultScriptServerHost());
    } catch (err) {
      console.error('Gagal membaca konfigurasi script tersimpan:', err);
      setSelectedScriptProtocol(nas.vpn_protocol || 'l2tp');
      setSelectedScriptRos('v7');
      setSelectedPatternTemplate('');
      setScriptServerIp(getDefaultScriptServerHost());
    }

    await loadServerList(nas.id);
  };

  const handleSaveScriptConfig = () => {
    if (!selectedNasForScript) return;
    localStorage.setItem(
      getScriptConfigKey(selectedNasForScript.id),
      JSON.stringify({
        scriptServerIp,
        selectedScriptRos,
        selectedScriptProtocol,
        selectedPatternTemplate
      })
    );
    alert('Konfigurasi script berhasil disimpan.');
  };

  const buildServerAdjustments = () => {
    if (!serverList.length) return '';
    let out = '\n# Penyesuaian Server MikroTik\n';
    serverList.forEach((srv) => {
      out += `/ip hotspot profile set [find name="${srv.server_name}"] use-radius=yes\n`;
    });
    return out;
  };

  const generateMikrotikScript = () => {
    if (!selectedNasForScript) return '';
    if (!selectedPatternTemplate) return '# Silakan pilih template script di atas';

    const vpsIp = scriptServerIp || 'IP_PUBLIC_SERVER_BILLING';
    const vpnLocalIp = vpnSettings.vpn_local_ip || '192.168.42.1';
    const radiusSecret = selectedNasForScript.connection_mode === 'local_direct'
      ? 'radius123'
      : (selectedNasForScript.secret || 'radius_secret');
    const authPort = getRadiusAuthPort(selectedNasForScript);
    const acctPort = getRadiusAcctPort(selectedNasForScript);
    const vpnUser = selectedNasForScript.vpn_user || 'vpn_username';
    const vpnPass = selectedNasForScript.vpn_pass || 'vpn_password';
    const vpnPsk = selectedNasForScript.vpn_psk || 'radius_vpn_secret';

    const hotspotConfig = `
# HOTSPOT MODE
/ip hotspot profile set [find] use-radius=yes
`;

    const pppoeProfileScript = `
# PPPOE MODE
:foreach i in=[/ip pool find name="ARMPOOL"] do={/ip pool remove $i}
:foreach i in=[/ip pool find name="ARMISOLIR"] do={/ip pool remove $i}
/ip pool add name="ARMPOOL" ranges="10.30.192.100-10.30.207.254"
/ip pool add name="ARMISOLIR" ranges="10.30.208.10-10.30.209.254"

:foreach i in=[/ppp profile find name="ARM_RADIUS"] do={/ppp profile remove $i}
:foreach i in=[/ppp profile find name="ARM_ISOLIR"] do={/ppp profile remove $i}
/ppp profile add name="ARM_RADIUS" remote-address=ARMPOOL only-one=yes change-tcp-mss=yes use-compression=no use-encryption=no
/ppp profile add name="ARM_ISOLIR" remote-address=ARMISOLIR only-one=yes change-tcp-mss=yes use-compression=no use-encryption=no
/ppp aaa set use-radius=yes
`;

    let selectedTemplateBlock = '';
    switch (selectedPatternTemplate) {
      case 'hotspot_pppoe':
        selectedTemplateBlock = `${pppoeProfileScript}\n${hotspotConfig}`;
        break;
      case 'pppoe_only':
        selectedTemplateBlock = pppoeProfileScript;
        break;
      case 'hotspot_only':
        selectedTemplateBlock = hotspotConfig;
        break;
      default:
        return '# Silakan pilih template script di atas';
    }

    let vpnInterfaceScript = '';
    switch (selectedScriptProtocol) {
      case 'pptp':
        vpnInterfaceScript = `:foreach i in=[/interface pptp-client find name="vpn-radius"] do={/interface pptp-client remove $i}
/interface pptp-client add name="vpn-radius" connect-to="${vpsIp}" user="${vpnUser}" password="${vpnPass}" profile="ARMTunnel" disabled=no`;
        break;
      case 'sstp':
        vpnInterfaceScript = `:foreach i in=[/interface sstp-client find name="vpn-radius"] do={/interface sstp-client remove $i}
/interface sstp-client add name="vpn-radius" connect-to="${vpsIp}" user="${vpnUser}" password="${vpnPass}" profile="ARMTunnel" verify-server-certificate=no disabled=no`;
        break;
      case 'ovpn':
        vpnInterfaceScript = selectedScriptRos === 'v7'
          ? `:foreach i in=[/interface ovpn-client find name="vpn-radius"] do={/interface ovpn-client remove $i}
/interface ovpn-client add name="vpn-radius" connect-to="${vpsIp}" user="${vpnUser}" password="${vpnPass}" port=1194 protocol=tcp profile="ARMTunnel" disabled=no`
          : `:foreach i in=[/interface ovpn-client find name="vpn-radius"] do={/interface ovpn-client remove $i}
/interface ovpn-client add name="vpn-radius" connect-to="${vpsIp}" user="${vpnUser}" password="${vpnPass}" port=1194 mode=ip profile="ARMTunnel" cipher=aes128 disabled=no`;
        break;
      case 'l2tp':
      default:
        vpnInterfaceScript = `:foreach i in=[/interface l2tp-client find name="vpn-radius"] do={/interface l2tp-client remove $i}
/interface l2tp-client add name="vpn-radius" connect-to="${vpsIp}" user="${vpnUser}" password="${vpnPass}" profile="ARMTunnel" use-ipsec=yes ipsec-secret="${vpnPsk}" disabled=no`;
    }

    const serverAdjustments = buildServerAdjustments();

    if (['ip_publik', 'local_direct'].includes(selectedNasForScript.connection_mode)) {
      return `# ==================================================
# SETUP SCRIPT (${selectedPatternTemplate.toUpperCase()}) - ${selectedScriptRos.toUpperCase()}
# ==================================================
# NAS: ${selectedNasForScript.nasname}
# SERVER BILLING: ${vpsIp}

:foreach i in=[/radius find comment="Radius Billing Direct"] do={/radius remove $i}
/radius add service="hotspot,ppp" address="${vpsIp}" secret="${radiusSecret}" authentication-port=${authPort} accounting-port=${acctPort} timeout=3000ms comment="Radius Billing Direct"
/radius incoming set accept=yes port=3799

${selectedTemplateBlock}
${serverAdjustments}
`;
    }

    return `# ==================================================
# SETUP SCRIPT (${selectedPatternTemplate.toUpperCase()}) - VPN ${selectedScriptProtocol.toUpperCase()} - ${selectedScriptRos.toUpperCase()}
# ==================================================
# NAS: ${selectedNasForScript.nasname}
# SERVER BILLING: ${vpsIp}

:foreach i in=[/ppp profile find name="ARMTunnel"] do={/ppp profile remove $i}
/ppp profile add name="ARMTunnel"

${vpnInterfaceScript}

:foreach i in=[/radius find comment="Radius Billing VPN"] do={/radius remove $i}
/radius add service="hotspot,ppp" address="${vpnLocalIp}" secret="${radiusSecret}" authentication-port=${authPort} accounting-port=${acctPort} comment="Radius Billing VPN"
/radius incoming set accept=yes port=3799

${selectedTemplateBlock}
${serverAdjustments}
`;
  };

  const fallbackCopyText = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopiedStatus(true);
        setTimeout(() => setCopiedStatus(false), 2000);
      } else {
        alert('Gagal menyalin otomatis. Silakan blokir teks dan salin manual.');
      }
    } catch {
      alert('Gagal menyalin otomatis. Silakan blokir teks dan salin manual.');
    }
    document.body.removeChild(textArea);
  };

  const handleCopyScript = () => {
    const scriptText = generateMikrotikScript();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(scriptText)
        .then(() => {
          setCopiedStatus(true);
          setTimeout(() => setCopiedStatus(false), 2000);
        })
        .catch(() => fallbackCopyText(scriptText));
    } else {
      fallbackCopyText(scriptText);
    }
  };

  const handleDownloadScript = () => {
    const scriptText = generateMikrotikScript();
    const safeName = (selectedNasForScript?.shortname || 'mikrotik').replace(/[^\w-]+/g, '_').toLowerCase();
    const blob = new Blob([scriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}-${selectedScriptRos}-${selectedPatternTemplate || 'template'}.rsc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenServerModal = async (nas) => {
    setSelectedNasForServer(nas);
    setNewServerName('');
    setEditingServerId(null);
    setEditingServerName('');
    await loadServerList(nas.id);
  };

  const handleAddServer = async (e) => {
    e.preventDefault();
    if (!newServerName.trim()) return;
    try {
      const res = await fetch(`/api/nas/${selectedNasForServer.id}/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_name: newServerName.trim(), admin_username: user?.username || 'admin' })
      });
      if (res.ok) {
        setNewServerName('');
        await loadServerList(selectedNasForServer.id);
      } else {
        const err = await res.json();
        alert('Gagal menambah server: ' + err.error);
      }
    } catch (error) {
      console.error('Gagal menambah server:', error);
    }
  };

  const handleStartEditServer = (server) => {
    setEditingServerId(server.id);
    setEditingServerName(server.server_name);
  };

  const handleSaveEditServer = async (serverId) => {
    if (!editingServerName.trim()) return;
    try {
      const res = await fetch(`/api/nas/${selectedNasForServer.id}/servers/${serverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_name: editingServerName.trim() })
      });
      if (res.ok) {
        setEditingServerId(null);
        setEditingServerName('');
        await loadServerList(selectedNasForServer.id);
      } else {
        const err = await res.json();
        alert('Gagal menyimpan server: ' + err.error);
      }
    } catch (error) {
      console.error('Gagal memperbarui server:', error);
    }
  };

  const handleDeleteServer = async (serverId) => {
    if (!window.confirm('Yakin ingin menghapus server ini?')) return;
    try {
      const res = await fetch(`/api/nas/${selectedNasForServer.id}/servers/${serverId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadServerList(selectedNasForServer.id);
      } else {
        const err = await res.json();
        alert('Gagal menghapus server: ' + err.error);
      }
    } catch (error) {
      console.error('Gagal menghapus server:', error);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Pengaturan NAS (Router MikroTik)</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Hubungkan Router MikroTik Anda ke RADIUS Server secara instan menggunakan IP Publik atau VPN Tunnel otomatis.</p>
        </div>
        <button onClick={openCreateModal} style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '50px', padding: '10px 24px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add_circle</span>
          Tambah Router Baru
        </button>
      </div>

      {isFormModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '550px', padding: '2rem', border: '1px solid rgba(255,255,255,0.15)', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={handleCancel} style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
            </button>

            <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded">{isEdit ? 'edit_note' : 'add_circle'}</span>
              {isEdit ? 'Edit Router NAS' : 'Tambah Router Baru'}
            </h3>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Sistem Koneksi ke Billing *</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'local_direct', icon: 'lan', label: 'Local Direct' },
                    { value: 'ip_publik', icon: 'public', label: 'IP Publik Router' },
                    { value: 'vpn', icon: 'vpn_lock', label: 'VPN Tunnel (Auto)' }
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => handleChange({ target: { name: 'connection_mode', value: mode.value } })}
                      style={{
                        flex: '1 1 150px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: formData.connection_mode === mode.value ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                        background: formData.connection_mode === mode.value ? 'rgba(233, 30, 99, 0.15)' : 'rgba(255,255,255,0.02)',
                        color: formData.connection_mode === mode.value ? 'white' : 'var(--text-secondary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span className="material-symbols-rounded">{mode.icon}</span>
                      <span style={{ fontSize: '0.85rem' }}>{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {['ip_publik', 'local_direct'].includes(formData.connection_mode) ? (
                <div className="form-group">
                  <label className="form-label">{formData.connection_mode === 'local_direct' ? 'IP Address Lokal MikroTik *' : 'IP Address Publik / CIDR MikroTik *'}</label>
                  <input type="text" name="nasname" className="form-input" placeholder={formData.connection_mode === 'local_direct' ? 'Contoh: 192.168.69.1' : 'Contoh: 114.125.10.22 atau 0.0.0.0/0'} value={formData.nasname} onChange={handleChange} required />
                </div>
              ) : (
                <div className="form-group" style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', borderLeft: '3px solid #3b82f6' }}>
                  <label className="form-label" style={{ color: '#3b82f6' }}>Alokasi IP Client VPN</label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    IP Client untuk MikroTik akan dialokasikan otomatis oleh server billing dari VPN Pool IP Anda. Anda cukup copy script setelah NAS tersimpan.
                  </p>
                </div>
              )}

              {formData.connection_mode === 'vpn' && (
                <div className="form-group">
                  <label className="form-label">Pilihan Protokol VPN *</label>
                  <select name="vpn_protocol" className="form-input" value={formData.vpn_protocol} onChange={handleChange}>
                    <option value="l2tp">L2TP / IPsec (Paling Stabil)</option>
                    <option value="pptp">PPTP</option>
                    <option value="sstp">SSTP</option>
                    <option value="ovpn">OpenVPN (OVPN)</option>
                  </select>
                </div>
              )}

              {isEdit ? (
                <div className="form-group">
                  <label className="form-label">RADIUS Secret (Dibuat Sistem)</label>
                  <input type="text" name="secret" className="form-input" value={formData.secret} readOnly style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)' }} />
                </div>
              ) : (
                <div className="form-group" style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '10px', borderLeft: '3px solid #10b981' }}>
                  <label className="form-label" style={{ color: '#10b981' }}>RADIUS Secret Otomatis</label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    RADIUS Secret akan di-generate secara otomatis menggunakan enkripsi acak saat Anda menyimpan router ini.
                  </p>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Nama Pendek (Shortname) *</label>
                <input type="text" name="shortname" className="form-input" placeholder="Contoh: CabangKuta" value={formData.shortname} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi Lokasi / Keterangan</label>
                <input type="text" name="description" className="form-input" placeholder="Contoh: Router lantai 2" value={formData.description} onChange={handleChange} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Authentication Port</label>
                  <input type="number" name="auth_port" className="form-input" value={formData.auth_port} onChange={handleChange} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Accounting Port</label>
                  <input type="number" name="acct_port" className="form-input" value={formData.acct_port} onChange={handleChange} />
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn" style={{ flex: 2, background: 'var(--accent-primary)', color: 'white', borderRadius: '50px', padding: '0.7rem 1.5rem', border: 'none', cursor: 'pointer' }}>
                  {isEdit ? 'Perbarui NAS' : 'Simpan NAS'}
                </button>
                <button type="button" className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px', padding: '0.7rem 1.5rem', cursor: 'pointer' }} onClick={handleCancel}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
          Show
          <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="form-input" style={{ width: '70px', padding: '4px 8px' }}>
            <option value="10">10</option>
            <option value="25">25</option>
          </select>
        </div>

        <input type="text" placeholder="Cari router..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="form-input" style={{ width: '180px', padding: '6px 12px' }} />
      </div>

      <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama Router</th>
              <th>Sistem Koneksi</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Setup & Config</th>
              <th style={{ textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !nasList.length ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>Memuat data...</td></tr>
            ) : !currentItems.length ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>Belum ada data router yang sesuai.</td></tr>
            ) : currentItems.map((nas) => (
              <tr key={nas.id}>
                <td>
                  <strong>{nas.shortname}</strong>
                  {nas.description && <small style={{ display: 'block', opacity: 0.6, fontSize: '0.75rem' }}>{nas.description}</small>}
                </td>
                <td>
                  <span style={{
                    fontSize: '0.8rem',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    border: nas.connection_mode === 'vpn' ? '1px solid rgba(16, 185, 129, 0.3)' : nas.connection_mode === 'local_direct' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                    color: nas.connection_mode === 'vpn' ? '#10b981' : nas.connection_mode === 'local_direct' ? '#60a5fa' : '#f59e0b',
                    background: nas.connection_mode === 'vpn' ? 'rgba(16, 185, 129, 0.05)' : nas.connection_mode === 'local_direct' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(245, 158, 11, 0.05)'
                  }}>
                    {nas.connection_mode === 'vpn' ? `VPN (${(nas.vpn_protocol || 'l2tp').toUpperCase()})` : nas.connection_mode === 'local_direct' ? 'Local Direct' : 'IP Publik'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${nas.status === 'Online' ? 'badge-success' : 'badge-danger'}`}>{nas.status || 'Offline'}</span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                    <button className="btn" onClick={() => handleOpenScript(nas)} style={{ padding: '4px 10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 600, borderRadius: '50px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>terminal</span>
                      Script
                    </button>
                    <button className="btn" onClick={() => handleOpenServerModal(nas)} style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.75rem', fontWeight: 600, borderRadius: '50px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>dns</span>
                      Server
                    </button>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button className="btn" style={{ padding: '0.4rem', background: 'var(--accent-primary)', color: 'white', display: 'flex' }} onClick={() => handleEditClick(nas)}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>edit</span>
                    </button>
                    <button className="btn" style={{ padding: '0.4rem', background: 'var(--danger)', color: 'white', display: 'flex' }} onClick={() => handleDelete(nas.id)}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1rem' }}>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Menampilkan {filteredNas.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(filteredNas.length, currentPage * itemsPerPage)} dari {filteredNas.length} Router
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', opacity: currentPage === 1 ? 0.3 : 1 }}>Prev</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px' }}>{currentPage} / {totalPages}</div>
          <button className="btn" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', opacity: currentPage >= totalPages ? 0.3 : 1 }}>Next</button>
        </div>
      </div>

      {selectedNasForScript && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1, 1, 2, 0.8)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ width: '90%', maxWidth: '700px', padding: '48px', background: '#0f1011', border: '1px solid #23252a', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
            <button onClick={() => setSelectedNasForScript(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#141516', border: '1px solid #34343a', color: '#f7f8f8', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: '#5e6ad2', fontSize: '28px' }}>terminal</span>
              <h3 style={{ margin: 0, color: '#f7f8f8', fontSize: '24px', fontWeight: 600, letterSpacing: '-0.5px' }}>Setup Script</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#8a8f98', marginBottom: '32px', lineHeight: 1.5 }}>
              Technical configuration for automated network authentication. Execute via Winbox Terminal.
            </p>

            <div style={{ marginBottom: '32px', padding: '24px', background: '#141516', border: '1px solid #34343a', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '24px' }}>
              <div>
                <div style={{ color: '#62666d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', fontWeight: 500 }}>Registered NAS</div>
                <code style={{ color: '#5e6ad2', fontWeight: 600, fontSize: '13px' }}>{selectedNasForScript.nasname}</code>
              </div>
              <div>
                <div style={{ color: '#62666d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', fontWeight: 500 }}>Engine Mode</div>
                <strong style={{ fontSize: '13px', fontWeight: 600, color: '#5e6ad2' }}>
                  {selectedNasForScript.connection_mode === 'vpn'
                    ? `VPN ${(selectedNasForScript.vpn_protocol || 'l2tp').toUpperCase()}`
                    : selectedNasForScript.connection_mode === 'local_direct'
                      ? 'Local Direct'
                      : 'IP Publik'}
                </strong>
              </div>
              <div>
                <div style={{ color: '#62666d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', fontWeight: 500 }}>Auth Ports</div>
                <code style={{ color: '#5e6ad2', fontWeight: 600, fontSize: '13px' }}>{getRadiusAuthPort(selectedNasForScript)} / {getRadiusAcctPort(selectedNasForScript)}</code>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', color: '#8a8f98', fontWeight: 500, marginBottom: '12px', display: 'block' }}>
                {selectedNasForScript.connection_mode === 'local_direct' ? 'Local Server IP (Billing/VPS)' : 'Public Server IP (Billing/VPS)'}
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder={selectedNasForScript.connection_mode === 'local_direct' ? 'e.g. 192.168.69.49' : 'e.g. 103.125.10.22'}
                  value={scriptServerIp}
                  onChange={(e) => setScriptServerIp(e.target.value)}
                  style={{ background: '#010102', border: '1px solid #34343a', borderRadius: '8px', padding: '10px 14px', color: '#f7f8f8', fontSize: '14px', flex: 1, outline: 'none' }}
                />
                <button type="button" onClick={handleSaveScriptConfig} style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#141516', border: '1px solid #34343a', color: '#f7f8f8' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>save</span>
                  Save Configuration
                </button>
              </div>
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', color: '#f59e0b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>warning</span>
                <span>{getScriptServerWarning() || 'Masukkan IP publik server billing/VPS yang dapat dijangkau dari MikroTik.'}</span>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', color: '#8a8f98', fontWeight: 500, marginBottom: '12px', display: 'block' }}>Engine Version</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['v7', 'v6'].map((ros) => (
                  <button key={ros} type="button" onClick={() => setSelectedScriptRos(ros)} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: selectedScriptRos === ros ? '1px solid #5e6ad2' : '1px solid #34343a', background: selectedScriptRos === ros ? 'rgba(94, 106, 210, 0.1)' : '#141516', color: selectedScriptRos === ros ? '#f7f8f8' : '#8a8f98', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>settings_ethernet</span>
                    {ros === 'v7' ? 'RouterOS V7' : 'RouterOS V6'}
                  </button>
                ))}
              </div>
            </div>

            {selectedNasForScript.connection_mode === 'vpn' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '13px', color: '#8a8f98', fontWeight: 500, marginBottom: '12px', display: 'block' }}>VPN Protocol</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {['l2tp', 'pptp', 'sstp', 'ovpn'].map((proto) => (
                    <button key={proto} type="button" onClick={() => setSelectedScriptProtocol(proto)} style={{ flex: 1, minWidth: '110px', padding: '10px 14px', borderRadius: '8px', border: selectedScriptProtocol === proto ? '1px solid #5e6ad2' : '1px solid #34343a', background: selectedScriptProtocol === proto ? 'rgba(94, 106, 210, 0.1)' : '#141516', color: selectedScriptProtocol === proto ? '#f7f8f8' : '#8a8f98', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textTransform: 'uppercase' }}>
                      {proto}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '32px' }}>
              <label style={{ fontSize: '13px', color: '#8a8f98', fontWeight: 500, marginBottom: '12px', display: 'block' }}>Select Pattern Template</label>
              <select value={selectedPatternTemplate} onChange={(e) => setSelectedPatternTemplate(e.target.value)} style={{ width: '100%', background: '#010102', border: '1px solid #34343a', borderRadius: '8px', padding: '10px 14px', color: '#f7f8f8', fontSize: '14px', outline: 'none' }}>
                <option value="">-- Choose Template ({selectedScriptRos.toUpperCase()}) --</option>
                <option value="hotspot_pppoe">HOTSPOT & PPPOE</option>
                <option value="pppoe_only">PPPOE ONLY</option>
                <option value="hotspot_only">HOTSPOT ONLY</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#8a8f98', fontWeight: 500 }}>Generated Output</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button title="Download .rsc file" onClick={handleDownloadScript} style={{ background: '#141516', border: '1px solid #34343a', color: '#f7f8f8', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>download</span>
                </button>
                <button onClick={handleCopyScript} style={{ background: copiedStatus ? '#10b981' : '#5e6ad2', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>{copiedStatus ? 'check_circle' : 'content_copy'}</span>
                  {copiedStatus ? 'Copied!' : 'Copy Pattern'}
                </button>
              </div>
            </div>

            <textarea readOnly value={generateMikrotikScript()} style={{ width: '100%', height: '240px', background: '#010102', border: '1px solid #34343a', borderRadius: '8px', padding: '20px', color: '#27a644', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6, outline: 'none', resize: 'none' }} />

            <div style={{ marginTop: '32px', padding: '24px', background: '#141516', border: '1px solid #23252a', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#f7f8f8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Deployment Steps</h4>
              <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '14px', color: '#8a8f98', lineHeight: 1.6 }}>
                <li>Access MikroTik via Winbox.</li>
                <li>Open New Terminal from the primary navigation.</li>
                <li>Paste the generated pattern into the terminal window.</li>
                <li>Verify authentication status in the Radius menu.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {selectedNasForServer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '650px', padding: '2rem', border: '1px solid rgba(255,255,255,0.15)', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setSelectedNasForServer(null)} style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
            </button>

            <h3 style={{ margin: '0 0 1rem 0', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>DATA SERVER</h3>

            <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Klik pada kolom server name untuk mengubah data</li>
                <li>
                  Server name harus sama dengan yang ada di mikrotik:<br />
                  - Untuk Hotspot lihat di menu <b>IP &rarr; Hotspot &rarr; Servers &rarr; Name</b><br />
                  - Untuk PPP lihat di menu <b>PPP &rarr; PPPoE Servers &rarr; Service name</b>
                </li>
                <li>Fungsi data server ini adalah untuk mengunci klien agar hanya bisa melakukan otentikasi dari satu server</li>
              </ul>
            </div>

            <form onSubmit={handleAddServer} style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
              <input type="text" placeholder="Masukkan Server Name (contoh: hotspot1, pppoe)" value={newServerName} onChange={(e) => setNewServerName(e.target.value)} className="form-input" style={{ flex: 1, padding: '10px 14px' }} required />
              <button type="submit" className="btn" style={{ background: '#0070f3', color: 'white', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Tambah Data
              </button>
            </form>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>SERVER NAME</h4>

              {serverList.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                  Belum ada data server terdaftar.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {serverList.map((srv) => (
                    <div key={srv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {editingServerId === srv.id ? (
                        <div style={{ display: 'flex', gap: '8px', flex: 1, marginRight: '10px' }}>
                          <input type="text" value={editingServerName} onChange={(e) => setEditingServerName(e.target.value)} className="form-input" style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem' }} autoFocus />
                          <button type="button" onClick={() => handleSaveEditServer(srv.id)} style={{ background: '#10b981', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Simpan</button>
                          <button type="button" onClick={() => setEditingServerId(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Batal</button>
                        </div>
                      ) : (
                        <div onClick={() => handleStartEditServer(srv)} style={{ fontSize: '0.95rem', color: 'white', cursor: 'pointer', flex: 1, fontWeight: 500 }}>
                          {srv.server_name}
                        </div>
                      )}

                      {editingServerId !== srv.id && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleStartEditServer(srv)} style={{ background: '#0070f3', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Ubah</button>
                          <button onClick={() => handleDeleteServer(srv.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Hapus</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NasMikrotik;
