# Panduan Instalasi RadiusBilling di Single VPS

Panduan ini ditujukan untuk instalasi seluruh layanan (Frontend, Backend, Database, dan Radius Server) ke dalam satu Virtual Private Server (VPS) yang sama.

## 1. Persiapan VPS
- **OS yang Disarankan:** Ubuntu 22.04 LTS (Jammy Jellyfish).
- **Akses:** Pastikan Anda memiliki akses `root` atau *sudo* ke dalam VPS tersebut.

> [!NOTE]
> **Khusus Pengguna Proxmox LXC:**
> Jika Anda menggunakan Proxmox LXC (*Linux Container*) tipe **Unprivileged**, script instalasi ini sudah dirancang pintar untuk menghapus fitur `apparmor` secara otomatis agar Docker dapat berjalan normal tanpa error keamanan (Permission Denied).

## 2. Cara Eksekusi Instalasi

Anda tidak perlu menginstal Docker secara manual karena script instalasi akan mengerjakan semuanya dari awal. Cukup jalankan perintah berikut di terminal VPS Anda:

### Unduh dan Jalankan Script
Jika file script belum ada di VPS Anda, Anda bisa membuat file baru atau mengunduhnya langsung. (Ganti URL di bawah dengan URL Raw GitHub Anda jika script sudah di-push ke GitHub).

```bash
# 1. Download script (jika mengambil dari github)
wget https://raw.githubusercontent.com/username-anda/radiusbillingcoolify/main/install.sh

# 2. Berikan izin eksekusi
chmod +x install.sh

# 3. Jalankan script sebagai root
sudo ./install.sh
```

## 3. Proses Pengisian Data (Interaktif)

Saat script berjalan, Anda akan diminta mengisi beberapa informasi. Berikut adalah penjelasannya:

1. **Link GitHub Repositori:** 
   Masukkan link repositori Anda (contoh: `https://github.com/username/radiusbillingcoolify.git`). Script akan otomatis mengkloning (download) seluruh kode ke VPS. Jika Anda kosongkan (*Enter*), script akan menyalin file lokal yang ada di folder tempat Anda menjalankan script.
   
2. **File Backup Database .sql (Opsional):** 
   Jika Anda sedang melakukan *migrasi* dari server lama dan memiliki file backup `.sql`, masukkan letak file tersebut (contoh: `/root/backup.sql`). Script akan otomatis menghapus kerangka database bawaan dan me-restore data lama Anda saat instalasi berjalan. Kosongkan (*Enter*) jika Anda ingin menginstal dari nol (database kosong/baru).

3. **Path Direktori Instalasi:** 
   Tempat folder aplikasi akan diletakkan. Standarnya ada di `/opt/radiusbilling`. Tekan *Enter* untuk menggunakan standar.

4. **Kredensial Database MySQL:** 
   - *MySQL Root Password* (Wajib diisi).
   - *Nama Database MySQL* (Bisa kosongkan untuk standar `radius`).
   - *Nama User MySQL* (Bisa kosongkan untuk standar `radius`).
   - *Password User MySQL* (Wajib diisi).

## 4. Proses Otomatis
Setelah Anda menekan Enter pada pengisian terakhir, sistem akan berjalan otomatis melakukan:
- Update sistem operasi dan instalasi Git, Curl, dan OpenSSH-Server.
- Membuka akses *Root Login* (PermitRootLogin) via SSH.
- Kloning source code dari GitHub (jika link diisi).
- Menyalin/menyiapkan file backup database.
- Instalasi Docker & Docker Compose.
- Menghapus AppArmor (khusus perbaikan environment Proxmox LXC).
- Pembuatan file konfigurasi `.env`.
- Proses `docker compose build` dan `up -d` untuk menjalankan aplikasi.

## 5. Mengakses Aplikasi

Setelah instalasi selesai (ditandai dengan munculnya pesan sukses di terminal), aplikasi Anda akan otomatis menyala di latar belakang dan memiliki fitur **Auto-Run** (langsung menyala kembali apabila VPS di-restart).

Buka browser Anda dan akses melalui alamat berikut:
```text
http://<IP_VPS_ANDA>:8088
```

> [!TIP]
> Jika Anda mengalami kendala aplikasi belum bisa diakses di detik-detik awal, berikan waktu sekitar 1-2 menit untuk kontainer MySQL melakukan *initialization* data di *background*.

## 6. Troubleshooting (Masalah Umum)

### Error: `open sysctl net.ipv4.ip_unprivileged_port_start file: permission denied`
Error ini sangat umum terjadi jika Anda menginstal sistem di dalam **Proxmox LXC bertipe Unprivileged**. Versi Docker dan image MySQL terbaru mencoba mengubah pengaturan jaringan kernel, namun ditolak oleh sistem keamanan Proxmox LXC.

**Solusi 1 (Paling Direkomendasikan - Jika Anda punya akses ke server Proxmox Utama):**
1. Login ke terminal server Host Proxmox Anda.
2. Edit file konfigurasi LXC Anda (misal ID-nya 105): `nano /etc/pve/lxc/105.conf`
3. Tambahkan 3 baris ini di bagian paling bawah:
   ```text
   lxc.apparmor.profile: unconfined
   lxc.cgroup.devices.allow: a
   lxc.cap.drop:
   ```
4. Simpan, lalu Restart VPS LXC Anda dari panel Proxmox. Docker akan berjalan normal setelah ini.

**Solusi 2 (Jika Anda Menyewa VPS dan tidak bisa akses Proxmox Induk):**
Jika Anda tidak bisa mengubah konfigurasi host, Anda harus beralih ke image **MariaDB** (saudara kembar MySQL yang 100% kompatibel dan lolos blokir ini).
1. Edit file `docker-compose.yml` di folder instalasi Anda.
2. Cari bagian `image: mysql:8.0` dan ubah menjadi `image: mariadb:10.11`
3. Simpan, lalu jalankan ulang `docker compose up -d`.
