# Panduan Instalasi Core Server (Database & FreeRADIUS)

Core Server adalah pusat dari sistem RadiusBilling Anda. Server ini tidak memiliki tampilan web, tetapi bertanggung jawab penuh untuk menyimpan semua data (MySQL) dan memproses autentikasi jaringan pelanggan (FreeRADIUS) dengan kecepatan maksimal.

## Persyaratan
- VPS dengan OS Linux (Ubuntu 20.04 / 22.04 / 24.04 atau Debian).
- Akses ke user `root` (atau user dengan akses `sudo`).
- Port yang tidak boleh terblokir (UDP: 1812, 1813. TCP: 3306 untuk koneksi web server).

## Langkah Instalasi

1. **Login ke VPS Core Server Anda** melalui terminal/SSH.
   
2. **Download Script Instalasi:**
   Jika Anda belum menarik data GitHub ke VPS ini, Anda bisa mendownload scriptnya secara langsung:
   ```bash
   wget https://raw.githubusercontent.com/<USERNAME_GITHUB_ANDA>/radiusbillingcoolify/main/install_core.sh
   chmod +x install_core.sh
   ```
   *(Penting: Ganti URL di atas dengan link "raw" dari GitHub Anda yang sebenarnya).*

3. **Jalankan Script Instalasi:**
   ```bash
   sudo ./install_core.sh
   ```

4. **Ikuti Instruksi pada Layar:**
   - Saat ditanya link GitHub, masukkan link repositori GitHub Anda.
   - Anda akan diminta untuk membuat **Password Database (MySQL)**. **CATAT PASSWORD INI**, karena akan digunakan untuk menghubungkan Web Server nantinya.
   - Tunggu hingga instalasi Docker dan proses *building* selesai otomatis.

## ⚠️ Konfigurasi Firewall (Sangat Penting)
Agar Web Server Anda nantinya bisa membaca database di server ini dan mengirimkan sinyal Auto-Reload, Anda harus mengizinkan (allow) akses port Database (3306) dan port Webhook (8080). **Demi keamanan, izinkan hanya dari IP Web Server Anda saja.**

Jika menggunakan UFW di Ubuntu, jalankan perintah ini di Core Server:
```bash
sudo ufw allow from <IP_WEB_SERVER_ANDA> to any port 3306
sudo ufw allow from <IP_WEB_SERVER_ANDA> to any port 8080
sudo ufw enable
sudo ufw status
```

---
## ⚠️ Catatan Penting untuk Setup Terpisah (Web & Core)
Karena Anda memisahkan Web Server dan Core Server, fitur Auto-Reload (Webhook) sudah diaktifkan di port `8080`. 
Setiap Anda menambahkan Router/MikroTik baru di Web Panel, Web Server akan otomatis "memanggil" port 8080 di Core Server untuk merestart FreeRADIUS. Pastikan port tersebut tidak terblokir firewall!

---
**Selesai!** Core Server sekarang sudah berjalan di background. Anda bisa melanjutkan ke tahap [Instalasi Web Server](INSTALL_WEB.md).
