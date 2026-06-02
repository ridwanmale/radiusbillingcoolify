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
2. **Download Script Instalasi dari GitHub:**
   ```bash
   wget https://raw.githubusercontent.com/<USERNAME_GITHUB_ANDA>/radiusbillingcoolify/main/install_portal.sh
   chmod +x install_portal.sh
   ```
   *(Catatan: Ganti `<USERNAME_GITHUB_ANDA>` dengan username GitHub Anda, atau sesuaikan dengan link repository Anda).*

3. **Jalankan script instalasi:**
```bash
sudo ./install_portal.sh
```

4. **Ikuti panduan di layar:**
   - **Link GitHub:** Tekan `Enter` untuk menggunakan repositori default.
   - **Path Instalasi:** Tekan `Enter` untuk default (`/opt/radiusbilling-portal`).
   - **URL Web Admin API:** Masukkan URL lengkap Web Admin Anda. 
     - *Contoh Jika Pakai Cloudflare/Domain:* `https://admin.domainanda.com`
     - *Contoh Jika IP Lokal:* `http://192.168.1.10:8088`
     - *(Catatan: Script ini akan otomatis menyuntikkan URL tersebut ke dalam sistem portal, sehingga Anda tidak perlu lagi mengedit file secara manual)*.
   - **Port:** Tekan `Enter` untuk menggunakan port default `8089`.

5. **Tunggu proses instalasi selesai.**
   Script akan otomatis mendownload file, menyuntikkan URL API yang Anda masukkan, mengkonfigurasi Docker, dan menjalankan container.nya di latar belakang.

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
