// Konfigurasi API
const API_URL = `http://${window.location.hostname}:8088/api`;

let portalSettings = {};
let packages = [];
let selectedPkg = null;
let currentTransaction = null;
let pollingInterval = null;
let timerInterval = null;
let timeLeft = 300;

// Format Rupiah
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

// Toast Notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `<div class="toast-content"><span>${message}</span></div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

// Switch View
function switchView(viewId) {
    const views = ['katalog', 'payment', 'checkout', 'success', 'check_status'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.add('hidden');
    });
    const active = document.getElementById(`view-${viewId}`);
    if (active) active.classList.remove('hidden');
}

// Inisialisasi
async function initPortal() {
    try {
        const [sRes, pRes] = await Promise.all([
            fetch(`${API_URL}/online-store/settings`).then(r => r.json()),
            fetch(`${API_URL}/profiles`).then(r => r.json())
        ]);
        
        portalSettings = sRes;
        packages = pRes.filter(p => p.harga > 0 && p.show_in_store);
        
        document.getElementById('loading').style.display = 'none';

        if (portalSettings && !portalSettings.is_active) {
            document.getElementById('closed-container').classList.remove('hidden');
            document.getElementById('closed-container').style.display = 'flex';
            if (portalSettings.closed_by_schedule) {
                document.getElementById('closed-title').innerText = 'PORTAL TUTUP';
                document.getElementById('closed-desc').innerText = `Jam operasional: ${portalSettings.open_time} - ${portalSettings.close_time}`;
            }
            return;
        }

        document.getElementById('main-container').classList.remove('hidden');
        document.title = portalSettings.portal_title || 'Online Payment';
        document.getElementById('portal-title').innerText = portalSettings.portal_title || 'Online Payment';
        if (portalSettings.portal_description) {
            document.getElementById('portal-desc').innerText = portalSettings.portal_description;
        }

        renderPackages();
        switchView('katalog');
        
        // Auto check order_id dari URL
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order_id');
        if (orderId) {
            document.getElementById('input-order-id').value = orderId;
            checkStatusById(orderId);
        }
    } catch (err) {
        document.getElementById('loading').innerHTML = `<div style="color:#ef4444;text-align:center;">Gagal menghubungi server. Pastikan Web Admin berjalan.</div>`;
    }
}

function renderPackages() {
    const list = document.getElementById('packages-list');
    let html = '';
    packages.forEach((pkg, i) => {
        const color = i % 3 === 0 ? '#8b5cf6' : i % 3 === 1 ? '#3b82f6' : '#ec4899';
        html += `
            <div class="glass-card" style="padding: 25px; text-align: center; border-top: 4px solid ${color};">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto; color: white;"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
                <h3 style="margin: 15px 0 5px; font-size: 1.5rem; font-weight: 800;">${pkg.groupname}</h3>
                <div style="font-size: 2.2rem; font-weight: 900; margin: 15px 0;">${formatRupiah(pkg.harga)}</div>
                <button onclick="handlePackageSelect('${pkg.groupname}')" class="btn-primary" style="width: 100%; padding: 16px; border-radius: 14px; font-weight: 900; cursor: pointer;">BELI SEKARANG</button>
            </div>
        `;
    });
    list.innerHTML = html;
}

function handlePackageSelect(groupname) {
    selectedPkg = packages.find(p => p.groupname === groupname);
    
    const activeMethods = [];
    if (portalSettings.enable_payment_bridge) activeMethods.push({ id: 'bridge', name: 'QRIS Manual / Bridge', desc: 'Otomatis via HP Admin', icon: 'QR' });
    if (portalSettings.enable_duitku) activeMethods.push({ id: 'duitku', name: 'Duitku Gateway', desc: 'VA / E-Wallet Resmi', icon: 'Bank', color: '#f59e0b' });
    if (portalSettings.enable_midtrans) activeMethods.push({ id: 'midtrans', name: 'Midtrans Gateway', desc: 'QRIS / E-Wallet / VA', icon: 'Bank', color: '#10b981' });
    if (portalSettings.enable_tripay) activeMethods.push({ id: 'tripay', name: 'Tripay Global', desc: 'QRIS / VA / Retail', icon: 'Rocket', color: '#ec4899' });

    if (activeMethods.length > 1) {
        renderPaymentMethods(activeMethods);
        switchView('payment');
    } else if (activeMethods.length === 1) {
        processPayment(activeMethods[0].id);
    } else {
        showToast('Metode pembayaran tidak tersedia.', 'error');
    }
}

