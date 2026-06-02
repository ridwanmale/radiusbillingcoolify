# Panduan Lengkap Setup Google Drive Backup

Fitur Google Drive Backup pada Radius Billing memungkinkan database Anda dicadangkan secara otomatis ke akun Google Drive Anda setiap hari.

Karena fitur ini bekerja secara "di belakang layar" *(server-to-server)*, Google mewajibkan penggunaan **Service Account** (Akun Layanan Robot) sebagai pengganti login email manual.

Berikut adalah langkah-langkah super lengkap dan mudah untuk mengaktifkannya:

---

## TAHAP 1: Membuat Service Account & Kunci (JSON) di Google Cloud

Langkah ini bertujuan untuk membuat "Robot" Google yang memiliki izin resmi untuk mengunggah file.

1. Buka situs **Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Login menggunakan akun Gmail Anda.
3. Di bagian kiri atas, klik menu dropdown **Pilih Project (Select a Project)**, lalu klik **New Project**. Beri nama bebas (misal: `RadiusBackup`), lalu klik **Create**.
4. Setelah project selesai dibuat, pastikan Anda sedang berada di dalam project tersebut.
5. Ketik di kolom pencarian paling atas: **Google Drive API**, lalu pilih hasilnya.
6. Klik tombol biru **ENABLE** (Aktifkan) agar project Anda memiliki izin menggunakan Google Drive.
7. Setelah API aktif, klik menu navigasi di kiri atas ☰ -> pilih **IAM & Admin** -> pilih **Service Accounts**.
8. Klik tombol **+ CREATE SERVICE ACCOUNT** di bagian atas.
9. Isi nama Service Account (misal: `radius-bot`), lalu klik **Create and Continue**, dan klik **Done**.
10. Anda akan melihat Service Account yang baru saja dibuat. Salin **Email Service Account** tersebut (bentuknya panjang, mirip `radius-bot@radiusbackup-123.iam.gserviceaccount.com`). *Catat email ini, kita akan menggunakannya di Tahap 3!*
11. Klik pada alamat email service account tersebut untuk masuk ke pengaturannya.
12. Pergi ke tab **KEYS** (Kunci).
13. Klik tombol **Add Key** -> pilih **Create new key**.
14. Pilih tipe **JSON**, lalu klik **Create**.
15. Sebuah file bernama panjang dengan akhiran `.json` akan otomatis ter-download ke laptop Anda. **Simpan file ini baik-baik!**

---

## TAHAP 2: Memasukkan Kredensial ke Radius Billing

Setelah Anda mendapatkan file JSON dari langkah di atas, kini saatnya memberikannya ke sistem Radius Anda.

1. Buka file `.json` yang baru saja Anda download menggunakan aplikasi **Notepad** (di Windows) atau TextEdit (di Mac).
2. Anda akan melihat banyak teks kode di dalamnya. Tekan **Ctrl + A** (Pilih Semua), lalu **Ctrl + C** (Salin/Copy).
3. Buka Dashboard Web Radius Billing Anda.
4. Masuk ke menu **Backup System**, lalu pilih tab **Google Drive**.
5. Pada kotak *Peringatan Kredensial Belum Dikonfigurasi*, letakkan kursor di kotak teks besar yang tersedia, lalu tekan **Ctrl + V** (Tempel/Paste).
6. Klik tombol hijau **Simpan Kredensial**.
7. Jika berhasil, Anda akan melihat pesan **"Service Account Aktif"** beserta alamat email panjang dari robot Google tadi.

---

## TAHAP 3: Membuat Folder Penampungan di Akun Google Drive Anda

Langkah ini sangat penting! Robot Google tadi (Service Account) **TIDAK BISA** melihat file-file pribadi di Google Drive Anda. Dia hanya bisa melihat folder yang Anda bagikan (Share) kepadanya.

1. Buka **Google Drive** Anda yang biasa (drive.google.com).
2. Buat sebuah folder baru, beri nama bebas (misal: `Backup_Radius_Ku`).
3. Klik kanan pada folder tersebut, pilih **Bagikan (Share)**.
4. Di kolom *"Add people and groups"*, **Paste/Tempel alamat Email Service Account** yang panjang tadi (dari Tahap 1 Nomor 10).
5. Pastikan perannya diatur sebagai **Editor** (agar dia bisa mengunggah file ke dalamnya).
6. Hapus centang pada opsi *Notify people*, lalu klik **Share**.
7. Sekarang, masuk (klik ganda) ke dalam folder `Backup_Radius_Ku` tersebut.
8. Lihat pada bagian URL (Alamat Web) di browser Anda. URL-nya akan terlihat seperti ini:
   `https://drive.google.com/drive/folders/1aBcD_eFgHiJkLMnOpQrStUvWxYz12345`
9. Salin teks acak yang berada di bagian paling belakang (yaitu `1aBcD_eFgHiJkLMnOpQrStUvWxYz12345`). **Ini adalah Folder ID Anda.**

---

## TAHAP 4: Mengaktifkan Jadwal di Radius Billing

1. Kembali ke Dashboard Web Radius Billing Anda, di tab **Google Drive Backup**.
2. Masukkan **Folder ID** yang baru saja Anda salin ke dalam kolom **Folder ID**.
3. Atur **Jam Backup Harian** sesuai keinginan Anda (misal 02:00 pagi).
4. Nyalakan *toggle switch* **Aktifkan Jadwal Otomatis** hingga berwarna hijau.
5. Klik **Simpan Pengaturan**.
6. Selesai!

Untuk memastikan semuanya sudah berjalan dengan benar, Anda bisa menekan tombol **"Backup Sekarang"** di pojok kanan atas. Tunggu beberapa detik, lalu cek folder Google Drive Anda. Jika muncul file bernama `backup-radius-xxxx.sql`, berarti instalasi Anda 100% SUKSES! 🎉
