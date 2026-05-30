import React, { useState, useEffect } from 'react';

const NasMikrotik = ({ user }) => {
  const [nasList, setNasList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const initialFormData = {
    nasname: '',
    shortname: '',
    secret: '',
    description: '',
    auth_port: 1812,
    acct_port: 1813,
    connection_mode: 'local_direct', // 'local_direct', 'ip_publik', or 'vpn'
    vpn_protocol: 'l2tp' // 'pptp', 'l2tp', 'sstp', 'ovpn'
  };
  const [formData, setFormData] = useState(initialFormData);
  const [vpnSettings, setVpnSettings] = useState({ vpn_local_ip: '192.168.42.1' });

  // Pagination & Search State
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for MikroTik script
  const [selectedNasForScript, setSelectedNasForScript] = useState(null);
  const [selectedScriptProtocol, setSelectedScriptProtocol] = useState('l2tp');
  const [selectedScriptRos, setSelectedScriptRos] = useState('v7'); // 'v6' or 'v7'
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [scriptServerIp, setScriptServerIp] = useState('');

  // Server Modal State
  const [selectedNasForServer, setSelectedNasForServer] = useState(null);
  const [serverList, setServerList] = useState([]);
  const [newServerName, setNewServerName] = useState('');
  const [editingServerId, setEditingServerId] = useState(null);
  const [editingServerName, setEditingServerName] = useState('');

  // Form Modal State for Add/Edit Router
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const isValidIpv4 = (value) => {
    const match = String(value || '').trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!match) return false;
    return match.slice(1).map(Number).every(octet => octet >= 0 && octet <= 255);
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

    if (!host) {
      return 'Masukkan IP publik server billing/VPS yang dapat dijangkau dari MikroTik.';
    }

    if (isLocalHost(host)) {
      return 'Alamat localhost tidak bisa dipakai oleh MikroTik. Gunakan IP publik server billing/VPS.';
    }

    if (['ip_publik', 'local_direct'].includes(selectedNasForScript.connection_mode) && !isValidIpv4(host)) {
      return 'Mode direct sebaiknya memakai IPv4 server billing, bukan domain.';
    }

    return '';
  };

  const getRadiusAuthPort = (nas) => {
    return nas?.auth_port || 1812;
  };

  const getRadiusAcctPort = (nas) => {
    return nas?.acct_port || 1813;
  };

  const filteredNas = nasList.filter(nas => 
    nas.nasname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nas.shortname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nas.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nas.connection_mode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredNas.length / itemsPerPage) || 1;
  const currentItems = filteredNas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchNas = async () => {
    try {
      const res = await fetch(`/api/nas`);
      const data = await res.json();
      setNasList(data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVpnSettings = async () => {
    try {
      const res = await fetch('/api/vpn/settings');
      if (res.ok) {
        const data = await res.json();
        setVpnSettings(data);
      }
    } catch (err) {
      console.error('Gagal mengambil pengaturan VPN:', err);
    }
  };

  useEffect(() => {
    fetchNas();
    fetchVpnSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Set default ports based on connection mode
      if (name === 'connection_mode') {
        if (value === 'vpn') {
          updated.auth_port = 1812;
          updated.acct_port = 1813;
        } else {
          updated.auth_port = 1812;
          updated.acct_port = 1813;
        }
      }
      return updated;
    });
  };

  const handleEditClick = (nas) => {
    setIsEdit(true);
    setEditId(nas.id);
    setFormData({
      nasname: nas.nasname,
      shortname: nas.shortname || '',
      secret: nas.secret,
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
      const url = isEdit 
        ? `/api/nas/${editId}` 
        : `/api/nas`;
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
        
        // If it was a new VPN router, open script modal automatically for nice UX!
        if (method === 'POST' && formData.connection_mode === 'vpn') {
          const createdNas = result.nasname;
          // Find the newly created item in nasList or fetch first
          const updatedRes = await fetch(`/api/nas`);
          const updatedData = await updatedRes.json();
          setNasList(updatedData);
          const newlyAdded = updatedData.find(item => item.nasname === createdNas);
          if (newlyAdded) {
            handleOpenScript(newlyAdded);
          }
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
    if (window.confirm('Yakin ingin menghapus Router ini? Seluruh konfigurasi VPN terkait juga akan dihapus.')) {
      try {
        const res = await fetch(`/api/nas/${id}?admin_username=${user?.username || 'admin'}`, { method: 'DELETE' });
        if (res.ok) {
          // Close and clear modal if it belongs to the deleted router
          if (selectedNasForServer?.id === id) {
            setSelectedNasForServer(null);
          }
          if (selectedNasForScript?.id === id) {
            setSelectedNasForScript(null);
          }
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
    }
  };

  const handleOpenScript = async (nas) => {
    setSelectedNasForScript(nas);
    setSelectedScriptProtocol(nas.vpn_protocol || 'l2tp');
    setCopiedStatus(false);
    setScriptServerIp(getDefaultScriptServerHost());

    try {
      const res = await fetch(`/api/nas/${nas.id}/servers`);
      if (res.ok) {
        const data = await res.json();
        setServerList(data);
      }
    } catch (err) {
      console.error('Gagal mengambil data server untuk skrip:', err);
    }
  };

  const handleOpenServerModal = async (nas) => {
    setSelectedNasForServer(nas);
    setNewServerName('');
    setEditingServerId(null);
    setEditingServerName('');
    try {
      const res = await fetch(`/api/nas/${nas.id}/servers`);
      if (res.ok) {
        const data = await res.json();
        setServerList(data);
      }
    } catch (error) {
      console.error('Gagal mengambil data server:', error);
    }
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
        const reloadRes = await fetch(`/api/nas/${selectedNasForServer.id}/servers`);
        const reloadData = await reloadRes.json();
        setServerList(reloadData);
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
        const reloadRes = await fetch(`/api/nas/${selectedNasForServer.id}/servers`);
        const reloadData = await reloadRes.json();
        setServerList(reloadData);
      } else {
        const err = await res.json();
        alert('Gagal menyimpan server: ' + err.error);
      }
    } catch (error) {
      console.error('Gagal memperbarui server:', error);
    }
  };

  const handleDeleteServer = async (serverId) => {
    if (!confirm('Yakin ingin menghapus server ini?')) return;
    try {
      const res = await fetch(`/api/nas/${selectedNasForServer.id}/servers/${serverId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const reloadRes = await fetch(`/api/nas/${selectedNasForServer.id}/servers`);
        const reloadData = await reloadRes.json();
        setServerList(reloadData);
      } else {
        const err = await res.json();
        alert('Gagal menghapus server: ' + err.error);
      }
    } catch (error) {
      console.error('Gagal menghapus server:', error);
    }
  };

  const generateMikrotikScript = () => {
    if (!selectedNasForScript) return '';
    const vpsIp = scriptServerIp || 'IP_PUBLIC_SERVER_BILLING';
    const vpnLocalIp = vpnSettings.vpn_local_ip || '192.168.42.1';
    const radiusSecret = selectedNasForScript.connection_mode === 'local_direct' ? 'radius123' : selectedNasForScript.secret;
    const authPort = getRadiusAuthPort(selectedNasForScript);
    const acctPort = getRadiusAcctPort(selectedNasForScript);
    const vpnUser = selectedNasForScript.vpn_user || 'vpn_username';
    const vpnPass = selectedNasForScript.vpn_pass || 'vpn_password';
    const vpnPsk = selectedNasForScript.vpn_psk || 'radius_vpn_secret';

    let serverAdjustments = '';
    if (serverList && serverList.length > 0) {
      serverAdjustments = `\n# 4. Penyesuaian Profil Server MikroTik yang Terdaftar\n`;
      serverList.forEach(srv => {
        serverAdjustments += `/ip hotspot profile set [find name="${srv.server_name}"] use-radius=yes\n`;
      });
    }

    const pppoeProfileScript = `
# Skema PPPoE Normal / Isolir
# Pool dan Profile untuk skema Isolir dan Tidak Isolir
:foreach i in=[/ip pool find name="ARMPOOL"] do={/ip pool remove $i}
:foreach i in=[/ip pool find name="ARMISOLIR"] do={/ip pool remove $i}
/ip pool add name="ARMPOOL" ranges="10.30.192.100-10.30.207.254"
/ip pool add name="ARMISOLIR" ranges="10.30.208.10-10.30.209.254"

:foreach i in=[/ppp profile find name="ARM_RADIUS"] do={/ppp profile remove $i}
:foreach i in=[/ppp profile find name="ARM_ISOLIR"] do={/ppp profile remove $i}
/ppp profile add name="ARM_RADIUS" remote-address=ARMPOOL only-one=yes change-tcp-mss=yes use-compression=no use-encryption=no
/ppp profile add name="ARM_ISOLIR" remote-address=ARMISOLIR only-one=yes change-tcp-mss=yes use-compression=no use-encryption=no
`;

    if (['ip_publik', 'local_direct'].includes(selectedNasForScript.connection_mode)) {
      const isLocalDirect = selectedNasForScript.connection_mode === 'local_direct';
      return `# ==================================================
# SCRIPT MIKROTIK (RADIUS DIRECT - ${isLocalDirect ? 'LOCAL VPS' : 'IP PUBLIK'}) - ${selectedScriptRos.toUpperCase()}
# ==================================================
# * Silakan copy & paste skrip ini langsung ke Terminal MikroTik Anda
# * IP MikroTik terdaftar di Billing: ${selectedNasForScript.nasname}
# * Server Billing/RADIUS: ${vpsIp}
# * Secret Local Direct Docker: ${radiusSecret}

:foreach i in=[/radius find comment="Radius Billing Direct"] do={/radius remove $i}
/radius add service="hotspot,ppp" address="${vpsIp}" secret="${radiusSecret}" authentication-port=${authPort} accounting-port=${acctPort} timeout=3000ms comment="Radius Billing Direct"
/radius incoming set accept=yes port=3799
/ip route print where dst-address="0.0.0.0/0"

# Menyiapkan PPPoE Profile/Pool normal dan isolir
${pppoeProfileScript}

# Mengaktifkan RADIUS di semua Profil Hotspot & PPP
/ip hotspot profile set [find] use-radius=yes
/ppp aaa set use-radius=yes
${serverAdjustments}`;
    }

    // VPN Mode script depending on protocol & ROS version
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
        if (selectedScriptRos === 'v7') {
          // RouterOS v7 supports TCP mode explicitly
          vpnInterfaceScript = `:foreach i in=[/interface ovpn-client find name="vpn-radius"] do={/interface ovpn-client remove $i}
/interface ovpn-client add name="vpn-radius" connect-to="${vpsIp}" user="${vpnUser}" password="${vpnPass}" port=1194 protocol=tcp profile="ARMTunnel" disabled=no`;
        } else {
          // RouterOS v6 legacy parameters (TCP is default, mode=ip)
          vpnInterfaceScript = `:foreach i in=[/interface ovpn-client find name="vpn-radius"] do={/interface ovpn-client remove $i}
/interface ovpn-client add name="vpn-radius" connect-to="${vpsIp}" user="${vpnUser}" password="${vpnPass}" port=1194 mode=ip profile="ARMTunnel" cipher=aes128 disabled=no`;
        }
        break;
      case 'l2tp':
      default:
        vpnInterfaceScript = `:foreach i in=[/interface l2tp-client find name="vpn-radius"] do={/interface l2tp-client remove $i}
/interface l2tp-client add name="vpn-radius" connect-to="${vpsIp}" user="${vpnUser}" password="${vpnPass}" profile="ARMTunnel" use-ipsec=yes ipsec-secret="${vpnPsk}" disabled=no`;
        break;
    }

    return `# ==================================================
# SCRIPT MIKROTIK (RADIUS TUNNEL - VPN ${selectedScriptProtocol.toUpperCase()}) - ${selectedScriptRos.toUpperCase()}
# ==================================================
# * Silakan copy & paste skrip ini langsung ke Terminal MikroTik Anda

# 0. Pembuatan PPP Profile ARMTunnel (Mencegah Pool Error)
:foreach i in=[/ppp profile find name="ARMTunnel"] do={/ppp profile remove $i}
/ppp profile add name="ARMTunnel"

# 1. Konfigurasi Interface VPN Client
${vpnInterfaceScript}

# 2. Konfigurasi RADIUS Client ke Server Gateway VPN
:foreach i in=[/radius find comment="Radius Billing VPN"] do={/radius remove $i}
/radius add service="hotspot,ppp" address="${vpnLocalIp}" secret="${radiusSecret}" authentication-port=${authPort} accounting-port=${acctPort} comment="Radius Billing VPN"
/radius incoming set accept=yes port=3799

# Menyiapkan PPPoE Profile/Pool normal dan isolir
${pppoeProfileScript}

# 3. Mengaktifkan RADIUS di semua Profil Hotspot & PPP
/ip hotspot profile set [find] use-radius=yes
/ppp aaa set use-radius=yes
${serverAdjustments}`;
  };

  const fallbackCopyText = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
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
    } catch (err) {
      alert('Gagal menyalin otomatis. Silakan blokir teks dan salin manual.');
    }
    document.body.removeChild(textArea);
  };

  const handleCopyScript = () => {
    const scriptText = generateMikrotikScript();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(scriptText).then(() => {
        setCopiedStatus(true);
        setTimeout(() => setCopiedStatus(false), 2000);
      }).catch(() => {
        fallbackCopyText(scriptText);
      });
    } else {
      fallbackCopyText(scriptText);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Pengaturan NAS (Router MikroTik)</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Hubungkan Router MikroTik Anda ke RADIUS Server secara instan menggunakan IP Publik atau VPN Tunnel otomatis.</p>
        </div>
        <button
          onClick={() => {
            setIsEdit(false);
            setEditId(null);
            setFormData(initialFormData);
            setIsFormModalOpen(true);
          }}
          style={{
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '10px 24px',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s'
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add_circle</span>
          Tambah Router Baru
        </button>
      </div>

      {/* MODAL DIALOG FOR ADD / EDIT NAS ROUTER */}
      {isFormModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.25s ease'
        }}>
          <div className="glass-card" style={{
            width: '90%',
            maxWidth: '550px',
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.15)',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button 
              onClick={handleCancel}
              style={{
                position: 'absolute',
                top: '1.2rem',
                right: '1.2rem',
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: 'white',
                padding: '6px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
            </button>

            <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded">{isEdit ? 'edit_note' : 'add_circle'}</span>
              {isEdit ? 'Edit Router NAS' : 'Tambah Router Baru'}
            </h3>
            
            <form onSubmit={handleSave}>
              
              {/* Connection Mode Selection */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600' }}>Sistem Koneksi ke Billing *</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: 'connection_mode', value: 'local_direct' } })}
                    style={{
                      flex: '1 1 150px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: formData.connection_mode === 'local_direct' ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                      background: formData.connection_mode === 'local_direct' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                      color: formData.connection_mode === 'local_direct' ? 'white' : 'var(--text-secondary)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span className="material-symbols-rounded">lan</span>
                    <span style={{ fontSize: '0.85rem' }}>Local Direct</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: 'connection_mode', value: 'ip_publik' } })}
                    style={{
                      flex: '1 1 150px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: formData.connection_mode === 'ip_publik' ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                      background: formData.connection_mode === 'ip_publik' ? 'rgba(233, 30, 99, 0.15)' : 'rgba(255,255,255,0.02)',
                      color: formData.connection_mode === 'ip_publik' ? 'white' : 'var(--text-secondary)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span className="material-symbols-rounded">public</span>
                    <span style={{ fontSize: '0.85rem' }}>IP Publik Router</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: 'connection_mode', value: 'vpn' } })}
                    style={{
                      flex: '1 1 150px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: formData.connection_mode === 'vpn' ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                      background: formData.connection_mode === 'vpn' ? 'rgba(233, 30, 99, 0.15)' : 'rgba(255,255,255,0.02)',
                      color: formData.connection_mode === 'vpn' ? 'white' : 'var(--text-secondary)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span className="material-symbols-rounded">vpn_lock</span>
                    <span style={{ fontSize: '0.85rem' }}>VPN Tunnel (Auto)</span>
                  </button>
                </div>
              </div>

              {/* IP Address Field - Conditional */}
              {['ip_publik', 'local_direct'].includes(formData.connection_mode) ? (
                <div className="form-group" style={{ animation: 'fadeInDown 0.3s' }}>
                  <label className="form-label">{formData.connection_mode === 'local_direct' ? 'IP Address Lokal MikroTik *' : 'IP Address Publik / CIDR MikroTik *'}</label>
                  <input 
                    type="text" 
                    name="nasname" 
                    className="form-input" 
                    placeholder={formData.connection_mode === 'local_direct' ? 'Contoh: 192.168.69.1' : 'Contoh: 114.125.10.22 atau 0.0.0.0/0'} 
                    value={formData.nasname} 
                    onChange={handleChange} 
                    required 
                  />
                  <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                    {formData.connection_mode === 'local_direct'
                      ? 'Gunakan IP MikroTik yang satu jaringan dengan server billing lokal, misalnya 192.168.69.1.'
                      : 'Gunakan IP publik aktif MikroTik Anda. Untuk IP dinamis, gunakan format CIDR seperti 0.0.0.0/0.'}
                  </small>
                </div>
              ) : (
                <div className="form-group" style={{ animation: 'fadeInDown 0.3s', padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', borderLeft: '3px solid #3b82f6' }}>
                  <label className="form-label" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>info</span>
                    Alokasi IP Client VPN
                  </label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    IP Client untuk MikroTik akan dialokasikan otomatis oleh server billing dari VPN Pool IP Anda. Anda cukup copy script setelah NAS tersimpan!
                  </p>
                  {formData.nasname && (
                    <div style={{ marginTop: '8px', fontSize: '0.9rem', color: 'white' }}>
                      IP Terpilih: <strong style={{ color: 'var(--accent-primary)' }}>{formData.nasname}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* VPN Protocol Selection */}
              {formData.connection_mode === 'vpn' && (
                <div className="form-group" style={{ animation: 'fadeInDown 0.3s' }}>
                  <label className="form-label">Pilihan Protokol VPN *</label>
                  <select
                    name="vpn_protocol"
                    className="form-input"
                    value={formData.vpn_protocol}
                    onChange={handleChange}
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <option value="l2tp" style={{ background: '#1d0f15' }}>L2TP / IPsec (Paling Stabil)</option>
                    <option value="pptp" style={{ background: '#1d0f15' }}>PPTP</option>
                    <option value="sstp" style={{ background: '#1d0f15' }}>SSTP</option>
                    <option value="ovpn" style={{ background: '#1d0f15' }}>OpenVPN (OVPN)</option>
                  </select>
                </div>
              )}

              {isEdit ? (
                <div className="form-group" style={{ animation: 'fadeInDown 0.3s' }}>
                  <label className="form-label">RADIUS Secret (Dibuat Sistem)</label>
                  <input 
                    type="text" 
                    name="secret" 
                    className="form-input" 
                    value={formData.secret} 
                    readOnly 
                    style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)', cursor: 'not-allowed' }}
                  />
                  <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                    RADIUS Secret dibuat otomatis oleh sistem untuk keamanan maksimal.
                  </small>
                </div>
              ) : (
                <div className="form-group" style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '10px', borderLeft: '3px solid #10b981', animation: 'fadeInDown 0.3s', marginBottom: '1.2rem' }}>
                  <label className="form-label" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>lock</span>
                    RADIUS Secret Otomatis
                  </label>
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
                  <input type="number" name="auth_port" className="form-input" placeholder="1812" value={formData.auth_port} onChange={handleChange} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Accounting Port</label>
                  <input type="number" name="acct_port" className="form-input" placeholder="1813" value={formData.acct_port} onChange={handleChange} />
                </div>
              </div>
              {['ip_publik', 'local_direct'].includes(formData.connection_mode) && (
                <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
                  Gunakan port standar RADIUS 1812/1813 dan pastikan UDP port tersebut terbuka di firewall server.
                </small>
              )}
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <button 
                  type="submit" 
                  className="btn" 
                  style={{ 
                    flex: 2, 
                    background: 'var(--accent-primary)', 
                    color: 'white', 
                    borderRadius: '50px', 
                    padding: '0.7rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>{isEdit ? 'save' : 'add_circle'}</span>
                  {isEdit ? 'Perbarui NAS' : 'Simpan NAS'}
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ 
                    flex: 1, 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    color: 'white', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '50px', 
                    padding: '0.7rem 1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }} 
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  onClick={handleCancel}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIST */}
      <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
              Show 
              <select 
                value={itemsPerPage} 
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="form-input"
                style={{ width: '70px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}
              >
                <option value="10" style={{ background: '#1d0f15' }}>10</option>
                <option value="25" style={{ background: '#1d0f15' }}>25</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Cari router..." 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-input"
                  style={{ width: '180px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}
                />
            </div>
          </div>

          <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
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
                {isLoading && nasList.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>Memuat data...</td></tr>
                ) : currentItems.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>Belum ada data router yang sesuai.</td></tr>
                ) : (
                  currentItems.map((nas) => (
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
                          fontWeight: '600',
                          border: nas.connection_mode === 'vpn' ? '1px solid rgba(16, 185, 129, 0.3)' : nas.connection_mode === 'local_direct' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                          color: nas.connection_mode === 'vpn' ? '#10b981' : nas.connection_mode === 'local_direct' ? '#60a5fa' : '#f59e0b',
                          background: nas.connection_mode === 'vpn' ? 'rgba(16, 185, 129, 0.05)' : nas.connection_mode === 'local_direct' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(245, 158, 11, 0.05)'
                        }}>
                          {nas.connection_mode === 'vpn' ? `VPN (${(nas.vpn_protocol || 'l2tp').toUpperCase()})` : nas.connection_mode === 'local_direct' ? 'Local Direct' : 'IP Publik'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${nas.status === 'Online' ? 'badge-success' : 'badge-danger'}`}>
                          {nas.status || 'Offline'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          <button 
                            className="btn" 
                            onClick={() => handleOpenScript(nas)}
                            style={{
                              padding: '4px 10px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              color: '#3b82f6',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              borderRadius: '50px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                            }}
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>terminal</span>
                            Script
                          </button>

                          <button 
                            className="btn" 
                            onClick={() => handleOpenServerModal(nas)}
                            style={{
                              padding: '4px 10px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.2)',
                              color: '#10b981',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              borderRadius: '50px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                            }}
                          >
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1rem' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Menampilkan {filteredNas.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(filteredNas.length, currentPage * itemsPerPage)} dari {filteredNas.length} Router
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', opacity: currentPage === 1 ? 0.3 : 1 }}
              >
                Prev
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px' }}>
                {currentPage} / {totalPages}
              </div>
              <button 
                className="btn" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', opacity: currentPage >= totalPages ? 0.3 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        </div>

      {/* MODAL DIALOG FOR MIKROTIK TERMINAL SCRIPT */}
      {selectedNasForScript && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.25s ease'
        }}>
          <div className="glass-card" style={{
            width: '90%',
            maxWidth: '650px',
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.15)',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => setSelectedNasForScript(null)}
              style={{
                position: 'absolute',
                top: '1.2rem',
                right: '1.2rem',
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: 'white',
                padding: '6px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
            </button>

            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded">terminal</span>
              MikroTik Setup Script
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Salin skrip di bawah ini dan tempelkan langsung di Terminal MikroTik untuk mengonfigurasi koneksi ke server billing secara otomatis.
            </p>

            <div style={{
              marginBottom: '1rem',
              padding: '10px 12px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.18)',
              borderRadius: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '10px',
              fontSize: '0.8rem'
            }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '3px', fontWeight: '600' }}>IP NAS terdaftar</div>
                <code style={{ color: '#93c5fd' }}>{selectedNasForScript.nasname}</code>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '3px', fontWeight: '600' }}>Mode koneksi</div>
                <strong style={{ color: selectedNasForScript.connection_mode === 'vpn' ? '#10b981' : selectedNasForScript.connection_mode === 'local_direct' ? '#60a5fa' : '#f59e0b' }}>
                  {selectedNasForScript.connection_mode === 'vpn' ? `VPN ${(selectedNasForScript.vpn_protocol || 'l2tp').toUpperCase()}` : selectedNasForScript.connection_mode === 'local_direct' ? 'Local Direct' : 'IP Publik'}
                </strong>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '3px', fontWeight: '600' }}>Port script</div>
                <code style={{ color: '#93c5fd' }}>{getRadiusAuthPort(selectedNasForScript)} / {getRadiusAcctPort(selectedNasForScript)}</code>
              </div>
            </div>

            {/* Input IP Address Server */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label className="form-label" style={{ marginBottom: '6px', display: 'block', fontWeight: '600' }}>
                {selectedNasForScript.connection_mode === 'local_direct' ? 'IP Lokal Server Billing / VPS:' : 'IP Publik Server Billing / VPS:'}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={selectedNasForScript.connection_mode === 'local_direct' ? 'Contoh: 192.168.69.49' : 'Contoh: 103.125.10.22'}
                value={scriptServerIp}
                onChange={(e) => setScriptServerIp(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem', width: '100%', padding: '10px 14px' }}
              />
              {getScriptServerWarning() && (
                <div style={{
                  marginTop: '6px',
                  padding: '8px 12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderLeft: '3px solid #f59e0b',
                  borderRadius: '4px',
                  color: '#f59e0b',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>warning</span>
                  <span>{getScriptServerWarning()}</span>
                </div>
              )}
              <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '6px', fontSize: '0.75rem' }}>
                Ini adalah alamat server billing yang akan ditulis pada perintah /radius add. Jangan isi dengan IP MikroTik pelanggan.
              </small>
            </div>

            {/* Choose RouterOS Version */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label className="form-label" style={{ marginBottom: '6px', display: 'block', fontWeight: '600' }}>Versi RouterOS MikroTik:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['v7', 'v6'].map(ros => (
                  <button
                    key={ros}
                    type="button"
                    onClick={() => setSelectedScriptRos(ros)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: selectedScriptRos === ros ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                      background: selectedScriptRos === ros ? 'rgba(233, 30, 99, 0.15)' : 'rgba(255,255,255,0.02)',
                      color: selectedScriptRos === ros ? 'white' : 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>settings_ethernet</span>
                    {ros === 'v7' ? 'RouterOS v7 (Terbaru)' : 'RouterOS v6'}
                  </button>
                ))}
              </div>
            </div>

            {/* If VPN, allow selector for protocols */}
            {selectedNasForScript.connection_mode === 'vpn' && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Pilih Protokol VPN MikroTik:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['l2tp', 'pptp', 'sstp', 'ovpn'].map(proto => (
                    <button
                      key={proto}
                      type="button"
                      onClick={() => setSelectedScriptProtocol(proto)}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: selectedScriptProtocol === proto ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                        background: selectedScriptProtocol === proto ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                        color: selectedScriptProtocol === proto ? 'white' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {proto}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Script Box */}
            <div style={{ position: 'relative', marginTop: '1rem' }}>
              <pre style={{
                background: '#090507',
                color: '#4ade80',
                padding: '1.2rem',
                borderRadius: '8px',
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '0.8rem',
                lineHeight: '1.4',
                overflowX: 'auto',
                border: '1px solid rgba(255,255,255,0.05)',
                maxHeight: '300px'
              }}>
                {generateMikrotikScript()}
              </pre>

              <button
                onClick={handleCopyScript}
                style={{
                  position: 'absolute',
                  top: '0.7rem',
                  right: '0.7rem',
                  background: copiedStatus ? '#10b981' : 'rgba(255,255,255,0.08)',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                  {copiedStatus ? 'check_circle' : 'content_copy'}
                </span>
                {copiedStatus ? 'Copied!' : 'Copy Script'}
              </button>
            </div>
            
            {selectedNasForScript.connection_mode === 'vpn' && selectedScriptProtocol === 'ovpn' && (
              <div style={{
                marginTop: '1rem',
                padding: '12px 16px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderLeft: '4px solid #3b82f6',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: '1.5',
                animation: 'fadeInDown 0.3s'
              }}>
                <div style={{ fontWeight: '700', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>download_for_offline</span>
                  Langkah Penting untuk OpenVPN (ca.crt):
                </div>
                <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
                  <li>
                    Download file CA Certificate dari server Anda dengan mengklik link berikut:{' '}
                    <a href={`http://${window.location.hostname}/ca.crt`} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontWeight: 'bold', textDecoration: 'underline' }}>
                      Download ca.crt
                    </a>
                  </li>
                  <li>Di Winbox, upload file <b>ca.crt</b> ke menu <b>Files</b>.</li>
                  <li>Masuk ke menu <b>System &gt; Certificates</b>, klik <b>Import</b>, pilih file <b>ca.crt</b>, lalu klik <b>Import</b>.</li>
                  <li>Setelah itu, paste script di atas ke Terminal MikroTik Anda agar OVPN langsung terkoneksi.</li>
                </ol>
              </div>
            )}

            {/* Instructions list */}
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'white' }}>Cara Pemasangan:</h4>
              <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                <li>Buka aplikasi <b>Winbox</b> dan masuk ke MikroTik Anda.</li>
                <li>Klik menu <b>"New Terminal"</b> di sebelah kiri.</li>
                <li>Klik tombol <b>"Copy Script"</b> di atas, lalu klik kanan dan pilih **Paste** di dalam terminal MikroTik Anda.</li>
                <li>Koneksi akan segera tersambung otomatis secara live!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DIALOG FOR DATA SERVER MANAGEMENT */}
      {selectedNasForServer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.25s ease'
        }}>
          <div className="glass-card" style={{
            width: '90%',
            maxWidth: '650px',
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.15)',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => setSelectedNasForServer(null)}
              style={{
                position: 'absolute',
                top: '1.2rem',
                right: '1.2rem',
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: 'white',
                padding: '6px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
            </button>

            <h3 style={{ margin: '0 0 1rem 0', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>
              DATA SERVER
            </h3>

            {/* Instruction List matching the user design precisely */}
            <div style={{ 
              background: 'rgba(255,255,255,0.01)', 
              borderRadius: '8px', 
              padding: '1rem', 
              marginBottom: '1.5rem',
              borderLeft: '4px solid #3b82f6'
            }}>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '1.2rem', 
                fontSize: '0.85rem', 
                color: 'rgba(255,255,255,0.7)', 
                lineHeight: '1.6',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <li>Klik pada kolom server name untuk mengubah data</li>
                <li>
                  Server name harus sama dengan yang ada di mikrotik:<br />
                  - Untuk Hotspot lihat di menu <b>IP &rarr; Hotspot &rarr; Servers &rarr; Name</b><br />
                  - Untuk PPP lihat di menu <b>PPP &rarr; PPPoE Servers &rarr; Service name</b>
                </li>
                <li>Fungsi data server ini adalah untuk mengunci klien agar hanya bisa melakukan otentikasi dari satu server</li>
              </ul>
            </div>

            {/* Add Server Name Form */}
            <form onSubmit={handleAddServer} style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Masukkan Server Name (contoh: hotspot1, pppoe)"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                className="form-input"
                style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}
                required
              />
              <button
                type="submit"
                className="btn"
                style={{
                  background: '#0070f3',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#0051cb'}
                onMouseOut={e => e.currentTarget.style.background = '#0070f3'}
              >
                Tambah Data
              </button>
            </form>

            {/* Table of Server Names */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                SERVER NAME
              </h4>
              
              {serverList.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                  Belum ada data server terdaftar.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {serverList.map((srv) => (
                    <div 
                      key={srv.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      {editingServerId === srv.id ? (
                        <div style={{ display: 'flex', gap: '8px', flex: 1, marginRight: '10px' }}>
                          <input
                            type="text"
                            value={editingServerName}
                            onChange={(e) => setEditingServerName(e.target.value)}
                            className="form-input"
                            style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.1)' }}
                            autoFocus
                          />
                          <button 
                            type="button" 
                            onClick={() => handleSaveEditServer(srv.id)}
                            style={{ background: '#10b981', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Simpan
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setEditingServerId(null)}
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => handleStartEditServer(srv)}
                          style={{ 
                            fontSize: '0.95rem', 
                            color: 'white', 
                            cursor: 'pointer', 
                            flex: 1,
                            fontWeight: '500'
                          }}
                          title="Klik untuk mengubah nama server"
                        >
                          {srv.server_name}
                        </div>
                      )}

                      {editingServerId !== srv.id && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleStartEditServer(srv)}
                            style={{
                              background: '#0070f3',
                              color: 'white',
                              border: 'none',
                              padding: '5px 12px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#0051cb'}
                            onMouseOut={e => e.currentTarget.style.background = '#0070f3'}
                          >
                            Ubah
                          </button>
                          <button
                            onClick={() => handleDeleteServer(srv.id)}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '5px 12px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#dc2626'}
                            onMouseOut={e => e.currentTarget.style.background = '#ef4444'}
                          >
                            Hapus
                          </button>
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
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NasMikrotik;


