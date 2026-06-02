# Panduan Instalasi Web Server (Frontend & Backend)

Web Server bertugas untuk menjalankan panel antarmuka admin (Frontend) dan mengolah API (Backend). Web Server tidak menyimpan data secara lokal, melainkan membaca dan menulis data langsung ke **Core Server**.

## Persyaratan
- VPS dengan OS Linux (Ubuntu 20.04 / 22.04 / 24.04 atau Debian).
- Akses ke user `root` (atau user dengan akses `sudo`).
- **Telah menyelesaikan instalasi Core Server.** Anda membutuhkan Alamat IP Core Server dan Password Databasenya.

## Langkah Instalasi

1. **Login ke VPS Web Server Anda** melalui terminal/SSH.

2. **Download Script Instalasi:**
   ```bash
   wget https://raw.githubusercontent.com/<USERNAME_GITHUB_ANDA>/radiusbillingcoolify/main/install_web.sh
   chmod +x install_web.sh
   ```
   *(Penting: Ganti URL di atas dengan link "raw" dari GitHub Anda yang sebenarnya).*

3. **Jalankan Script Instalasi:**
   ```bash
   sudo ./install_web.sh
   ```

4. **Ikuti Instruksi pada Layar:**
   - Masukkan link repositori GitHub Anda.
   - Script akan meminta **IP Address CORE SERVER**. Masukkan alamat IP VPS Core Server Anda. *(Catatan: Jika kedua VPS Anda berada di provider yang sama dan mendukung Private IP, gunakan Private IP agar lebih cepat dan aman).*
   - Masukkan **Password Database (MySQL)** yang sama persis dengan yang Anda buat pada saat menginstal Core Server.
   - Tunggu hingga proses instalasi Docker selesai.

## Mengakses Dashboard Web
Setelah proses selesai, aplikasi web Anda otomatis berjalan. Buka browser dan ketik alamat IP Web Server Anda menggunakan port 8088:
```
http://<IP_WEB_SERVER_ANDA>:8088
```

> [!NOTE]
> **Catatan Terkait Portal Mandiri (Standalone):**
> Jika Anda menginstal Portal Pembelian Voucher di VPS yang berbeda, server Web Admin ini **tidak perlu dikonfigurasi** dengan nama domain/IP portal tersebut. Sistem *Cross-Origin* (CORS) dan *Redirect Payment Gateway* (Duitku/Midtrans) di Web Admin telah diotomatisasi secara dinamis untuk menerima permintaan dari domain portal mana pun (selama URL portal diset saat instalasi Portal).

## Setup Backup Google Drive (Opsional)
Fitur Backup GDrive berjalan secara otomatis di Web Server. Untuk mengaktifkannya, Anda harus memasukkan kredensial Service Account:
1. Buat **Service Account** di Google Cloud Console.
2. Unduh file JSON kredensial (keys) yang diberikan.
3. Ganti nama file tersebut menjadi `service-account.json`.
4. Upload file tersebut ke Web Server Anda, lalu letakkan di folder `backend/config/` (contoh lokasi jika menggunakan docker volume, atau copy manual ke dalam container/folder source code di `/backend/config/service-account.json`).
5. Buka dashboard web, masuk ke menu **Backup GDrive**, lengkapi Folder ID dan nyalakan penjadwalannya.

## Troubleshooting
Jika saat membuka web, data pelanggan tidak muncul atau loading terus-menerus:
1. Pastikan IP Core Server sudah diketik dengan benar (periksa kembali isi file `.env`).
2. Pastikan password database sudah sesuai.
3. Pastikan **Firewall (UFW)** di VPS Core Server sudah di-setting untuk mengizinkan port `3306` dari koneksi IP VPS Web ini.
4. Anda bisa melihat log error web menggunakan perintah:
   ```bash
   docker compose -f docker-compose_web.yml logs -f backend
   ```
