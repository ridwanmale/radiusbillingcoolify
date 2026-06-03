import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- INLINE SVG ICONS ---
const Icons = {
  Bolt: () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" /></svg>
  ),
  Wifi: () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
  ),
  QR: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><line x1="7" y1="7" x2="7" y2="7" /><line x1="17" y1="7" x2="17" y2="7" /><line x1="17" y1="17" x2="17" y2="17" /><line x1="7" y1="17" x2="7" y2="17" /></svg>
  ),
  ChevronRight: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
  ),
  Rocket: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12l-5 3" /><path d="M12 9l3-5" /></svg>
  ),
  Check: () => (
    <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  ),
  Copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
  ),
  Download: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
  ),
  Search: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
  ),
  Bank: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18" /><path d="M3 10h18" /><path d="M5 21V10" /><path d="M19 21V10" /><path d="M10 21V10" /><path d="M14 21V10" /><path d="M2 10l10-8 10 8" /></svg>
  ),
  Alert: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
  )
};

const CustomerPortal = () => {
  
  const [settings, setSettings] = useState(null);
  const [packages, setPackages] = useState([]);
  const [step, setStep] = useState('katalog');
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [qrString, setQrString] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [inputOrderId, setInputOrderId] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [redirectCount, setRedirectCount] = useState(null);
  const [manualLoginUrl, setManualLoginUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [physicalCode, setPhysicalCode] = useState('');

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 4000);
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number);
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => showToast('Berhasil disalin!', 'success'));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); showToast('Berhasil disalin!', 'success'); }
      catch (err) { showToast('Gagal menyalin.', 'error'); }
      document.body.removeChild(textArea);
    }
  };

  const fetchPortalData = async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        fetch(`/api/online-store/settings`).then(r => r.json()),
        fetch(`/api/profiles`).then(r => r.json())
      ]);
      setSettings(sRes);
      setPackages(pRes.filter(p => p.harga > 0 && p.show_in_store));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchPortalData();
    const script = document.createElement('script');
    script.src = '/jsQR.min.js'; // Menggunakan file lokal agar tetap jalan di Walled Garden
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // 1. Deteksi order_id dari query param URL saat load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (orderId) {
      setInputOrderId(orderId);
      checkStatusById(orderId);
    }
  }, []);

  // 2. Regenerasi QR dinamis saat settings & transaksi sudah termuat (mencegah race condition)
  useEffect(() => {
    if (settings?.qris_static_string && transaction && step === 'checkout') {
      generateDynamicQR(transaction.total_amount, transaction.order_id);
    }
  }, [settings, transaction, step]);

  // 3. Polling otomatis status transaksi saat status PENDING di halaman checkout
  useEffect(() => {
    let pollInterval;
    
    if (step === 'checkout' && transaction && transaction.status === 'PENDING') {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/online-store/${transaction.order_id}`);
          if (res.ok) {
            const updatedTrx = await res.json();
            if (updatedTrx.status === 'PAID' || updatedTrx.status === 'USED') {
              clearInterval(pollInterval);
              setTransaction(updatedTrx);
              setStep('success');
              showToast('PEMBAYARAN BERHASIL DIVALIDASI!', 'success');
            }
          }
        } catch (err) {
          console.error('Error polling status:', err);
        }
      }, 4000); // Cek setiap 4 detik
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [step, transaction]);

  const checkStatusById = async (idOrAmount) => {
    if (!idOrAmount) return;
    const cleanKey = idOrAmount.toString().trim();
    try {
      setIsProcessing(true);
      showToast(`Mencari data: ${cleanKey}...`, 'info');
      
      // 1. Coba cari sebagai ID Pesanan
      let res = await fetch(`/api/online-store/${cleanKey}`);
      
      // 2. Jika tidak ketemu (404) dan inputnya angka, coba cari sebagai Nominal
      if (!res.ok && res.status === 404 && /^\d+$/.test(cleanKey)) {
        res = await fetch(`/api/online-store/search-by-amount/${cleanKey}`);
      }

      if (res.ok) {
        const data = await res.json();
        setTransaction(data);
        if (data.status === 'PAID' || data.status === 'USED') {
          setStep('success');
          showToast('VOUCHER BERHASIL DIVALIDASI!', 'success');
        } else {
          generateDynamicQR(data.total_amount, data.order_id);
          setStep('checkout');
          setTimeLeft(300);
          showToast(`ID ${data.order_id} ditemukan, tapi STATUS MASIH PENDING.`, 'warning');
        }
      } else {
        showToast(`Data "${cleanKey}" tidak ditemukan di database.`, 'error');
      }
    } catch (err) {
      showToast('Gagal terhubung ke server.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (step === 'checkout' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && step === 'checkout') { setStep('katalog'); }
  }, [step, timeLeft]);

  // Auto-redirect logic for success step
  useEffect(() => {
    let timer;
    // Hanya lakukan pengalihan otomatis jika pengguna berada di dalam jaringan Wi-Fi lokal
    if (step === 'success' && transaction?.voucher_code && isLocalNetwork()) {
      setRedirectCount(5);
      timer = setInterval(() => {
        setRedirectCount(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoLogin();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setRedirectCount(null);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [step, transaction, settings]);

  const handlePackageSelect = (pkg) => {
    setSelectedPkg(pkg);
    const activeMethods = [];
    if (settings?.enable_payment_bridge) activeMethods.push('bridge');
    if (settings?.enable_midtrans) activeMethods.push('midtrans');
    if (settings?.enable_duitku) activeMethods.push('duitku');
    if (settings?.enable_tripay) activeMethods.push('tripay');

    if (activeMethods.length > 1) setStep('payment_selection');
    else if (activeMethods.length === 1) handlePayment(activeMethods[0], pkg);
    else showToast('Metode pembayaran tidak aktif.', 'error');
  };

  const handlePayment = async (method, pkg = selectedPkg) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (method === 'duitku') {
        const res = await axios.post(`/api/online-store/duitku/create-invoice`, {
          package_id: pkg.groupname, amount: pkg.harga,
          customer_name: 'Customer', customer_email: 'customer@example.com'
        });
        if (res.data.payment_url) { window.location.href = res.data.payment_url; return; }
      } else if (method === 'bridge') {
        const res = await axios.post(`/api/online-store/create-transaction`, {
          package_id: pkg.groupname, amount: pkg.harga, customer_name: 'Customer'
        });
        const data = res.data;
        if (data.order_id) {
          setTransaction(data);
          generateDynamicQR(data.total_amount, data.order_id);
          setStep('checkout');
          setTimeLeft(300);
        }
      } else if (method === 'tripay') {
        const res = await axios.post(`/api/online-store/tripay/create-transaction`, {
          package_id: pkg.groupname, amount: pkg.harga, customer_name: 'Customer', method: 'QRIS'
        });
        if (res.data.payment_url) { window.location.href = res.data.payment_url; return; }
      } else if (method === 'midtrans') {
        const res = await axios.post(`/api/online-store/midtrans/create-transaction`, {
          package_id: pkg.groupname, amount: pkg.harga, customer_name: 'Customer'
        });
        if (res.data.payment_url) { window.location.href = res.data.payment_url; return; }
      }
    } catch (err) { showToast('Gagal: ' + (err.response?.data?.error || err.message), 'error'); }
    finally { setIsProcessing(false); }
  };

  const generateDynamicQR = (amount, orderId) => {
    if (!settings?.qris_static_string) return;
    
    let qrisList = [];
    try {
      // Coba parse sebagai JSON (Format baru)
      const parsed = JSON.parse(settings.qris_static_string);
      if (Array.isArray(parsed)) {
        qrisList = parsed.map(q => q.payload).filter(Boolean);
      }
    } catch (e) {
      // Fallback ke format lama (Dipisah enter)
      qrisList = settings.qris_static_string.split('\n').map(s => s.trim()).filter(Boolean);
    }
    
    if (qrisList.length === 0) return;
    
    const randomIdx = Math.floor(Math.random() * qrisList.length);
    let payload = qrisList[randomIdx];
    
    // ATURAN KETAT: Cek Tag 5303360 (Currency IDR) dan 5802ID (Country Code)
    // Jika tidak ada salah satunya, payload dianggap tidak standar dan tidak aman dikonversi
    if (payload.indexOf("5303360") === -1 || payload.indexOf("5802ID") === -1) {
      console.warn("Payload tidak standar (Tag 53/58 missing). Menampilkan QR Asli.");
      setQrString(payload);
      return;
    }

    try {
      // Pastikan payload diawali format standar 000201
      if (!payload.startsWith("000201")) {
         setQrString(payload); 
         return;
      }

      // 1. Ambil data asli sebelum Tag 63 (CRC)
      const crcIdx = payload.lastIndexOf('6304');
      if (crcIdx === -1) { setQrString(payload); return; }
      let body = payload.substring(0, crcIdx);

      // 2. Ubah Point of Initiation (Tag 01) menjadi 12 (Dynamic)
      // Sesuai masukan: 010211 -> 010212
      body = body.replace('010211', '010212');

      // 3. Siapkan Tag 54 baru (TLV: Tag 54, Length, Value)
      const amountVal = Math.floor(amount).toString();
      const tag54 = "54" + amountVal.length.toString().padStart(2, '0') + amountVal;
      
      // 4. SISIPKAN DI ANTARA 5303360 DAN 5802ID
      // Ini cara paling aman agar tidak merusak tag lain seperti MCC (52045499)
      const pos53 = body.indexOf("5303360");
      const pos58 = body.indexOf("5802ID");
      
      if (pos53 !== -1 && pos58 !== -1) {
        // Hapus apapun yang ada di antara 53 dan 58 (misal tag 54 lama) dan masukkan yang baru
        body = body.substring(0, pos53 + 7) + tag54 + body.substring(pos58);
      } else {
        // Fallback jika posisi tidak ideal (tapi lolos pengecekan awal)
        setQrString(payload);
        return;
      }

      // 5. Tambahkan kembali Tag 63 dan Hitung CRC16 standar
      const finalPayload = body + "6304";
      setQrString(finalPayload + crc16(finalPayload));
    } catch (err) {
      console.error("Gagal konversi QRIS:", err);
      setQrString(payload); // Fallback ke statis
    }
  };

  const crc16 = (data) => {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  };


  const handleDownloadQRIS = async () => {
    try {
      showToast('Menyiapkan QRIS...', 'info');
      const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(qrString)}`;
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `QRIS-${transaction.order_id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('QRIS disimpan!', 'success');
    } catch (err) { showToast('Gagal mendownload QRIS.', 'error'); }
  };

  const handleSaveOrderCard = async () => {
    try {
      showToast('Menyiapkan Gambar Kartu...', 'info');
      const canvas = document.createElement('canvas');
      canvas.width = 600; canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1e1e24'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 24px Arial'; ctx.fillText('KARTU PESANAN', 40, 60);
      ctx.fillStyle = '#ffffff'; ctx.font = '900 52px Arial'; ctx.fillText(transaction.order_id, 40, 130);
      ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 60px Arial'; ctx.fillText(formatRupiah(transaction.total_amount), 40, 220);
      ctx.fillStyle = '#94a3b8'; ctx.font = '24px Arial'; ctx.fillText(`Paket: ${transaction.package_id || selectedPkg?.groupname || 'Voucher'}`, 40, 280);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.fillStyle = 'white'; ctx.fillRect(440, 40, 120, 120);
        ctx.drawImage(img, 450, 50, 100, 100);
        const link = document.createElement('a');
        link.download = `KARTU-PESANAN-${transaction.order_id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Kartu Pesanan disimpan!', 'success');
      };
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
    } catch (err) { showToast('Gagal menyimpan kartu.', 'error'); }
  };

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    showToast('Sedang memproses gambar...', 'info');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (typeof window.jsQR === 'function') {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            let foundData = code.data;
            
            // --- LOGIKA EKSTRAKSI PINTAR (ID & NOMINAL) ---
            if (foundData.startsWith('000201')) {
              try {
                const getTagValue = (str, targetTag) => {
                  let i = 0;
                  while (i < str.length - 4) {
                    const tag = str.substring(i, i + 2);
                    const len = parseInt(str.substring(i + 2, i + 4));
                    if (isNaN(len)) break;
                    const val = str.substring(i + 4, i + 4 + len);
                    if (tag === targetTag) return val;
                    i += 4 + len;
                  }
                  return null;
                };

                const tag62Content = getTagValue(foundData, '62');
                const amountVal = getTagValue(foundData, '54'); // Tag 54 = Nominal
                
                let extractedId = '';
                if (tag62Content) {
                  const refId = getTagValue(tag62Content, '05');
                  const billId = getTagValue(tag62Content, '01');
                  extractedId = (refId || billId || '').trim();
                }

                // Jika ada ID, pakai ID. Jika tidak ada, coba pakai Nominal sebagai kunci pencarian
                if (extractedId) {
                  foundData = extractedId;
                } else if (amountVal) {
                  foundData = amountVal;
                  showToast(`Mencari pesanan dengan nominal ${formatRupiah(amountVal)}...`, 'info');
                }
              } catch (err) { console.error(err); }
            }
            
            const finalSearchKey = foundData.trim();
            setInputOrderId(finalSearchKey);
            checkStatusById(finalSearchKey);
          } else { 
            showToast('Gagal membaca kode QR. Pastikan gambar jelas.', 'error'); 
          }
        } else {
          showToast('Alat pemindai belum siap. Pastikan koneksi internet aktif atau masukkan ID manual.', 'error');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = null; // Agar bisa upload file yang sama berkali-kali
  };

  // Helper to check if user is connected to local Hotspot network
  const isLocalNetwork = () => {
    const hostname = window.location.hostname;
    let localHost = settings?.hotspot_login_url || 'arm.test';
    localHost = localHost.replace('http://', '').replace('https://', '').split('/')[0].trim();
    
    if (hostname.toLowerCase() === localHost.toLowerCase()) {
      return true;
    }
    
    if (
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname.startsWith('192.168.') || 
      hostname.startsWith('10.') || 
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return true;
    }

    return false;
  };

    const handleAutoLogin = async () => {
    if (!transaction?.voucher_code) {
      showToast("Kode voucher tidak ditemukan.", "error");
      return;
    }

    const username = transaction.voucher_code;
    const password = transaction.password || username;

    let targetHost = settings?.hotspot_login_url || "arm.test";
    targetHost = targetHost.replace("http://", "").replace("https://", "").split("/")[0];

    const loginUrl = `http://${targetHost}/login?username=${username}&password=${password}&dst=http://www.google.com`;
    showToast("Mengaktifkan Koneksi...", "success");
    setManualLoginUrl(loginUrl);

    setTimeout(() => {
      setIsProcessing(false);
      window.location.href = loginUrl;
    }, 1000);
  };

  const handlePhysicalVoucherLogin = async () => {
    const code = physicalCode.trim();
    if (!code) {
      showToast("Masukkan kode voucher Anda.", "error");
      return;
    }
    
    let targetHost = settings?.hotspot_login_url || "arm.test";
    targetHost = targetHost.replace("http://", "").replace("https://", "").split("/")[0];
    
    const loginUrl = `http://${targetHost}/login?username=${code}&password=${code}&dst=http://www.google.com`;
    showToast("Mengaktifkan Koneksi...", "success");
    setManualLoginUrl(loginUrl);
    
    setTimeout(() => {
      setIsProcessing(false);
      window.location.href = loginUrl;
    }, 1000);
  };

  if (!settings) return <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Memuat...</div>;

  if (settings && !settings.is_active) {
    const isClosedBySchedule = !!settings.closed_by_schedule;
    const headerTitle = isClosedBySchedule ? 'PORTAL TUTUP' : 'PORTAL MAINTENANCE';
    const bodyText = isClosedBySchedule 
      ? (settings.portal_description || 'Mohon maaf, pembelian voucher online sedang dinonaktifkan atau di luar jam operasional.')
      : 'Mohon maaf, pembelian voucher online sedang dinonaktifkan. Sedang dalam pemeliharaan system.';

    return (
      <div style={{ background: '#0a0a0c', minHeight: '100vh', color: 'white', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-card" style={{ padding: '40px', maxWidth: '450px', width: '100%', textAlign: 'center', borderTop: '5px solid #ef4444' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#ef4444' }}>storefront</span>
          </div>
          <h2 style={{ fontWeight: '900', fontSize: '1.8rem', margin: '0 0 10px' }}>{headerTitle}</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
            {bodyText}
          </p>
          {isClosedBySchedule && !!settings.enable_schedule && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '5px' }}>JAM OPERASIONAL:</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff' }}>
                {settings.open_time} - {settings.close_time}
              </div>
            </div>
          )}
          <button onClick={fetchPortalData} className="btn-primary" style={{ width: '100%', padding: '15px', borderRadius: '12px', fontWeight: '900', border: 'none', color: 'white', cursor: 'pointer' }}>
            COBA LAGI
          </button>
        </div>
        <style>{' .glass-card { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(25px); border-radius: 28px; border: 1px solid rgba(255,255,255,0.1); } .btn-primary { background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); color: white; border: none; transition: all 0.2s; } '}</style>
      </div>
    );
  }

  return (
    <div style={{ background: '#0a0a0c', minHeight: '100vh', color: 'white', fontFamily: "'Inter', sans-serif" }}>
      {toast.show && (
        <div className={`custom-toast toast-${toast.type}`}>
          <div className="toast-content">
            {toast.type === 'error' ? <Icons.Alert /> : toast.type === 'success' ? <Icons.Check /> : <Icons.Bolt />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="portal-container" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900' }}>{settings?.portal_title || 'Online Payment'}</h1>
          </div>
          {settings?.portal_description && (
            <p style={{ margin: '5px 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '1rem', fontWeight: '500', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.5' }}>
              {settings.portal_description}
            </p>
          )}
        </header>

        {step === 'katalog' && (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "15px", marginBottom: "35px", maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}>

              <button onClick={() => setStep("check_status")} style={{ width: "100%", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)", color: "#38bdf8", padding: "15px 30px", borderRadius: "20px", cursor: "pointer", fontSize: "1.1rem", fontWeight: "900", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "12px", boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}>
                <Icons.QR /> VALIDASI PEMBAYARAN
              </button>
              <div style={{ fontSize: "0.85rem", opacity: 0.6, fontWeight: "600" }}>Sudah bayar online? Validasi pesanan Anda di sini.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {packages.map((pkg, i) => (
                <div key={i} className="glass-card" style={{ padding: '25px', textAlign: 'center', borderTop: `4px solid ${i % 3 === 0 ? '#8b5cf6' : i % 3 === 1 ? '#3b82f6' : '#ec4899'}` }}>
                  <Icons.Wifi />
                  <h3 style={{ margin: '15px 0 5px', fontSize: '1.5rem', fontWeight: '800' }}>{pkg.groupname}</h3>
                  <div style={{ fontSize: '2.2rem', fontWeight: '900', margin: '15px 0' }}>{formatRupiah(pkg.harga)}</div>
                  <button onClick={() => handlePackageSelect(pkg)} className="btn-primary" style={{ width: '100%', padding: '16px', border: 'none', borderRadius: '14px', color: 'white', fontWeight: '900', cursor: 'pointer' }}>BELI SEKARANG</button>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 'check_status' && (
          <div style={{ maxWidth: '450px', margin: '0 auto' }}>
            <div className="glass-card" style={{ padding: '30px', textAlign: 'center' }}>
              <h2 style={{ fontWeight: '900', marginBottom: '20px' }}>Validasi Pembayaran</h2>
              <button onClick={() => fileInputRef.current.click()} style={{ width: '100%', padding: '30px', background: 'rgba(56, 189, 248, 0.08)', border: '2px dashed rgba(56, 189, 248, 0.3)', borderRadius: '20px', color: '#38bdf8', cursor: 'pointer', marginBottom: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Icons.QR /><div style={{ fontWeight: '800', fontSize: '1.1rem' }}>Scan QRIS Pembayaran</div><div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Upload screenshot QRIS untuk validasi</div>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleQrUpload} accept="image/*" style={{ display: 'none' }} />
              <div style={{ marginBottom: '15px', fontSize: '0.8rem', opacity: 0.5 }}>Atau masukkan ID secara manual</div>
              <input type="text" placeholder="Masukkan Order ID..." value={inputOrderId} onChange={(e) => setInputOrderId(e.target.value)} style={{ width: '100%', padding: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', marginBottom: '15px', textAlign: 'center' }} />
              <button onClick={() => checkStatusById(inputOrderId)} disabled={isProcessing} className="btn-primary" style={{ width: '100%', padding: '15px', borderRadius: '12px', fontWeight: '900' }}>{isProcessing ? 'Memvalidasi...' : 'VALIDASI PEMBAYARAN'}</button>
              <button onClick={() => setStep('katalog')} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>Kembali</button>
            </div>
          </div>
        )}

        {step === 'payment_selection' && selectedPkg && (
          <div style={{ maxWidth: '450px', margin: '0 auto' }}>
            <div className="glass-card" style={{ padding: '30px' }}>
              <h2 style={{ textAlign: 'center', marginBottom: '25px', fontWeight: '900' }}>Metode Bayar</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {!!settings.enable_payment_bridge && (
                  <button onClick={() => handlePayment('bridge')} className="payment-method-btn">
                    <div className="payment-icon-wrapper" style={{ background: '#38bdf815' }}><Icons.QR /></div>
                    <div style={{ textAlign: 'left', flex: 1 }}><div style={{ fontWeight: '800' }}>QRIS Manual / Bridge</div><div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Otomatis via HP Admin</div></div>
                    <Icons.ChevronRight />
                  </button>
                )}
                {!!settings.enable_duitku && (
                  <button onClick={() => handlePayment('duitku')} className="payment-method-btn">
                    <div className="payment-icon-wrapper" style={{ background: '#f59e0b15' }}><Icons.Bank /></div>
                    <div style={{ textAlign: 'left', flex: 1 }}><div style={{ fontWeight: '800' }}>Duitku Gateway</div><div style={{ fontSize: '0.75rem', opacity: 0.6 }}>VA / E-Wallet Resmi</div></div>
                    <Icons.ChevronRight />
                  </button>
                )}
                {!!settings.enable_midtrans && (
                  <button onClick={() => handlePayment('midtrans')} className="payment-method-btn">
                    <div className="payment-icon-wrapper" style={{ background: '#10b98115' }}><Icons.Bank /></div>
                    <div style={{ textAlign: 'left', flex: 1 }}><div style={{ fontWeight: '800' }}>Midtrans Gateway</div><div style={{ fontSize: '0.75rem', opacity: 0.6 }}>QRIS / E-Wallet / VA</div></div>
                    <Icons.ChevronRight />
                  </button>
                )}
                {!!settings.enable_tripay && (
                  <button onClick={() => handlePayment('tripay')} className="payment-method-btn">
                    <div className="payment-icon-wrapper" style={{ background: '#ec489915' }}><Icons.Rocket /></div>
                    <div style={{ textAlign: 'left', flex: 1 }}><div style={{ fontWeight: '800' }}>Tripay Global</div><div style={{ fontSize: '0.75rem', opacity: 0.6 }}>QRIS / VA / Retail</div></div>
                    <Icons.ChevronRight />
                  </button>
                )}
              </div>
              <button onClick={() => setStep('katalog')} style={{ marginTop: '20px', width: '100%', padding: '12px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '10px', cursor: 'pointer' }}>Kembali</button>
            </div>
          </div>
        )}

        {step === 'checkout' && transaction && (
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <div className="glass-card" style={{ padding: '25px', textAlign: 'center' }}>
              <h2 style={{ marginBottom: '20px', fontWeight: '900' }}>Selesaikan Pembayaran</h2>
              <div style={{ background: 'linear-gradient(135deg, #1e1e24 0%, #2d2d3a 100%)', borderRadius: '24px', padding: '25px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginBottom: '10px' }}>KARTU PESANAN</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff' }}>{transaction.order_id}</div>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '15px', borderRadius: '15px', marginTop: '15px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: '700', marginBottom: '5px' }}>NOMINAL YANG WAJIB DIBAYAR:</div>
                  <div style={{ fontSize: '2.4rem', fontWeight: '900', color: '#ffffff' }}>{formatRupiah(transaction.total_amount)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '5px' }}>*Sudah termasuk kode unik untuk aktivasi otomatis</div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '10px' }}>Paket: {transaction.package_id || selectedPkg?.groupname || 'Voucher'}</div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button onClick={handleSaveOrderCard} style={{ flex: 1, padding: '12px', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: '12px', color: '#a78bfa', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Icons.Download /> SIMPAN KARTU
                  </button>
                  <button onClick={() => copyToClipboard(transaction.order_id)} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#ffffff', cursor: 'pointer' }}><Icons.Copy /></button>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '15px' }}>SCAN QRIS UNTUK BAYAR</div>
                <div style={{ background: 'white', padding: '10px', borderRadius: '15px', margin: '0 auto 15px', width: 'fit-content' }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`} alt="QRIS" style={{ width: '220px', height: '220px', display: 'block' }} />
                </div>
                <button onClick={handleDownloadQRIS} style={{ width: '100%', padding: '14px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Icons.Download /> SIMPAN QRIS
                </button>
              </div>
              <div style={{ color: '#fbbf24', fontSize: '0.95rem', margin: '20px 0', fontWeight: '700' }}>Menunggu pembayaran... ({Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')})</div>
              <button onClick={() => setStep('katalog')} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Batal</button>
            </div>
          </div>
        )}

        {step === 'success' && transaction && (
          <div style={{ maxWidth: '450px', margin: '0 auto' }}>
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', borderTop: '5px solid #10b981' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Icons.Check />
              </div>
              <h2 style={{ fontWeight: '900', fontSize: '1.8rem', margin: '0 0 10px' }}>PEMBAYARAN BERHASIL!</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px' }}>Voucher Anda sudah aktif. Silakan login untuk menikmati internet.</p>
              
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Order ID: <code style={{ color: '#94a3b8', fontWeight: 'bold' }}>{transaction.order_id}</code>
                <button onClick={() => copyToClipboard(transaction.order_id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '2px' }} title="Salin Order ID"><Icons.Copy /></button>
              </div>
              
              {!isLocalNetwork() && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px', padding: '15px', marginBottom: '20px', textAlign: 'left', fontSize: '0.85rem', color: '#fbbf24', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icons.Alert /> KONEKSI LUAR JARINGAN
                  </div>
                  <div>Anda terdeteksi mengakses dari luar jaringan Wi-Fi Hotspot. Silakan <b>SALIN/SIMPAN</b> kode voucher di bawah, hubungkan ke Wi-Fi Hotspot lokal, lalu buka menu <b>Validasi Pembayaran</b> untuk melakukan login otomatis.</div>
                </div>
              )}
              
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '25px', borderRadius: '24px', margin: '0 0 25px', border: '1px solid rgba(16, 185, 129, 0.2)', position: 'relative' }}>
                <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '700', marginBottom: '8px' }}>KODE VOUCHER</div>
                <div style={{ 
                  fontSize: 'clamp(1.3rem, 7vw, 2.5rem)', 
                  fontWeight: '900', 
                  letterSpacing: 'clamp(2px, 1.5vw, 6px)', 
                  color: 'white',
                  wordBreak: 'break-all',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'normal',
                  lineHeight: '1.2'
                }}>{transaction?.voucher_code}</div>
                <button onClick={() => copyToClipboard(transaction?.voucher_code)} style={{ marginTop: '15px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Icons.Copy /> SALIN KODE
                </button>
              </div>

              <button onClick={handleAutoLogin} className="btn-primary" style={{ width: '100%', padding: '20px', borderRadius: '18px', fontWeight: '900', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)' }}>
                <Icons.Rocket /> {redirectCount > 0 ? `LOGIN OTOMATIS (${redirectCount}s)` : 'LOGIN SEKARANG'}
              </button>

              {manualLoginUrl && (
                <div style={{ marginTop: '20px' }}>
                  <a href={manualLoginUrl} style={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: '700', textDecoration: 'none', borderBottom: '1px dashed #3b82f6' }}>
                    Klik di sini jika tidak otomatis masuk
                  </a>
                </div>
              )}
              
              <p style={{ marginTop: '20px', fontSize: '0.8rem', color: '#64748b' }}>
                {redirectCount > 0 
                  ? `Mengalihkan ke sistem WiFi dalam ${redirectCount} detik...` 
                  : 'Klik tombol di atas untuk login ke sistem WiFi.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .glass-card { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(25px); border-radius: 28px; border: 1px solid rgba(255,255,255,0.1); }
        .btn-primary { background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); color: white; border: none; transition: all 0.2s; }
        .payment-method-btn { width: 100%; display: flex; align-items: center; gap: 15px; padding: 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; color: white; cursor: pointer; transition: all 0.2s; }
        .payment-icon-wrapper { width: 50px; height: 50px; border-radius: 15px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        
        .custom-toast { 
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
          z-index: 10000; min-width: 280px; padding: 20px 30px; border-radius: 24px; 
          backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2);
          box-shadow: 0 25px 50px rgba(0,0,0,0.6); animation: toastIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .toast-content { display: flex; flex-direction: column; align-items: center; gap: 15px; text-align: center; }
        .toast-content span { font-size: 1.1rem; fontWeight: 900; }
        .toast-error { background: rgba(220, 38, 38, 0.9); color: white; border-color: rgba(255,255,255,0.3); box-shadow: 0 0 30px rgba(220, 38, 38, 0.4); }
        .toast-success { background: rgba(16, 185, 129, 0.9); color: white; box-shadow: 0 0 30px rgba(16, 185, 129, 0.4); }
        .toast-info { background: rgba(30, 64, 175, 0.9); color: white; box-shadow: 0 0 30px rgba(30, 64, 175, 0.4); }

        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -40%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        @media (max-width: 480px) { h1 { font-size: 1.8rem !important; } }
      `}</style>
    </div>
  );
};

export default CustomerPortal;
