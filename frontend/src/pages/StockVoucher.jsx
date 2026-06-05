import { formatDateTime } from '../utils/dateFormatter';
import React, { useState, useEffect } from 'react';
import PrintTemplate from '../components/PrintTemplate';
import { toast } from 'react-toastify';
import ConfirmModal from '../components/ConfirmModal';

const StockVoucher = ({ user }) => {
  const [vouchers, setVouchers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal States
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isOutletModalOpen, setIsOutletModalOpen] = useState(false);
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
    const [isAddingUser, setIsAddingUser] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    onConfirm: null
  });

  const triggerConfirm = (message, onConfirm) => {
    setConfirmModal({
      isOpen: true,
      message,
      onConfirm
    });
  };
  const [importProfile, setImportProfile] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  // Print Preview State
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printVouchers, setPrintVouchers] = useState([]);

  // Pagination & Filter State
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterProfile, setFilterProfile] = useState('');
  const [filterOutlet, setFilterOutlet] = useState('');
  const [filterPrintCode, setFilterPrintCode] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedVouchers, setSelectedVouchers] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Generate Form State
  const initialFormData = {
    jenis: 'UP',
    profile: '',
    prefix: '',
    charsetType: 'alpha_num',
    qty: 1,
    length: 6,
    macLock: false,
    outletName: ''
  };
  const [formData, setFormData] = useState(initialFormData);

  // Add User Form State
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    outlet_name: '',
    profile: '',
    mac_lock: false
  });

  // Stats calculation
  const [summaryStats, setSummaryStats] = useState({ totalStock: 0, totalHPP: 0, totalHarga: 0 });

  // Outlet Form State
  const [newOutletName, setNewOutletName] = useState('');

  // Print Form State
  const [printCodeInput, setPrintCodeInput] = useState('');

  // Setting Form State
  const [presets, setPresets] = useState([]);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [isSavePresetPromptOpen, setIsSavePresetPromptOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [isExecutePresetModalOpen, setIsExecutePresetModalOpen] = useState(false);
  const [presetToExecute, setPresetToExecute] = useState(null);
  const [executeQtyInput, setExecuteQtyInput] = useState('');

  // Edit Preset State
  const [isEditPresetModalOpen, setIsEditPresetModalOpen] = useState(false);
  const [editPresetFormData, setEditPresetFormData] = useState(null);

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/vouchers/presets');
      if (res.ok) setPresets(await res.json());
    } catch(err) { console.error('Failed to fetch presets', err); }
  };

  useEffect(() => { fetchPresets(); }, []);

  const handleSavePresetClick = () => {
    setPresetNameInput('');
    setIsSavePresetPromptOpen(true);
  };

  const executeSavePreset = async (e) => {
    e.preventDefault();
    if (!presetNameInput.trim()) return;
    setIsSavePresetPromptOpen(false);
    setIsSavingPreset(true);
    try {
      const res = await fetch('/api/vouchers/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset_name: presetNameInput,
          jenis: formData.jenis,
          profile: formData.profile,
          prefix: formData.prefix,
          charset_type: formData.charsetType,
          panjang_user: formData.length,
          panjang_pass: formData.length,
          qty: formData.qty,
          server: formData.outletName,
          template_id: selectedTemplateId
        })
      });
      if (res.ok) {
        toast.success('Preset berhasil disimpan!');
        fetchPresets();
      } else {
        toast.error('Gagal menyimpan preset');
      }
    } catch(err) {
      toast.error('Gagal koneksi ke server');
    } finally { setIsSavingPreset(false); }
  };

  const handleEditPresetClick = (preset) => {
    setEditPresetFormData({
      id: preset.id,
      preset_name: preset.preset_name,
      profile: preset.profile,
      server: preset.server || '',
      template_id: preset.template_id || '',
      prefix: preset.prefix || '',
      panjang_user: preset.panjang_user || 6,
      panjang_pass: preset.panjang_pass || 6
    });
    setIsPresetModalOpen(false);
    setIsEditPresetModalOpen(true);
  };

  const executeEditPreset = async (e) => {
    e.preventDefault();
    if (!editPresetFormData) return;
    setIsEditPresetModalOpen(false);
    setIsSavingPreset(true);
    try {
      const res = await fetch('/api/vouchers/presets/' + editPresetFormData.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPresetFormData)
      });
      if (res.ok) {
        toast.success('Preset berhasil diperbarui!');
        fetchPresets();
        setIsPresetModalOpen(true); // Re-open preset modal
      } else {
        toast.error('Gagal memperbarui preset');
      }
    } catch(err) {
      toast.error('Gagal koneksi ke server');
    } finally { setIsSavingPreset(false); }
  };

  const handleDeletePreset = async (id) => {
    if (!window.confirm('Yakin ingin menghapus preset ini?')) return;
    try {
      const res = await fetch('/api/vouchers/presets/' + id, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Preset dihapus');
        fetchPresets();
      }
    } catch(err) {}
  };

  const handleExecutePresetClick = (preset) => {
    setPresetToExecute(preset);
    setExecuteQtyInput('');
    setIsPresetModalOpen(false);
    setIsExecutePresetModalOpen(true);
  };

  const executePreset = async (e) => {
    e.preventDefault();
    if (!presetToExecute || !executeQtyInput) return;
    setIsExecutePresetModalOpen(false);
    const preset = presetToExecute;
    const qtyToGenerate = parseInt(executeQtyInput);
    
    setIsGenerating(true);
    const toastId = toast.loading('🚀 Menjalankan Preset: Generate Vouchers...');
    try {
      const res = await fetch('/api/vouchers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_username: user?.username || 'admin',
          qty: qtyToGenerate,
          profile: preset.profile,
          length: preset.panjang_user,
          prefix: preset.prefix,
          charsetType: preset.charset_type,
          macLock: false,
          jenis: preset.jenis,
          outletName: preset.server === 'all' ? '' : preset.server
        })
      });
      const result = await res.json();
      if (res.ok) {
        await fetchData();
        toast.update(toastId, { render: '✅ Sukses Generate!', type: 'success', isLoading: false, autoClose: 3000 });
        if (result.data && result.data.length > 0) {
          handleOpenPrintTab(result.data, presetToExecute.template_id);
        }
      } else {
        toast.update(toastId, { render: '❌ Gagal: ' + result.error, type: 'error', isLoading: false, autoClose: 4000 });
      }
    } catch (err) {
      toast.update(toastId, { render: '❌ Gagal Server Error', type: 'error', isLoading: false, autoClose: 4000 });
    } finally {
      setIsGenerating(false);
    }
  };

  const [settingData, setSettingData] = useState({
    hotspot_name: '',
    dns_name: '',
    cs_phone: '',
    logo_base64: ''
  });

  const fetchData = async () => {
    try {
      const host = window.location.hostname;
      const [vRes, pRes, oRes, sRes, temRes] = await Promise.all([
        fetch(`/api/vouchers`).then(res => res.json()),
        fetch(`/api/profiles`).then(res => res.json()),
        fetch(`/api/outlets`).then(res => res.json()),
        fetch(`/api/settings`).then(res => res.json()),
        fetch(`/api/settings/templates`).then(res => res.json())
      ]);

      setVouchers(Array.isArray(vRes) ? vRes : []);
      setProfiles(Array.isArray(pRes) ? pRes : []);
      setOutlets(Array.isArray(oRes) ? oRes : []);
      setSettings(sRes || {});
      setSettingData(sRes || {});
      setTemplates(Array.isArray(temRes) ? temRes : []);
      
      if (Array.isArray(temRes) && temRes.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(temRes[0].id);
      }
      
      if (Array.isArray(pRes) && pRes.length > 0 && !formData.profile) {
        const firstPhysical = pRes.find(p => !p.show_in_store);
        if (firstPhysical) {
          setFormData(prev => ({ ...prev, profile: firstPhysical.groupname }));
        }
      }

    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const physicalProfiles = profiles.filter(p => !p.show_in_store);

  useEffect(() => {
    fetchData();
  }, []);

  // --- PRINT LOGIC ---
  const handleOpenPrintTab = (toPrint, overrideTemplateId = null) => {
    if (toPrint.length === 0) {
      toast.warning('Pilih minimal 1 voucher untuk diprint');
      return;
    }
    
    if ((overrideTemplateId || selectedTemplateId) === 'no_print') {
      toast.warning('Silakan pilih Design Template terlebih dahulu untuk mencetak!');
      return;
    }
    
    // Simpan data ke localStorage untuk dibaca di tab baru
    localStorage.setItem('print_vouchers_data', JSON.stringify({
      vouchers: toPrint,
      settings: settings,
      profiles: profiles,
      templateId: overrideTemplateId || selectedTemplateId
    }));

    // Buka tab baru
    window.open('/print', '_blank');
  };

  const handlePrintSelected = () => {
    const toPrint = vouchers.filter(v => selectedVouchers.includes(v.voucher_code));
    handleOpenPrintTab(toPrint);
  };

  const handlePrintBatch = () => {
    if (!printCodeInput) return;
    const toPrint = vouchers.filter(v => v.kode_print === printCodeInput);
    if (toPrint.length === 0) {
      toast.error('Kode Print tidak ditemukan!');
      return;
    }
    setIsPrintModalOpen(false);
    handleOpenPrintTab(toPrint);
  };

    const downloadTemplate = () => {
    // We create a basic HTML table that Excel can open as XLS natively
    const xlsContent = 
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        </head>
        <body>
          <table>
            <thead>
              <tr><th>username</th><th>password</th></tr>
            </thead>
            <tbody>
              <tr><td>user1</td><td>pass1</td></tr>
              <tr><td>user2</td><td>pass2</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    ;
    const blob = new Blob([xlsContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_import_voucher.xls");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImportFile(file);
  };

  const handleImportSubmit = async () => {
    if (!importProfile) {
      toast.error('Silakan pilih profile terlebih dahulu');
      return;
    }
    if (!importFile) {
      toast.error('Silakan Upload File XLS');
      return;
    }

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const vouchersToImport = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [username, password] = line.split(',');
        if (username && password) {
          vouchersToImport.push({ 
            username: username.trim().replace(/['"]/g, ''), 
            password: password.trim().replace(/['"]/g, '') 
          });
        }
      }

      if (vouchersToImport.length === 0) {
        toast.error('Tidak ada data voucher valid yang ditemukan di file CSV');
        setIsImporting(false);
        return;
      }

      try {
        const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
        const res = await fetch('/api/vouchers/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: importProfile,
            vouchers: vouchersToImport,
            admin_username: adminData.username || 'admin'
          })
        });

        const data = await res.json();
        if (res.ok) {
          toast.success(`Berhasil mengimport ${data.successCount} voucher`);

          setIsImportModalOpen(false);
          setImportFile(null);
          setImportProfile('');
          fetchData();
        } else {
          toast.error('Gagal import: ' + (data.error || 'Terjadi kesalahan'));
        }
      } catch (err) {
        console.error(err);
        toast.error('Terjadi kesalahan saat memproses import');
      } finally {
        setIsImporting(false);
      }
    };
    
    reader.onerror = () => {
      toast.error('Gagal membaca file');
      setIsImporting(false);
    };

    reader.readAsText(importFile);
  };


  // --- BULK SELECTION LOGIC ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedVouchers(paginatedVouchers.map(v => v.voucher_code));
    } else {
      setSelectedVouchers([]);
    }
  };

  const handleSelectOne = (e, code) => {
    if (e.target.checked) {
      setSelectedVouchers([...selectedVouchers, code]);
    } else {
      setSelectedVouchers(selectedVouchers.filter(v => v !== code));
    }
  };

  const handleBulkAction = async (eOrAction, targetUsernames) => {
    let action = typeof eOrAction === 'string' ? eOrAction : eOrAction.target.value;
    if (!action) return;
    
    const usernamesToProcess = targetUsernames || selectedVouchers;
    if (usernamesToProcess.length === 0) {
      toast.warning('Pilih minimal satu voucher!');
      if (typeof eOrAction !== 'string') eOrAction.target.value = '';
      return;
    }

    if (action === 'cetak') {
      const toPrint = vouchers.filter(v => usernamesToProcess.includes(v.voucher_code));
      handleOpenPrintTab(toPrint);
      if (typeof eOrAction !== 'string') eOrAction.target.value = '';
      return;
    }

    let extraValue = null;
    if (action === 'change_router') {
      const newRouter = prompt('Masukkan nama Router/Outlet baru:');
      if (!newRouter) {
        if (typeof eOrAction !== 'string') eOrAction.target.value = '';
        return;
      }
      extraValue = newRouter;
    }



    triggerConfirm(`Yakin ingin melakukan ${action} pada ${usernamesToProcess.length} voucher terpilih?`, async () => {

      try {

        const host = window.location.hostname;

        const res = await fetch(`/api/vouchers/bulk`, {

          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ 

            action, 

            usernames: usernamesToProcess, 

            value: extraValue,

            admin_username: user?.username || 'admin'

          })

        });

        if (res.ok) {

          await fetchData();

          if (!targetUsernames) setSelectedVouchers([]);

          toast.success(`Berhasil melakukan ${action.replace('_', ' ')} pada ${usernamesToProcess.length} voucher!`);

        } else {

          const result = await res.json().catch(() => ({ error: 'Gagal membaca respon server (Bukan JSON)' }));

          toast.error('Gagal: ' + (result.error || result.message || 'Terjadi kesalahan tidak dikenal'));

        }

      } catch (err) {

        console.error(err);

        toast.error('Gagal koneksi ke server: ' + err.message);

      }

    });

    if (typeof eOrAction !== 'string') eOrAction.target.value = '';
    setActiveActionMenu(null);
  };

  // --- OUTLET LOGIC ---
  const handleCreateOutlet = async (e) => {
    e.preventDefault();
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/outlets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOutletName })
      });
      if (res.ok) {
        setNewOutletName('');
        const updatedOutlets = await fetch(`/api/outlets`).then(r => r.json());
        setOutlets(updatedOutlets);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOutlet = async (id) => {
    try {
      const host = window.location.hostname;
      await fetch(`/api/outlets/${id}`, { method: 'DELETE' });
      setOutlets(outlets.filter(o => o.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // --- SETTING LOGIC ---
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024) {
      toast.warning('Ukuran file maksimal 100KB!');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setSettingData({ ...settingData, logo_base64: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const host = window.location.hostname;
      const res = await fetch(`/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settingData, admin_username: user?.username || 'admin' })
      });
      if (res.ok) {
        setSettings(settingData);
        setIsSettingModalOpen(false);
        toast.success('Setting berhasil disimpan!');
      } else {
        toast.error('Gagal menyimpan setting.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan setting: ' + err.message);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      const host = window.location.hostname;
      const res = await fetch(`/api/vouchers/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_username: user?.username || 'admin',
          qty: parseInt(formData.qty),
          profile: formData.profile,
          length: parseInt(formData.length),
          prefix: formData.prefix,
          charsetType: formData.charsetType,
          macLock: formData.macLock,
          jenis: formData.jenis,
          outletName: formData.outletName
        })
      });

      const result = await res.json();
      if (res.ok) {
        await fetchData();
        setIsGenerateModalOpen(false);
        
        // AUTO OPEN PRINT TAB AFTER GENERATE
        if (result.data && result.data.length > 0) {
          if (selectedTemplateId !== 'no_print') {
            handleOpenPrintTab(result.data);
          } else {
            toast.success('Voucher berhasil di-generate!');
          }
        } else {
          toast.info(result.message);
        }
      } else {
        toast.error('Gagal: ' + result.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      setIsAddingUser(true);
      const host = window.location.hostname;
      const res = await fetch(`/api/vouchers/add-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userFormData,
          admin_username: user?.username || 'admin'
        })
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('User berhasil ditambahkan!');
        setIsAddUserModalOpen(false);
        setUserFormData({ username: '', password: '', outlet_name: '', profile: '', mac_lock: false });
        fetchData();
      } else {
        toast.error('Gagal: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal koneksi ke server');
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDelete = (voucherCode) => {
    triggerConfirm(`Yakin ingin menghapus voucher ${voucherCode}?`, async () => {
      try {
        const host = window.location.hostname;
        const res = await fetch(`/api/vouchers/${voucherCode}?admin_username=${adminData.username || 'admin'}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          await fetchData();
          toast.success(`Berhasil menghapus voucher ${voucherCode}!`);
        } else {
          toast.error(`Gagal menghapus voucher ${voucherCode}`);
        }
      } catch (err) {
        console.error(err);
        toast.error('Gagal koneksi ke server: ' + err.message);
      }
    });
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <span style={{ opacity: 0.3, fontSize: '0.7rem', marginLeft: '5px' }}>?</span>;
    return <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', marginLeft: '5px' }}>{sortConfig.direction === 'asc' ? '?' : '?'}</span>;
  };

  // FILTERING LOGIC
  const filteredVouchers = vouchers
    .filter(v => {
      let match = true;
      if (filterProfile && v.profile !== filterProfile) match = false;
      if (filterOutlet && v.outlet_name !== filterOutlet) match = false;
      const vStatus = v.status || 'Aktif';
      if (filterStatus && vStatus !== filterStatus) match = false;
      if (filterPrintCode) {
        const query = filterPrintCode.toLowerCase();
        const hasVoucherCode = (v.voucher_code || '').toLowerCase().includes(query);
        const hasPrintCode = (v.kode_print || '').toLowerCase().includes(query);
        if (!hasVoucherCode && !hasPrintCode) match = false;
      }
      if (filterDate && v.created_at) {
        const vDate = new Date(v.created_at).toISOString().split('T')[0];
        if (vDate !== filterDate) match = false;
      }
      return match;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      // Handle null/undefined
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage) || 1;
  const paginatedVouchers = filteredVouchers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  useEffect(() => {
    let totalStock = filteredVouchers.length;
    let totalHPP = 0;
    let totalHarga = 0;

    filteredVouchers.forEach(v => {
      const p = profiles.find(prof => prof.groupname === v.profile);
      if (p) {
        const harga = Number(p.harga) || 0;
        const komisi = Number(p.komisi) || 0;
        totalHarga += harga;
        totalHPP += (harga - komisi);
      }
    });

    setSummaryStats({ totalStock, totalHPP, totalHarga });
  }, [filteredVouchers, profiles]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedVouchers([]);
  }, [filterProfile, filterOutlet, filterStatus, filterPrintCode, filterDate, itemsPerPage]);

  // Bulk Menu State
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
  const [isEditActive, setIsEditActive] = useState(false);




  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setIsBulkMenuOpen(false);
    if (isBulkMenuOpen) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isBulkMenuOpen]);

  // --- LOADING STATE ---
  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Memuat data stock...</div>;
  }

  return (
    <div className="stock-voucher">
      <style>{`
        .password-reveal {
          cursor: pointer;
          min-width: 100px;
          text-align: left;
          padding-left: 5px;
        }
        .password-reveal .masked {
          color: #ffffff !important;
          font-weight: 900 !important;
          letter-spacing: 2px !important;
          display: inline-block !important;
        }
        .password-reveal .unmasked {
          display: none !important;
        }
        .password-reveal:hover .masked {
          display: none !important;
        }
        .password-reveal:hover .unmasked {
          display: inline-block !important;
          font-weight: 800 !important;
          color: #00ffcc !important;
          font-family: monospace !important;
          text-shadow: 0 0 10px rgba(0, 255, 204, 0.6) !important;
        }
        .hoverable-row:hover {
          background: rgba(255,255,255,0.08) !important;
        }
      `}</style>

            <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.8rem', margin: 0 }}>Stock Voucher</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '5px 0 0' }}>Manajemen pembuatan dan daftar stok voucher hotspot</p>
      </div>

      {/* STATS CARDS (Dashboard Card Style) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ borderTop: '2px solid rgba(139, 92, 246, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)', padding: '12px', borderRadius: '14px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(139, 92, 246, 0.2)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>inventory_2</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Jumlah Stock Voucher</div>
              <div className="stat-value" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
                {summaryStats.totalStock} <span style={{ fontSize: '1.2rem', fontWeight: '400', opacity: 0.5 }}>pcs</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ borderTop: '2px solid rgba(245, 158, 11, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '12px', borderRadius: '14px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(245, 158, 11, 0.2)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>account_balance_wallet</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Total HPP (Modal)</div>
              <div className="stat-value" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summaryStats.totalHPP)}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ borderTop: '2px solid rgba(16, 185, 129, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '12px', borderRadius: '14px', display: 'flex', color: 'white', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.8rem' }}>payments</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Total Harga (Jual)</div>
              <div className="stat-value" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summaryStats.totalHarga)}
              </div>
            </div>
          </div>
        </div>
      </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
          
          {/* MENU BUTTON */}
          <div style={{ position: 'relative' }}>
            <button 
              className="btn-glass-premium btn-purple" 
              onClick={(e) => { e.stopPropagation(); setIsBulkMenuOpen(!isBulkMenuOpen); }}
            >
              <span className="material-symbols-rounded">menu</span>
              <span>MENU</span>
            </button>
            <div className={"dropdown-menu-container " + (isBulkMenuOpen ? 'show' : '')} style={{ left: '0', top: '110%' }}>
              <div className="dropdown-item" onClick={() => handleBulkAction('cetak')}><span className="material-symbols-rounded">print</span> CETAK TERPILIH</div>
              <div className="dropdown-item" onClick={() => handleBulkAction('lock_mac')}><span className="material-symbols-rounded">lock</span> LOCK MAC (Auto Bind)</div>
              <div className="dropdown-item" onClick={() => handleBulkAction('unlock_mac')}><span className="material-symbols-rounded">lock_open</span> RESET MAC LOCK (Unbind)</div>
              <div className="dropdown-item" onClick={() => handleBulkAction('disable_mac_lock')}><span className="material-symbols-rounded" style={{ color: '#ef4444' }}>block</span> DISABLE MAC LOCK</div>
              <div className="dropdown-item" onClick={() => handleBulkAction('set_aktif')}><span className="material-symbols-rounded" style={{ color: '#10b981' }}>check_circle</span> SET AKTIF</div>
              <div className="dropdown-item" onClick={() => handleBulkAction('set_nonaktif')}><span className="material-symbols-rounded">do_not_disturb_on</span> NON AKTIF</div>
              <div className="dropdown-item" onClick={() => handleBulkAction('change_router')}><span className="material-symbols-rounded">router</span> GANTI ROUTER</div>
              <div className="dropdown-item danger" onClick={() => handleBulkAction('delete')} style={{ borderTop: '1px solid var(--border-color)', marginTop: '5px' }}>
                <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>delete</span> HAPUS
              </div>
            </div>
          </div>

          <button className="btn-glass-premium btn-green" onClick={() => setIsPresetModalOpen(true)}>
            <span className="material-symbols-rounded">bolt</span>
            <span>PRINT CEPAT</span>
          </button>

          <button className="btn-glass-premium btn-purple" onClick={() => setIsPrintModalOpen(true)}>
            <span className="material-symbols-rounded">print</span>
            <span>PRINT</span>
          </button>
          
          <button className="btn-glass-premium btn-rose" onClick={() => setIsOutletModalOpen(true)}>
            <span className="material-symbols-rounded">storefront</span>
            <span>Outlet</span>
          </button>
          
          <button className="btn-glass-premium btn-cyan" onClick={() => setIsSettingModalOpen(true)}>
            <span className="material-symbols-rounded" style={{ color: '#f59e0b' }}>settings</span>
            <span>Setting</span>
          </button>
          


          <button className="btn-glass-premium btn-blue" onClick={() => setIsGenerateModalOpen(true)}>
            <span className="material-symbols-rounded" style={{ color: '#10b981' }}>add_circle</span>
            <span>Generate</span>
          </button>

                    <button className="btn-glass-premium btn-green" onClick={() => setIsAddUserModalOpen(true)}>
            <span className="material-symbols-rounded">person_add</span>
            <span>Buat User</span>
          </button>
          
          <button type="button" className="btn-glass-premium btn-blue" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsImportModalOpen(true); }}>
            <span className="material-symbols-rounded">upload_file</span>
            <span>Import</span>
          </button>
        </div>

      <div style={{ marginBottom: '2rem' }}>
        {/* ACTION BAR ABOVE TABLE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
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
              <option value="50" style={{ background: '#1d0f15' }}>50</option>
              <option value="100" style={{ background: '#1d0f15' }}>100</option>
            </select>
            entries
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select className="form-input" value={filterProfile} onChange={e => {setFilterProfile(e.target.value); setCurrentPage(1);}} style={{ width: '150px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}>
                <option value="" style={{ background: '#1d0f15' }}>ALL PROFILE</option>
                {physicalProfiles.map((p, i) => <option key={i} value={p.groupname} style={{ background: '#1d0f15' }}>{p.groupname}</option>)}
              </select>
              <select className="form-input" value={filterOutlet} onChange={e => {setFilterOutlet(e.target.value); setCurrentPage(1);}} style={{ width: '150px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}>
                <option value="" style={{ background: '#1d0f15' }}>ALL OUTLET</option>
                {outlets.map((o, i) => <option key={i} value={o.name} style={{ background: '#1d0f15' }}>{o.name}</option>)}
              </select>
              <select className="form-input" value={filterStatus} onChange={e => {setFilterStatus(e.target.value); setCurrentPage(1);}} style={{ width: '150px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}>
                <option value="" style={{ background: '#1d0f15' }}>ALL STATUS</option>
                <option value="Aktif" style={{ background: '#1d0f15' }}>AKTIF</option>
                <option value="Nonaktif" style={{ background: '#1d0f15' }}>NON AKTIF</option>
              </select>
              <input 
                type="date" 
                className="form-input" 
                value={filterDate} 
                onChange={e => {setFilterDate(e.target.value); setCurrentPage(1);}} 
                style={{ width: '150px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }} 
              />
            </div>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Search:</span>
            <input 
              type="text" 
              placeholder="Cari Voucher / Kode Print..." 
              value={filterPrintCode}
              onChange={(e) => {
                setFilterPrintCode(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input"
              style={{ width: '220px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}
            />
          </div>
        </div>

        {/* Voucher List Table */}
        <div className="glass-card" style={{ padding: '0' }}>
            {isLoading ? (
              <p style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</p>
            ) : (
              <>
                <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input type="checkbox" onChange={handleSelectAll} checked={paginatedVouchers.length > 0 && selectedVouchers.length === paginatedVouchers.length} />
                    </th>
                    <th onClick={() => requestSort('voucher_code')} style={{ cursor: 'pointer' }}>Kode Voucher {getSortIcon('voucher_code')}</th>
                    <th>Password</th>
                    <th onClick={() => requestSort('profile')} style={{ cursor: 'pointer' }}>Profile {getSortIcon('profile')}</th>
                    <th onClick={() => requestSort('shared_users')} style={{ cursor: 'pointer', textAlign: 'center' }}>Shared {getSortIcon('shared_users')}</th>
                    <th onClick={() => requestSort('kode_print')} style={{ cursor: 'pointer' }}>Kode {getSortIcon('kode_print')}</th>
                    <th onClick={() => requestSort('created_at')} style={{ cursor: 'pointer' }}>Tgl Pembuatan {getSortIcon('created_at')}</th>
                    <th onClick={() => requestSort('outlet_name')} style={{ cursor: 'pointer' }}>Outlet {getSortIcon('outlet_name')}</th>
                    <th onClick={() => requestSort('status')} style={{ cursor: 'pointer' }}>Status {getSortIcon('status')}</th>
                    <th style={{ textAlign: 'center' }}>Lock Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVouchers.length === 0 ? (
                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: '3rem' }}>Data tidak ditemukan.</td></tr>
                  ) : (
                    paginatedVouchers.map((v, i) => {
                      const dDate = new Date(v.created_at);
                      const formattedDate = formatDateTime(dDate);
                      return (
                        <tr key={i} className="hoverable-row" style={{ verticalAlign: 'middle', opacity: v.status === 'Nonaktif' ? 0.6 : 1, background: v.status === 'Nonaktif' ? 'rgba(239, 68, 68, 0.02)' : 'transparent' }}>
                          <td style={{ textAlign: 'center' }}><input type="checkbox" checked={selectedVouchers.includes(v.voucher_code)} onChange={(e) => handleSelectOne(e, v.voucher_code)} /></td>
                          <td>
                            <div style={{ fontWeight: '700' }}>
                              {v.voucher_code}
                            </div>
                          </td>
                          <td className="password-reveal">
                            <span className="masked">******</span>
                            <span className="unmasked">{v.password || v.voucher_code}</span>
                          </td>
                          <td><span className="badge" style={{ background: 'var(--accent-primary)', minWidth: '80px', textAlign: 'center', fontWeight: '700' }}>{v.profile}</span></td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', background: 'rgba(255,255,255,0.08)', padding: '0.3rem 0.6rem', borderRadius: '4px', display: 'inline-block' }}>
                              {v.shared_users || 1} User
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>{v.kode_print || '-'}</td>
                          <td style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>{formattedDate}</td>
                          <td style={{ fontWeight: '600' }}>{v.outlet_name || '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span 
                              className="badge" 
                              style={{ 
                                minWidth: '70px', 
                                textAlign: 'center', 
                                fontWeight: '700',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: v.status === 'Nonaktif' ? 'rgba(239, 68, 68, 0.15)' : v.status === 'Aktif' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: v.status === 'Nonaktif' ? '#ef4444' : v.status === 'Aktif' ? '#10b981' : '#f59e0b',
                                border: '1px solid ' + (v.status === 'Nonaktif' ? 'rgba(239, 68, 68, 0.25)' : v.status === 'Aktif' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)')
                              }}
                            >
                              {v.status || 'Aktif'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.75rem' }}>
                            {v.mac_lock_enabled ? (
                              <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>lock</span> LOCKED</span>
                            ) : (
                              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>lock_open</span> UNLOCKED</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1.5rem' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                Terpilih: {selectedVouchers.length} | Menampilkan {filteredVouchers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(filteredVouchers.length, currentPage * itemsPerPage)} dari {filteredVouchers.length} Voucher
              </p>
<div className="pagination-wrapper">
  <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>Prev</button>
  <div className="pagination-text">{currentPage} / {totalPages}</div>
  <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages}>Next</button>
</div>
            </div>
          </>
        )}
      </div>
    </div>

      {/* MODAL PRINT CEPAT (PRESET) */}
      <div className={`modal-overlay ${isPresetModalOpen ? 'open' : ''}`} onClick={() => setIsPresetModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
          <div className="modal-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: '#10b981' }}>bolt</span>
              Print Cepat (Generate Presets)
            </h2>
            <button className="modal-close" onClick={() => setIsPresetModalOpen(false)}>&times;</button>
          </div>
          <div style={{ marginTop: '1rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Daftar template voucher yang telah Anda simpan. Klik tombol Generate & Print untuk otomatis membuat dan mencetak voucher.
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama Preset</th>
                  <th>Profile</th>
                  <th>Prefix / Panjang</th>
                  <th>Server</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {presets.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada preset tersimpan. Anda bisa menyimpan preset dari form Generate Voucher.</td></tr>
                ) : (
                  presets.map((p, i) => (
                    <tr key={i} className="hoverable-row">
                      <td style={{ fontWeight: '700', color: 'white' }}>{p.preset_name}</td>
                      <td><span className="badge" style={{ background: 'var(--accent-primary)', fontWeight: '700' }}>{p.profile}</span></td>
                      <td>{p.prefix || '-'} / {p.panjang_user} char</td>
                      <td>{p.server || 'All'}</td>
                      <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button type="button" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleExecutePresetClick(p)}>
                          <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>rocket_launch</span> Generate & Print
                        </button>
                        <button type="button" className="btn btn-warning" style={{ padding: '6px', background: '#f59e0b', color: 'white', border: 'none' }} onClick={() => handleEditPresetClick(p)}>
                          <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>edit</span>
                        </button>
                        <button type="button" className="btn btn-danger" style={{ padding: '6px' }} onClick={() => handleDeletePreset(p.id)}>
                          <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL GENERATE */}
      <div className={`modal-overlay ${isGenerateModalOpen ? 'open' : ''}`} onClick={() => !isGenerating && setIsGenerateModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Generate Voucher Baru</h2>
            <button className="modal-close" onClick={() => setIsGenerateModalOpen(false)}>&times;</button>
          </div>
          
          <form onSubmit={handleGenerate}>
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Jenis Voucher</label>
                  <select name="jenis" className="form-input" value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value})}>
                    <option value="UP">Username = Password</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Profile / Paket *</label>
                  <select name="profile" className="form-input" value={formData.profile} onChange={e => setFormData({...formData, profile: e.target.value})} required>
                    <option value="">-- Pilih Profile --</option>
                    {physicalProfiles.map((p, i) => <option key={i} value={p.groupname}>{p.groupname}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Outlet Pemilik</label>
                  <select name="outletName" className="form-input" value={formData.outletName} onChange={e => setFormData({...formData, outletName: e.target.value})}>
                    <option value="">-- Kosongkan --</option>
                    {outlets.map((o, i) => <option key={i} value={o.name}>{o.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Prefix (Awalan)</label>
                  <input type="text" name="prefix" className="form-input" value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} placeholder="Opsional" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Kode Kombinasi</label>
                  <select name="charsetType" className="form-input" value={formData.charsetType} onChange={e => setFormData({...formData, charsetType: e.target.value})}>
                    <option value="lower">Huruf Kecil (abcdefg...)</option>
                    <option value="upper">Huruf Kapital (ABCDEFG...)</option>
                    <option value="numeric">Angka Saja (123456...)</option>
                    <option value="alpha_num">Angka & Huruf</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Jumlah</label>
                  <input type="number" name="qty" className="form-input" min="1" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Panjang</label>
                  <input type="number" name="length" className="form-input" min="3" value={formData.length} onChange={e => setFormData({...formData, length: e.target.value})} required />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input type="checkbox" name="macLock" checked={formData.macLock} onChange={e => setFormData({...formData, macLock: e.target.checked})} style={{ width: '1.2rem', height: '1.2rem' }} />
                  <span>Lock Mac (Auto Bind)</span>
                </label>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Pilih Design Template</label>
                <select 
                  className="form-input" 
                  value={selectedTemplateId || ''} 
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="no_print">-- Tidak di Print --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.template_name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-primary" style={{ background: '#6366f1', borderColor: '#6366f1' }} onClick={handleSavePresetClick} disabled={isSavingPreset || !formData.profile}>
                  {isSavingPreset ? 'MENYIMPAN...' : '⭐ Simpan sbg Preset'}
                </button>
                <button type="button" className="btn" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} onClick={() => setIsGenerateModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isGenerating || profiles.length === 0}>
                  {isGenerating ? 'MENYIMPAN...' : 'Generate Voucher'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL OUTLET */}
      <div className={`modal-overlay ${isOutletModalOpen ? 'open' : ''}`} onClick={() => setIsOutletModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Manajemen Outlet</h2>
            <button className="modal-close" onClick={() => setIsOutletModalOpen(false)}>&times;</button>
          </div>
          <form onSubmit={handleCreateOutlet} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <input type="text" className="form-input" placeholder="Nama Outlet Baru..." value={newOutletName} onChange={e => setNewOutletName(e.target.value)} required style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary">Tambah</button>
          </form>
          <table className="data-table">
            <thead>
              <tr><th>Nama Outlet</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {outlets.map((o, i) => (
                <tr key={i}>
                  <td>{o.name}</td>
                  <td style={{ width: '80px' }}><button className="btn btn-danger" onClick={() => handleDeleteOutlet(o.id)}>Hapus</button></td>
                </tr>
              ))}
              {outlets.length === 0 && <tr><td colSpan="2" style={{ textAlign: 'center' }}>Belum ada data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL SETTING */}
      <div className={`modal-overlay ${isSettingModalOpen ? 'open' : ''}`} onClick={() => setIsSettingModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Setting Hotspot</h2>
            <button className="modal-close" onClick={() => setIsSettingModalOpen(false)}>&times;</button>
          </div>
          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label className="form-label">Nama Hotspot</label>
              <input type="text" className="form-input" value={settingData.hotspot_name || ''} onChange={e => setSettingData({...settingData, hotspot_name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">DNS Name</label>
              <input type="text" className="form-input" value={settingData.dns_name || ''} onChange={e => setSettingData({...settingData, dns_name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">CS Phone (Opsional)</label>
              <input type="text" className="form-input" value={settingData.cs_phone || ''} onChange={e => setSettingData({...settingData, cs_phone: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Upload Logo (Max 100KB)</label>
              <input type="file" className="form-input" accept="image/*" onChange={handleLogoUpload} style={{ padding: '0.4rem' }} />
              {settingData.logo_base64 && <img src={settingData.logo_base64} alt="Preview" style={{ height: '50px', marginTop: '1rem', borderRadius: '4px' }} />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary">SIMPAN</button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL PRINT ULANG */}
      <div className={`modal-overlay ${isPrintModalOpen ? 'open' : ''}`} onClick={() => setIsPrintModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Print Ulang Voucher</h2>
            <button className="modal-close" onClick={() => setIsPrintModalOpen(false)}>&times;</button>
          </div>
          <div className="form-group">
            <label className="form-label">Masukkan Kode Print (11 Digit)</label>
            <input type="text" className="form-input" placeholder="Contoh: 15482910394" value={printCodeInput} onChange={e => setPrintCodeInput(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Pilih Design Template</label>
            <select 
              className="form-input" 
              value={selectedTemplateId || ''} 
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.template_name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" onClick={handlePrintBatch}>
              Lanjutkan Cetak ???
            </button>
          </div>
        </div>
      </div>

      
      {/* MODAL IMPORT DATA */}
      {isImportModalOpen && (
        <div className="modal-overlay open" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--accent-primary)' }}>upload_file</span>
                IMPORT VOUCHER
              </h2>
              <button className="modal-close" onClick={() => setIsImportModalOpen(false)}>&times;</button>
            </div>
            <div style={{ padding: '1.5rem 0' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Pilih Profile (Paket)</label>
                <select
                  className="form-input"
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  value={importProfile}
                  onChange={e => setImportProfile(e.target.value)}
                >
                  <option value="" disabled style={{ background: '#1e1b1e' }}>-- Pilih Profile --</option>
                  {physicalProfiles.map(p => (
                    <option key={p.groupname} value={p.groupname} style={{ background: '#1e1b1e' }}>{p.groupname}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Upload File XLS</label>
                <input 
                  type="file" 
                  accept=".xls,.csv"
                  className="form-input"
                  onChange={handleFileChange}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                />
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small style={{ color: 'var(--text-secondary)' }}>Format: username, password</small>
                  <button type="button" className="btn-glass-premium btn-blue" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={downloadTemplate}>
                    <span className="material-symbols-rounded" style={{ color: '#3b82f6', fontSize: '1rem' }}>download</span> Template
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-glass-premium btn-red" onClick={() => setIsImportModalOpen(false)}>Batal</button>
              <button type="button" className="btn-glass-premium btn-green" onClick={handleImportSubmit} disabled={isImporting}>
                <span className="material-symbols-rounded">{isImporting ? 'hourglass_empty' : 'upload'}</span>
                {isImporting ? 'Memproses...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH USER */}
      <div className={`modal-overlay ${isAddUserModalOpen ? 'open' : ''}`} onClick={() => !isAddingUser && setIsAddUserModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
          <div className="modal-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded" style={{ color: '#10b981' }}>person_add</span>
              Tambah User Baru
            </h2>
            <button className="modal-close" onClick={() => setIsAddUserModalOpen(false)}>&times;</button>
          </div>
          
          <form onSubmit={handleAddUser}>
            <div style={{ display: 'flex', gap: '1.2rem', flexDirection: 'column', padding: '1rem 0' }}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Masukkan username..." 
                  value={userFormData.username}
                  onChange={e => setUserFormData({...userFormData, username: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Masukkan password..." 
                  value={userFormData.password}
                  onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Outlet / Lokasi</label>
                <select 
                  className="form-input"
                  value={userFormData.outlet_name}
                  onChange={e => setUserFormData({...userFormData, outlet_name: e.target.value})}
                >
                  <option value="">-- Pilih Outlet (Opsional) --</option>
                  {outlets.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Profile / Paket *</label>
                <select 
                  className="form-input" 
                  value={userFormData.profile} 
                  onChange={e => setUserFormData({...userFormData, profile: e.target.value})} 
                  required
                >
                  <option value="">-- Pilih Profile --</option>
                  {physicalProfiles.map((p, i) => <option key={i} value={p.groupname}>{p.groupname}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <input 
                  type="checkbox" 
                  id="userMacLock"
                  checked={userFormData.mac_lock}
                  onChange={e => setUserFormData({...userFormData, mac_lock: e.target.checked})}
                />
                <label htmlFor="userMacLock" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>Lock MAC Address (Auto Bind pada login pertama)</label>
              </div>
            </div>
            
            <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setIsAddUserModalOpen(false)} disabled={isAddingUser} style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>Batal</button>
              <button type="submit" className="btn" disabled={isAddingUser} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: '700', padding: '0.7rem 2rem' }}>
                {isAddingUser ? 'Memproses...' : 'SIMPAN'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .btn-glass-premium {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50px;
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .btn-glass-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
        }

        .btn-glass-premium .material-symbols-rounded {
          font-size: 20px;
        }

        .btn-purple:hover { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .btn-rose:hover { border-color: #f43f5e; background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
        .btn-cyan:hover { border-color: #06b6d4; background: rgba(6, 182, 212, 0.1); color: #06b6d4; }
        .btn-blue:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .btn-green:hover { border-color: #10b981; background: rgba(16, 185, 129, 0.1); color: #10b981; }

        .btn-purple .material-symbols-rounded { color: #8b5cf6; }
        .btn-rose .material-symbols-rounded { color: #f43f5e; }
        .btn-cyan .material-symbols-rounded { color: #06b6d4; }
        .btn-blue .material-symbols-rounded { color: #3b82f6; }
        .btn-green .material-symbols-rounded { color: #10b981; }

        .hoverable-row:hover {
          background: rgba(255,255,255,0.08) !important;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .data-table th, .data-table td {
          white-space: nowrap;
          padding: 14px 18px;
          vertical-align: middle;
          text-align: center;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .data-table th {
          font-weight: 800;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-primary);
          background: rgba(255,255,255,0.05);
        }
        .data-table td {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .table-container {
          overflow-x: auto;
          width: 100%;
          border-radius: 12px;
        }
      `}</style>

      {/* MODAL SIMPAN PRESET */}
      <div className={`modal-overlay ${isSavePresetPromptOpen ? 'open' : ''}`} onClick={() => setIsSavePresetPromptOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
          <div className="modal-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded" style={{ color: '#10b981' }}>bookmark_add</span>
              Simpan Preset / Shortcut
            </h2>
            <button className="modal-close" onClick={() => setIsSavePresetPromptOpen(false)}>&times;</button>
          </div>
          
          <form onSubmit={executeSavePreset}>
            <div style={{ padding: '1.5rem 0' }}>
              <label className="form-label">Nama Preset</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Misal: 1 Hari 50pcs" 
                value={presetNameInput}
                onChange={e => setPresetNameInput(e.target.value)}
                autoFocus
                required 
              />
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                Preset akan menyimpan pengaturan profil, harga, dan kuantitas saat ini untuk mempercepat pembuatan voucher berikutnya.
              </p>
            </div>
            
            <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-glass-premium btn-red" onClick={() => setIsSavePresetPromptOpen(false)}>Batal</button>
              <button type="submit" className="btn-glass-premium btn-green">
                <span className="material-symbols-rounded">save</span>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL EXECUTE PRESET */}
      <div className={`modal-overlay ${isExecutePresetModalOpen ? 'open' : ''}`} onClick={() => setIsExecutePresetModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
          <div className="modal-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded" style={{ color: '#10b981' }}>rocket_launch</span>
              Generate Voucher
            </h2>
            <button className="modal-close" onClick={() => setIsExecutePresetModalOpen(false)}>&times;</button>
          </div>
          
          <form onSubmit={executePreset}>
            <div style={{ padding: '1.5rem 0' }}>
              <label className="form-label">Berapa jumlah voucher yang ingin di-generate?</label>
              <input 
                type="number" 
                className="form-input" 
                min="1"
                max="1000"
                value={executeQtyInput}
                onChange={e => setExecuteQtyInput(e.target.value)}
                autoFocus
                required 
                style={{ fontSize: '1.2rem', padding: '12px', textAlign: 'center' }}
              />
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '12px', textAlign: 'center' }}>
                Preset: <strong>{presetToExecute?.preset_name}</strong>
              </p>
            </div>
            
            <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-glass-premium btn-red" onClick={() => setIsExecutePresetModalOpen(false)}>Batal</button>
              <button type="submit" className="btn-glass-premium btn-green" disabled={isGenerating}>
                <span className="material-symbols-rounded">play_arrow</span>
                {isGenerating ? 'Memproses...' : 'Generate'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL EDIT PRESET */}
      <div className={`modal-overlay ${isEditPresetModalOpen ? 'open' : ''}`} onClick={() => setIsEditPresetModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
          <div className="modal-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded" style={{ color: '#f59e0b' }}>edit_note</span>
              Edit Preset / Shortcut
            </h2>
            <button className="modal-close" onClick={() => setIsEditPresetModalOpen(false)}>&times;</button>
          </div>
          
          {editPresetFormData && (
            <form onSubmit={executeEditPreset}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem 0' }}>
                <div className="form-group">
                  <label className="form-label">Nama Preset</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editPresetFormData.preset_name}
                    onChange={e => setEditPresetFormData({...editPresetFormData, preset_name: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Profile / Paket</label>
                  <select 
                    className="form-input" 
                    value={editPresetFormData.profile}
                    onChange={e => setEditPresetFormData({...editPresetFormData, profile: e.target.value})}
                    required
                  >
                    <option value="">-- Pilih Profile --</option>
                    {physicalProfiles.map((p, i) => <option key={i} value={p.groupname}>{p.groupname}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Prefix</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editPresetFormData.prefix}
                      onChange={e => setEditPresetFormData({...editPresetFormData, prefix: e.target.value})}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Panjang</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="1" max="16"
                      value={editPresetFormData.panjang_user}
                      onChange={e => setEditPresetFormData({...editPresetFormData, panjang_user: parseInt(e.target.value) || 6, panjang_pass: parseInt(e.target.value) || 6})}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Server / Outlet</label>
                  <select 
                    className="form-input"
                    value={editPresetFormData.server}
                    onChange={e => setEditPresetFormData({...editPresetFormData, server: e.target.value})}
                  >
                    <option value="">-- All Server --</option>
                    {outlets.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Design Template Printer</label>
                  <select 
                    className="form-input"
                    value={editPresetFormData.template_id || ''}
                    onChange={e => setEditPresetFormData({...editPresetFormData, template_id: e.target.value})}
                  >
                    <option value="">-- Gunakan Pilihan Saat Ini --</option>
                    <option value="no_print">Jangan Print (Hanya Generate)</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.template_name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-glass-premium btn-red" onClick={() => { setIsEditPresetModalOpen(false); setIsPresetModalOpen(true); }}>Batal</button>
                <button type="submit" className="btn-glass-premium btn-warning" disabled={isSavingPreset} style={{ color: '#fff', borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
                  <span className="material-symbols-rounded">save</span>
                  {isSavingPreset ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
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

export default StockVoucher;

