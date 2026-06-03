// Konfigurasi API
const API_URL = `http://${window.location.hostname}:8088/api`;

let portalSettings = {};
let packages = [];
let currentStep = 'katalog';
let selectedPkg = null;
let currentTransaction = null;
let pollingInterval = null;
let timerInterval = null;
let redirectTimer = null;
let timeLeft = 300;
let isProcessing = false;
let qrString = '';

// --- Format Utilities ---
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast-container');
    const msg = document.getElementById('toast-message');
    const icon = document.getElementById('toast-icon');
    
    msg.innerText = message;
    toast.className = `custom-toast toast-${type}`;
    toast.style.display = 'block';

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
        iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else {
        iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    }
    icon.innerHTML = iconSvg;

    setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

function copyToClipboard(text) {
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
}

// --- Navigation Logic ---
function setStep(stepName) {
    currentStep = stepName;
    ['katalog', 'check_status', 'payment_selection', 'checkout', 'success'].forEach(s => {
        document.getElementById('step-' + s).classList.add('hidden');
    });
    document.getElementById('step-' + stepName).classList.remove('hidden');

    if (stepName === 'checkout') {
        timeLeft = 300;
        startCheckoutTimer();
        startPolling();
    } else {
        stopPolling();
        stopCheckoutTimer();
    }

    if (stepName === 'success') {
        startSuccessAutoLogin();
    } else {
        if (redirectTimer) clearInterval(redirectTimer);
    }
}

// --- Init Fetch ---
async function fetchPortalData() {
    try {
        const [sRes, pRes] = await Promise.all([
            fetch(`${API_URL}/online-store/settings`).then(r => r.json()),
            fetch(`${API_URL}/profiles`).then(r => r.json())
        ]);
        
        portalSettings = sRes;
        packages = pRes.filter(p => p.harga > 0 && p.show_in_store);
        
        document.getElementById('loading-overlay').style.display = 'none';

        if (portalSettings && !portalSettings.is_active) {
            document.getElementById('closed-container').classList.remove('hidden');
            if (portalSettings.closed_by_schedule) {
                document.getElementById('closed-title').innerText = 'PORTAL TUTUP';
                document.getElementById('closed-desc').innerText = portalSettings.portal_description || 'Pembelian voucher di luar jam operasional.';
                if (portalSettings.enable_schedule) {
                    document.getElementById('closed-schedule').classList.remove('hidden');
                    document.getElementById('closed-hours').innerText = `${portalSettings.open_time} - ${portalSettings.close_time}`;
                }
            } else {
                document.getElementById('closed-title').innerText = 'PORTAL MAINTENANCE';
                document.getElementById('closed-desc').innerText = 'Mohon maaf, sedang dalam pemeliharaan sistem.';
            }
            return;
        }

        document.getElementById('main-container').classList.remove('hidden');
        document.getElementById('portal-title').innerText = portalSettings.portal_title || 'Online Payment';
        document.getElementById('portal-desc').innerText = portalSettings.portal_description || '';
        document.body.style.setProperty('--primary', portalSettings.primary_color || '#6366f1');

        renderPackages();
        setupPaymentMethods();
        
        setStep('katalog');

        // Cek jika ada order_id dari URL
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('order_id');
        if (orderId) {
            document.getElementById('manual-order-id').value = orderId;
            checkStatusById(orderId);
        }

    } catch (err) {
        console.error(err);
        showToast('Gagal memuat data dari server.', 'error');
    }
}

