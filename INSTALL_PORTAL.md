# Panduan Instalasi Portal Pembelian Voucher Online

Dokumen ini berisi panduan untuk menginstal dan menjalankan Portal Pembelian Voucher Online yang berjalan secara independen dari server Web Admin utama.

Portal ini dirancang untuk sangat ringan, responsif untuk perangkat mobile, dan menggunakan desain modern (Dark Theme).

---

## 📋 Persyaratan Sistem

Sebelum melakukan instalasi, pastikan hal-hal berikut sudah terpenuhi:
1. Anda sudah menginstal **Core Server** (Radius & Database) dan sedang berjalan.
2. Anda sudah menginstal **Web Server / Backend API** (Container `backend` berjalan di port `5000`). Portal membutuhkan API Backend untuk memuat paket internet dan memproses pembayaran.
3. Anda memiliki Docker dan Docker Compose yang terinstal di server.

---

## 🚀 Langkah Instalasi

Proses instalasi sangat mudah karena sudah menggunakan script interaktif.

1. **Login ke VPS / Server Anda** melalui terminal atau SSH.
2. **Download dan Jalankan Script Instalasi:**
   ```bash
   wget https://raw.githubusercontent.com/ridwanmale/radiusbillingcoolify/main/install_portal.sh
   chmod +x install_portal.sh
   sudo ./install_portal.sh
   ```
3. **Ikuti panduan di layar:**
   - **Link GitHub:** Tekan `Enter` untuk menggunakan repositori default.
   - **Path Instalasi:** Tekan `Enter` untuk default (`/opt/radiusbilling-portal`).
   - **URL Web Admin API:** Masukkan URL lengkap Web Admin Anda.
     - *Contoh Jika Pakai Cloudflare/Domain (HTTPS):* `https://admin.domainanda.com`
     - *Contoh Jika IP Lokal (HTTP):* `http://192.168.1.10:8088`
     > **PENTING (HTTPS / Mixed Content):** Jika nantinya portal ini diakses oleh pelanggan menggunakan HTTPS (contoh: `https://beli.domain.com`), maka Web Admin Anda **wajib** menggunakan alamat HTTPS juga (contoh: `https://admin.domain.com`). Jika Anda memasukkan alamat `http://` biasa, browser pelanggan akan memblokir proses pembelian (Error Mixed Content).
   - **Port:** Tekan `Enter` untuk menggunakan port default `8089`.

4. **Tunggu proses instalasi selesai.**
   Script akan otomatis mendownload file, menyuntikkan URL API yang Anda masukkan, mengkonfigurasi Docker, dan menjalankan container-nya di latar belakang.

---

## 📝 Topologi 2 VPS (Core Server & Web Admin + Portal)
Jika Anda menggunakan topologi 2 VPS (VPS 1 untuk Core Server, VPS 2 untuk Web Admin dan Portal sekaligus), maka di **VPS 2**, Anda **wajib menjalankan 2 script secara berurutan**:
1. Jalankan `install_web.sh` terlebih dahulu untuk menginstal Web Admin.
2. Setelah selesai, jalankan `install_portal.sh` untuk menginstal Portal Pembelian.

Saat `install_portal.sh` meminta **URL Web Admin API**, Anda cukup menekan `Enter` (dikosongkan), maka sistem akan cerdas menghubungkan portal ke web admin di VPS yang sama secara otomatis. Pastikan mengakses portal dan web admin sesuai konfigurasi domain yang sama.

---

## 🌐 Cara Mengakses Portal

Jika instalasi berhasil dan Anda menggunakan port `8089`, Anda dapat mengakses portal melalui browser dengan mengetikkan:

```text
http://<IP_SERVER_ANDA>:8089
```

> **Catatan:** Portal ini akan langsung terhubung ke API backend untuk menarik pengaturan nama toko, warna, dan daftar paket voucher internet yang disetel ke `show_in_store = 1`.

---

## 🛠️ Manajemen Container (Opsional)

Jika Anda ingin mengelola service portal ini secara manual (tanpa script bash), Anda dapat menggunakan perintah Docker Compose bawaan:

**Menjalankan Portal:**
```bash
export PORTAL_PORT=8089
docker-compose -f docker-compose_portalonlinevoucher.yml up -d
```

**Melihat Log Error/Akses Portal:**
```bash
docker logs -f radiusbillingcoolify-portal-1
```

**Menghentikan Portal:**
```bash
docker-compose -f docker-compose_portalonlinevoucher.yml down
```

---

## 💡 Konfigurasi Domain / Reverse Proxy (Lanjutan)

Jika Anda menggunakan Nginx Manager, Cloudflare Tunnel, atau Traefik, Anda bisa mengarahkan domain publik khusus (misal: `beli.hotspotanda.com`) untuk meneruskan permintaan (*forwarding*) ke IP server Anda pada port portal (misalnya `8089`). 

Pastikan koneksi antara portal web publik ini dan API Backend port 5000 tidak terblokir firewall (jika diletakkan pada server yang berbeda).

---

## 🛠️ Konfigurasi Wajib di Mikrotik (Sangat Penting)

Agar fitur **Auto-Restore Voucher** (anti-hilang khusus iPhone/Android) dan **Auto-Block Spam** dapat berjalan sempurna, Portal membutuhkan data **MAC Address** pelanggan yang dikirim oleh Mikrotik.

Anda **WAJIB** mengedit file `login.html` yang ada di dalam File List Mikrotik Anda.
Cari baris kode HTML atau Javascript yang melempar (redirect) pelanggan ke alamat Portal Anda, lalu ubah dan tambahkan parameter `?mac=$(mac)&ip=$(ip)&link-login-only=$(link-login-only)`.

**Contoh jika menggunakan Meta Refresh (HTML):**
```html
<meta http-equiv="refresh" content="0; url=https://beli.domainanda.com/?mac=$(mac)&ip=$(ip)&link-login-only=$(link-login-only)">
```

**Contoh jika menggunakan Javascript:**
```javascript
window.location.href = "https://beli.domainanda.com/?mac=$(mac)&ip=$(ip)&link-login-only=$(link-login-only)";
```

> **INFO:** Kode `$(mac)` adalah variabel bawaan Mikrotik. Jika parameter ini ditambahkan, sistem Portal otomatis mengenali pelanggan meskipun mereka menutup layar / merefresh halaman, sehingga voucher mereka tidak akan pernah hangus / hilang di layar.
