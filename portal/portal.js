// Konfigurasi API (Menggunakan port 8088 karena Nginx Web Proxy meneruskannya ke Backend port 5000)
const API_URL = `http://${window.location.hostname}:8088/api`;
let portalSettings = {};
let selectedPackage = null;
let pollingInterval = null;

// Format Rupiah
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

// Inisialisasi Portal
async function initPortal() {
    try {
        // Cek apakah ada order_id di URL (dari return url payment gateway)
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order_id');
        
        if (orderId) {
            checkTransactionStatus(orderId);
            return; // Tunggu status selesai
        }

        // Fetch Settings
        const resSettings = await fetch(`${API_URL}/online-store/settings`);
        if (!resSettings.ok) throw new Error('Gagal mengambil pengaturan portal');
        portalSettings = await resSettings.json();

        // Terapkan pengaturan ke UI
        document.title = portalSettings.portal_title || 'Portal Pembelian Voucher';
        document.getElementById('portal-title').innerText = portalSettings.portal_title || 'Wi-Fi Voucher Store';
        document.getElementById('portal-desc').innerText = portalSettings.portal_description || 'Beli voucher internet instan 24 jam';
        
        // if (portalSettings.primary_color) {
        //     document.getElementById('header-bg').style.backgroundColor = portalSettings.primary_color;
        //     document.getElementById('btn-checkout').style.backgroundColor = portalSettings.primary_color;
        // }

        // Fetch Packages
        const resPackages = await fetch(`${API_URL}/profiles`);
        if (!resPackages.ok) throw new Error('Gagal mengambil daftar paket');
        const allPackages = await resPackages.json();

        // Filter paket yang diaktifkan untuk online store
        const storePackages = allPackages.filter(p => p.show_in_store === 1 && p.status === 'Aktif');

        renderPackages(storePackages);

        // Sembunyikan loading, tampilkan konten
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('portal-container').classList.remove('hidden');

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loading').innerHTML = `
            <div class="text-red-500 mb-4"><svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div>
            <p class="text-ink font-medium">Terjadi kesalahan sistem.</p>
            <p class="text-ink-subtle text-sm mt-1">Pastikan server backend berjalan.</p>
        `;
    }
}

// Render daftar paket ke HTML
function renderPackages(packages) {
    const listContainer = document.getElementById('packages-list');
    const noPackages = document.getElementById('no-packages');

    if (packages.length === 0) {
        noPackages.classList.remove('hidden');
        listContainer.innerHTML = '';
        return;
    }

    let html = '';
    packages.forEach(pkg => {
        // Tentukan warna tag/ikon berdasarkan harga
        const isPremium = pkg.harga >= 50000;
        const badgeColor = isPremium ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800';
        
        html += `
            <div class="linear-card p-6 cursor-pointer flex flex-col justify-between hover:border-brand-primary/50 transition-colors group" onclick="openCheckout('${pkg.groupname}', ${pkg.harga})">
                <div class="mb-4">
                    <div class="flex items-center gap-2 mb-2">
                        <h3 class="font-semibold text-ink text-lg display-font">${pkg.groupname}</h3>
                        ${pkg.rate_limit ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-ink-subtle border border-hairline uppercase tracking-wider">${pkg.rate_limit}</span>` : ''}
                    </div>
                    <div class="text-sm text-ink-subtle flex items-center gap-1">
                        <svg class="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Masa Aktif: ${pkg.masa_aktif} ${pkg.satuan}
                    </div>
                </div>
                <div class="flex items-end justify-between border-t border-hairline pt-4 mt-2">
                    <p class="text-2xl font-semibold text-ink display-font">${formatRupiah(pkg.harga)}</p>
                    <button class="text-sm text-white bg-surface-2 border border-hairline px-4 py-1.5 rounded-md font-medium group-hover:bg-brand-primary group-hover:border-brand-primary transition-colors">Pilih</button>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

// Buka modal konfirmasi pembelian
function openCheckout(packageId, price) {
    selectedPackage = { id: packageId, price: price };
    
    document.getElementById('selected-package-name').innerText = packageId;
    document.getElementById('selected-package-price').innerText = formatRupiah(price);
    document.getElementById('input-package-id').value = packageId;
    document.getElementById('input-amount').value = price;
    
    // if (portalSettings.primary_color) {
    //     document.getElementById('selected-package-price').style.color = portalSettings.primary_color;
    // }

    const modal = document.getElementById('checkout-modal');
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('checkout-modal').classList.add('hidden');
}

// Proses Pembayaran (Prioritas: Midtrans -> Tripay -> Duitku -> Manual)
async function handleCheckout(e) {
    e.preventDefault();
    
    const btn = document.getElementById('btn-checkout');
    btn.disabled = true;
    btn.innerHTML = '<div class="loader" style="width:20px;height:20px;border-width:2px;margin:0;"></div> <span class="ml-2">Memproses...</span>';

    const packageId = document.getElementById('input-package-id').value;
    const amount = document.getElementById('input-amount').value;
    const customerName = document.getElementById('input-name').value || 'Customer Portal';

    const payload = {
        package_id: packageId,
        amount: amount,
        customer_name: customerName
    };

    try {
        let endpoint = '/online-store/create-transaction'; // Default manual QRIS
        let isRedirect = false;

        // Cek payment gateway yang aktif dari setting
        if (portalSettings.enable_midtrans) {
            endpoint = '/online-store/midtrans/create-transaction';
            isRedirect = true;
        } else if (portalSettings.enable_tripay) {
            endpoint = '/online-store/tripay/create-transaction';
            isRedirect = true;
        } else if (portalSettings.enable_duitku) {
            endpoint = '/online-store/duitku/create-invoice';
            isRedirect = true;
        }

        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Terjadi kesalahan saat memproses pembayaran');
        }

        if (isRedirect && data.payment_url) {
            // Redirect ke payment gateway
            window.location.href = data.payment_url;
        } else {
            // Transaksi Manual QRIS
            alert(`Pesanan berhasil dibuat! Silakan transfer sebesar ${formatRupiah(data.total_amount)} (Termasuk kode unik ${data.unique_code}) ke QRIS Admin.`);
            // Mulai polling status
            closeModal();
            checkTransactionStatus(data.order_id);
        }

    } catch (error) {
        alert(error.message);
        btn.disabled = false;
        btn.innerHTML = '<span>Lanjutkan Pembayaran</span>';
    }
}

// Cek Status Transaksi secara berkala
async function checkTransactionStatus(orderId) {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('portal-container').classList.add('hidden');
    document.querySelector('#loading p').innerText = "Menunggu konfirmasi pembayaran...";

    pollingInterval = setInterval(async () => {
        try {
            const res = await fetch(`${API_URL}/online-store/${orderId}`);
            if (res.ok) {
                const trx = await res.json();
                if (trx.status === 'PAID') {
                    clearInterval(pollingInterval);
                    showSuccess(trx.voucher_code);
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 5000); // Tiap 5 detik
}

// Tampilkan halaman sukses
function showSuccess(voucherCode) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('checkout-modal').classList.add('hidden');
    document.getElementById('portal-container').classList.add('hidden');
    
    document.getElementById('success-voucher-code').innerText = voucherCode;
    document.getElementById('success-container').classList.remove('hidden');
}

// Mulai aplikasi
initPortal();