// --- Render Logic ---
function renderPackages() {
    const container = document.getElementById('packages-container');
    container.innerHTML = '';
    packages.forEach((pkg, i) => {
        const color = i % 3 === 0 ? '#8b5cf6' : i % 3 === 1 ? '#3b82f6' : '#ec4899';
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.textAlign = 'center';
        card.style.borderTop = `4px solid ${color}`;
        card.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
            <h3 style="margin: 15px 0 5px; font-size: 1.5rem; font-weight: 800;">${pkg.groupname}</h3>
            <div style="font-size: 2.2rem; font-weight: 900; margin: 15px 0;">${formatRupiah(pkg.harga)}</div>
            <button onclick="handlePackageSelect(${i})" class="btn-primary">BELI SEKARANG</button>
        `;
        container.appendChild(card);
    });
}

function handlePackageSelect(pkgIndex) {
    selectedPkg = packages[pkgIndex];
    const activeMethods = [];
    if (portalSettings?.enable_payment_bridge) activeMethods.push('bridge');
    if (portalSettings?.enable_midtrans) activeMethods.push('midtrans');
    if (portalSettings?.enable_duitku) activeMethods.push('duitku');
    if (portalSettings?.enable_tripay) activeMethods.push('tripay');

    if (activeMethods.length > 1) {
        setStep('payment_selection');
    } else if (activeMethods.length === 1) {
        handlePayment(activeMethods[0]);
    } else {
        showToast('Tidak ada metode pembayaran aktif.', 'error');
    }
}

function setupPaymentMethods() {
    const container = document.getElementById('payment-methods-container');
    container.innerHTML = '';
    
    if (portalSettings?.enable_payment_bridge) {
        container.innerHTML += `
            <button onclick="handlePayment('bridge')" class="payment-method-btn">
                <div class="payment-icon-wrapper" style="background: #38bdf815;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></div>
                <div style="text-align: left; flex: 1;"><div style="font-weight: 800;">QRIS Manual / Bridge</div><div style="font-size: 0.75rem; opacity: 0.6;">Otomatis via HP Admin</div></div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M9 18l6-6-6-6"/></svg>
            </button>`;
    }
    if (portalSettings?.enable_duitku) {
        container.innerHTML += `
            <button onclick="handlePayment('duitku')" class="payment-method-btn">
                <div class="payment-icon-wrapper" style="background: #f59e0b15;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 21V10"/><path d="M19 21V10"/><path d="M10 21V10"/><path d="M14 21V10"/><path d="M2 10l10-8 10 8"/></svg></div>
                <div style="text-align: left; flex: 1;"><div style="font-weight: 800;">Duitku Gateway</div><div style="font-size: 0.75rem; opacity: 0.6;">VA / E-Wallet Resmi</div></div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M9 18l6-6-6-6"/></svg>
            </button>`;
    }
    if (portalSettings?.enable_midtrans) {
        container.innerHTML += `
            <button onclick="handlePayment('midtrans')" class="payment-method-btn">
                <div class="payment-icon-wrapper" style="background: #10b98115;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 21V10"/><path d="M19 21V10"/><path d="M10 21V10"/><path d="M14 21V10"/><path d="M2 10l10-8 10 8"/></svg></div>
                <div style="text-align: left; flex: 1;"><div style="font-weight: 800;">Midtrans Gateway</div><div style="font-size: 0.75rem; opacity: 0.6;">QRIS / E-Wallet / VA</div></div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M9 18l6-6-6-6"/></svg>
            </button>`;
    }
    if (portalSettings?.enable_tripay) {
        container.innerHTML += `
            <button onclick="handlePayment('tripay')" class="payment-method-btn">
                <div class="payment-icon-wrapper" style="background: #ec489915;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12l-5 3"/><path d="M12 9l3-5"/></svg></div>
                <div style="text-align: left; flex: 1;"><div style="font-weight: 800;">Tripay Global</div><div style="font-size: 0.75rem; opacity: 0.6;">QRIS / VA / Retail</div></div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M9 18l6-6-6-6"/></svg>
            </button>`;
    }
}

// --- Payment Logic ---
async function handlePayment(method) {
    if (isProcessing || !selectedPkg) return;
    isProcessing = true;
    showToast('Memproses pesanan...', 'info');

    try {
        let endpoint = '';
        let payload = { package_id: selectedPkg.groupname, amount: selectedPkg.harga, customer_name: 'Customer' };
        
        if (method === 'duitku') {
            endpoint = '/online-store/duitku/create-invoice';
            payload.customer_email = 'customer@example.com';
        } else if (method === 'bridge') {
            endpoint = '/online-store/create-transaction';
        } else if (method === 'tripay') {
            endpoint = '/online-store/tripay/create-transaction';
            payload.method = 'QRIS';
        } else if (method === 'midtrans') {
            endpoint = '/online-store/midtrans/create-transaction';
        }

        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error("Server mengembalikan error");
        const data = await res.json();

        if (data.payment_url) {
            window.location.href = data.payment_url;
            return;
        }

        if (data.order_id) {
            currentTransaction = data;
            generateDynamicQR(data.total_amount, data.order_id);
            document.getElementById('checkout-order-id').innerText = data.order_id;
            document.getElementById('checkout-amount').innerText = formatRupiah(data.total_amount);
            document.getElementById('checkout-package-name').innerText = `Paket: ${selectedPkg.groupname}`;
            setStep('checkout');
        }
    } catch (err) {
        showToast('Gagal memproses: ' + err.message, 'error');
    } finally {
        isProcessing = false;
    }
}

// --- Dynamic QR Logic ---
function generateDynamicQR(amount) {
    if (!portalSettings?.qris_static_string) return;
    
    let qrisList = [];
    try {
        qrisList = JSON.parse(portalSettings.qris_static_string);
    } catch (e) {
        qrisList = [{ payload: portalSettings.qris_static_string }];
    }

    if (!Array.isArray(qrisList) || qrisList.length === 0) return;
    qrisList = qrisList.filter(q => q && q.payload && q.payload.trim() !== '');
    if (qrisList.length === 0) return;

    const randomIndex = Math.floor(Math.random() * qrisList.length);
    const selectedQris = qrisList[randomIndex];
    let payload = selectedQris.payload.trim();
    
    if (payload.indexOf("5303360") === -1 || payload.indexOf("5802ID") === -1) {
        qrString = payload;
        document.getElementById('checkout-qris-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
        return;
    }

    try {
        if (!payload.startsWith("000201")) {
            qrString = payload;
            document.getElementById('checkout-qris-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
            return;
        }

        const crcIdx = payload.lastIndexOf('6304');
        if (crcIdx === -1) { qrString = payload; return; }
        let body = payload.substring(0, crcIdx);
        body = body.replace('010211', '010212');

        const amountVal = Math.floor(amount).toString();
        const tag54 = "54" + amountVal.length.toString().padStart(2, '0') + amountVal;
        
        const pos53 = body.indexOf("5303360");
        const pos58 = body.indexOf("5802ID");
        
        if (pos53 !== -1 && pos58 !== -1) {
            body = body.substring(0, pos53 + 7) + tag54 + body.substring(pos58);
        } else {
            qrString = payload;
            return;
        }

        const finalPayload = body + "6304";
        qrString = finalPayload + crc16(finalPayload);
        document.getElementById('checkout-qris-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
    } catch (err) {
        console.error("Gagal konversi QRIS:", err);
        qrString = payload;
        document.getElementById('checkout-qris-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
    }
}

function crc16(data) {
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
}

// --- Check Status ---
async function checkStatusById(idOrAmount) {
    if (!idOrAmount) return;
    const cleanKey = idOrAmount.toString().trim();
    
    try {
        isProcessing = true;
        document.getElementById('btn-validasi-manual').innerText = 'Memvalidasi...';
        showToast(`Mencari data: ${cleanKey}...`, 'info');
        
        let res = await fetch(`${API_URL}/online-store/${cleanKey}`);
        
        if (!res.ok && res.status === 404 && /^\d+$/.test(cleanKey)) {
            res = await fetch(`${API_URL}/online-store/search-by-amount/${cleanKey}`);
        }

        if (res.ok) {
            const data = await res.json();
            currentTransaction = data;
            if (data.status === 'PAID' || data.status === 'USED') {
                showSuccess();
            } else {
                generateDynamicQR(data.total_amount);
                document.getElementById('checkout-order-id').innerText = data.order_id;
                document.getElementById('checkout-amount').innerText = formatRupiah(data.total_amount);
                document.getElementById('checkout-package-name').innerText = `Paket: ${data.package_id || 'Voucher'}`;
                setStep('checkout');
                showToast(`ID ${data.order_id} ditemukan, tapi STATUS MASIH PENDING.`, 'warning');
            }
        } else {
            showToast(`Data "${cleanKey}" tidak ditemukan.`, 'error');
        }
    } catch (err) {
        showToast('Gagal terhubung ke server.', 'error');
    } finally {
        isProcessing = false;
        document.getElementById('btn-validasi-manual').innerText = 'VALIDASI PEMBAYARAN';
    }
}

function checkStatusManual() {
    const input = document.getElementById('manual-order-id').value;
    if (input) checkStatusById(input);
}

// --- QR Upload (jsQR) ---
function handleQrUpload(e) {
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
                            const amountVal = getTagValue(foundData, '54');
                            
                            let extractedId = '';
                            if (tag62Content) {
                                const refId = getTagValue(tag62Content, '05');
                                const billId = getTagValue(tag62Content, '01');
                                extractedId = (refId || billId || '').trim();
                            }

                            if (extractedId) {
                                foundData = extractedId;
                            } else if (amountVal) {
                                foundData = amountVal;
                                showToast(`Mencari pesanan dengan nominal ${formatRupiah(amountVal)}...`, 'info');
                            }
                        } catch (err) { console.error(err); }
                    }
                    
                    const finalSearchKey = foundData.trim();
                    document.getElementById('manual-order-id').value = finalSearchKey;
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
    e.target.value = null;
}

// --- Timers & Polling ---
function startCheckoutTimer() {
    stopCheckoutTimer();
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            stopCheckoutTimer();
            setStep('katalog');
        } else {
            const m = Math.floor(timeLeft / 60);
            const s = (timeLeft % 60).toString().padStart(2, '0');
            document.getElementById('checkout-timer').innerText = `Menunggu pembayaran... (${m}:${s})`;
        }
    }, 1000);
}

function stopCheckoutTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

function startPolling() {
    stopPolling();
    pollingInterval = setInterval(async () => {
        if (!currentTransaction) return;
        try {
            const res = await fetch(`${API_URL}/online-store/${currentTransaction.order_id}`);
            if (res.ok) {
                const updatedTrx = await res.json();
                if (updatedTrx.status === 'PAID' || updatedTrx.status === 'USED') {
                    currentTransaction = updatedTrx;
                    showSuccess();
                }
            }
        } catch (e) { console.error(e); }
    }, 4000);
}

function stopPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
}

// --- Success & Login ---
function showSuccess() {
    stopPolling();
    stopCheckoutTimer();
    
    document.getElementById('success-order-id').innerText = currentTransaction.order_id;
    document.getElementById('success-voucher-code').innerText = currentTransaction.voucher_code || '-';
    
    if (portalSettings?.success_message_html) {
        document.getElementById('success-message-custom').innerHTML = portalSettings.success_message_html;
    } else {
        document.getElementById('success-message-custom').innerHTML = "Voucher Anda sudah aktif. Silakan login untuk menikmati internet.";
    }

    if (!isLocalNetwork()) {
        document.getElementById('outside-network-warning').classList.remove('hidden');
        if (portalSettings?.outside_network_message_html) {
            document.getElementById('outside-network-message-custom').innerHTML = portalSettings.outside_network_message_html;
        }
    } else {
        document.getElementById('outside-network-warning').classList.add('hidden');
    }

    setStep('success');
}

function isLocalNetwork() {
    const hostname = window.location.hostname;
    let localHost = portalSettings?.hotspot_login_url || 'arm.test';
    localHost = localHost.replace('http://', '').replace('https://', '').split('/')[0].trim();
    
    if (hostname.toLowerCase() === localHost.toLowerCase()) return true;
    if (['localhost', '127.0.0.1'].includes(hostname) || hostname.startsWith('192.168.') || hostname.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return true;
    return false;
}

function startSuccessAutoLogin() {
    if (!currentTransaction?.voucher_code || !isLocalNetwork()) return;
    
    let rc = 5;
    const btnText = document.getElementById('auto-login-text');
    const helperText = document.getElementById('auto-login-helper-text');
    
    document.getElementById('manual-login-link').classList.remove('hidden');
    
    redirectTimer = setInterval(() => {
        rc--;
        if (rc <= 0) {
            clearInterval(redirectTimer);
            handleAutoLogin();
        } else {
            btnText.innerText = `LOGIN OTOMATIS (${rc}s)`;
            helperText.innerText = `Mengalihkan ke sistem WiFi dalam ${rc} detik...`;
        }
    }, 1000);
}

function handleAutoLogin() {
    if (!currentTransaction?.voucher_code) {
        showToast("Kode voucher tidak ditemukan.", "error");
        return;
    }
    const username = currentTransaction.voucher_code;
    const password = currentTransaction.password || username;
    let targetHost = portalSettings?.hotspot_login_url || "arm.test";
    targetHost = targetHost.replace("http://", "").replace("https://", "").split("/")[0];
    const loginUrl = `http://${targetHost}/login?username=${username}&password=${password}&dst=http://www.google.com`;
    
    showToast("Mengaktifkan Koneksi...", "success");
    document.getElementById('a-manual-login').href = loginUrl;
    
    setTimeout(() => {
        window.location.href = loginUrl;
    }, 1000);
}

// --- Image Download Tools ---
async function handleDownloadQRIS() {
    try {
        showToast('Menyiapkan QRIS...', 'info');
        const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(qrString)}`;
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `QRIS-${currentTransaction.order_id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showToast('QRIS disimpan!', 'success');
    } catch (err) { showToast('Gagal mendownload QRIS.', 'error'); }
}

function handleSaveOrderCard() {
    try {
        showToast('Menyiapkan Gambar Kartu...', 'info');
        const canvas = document.createElement('canvas');
        canvas.width = 600; canvas.height = 360;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e1e24'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 24px Arial'; ctx.fillText('KARTU PESANAN', 40, 60);
        ctx.fillStyle = '#ffffff'; ctx.font = '900 52px Arial'; ctx.fillText(currentTransaction.order_id, 40, 130);
        ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 60px Arial'; ctx.fillText(formatRupiah(currentTransaction.total_amount), 40, 220);
        ctx.fillStyle = '#94a3b8'; ctx.font = '24px Arial'; ctx.fillText(`Paket: ${currentTransaction.package_id || selectedPkg?.groupname || 'Voucher'}`, 40, 280);
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            ctx.fillStyle = 'white'; ctx.fillRect(440, 40, 120, 120);
            ctx.drawImage(img, 450, 50, 100, 100);
            const link = document.createElement('a');
            link.download = `KARTU-PESANAN-${currentTransaction.order_id}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('Kartu Pesanan disimpan!', 'success');
        };
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
    } catch (err) { showToast('Gagal menyimpan kartu.', 'error'); }
}

// Init
fetchPortalData();