function renderPaymentMethods(methods) {
    const list = document.getElementById('payment-methods');
    let html = '';
    methods.forEach(m => {
        const colorStyle = m.color ? `background: ${m.color}15; color: ${m.color};` : `background: #38bdf815; color: #38bdf8;`;
        const iconSvg = m.icon === 'Bank' ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18" /><path d="M3 10h18" /><path d="M5 21V10" /><path d="M19 21V10" /><path d="M10 21V10" /><path d="M14 21V10" /><path d="M2 10l10-8 10 8" /></svg>` : 
                        m.icon === 'Rocket' ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12l-5 3" /><path d="M12 9l3-5" /></svg>` :
                        `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>`;
        html += `
            <button onclick="processPayment('${m.id}')" class="payment-method-btn">
                <div class="payment-icon-wrapper" style="${colorStyle}">${iconSvg}</div>
                <div style="text-align: left; flex: 1;"><div style="font-weight: 800;">${m.name}</div><div style="font-size: 0.75rem; opacity: 0.6;">${m.desc}</div></div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        `;
    });
    list.innerHTML = html;
}

async function processPayment(methodId) {
    if (!selectedPkg) return;
    showToast('Memproses...', 'info');
    
    try {
        const payload = { 
            package_id: selectedPkg.groupname, 
            amount: selectedPkg.harga, 
            customer_name: 'Customer',
            return_url: window.location.href.split('?')[0]
        };
        
        let endpoint = '';
        if (methodId === 'duitku') endpoint = '/online-store/duitku/create-invoice';
        else if (methodId === 'bridge') endpoint = '/online-store/create-transaction';
        else if (methodId === 'tripay') { endpoint = '/online-store/tripay/create-transaction'; payload.method = 'QRIS'; }
        else if (methodId === 'midtrans') endpoint = '/online-store/midtrans/create-transaction';

        const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();

        if (data.payment_url) {
            window.location.href = data.payment_url;
            return;
        }

        if (data.order_id) {
            currentTransaction = data;
            document.getElementById('co-order-id').innerText = data.order_id;
            document.getElementById('co-amount').innerText = formatRupiah(data.total_amount);
            document.getElementById('co-pkg-name').innerText = `Paket: ${selectedPkg.groupname}`;
            
            generateDynamicQR(data.total_amount);
            
            switchView('checkout');
            startTimer();
            startPolling(data.order_id);
        } else {
            showToast(data.error || 'Terjadi kesalahan', 'error');
        }
    } catch (err) {
        showToast('Gagal memproses pembayaran.', 'error');
    }
}

function generateDynamicQR(amount) {
    const container = document.getElementById('qrcode-container');
    container.innerHTML = ''; // Clear
    
    let qrString = portalSettings.qris_static_string || '';
    
    // Simple dynamic QR logic (for bridge)
    if (qrString && qrString.includes('5303360') && qrString.includes('5802ID') && qrString.startsWith('000201')) {
        let body = qrString.substring(0, qrString.lastIndexOf('6304'));
        body = body.replace('010211', '010212');
        const amountStr = Math.floor(amount).toString();
        const tag54 = "54" + amountStr.length.toString().padStart(2, '0') + amountStr;
        
        const pos53 = body.indexOf("5303360");
        const pos58 = body.indexOf("5802ID");
        if (pos53 !== -1 && pos58 !== -1) {
            body = body.substring(0, pos53 + 7) + tag54 + body.substring(pos58);
            const finalPayload = body + "6304";
            qrString = finalPayload + crc16(finalPayload);
        }
    }

    if (qrString) {
        new QRCode(container, {
            text: qrString,
            width: 200,
            height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    } else {
        container.innerText = "QRIS tidak tersedia.";
    }
}

function crc16(data) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            else crc = (crc << 1) & 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function startTimer() {
    timeLeft = 300;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        const m = Math.floor(timeLeft / 60);
        const s = (timeLeft % 60).toString().padStart(2, '0');
        const el = document.getElementById('co-timer');
        if (el) el.innerText = `${m}:${s}`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            switchView('katalog');
            if (pollingInterval) clearInterval(pollingInterval);
        }
    }, 1000);
}

