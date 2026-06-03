import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDateTime } from '../utils/dateFormatter';

const Backup = () => {
  const [activeTab, setActiveTab] = useState('local');
  const [telegramSettings, setTelegramSettings] = useState({ bot_token: '', chat_id: '', cron_time: '0 2 * * *', is_enabled: 0 });
  const [ftpSettings, setFtpSettings] = useState({ host: '', port: 21, username: '', password: '', remote_path: '/', cron_time: '0 2 * * *', is_enabled: 0 });
  const [lastBackup, setLastBackup] = useState(null);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/backup');
      if (res.data.telegramSettings) {
        setTelegramSettings(res.data.telegramSettings);
      }
      if (res.data.ftpSettings) {
        setFtpSettings(res.data.ftpSettings);
      }
      setLastBackup(res.data.lastBackup);

      const logsRes = await axios.get('/api/backup/logs');
      setLogs(logsRes.data);
    } catch (error) {
      console.error('Failed to fetch backup data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to convert cron (e.g. "0 2 * * *") to HH:mm (e.g. "02:00")
  const parseCronToTime = (cronString) => {
    if (!cronString) return '02:00';
    const parts = cronString.split(' ');
    if (parts.length >= 2) {
      const min = parts[0].padStart(2, '0');
      const hour = parts[1].padStart(2, '0');
      return `${hour}:${min}`;
    }
    return '02:00';
  };

  // Helper to convert HH:mm to cron
  const parseTimeToCron = (timeString) => {
    if (!timeString) return '0 2 * * *';
    const [h, m] = timeString.split(':');
    return `${parseInt(m)} ${parseInt(h)} * * *`;
  };

  const saveTelegramSettings = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/backup/telegram/settings', telegramSettings);
      alert('Pengaturan Telegram berhasil disimpan!');
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan pengaturan Telegram');
    }
  };

  const saveFtpSettings = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/backup/ftp/settings', ftpSettings);
      alert('Pengaturan FTP berhasil disimpan!');
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan pengaturan FTP');
    }
  };

  const triggerTelegramBackup = async () => {
    try {
      alert('Memulai backup ke Telegram, harap tunggu...');
      await axios.post('/api/backup/telegram/trigger');
      alert('Backup Telegram sukses!');
      fetchData();
    } catch (error) {
      alert('Backup Telegram gagal: ' + (error.response?.data?.message || error.message));
    }
  };

  const triggerFtpBackup = async () => {
    try {
      alert('Memulai backup ke FTP, harap tunggu...');
      await axios.post('/api/backup/ftp/trigger');
      alert('Backup FTP sukses!');
      fetchData();
    } catch (error) {
      alert('Backup FTP gagal: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleLocalDownload = () => {
    setDownloading(true);
    // Create an invisible anchor to trigger download
    const link = document.createElement('a');
    link.href = '/api/backup/local/download';
    link.setAttribute('download', 'backup.sql');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      setDownloading(false);
      fetchData();
    }, 2000);
  };

  if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading...</div>;

  return (
    <div className="content-container fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'white', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
            Backup System
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem' }}>
            Lindungi data aplikasi Anda dengan mengunduh secara lokal atau mengatur pencadangan otomatis.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: '#0f1011', padding: '0.5rem', borderRadius: '12px', border: '1px solid #23252a' }}>
        <button 
          onClick={() => setActiveTab('local')}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', 
            background: activeTab === 'local' ? 'rgba(94, 106, 210, 0.1)' : 'transparent',
            color: activeTab === 'local' ? '#5e6ad2' : 'rgba(255,255,255,0.5)',
            fontWeight: activeTab === 'local' ? 'bold' : 'normal',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          Direct Download
        </button>
        <button 
          onClick={() => setActiveTab('telegram')}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', 
            background: activeTab === 'telegram' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
            color: activeTab === 'telegram' ? '#38bdf8' : 'rgba(255,255,255,0.5)',
            fontWeight: activeTab === 'telegram' ? 'bold' : 'normal',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          Telegram Backup
        </button>
        <button 
          onClick={() => setActiveTab('ftp')}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', 
            background: activeTab === 'ftp' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
            color: activeTab === 'ftp' ? '#f59e0b' : 'rgba(255,255,255,0.5)',
            fontWeight: activeTab === 'ftp' ? 'bold' : 'normal',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          FTP Auto-Backup
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
        
        {/* MAIN CONTENT AREA */}
        <div style={{ background: '#0f1011', border: '1px solid #23252a', borderRadius: '16px', padding: '2rem' }}>
          
          {/* TAB: LOCAL DOWNLOAD */}
          {activeTab === 'local' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ background: 'rgba(94, 106, 210, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '40px', color: '#5e6ad2' }}>cloud_download</span>
              </div>
              <h2 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '1.4rem' }}>Download Database (.sql)</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 auto 2rem auto', maxWidth: '400px', lineHeight: '1.5' }}>
                Klik tombol di bawah ini untuk langsung men-generate dan mengunduh file backup database terbaru ke perangkat Anda.
              </p>
              <button 
                onClick={handleLocalDownload}
                disabled={downloading}
                style={{
                  background: '#5e6ad2', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '50px',
                  fontSize: '1rem', fontWeight: 'bold', cursor: downloading ? 'wait' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  boxShadow: '0 4px 15px rgba(94, 106, 210, 0.3)',
                  transition: 'all 0.2s',
                  opacity: downloading ? 0.7 : 1
                }}
              >
                <span className="material-symbols-rounded">{downloading ? 'sync' : 'download'}</span>
                {downloading ? 'Mendownload...' : 'Download Sekarang'}
              </button>
            </div>
          )}

          {/* TAB: TELEGRAM */}
          {activeTab === 'telegram' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-rounded" style={{ color: '#38bdf8' }}>send</span>
                  Telegram Auto-Backup
                </h2>
                <button 
                  onClick={triggerTelegramBackup}
                  style={{
                    background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)',
                    padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                    fontWeight: 'bold', fontSize: '0.85rem'
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>backup</span> Backup Sekarang
                </button>
              </div>

              <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                  Setiap jam yang ditentukan, bot Telegram akan mengirimkan file <code>backup.sql</code> langsung ke chat Anda. 
                  Anda bisa mendapatkan <b>Bot Token</b> dari <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{color:'#38bdf8'}}>@BotFather</a> dan <b>Chat ID</b> dengan mengirim pesan ke <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" style={{color:'#38bdf8'}}>@userinfobot</a>.
                </p>
              </div>

              <form onSubmit={saveTelegramSettings}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>Bot Token</label>
                  <input type="text" value={telegramSettings.bot_token} onChange={e => setTelegramSettings({...telegramSettings, bot_token: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #23252a', background: 'rgba(0,0,0,0.2)', color: 'white' }} placeholder="123456789:ABCdefGHIjklmnoPQRstUVwxyz" />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>Chat ID</label>
                  <input type="text" value={telegramSettings.chat_id} onChange={e => setTelegramSettings({...telegramSettings, chat_id: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #23252a', background: 'rgba(0,0,0,0.2)', color: 'white' }} placeholder="12345678" />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>Jam Backup Harian (Waktu Server)</label>
                  <input 
                    type="time" 
                    value={parseCronToTime(telegramSettings.cron_time)} 
                    onChange={e => setTelegramSettings({...telegramSettings, cron_time: parseTimeToCron(e.target.value)})} 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #23252a', background: 'rgba(0,0,0,0.2)', color: 'white' }} 
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                  <div 
                    onClick={() => setTelegramSettings({...telegramSettings, is_enabled: telegramSettings.is_enabled ? 0 : 1})}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px', background: telegramSettings.is_enabled ? '#38bdf8' : '#374151',
                      position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px',
                      left: telegramSettings.is_enabled ? '23px' : '3px', transition: 'left 0.3s'
                    }}></div>
                  </div>
                  <span style={{ color: 'white', fontSize: '0.9rem' }}>Aktifkan Jadwal Otomatis</span>
                </div>
                <button type="submit" style={{ background: '#38bdf8', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Simpan Pengaturan</button>
              </form>
            </div>
          )}

          {/* TAB: FTP */}
          {activeTab === 'ftp' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-rounded" style={{ color: '#f59e0b' }}>dns</span>
                  FTP Server Setup
                </h2>
                <button 
                  onClick={triggerFtpBackup}
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)',
                    padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                    fontWeight: 'bold', fontSize: '0.85rem'
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>backup</span> Backup Sekarang
                </button>
              </div>

              <form onSubmit={saveFtpSettings}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>FTP Host</label>
                    <input type="text" value={ftpSettings.host} onChange={e => setFtpSettings({...ftpSettings, host: e.target.value})} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #23252a', background: 'rgba(0,0,0,0.2)', color: 'white' }} placeholder="ftp.domain.com" />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>Port</label>
                    <input type="number" value={ftpSettings.port} onChange={e => setFtpSettings({...ftpSettings, port: e.target.value})} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #23252a', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>Username</label>
                    <input type="text" value={ftpSettings.username} onChange={e => setFtpSettings({...ftpSettings, username: e.target.value})} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #23252a', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>Password</label>
                    <input type="password" value={ftpSettings.password} onChange={e => setFtpSettings({...ftpSettings, password: e.target.value})} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #23252a', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>Remote Path (Folder Tujuan)</label>
                  <input type="text" value={ftpSettings.remote_path} onChange={e => setFtpSettings({...ftpSettings, remote_path: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #23252a', background: 'rgba(0,0,0,0.2)', color: 'white' }} placeholder="/" />
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>Jam Backup Harian (Waktu Server)</label>
                  <input 
                    type="time" 
                    value={parseCronToTime(ftpSettings.cron_time)} 
                    onChange={e => setFtpSettings({...ftpSettings, cron_time: parseTimeToCron(e.target.value)})} 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #23252a', background: 'rgba(0,0,0,0.2)', color: 'white' }} 
                  />
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                    Data akan dibackup dan dikirim ke server FTP setiap hari pada jam tersebut.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                  <div 
                    onClick={() => setFtpSettings({...ftpSettings, is_enabled: ftpSettings.is_enabled ? 0 : 1})}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px', background: ftpSettings.is_enabled ? '#f59e0b' : '#374151',
                      position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px',
                      left: ftpSettings.is_enabled ? '23px' : '3px', transition: 'left 0.3s'
                    }}></div>
                  </div>
                  <span style={{ color: 'white', fontSize: '0.9rem' }}>Aktifkan Jadwal Otomatis</span>
                </div>
                
                <button type="submit" style={{ background: '#f59e0b', color: 'black', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Simpan Pengaturan</button>
              </form>
            </div>
          )}
        </div>

        {/* SIDEBAR LOGS AREA */}
        <div style={{ background: '#0f1011', border: '1px solid #23252a', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded">history</span> Riwayat Backup
          </h3>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
            {logs.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>Belum ada riwayat backup</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {logs.map((log) => (
                  <div key={log.id} style={{ 
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
                    borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: log.status === 'success' ? '#10b981' : '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {log.status}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    <div style={{ color: 'white', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.file_name}>
                      {log.file_name}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Size: {log.file_size}</span>
                      <span style={{ color: log.file_name.includes('ftp') ? '#f59e0b' : '#38bdf8' }}>
                        {log.file_name.includes('ftp') ? 'FTP' : 'Telegram'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Backup;
