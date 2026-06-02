import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const GdriveBackup = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  
  const [serviceEmail, setServiceEmail] = useState('');
  const [settings, setSettings] = useState({
    folder_id: '',
    cron_time: '0 2 * * *',
    is_enabled: 0
  });
  const [lastBackup, setLastBackup] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchData();
    fetchLogs();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/gdrive-backup');
      setServiceEmail(res.data.serviceEmail);
      if (res.data.settings) setSettings(res.data.settings);
      setLastBackup(res.data.lastBackup);
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil data pengaturan backup');
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await axios.get('/api/gdrive-backup/logs');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post('/api/gdrive-backup/settings', settings);
      toast.success('Pengaturan backup berhasil disimpan');
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleBackupNow = async () => {
    if (!settings.folder_id) {
      toast.error('Folder ID harus diisi terlebih dahulu!');
      return;
    }
    setBackingUp(true);
    try {
      const res = await axios.post('/api/gdrive-backup/trigger');
      toast.success('Backup berhasil diselesaikan!');
      fetchData();
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Proses backup gagal');
    } finally {
      setBackingUp(false);
    }
  };

  if (loading) {
    return <div className="page-container"><p style={{color:'white'}}>Loading...</p></div>;
  }

  // Linear Design Inspired Styling
  const styles = {
    container: {
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      color: '#f7f8f8',
      fontFamily: '"Inter", sans-serif'
    },
    header: {
      fontSize: '28px',
      fontWeight: '600',
      marginBottom: '24px',
      letterSpacing: '-0.6px'
    },
    card: {
      backgroundColor: '#0f1011',
      border: '1px solid #23252a',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px'
    },
    input: {
      width: '100%',
      backgroundColor: '#0f1011',
      border: '1px solid #23252a',
      color: '#f7f8f8',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '14px',
      marginTop: '6px',
      outline: 'none',
      boxSizing: 'border-box'
    },
    label: {
      fontSize: '13px',
      fontWeight: '500',
      color: '#d0d6e0',
      display: 'block',
      marginBottom: '4px'
    },
    primaryBtn: {
      backgroundColor: '#5e6ad2',
      color: '#ffffff',
      border: 'none',
      padding: '8px 14px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    secondaryBtn: {
      backgroundColor: '#0f1011',
      color: '#f7f8f8',
      border: '1px solid #23252a',
      padding: '8px 14px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '16px'
    },
    th: {
      textAlign: 'left',
      padding: '12px 8px',
      color: '#8a8f98',
      fontSize: '12px',
      borderBottom: '1px solid #23252a',
      fontWeight: '400'
    },
    td: {
      padding: '16px 8px',
      fontSize: '14px',
      color: '#d0d6e0',
      borderBottom: '1px solid #23252a'
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Google Drive Backup</h1>

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', margin: '0 0 8px 0', fontWeight: '500' }}>Email Service Account</h2>
            <p style={{ color: '#8a8f98', fontSize: '14px', margin: 0 }}>
              Buat folder baru di Google Drive Anda, lalu klik "Share" (Bagikan). Masukkan alamat email di bawah ini dan beri akses sebagai <strong>Editor</strong>.
            </p>
          </div>
        </div>
        {serviceEmail === 'NOT_CONFIGURED' ? (
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            color: '#ef4444'
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '20px', marginTop: '2px' }}>warning</span>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>Service Account Belum Dikonfigurasi</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#fca5a5', lineHeight: '1.5' }}>
                Sistem tidak menemukan file kredensial Google Drive Anda. Silakan ikuti panduan di dokumentasi untuk mengunduh <code>service-account.json</code> dari Google Cloud, lalu letakkan di folder <code>backend/config/</code> pada server Anda.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#010102', 
            borderRadius: '8px', 
            border: '1px solid #23252a',
            fontFamily: 'monospace',
            color: '#5e6ad2',
            fontSize: '16px'
          }}>
            {serviceEmail}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* Status Card */}
        <div style={styles.card}>
          <h2 style={{ fontSize: '16px', margin: '0 0 16px 0', fontWeight: '500', color: '#8a8f98' }}>Status Terakhir</h2>
          {lastBackup ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span className="material-symbols-rounded" style={{ color: lastBackup.status === 'success' ? '#27a644' : '#ef4444' }}>
                  {lastBackup.status === 'success' ? 'check_circle' : 'error'}
                </span>
                <span style={{ fontSize: '18px', fontWeight: '600' }}>
                  {lastBackup.status === 'success' ? 'Berhasil' : 'Gagal'}
                </span>
              </div>
              <p style={{ color: '#d0d6e0', fontSize: '13px', margin: '0 0 4px 0' }}>{new Date(lastBackup.created_at).toLocaleString('id-ID')}</p>
              <p style={{ color: '#8a8f98', fontSize: '13px', margin: 0 }}>Ukuran: {lastBackup.file_size}</p>
            </div>
          ) : (
            <p style={{ color: '#8a8f98', fontSize: '14px' }}>Belum ada backup tercatat.</p>
          )}
        </div>

        {/* Configuration Card */}
        <div style={styles.card}>
          <h2 style={{ fontSize: '16px', margin: '0 0 16px 0', fontWeight: '500', color: '#8a8f98' }}>Konfigurasi & Penjadwalan</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={styles.label}>GDrive Folder ID</label>
            <input 
              type="text" 
              style={styles.input} 
              placeholder="Contoh: 1A2b3C4d5E6f..." 
              value={settings.folder_id}
              onChange={e => setSettings({...settings, folder_id: e.target.value})}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>Jam Berapa Backup Dilakukan?</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="time" 
                style={{...styles.input, maxWidth: '150px'}} 
                value={(function() {
                  try {
                    const parts = settings.cron_time.split(' ');
                    const min = parts[0];
                    const hr = parts[1];
                    return `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                  } catch (e) {
                    return '02:00';
                  }
                })()}
                onChange={e => {
                  const val = e.target.value; // e.g. "02:30"
                  if (val) {
                    const [hr, min] = val.split(':');
                    setSettings({...settings, cron_time: `${parseInt(min, 10)} ${parseInt(hr, 10)} * * *`});
                  }
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <input 
                  type="checkbox" 
                  checked={settings.is_enabled === 1}
                  onChange={e => setSettings({...settings, is_enabled: e.target.checked ? 1 : 0})}
                />
                <span style={{ fontSize: '13px', color: '#d0d6e0' }}>Aktifkan Backup Otomatis</span>
              </div>
            </div>
            <p style={{ color: '#8a8f98', fontSize: '12px', marginTop: '6px', margin: '4px 0 0 0' }}>
              Sistem akan melakukan ekspor database harian pada jam yang Anda tentukan. File berumur di atas 7 hari akan dihapus otomatis (Rolling 7 Hari).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button 
              style={{...styles.primaryBtn, opacity: saving ? 0.7 : 1}} 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : 'Save Settings'}
            </button>
            <button 
              style={{...styles.secondaryBtn, opacity: backingUp ? 0.7 : 1}} 
              onClick={handleBackupNow} 
              disabled={backingUp}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>cloud_upload</span>
              {backingUp ? 'Memproses...' : 'Backup Now'}
            </button>
          </div>
        </div>
      </div>

      {/* History Card */}
      <div style={styles.card}>
        <h2 style={{ fontSize: '18px', margin: '0 0 16px 0', fontWeight: '500' }}>Riwayat Backup</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Waktu Backup</th>
                <th style={styles.th}>Nama File</th>
                <th style={styles.th}>Ukuran</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? logs.map(log => (
                <tr key={log.id}>
                  <td style={styles.td}>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                  <td style={styles.td}><span style={{fontFamily: 'monospace', color: '#8a8f98'}}>{log.file_name}</span></td>
                  <td style={styles.td}>{log.file_size}</td>
                  <td style={styles.td}>
                    <span style={{ 
                      backgroundColor: log.status === 'success' ? 'rgba(39, 166, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: log.status === 'success' ? '#27a644' : '#ef4444',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {log.status === 'success' ? 'Success' : 'Failed'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{...styles.td, textAlign: 'center', color: '#8a8f98'}}>Belum ada riwayat backup</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GdriveBackup;