function startPolling(orderId) {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        try {
            const res = await fetch(`${API_URL}/online-store/${orderId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'PAID' || data.status === 'USED') {
                    clearInterval(pollingInterval);
                    if (timerInterval) clearInterval(timerInterval);
                    currentTransaction = data;
                    showSuccess();
                }
            }
        } catch (e) { console.error(e); }
    }, 4000);
}

async function checkStatusById(providedId) {
    const inputId = providedId || document.getElementById('input-order-id').value.trim();
    if (!inputId) {
        showToast('Masukkan ID pesanan!', 'error');
        return;
    }
    
    document.getElementById('btn-validasi').innerText = 'Memvalidasi...';
    try {
        let res = await fetch(`${API_URL}/online-store/${inputId}`);
        if (!res.ok && res.status === 404 && /^\d+$/.test(inputId)) {
            res = await fetch(`${API_URL}/online-store/search-by-amount/${inputId}`);
        }
        
        if (res.ok) {
            const data = await res.json();
            currentTransaction = data;
            if (data.status === 'PAID' || data.status === 'USED') {
                showSuccess();
            } else {
                showToast('Transaksi masih PENDING.', 'warning');
                document.getElementById('co-order-id').innerText = data.order_id;
                document.getElementById('co-amount').innerText = formatRupiah(data.total_amount);
                document.getElementById('co-pkg-name').innerText = `Paket: ${data.package_id}`;
                generateDynamicQR(data.total_amount);
                switchView('checkout');
                startTimer();
                startPolling(data.order_id);
            }
        } else {
            showToast('Pesanan tidak ditemukan.', 'error');
        }
    } catch (e) {
        showToast('Gagal terhubung ke server.', 'error');
    }
    document.getElementById('btn-validasi').innerText = 'VALIDASI PEMBAYARAN';
}

function showSuccess() {
    switchView('success');
    document.getElementById('success-order-id').innerText = currentTransaction.order_id;
    document.getElementById('success-code').innerText = currentTransaction.voucher_code;
    showToast('Pembayaran berhasil divalidasi!', 'success');
}

function handleAutoLogin() {
    if (!currentTransaction || !currentTransaction.voucher_code) return;
    const username = currentTransaction.voucher_code;
    const password = currentTransaction.password || username;
    
    let targetHost = portalSettings.hotspot_login_url || window.location.hostname;
    targetHost = targetHost.replace('http://', '').replace('https://', '').split('/')[0];
    
    const loginUrl = `http://${targetHost}/login?username=${username}&password=${password}&dst=http://www.google.com`;
    showToast('Mengaktifkan Koneksi...', 'info');
    document.getElementById('btn-login-otomatis').innerText = 'MENGALIHKAN...';
    setTimeout(() => {
        window.location.href = loginUrl;
    }, 1500);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Berhasil disalin!', 'success');
    }).catch(err => {
        const textArea = document.createElement("textarea");
        textArea.value = text; document.body.appendChild(textArea); textArea.select();
        try { document.execCommand('copy'); showToast('Berhasil disalin!', 'success'); } 
        catch (err) { showToast('Gagal menyalin.', 'error'); }
        document.body.removeChild(textArea);
    });
}

initPortal();
