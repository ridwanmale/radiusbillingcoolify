# Panduan Instalasi Cloudflare Tunnel

Panduan ini menjelaskan cara menginstal Cloudflare Tunnel (`cloudflared`) di server Ubuntu/Debian menggunakan skrip `install_cloudflare.sh`. Skrip ini akan secara otomatis mengunduh, menginstal, dan memungkinkan Anda mengatur tunnel sebagai *background service* hanya dengan memasukkan token Anda.

## Langkah-langkah Instalasi

1. **Berikan Izin Eksekusi**
   Sebelum skrip dapat dijalankan, Anda perlu memberikan izin eksekusi pada file tersebut. Buka terminal di server Anda dan jalankan:
   ```bash
   chmod +x install_cloudflare.sh
   ```

2. **Jalankan Skrip**
   Jalankan skrip instalasi menggunakan perintah berikut:
   ```bash
   ./install_cloudflare.sh
   ```

3. **Masukkan Token Anda**
   Di akhir proses instalasi, skrip akan meminta Anda untuk memasukkan Token Cloudflare Tunnel Anda:
   ```text
   Masukkan Cloudflare Tunnel Token Anda (atau tekan Enter untuk melewati): 
   ```
   *Paste* token yang Anda dapatkan dari **Cloudflare Zero Trust Dashboard** lalu tekan `Enter`. 
   
   Skrip akan otomatis mengonfigurasi dan menjalankan tunnel sebagai *background service*. Dengan ini, tunnel akan otomatis berjalan setiap kali server di-restart (auto-run).

## Menjalankan Secara Manual (Opsional)
Jika Anda melewati langkah pengisian token saat menjalankan skrip, Anda tetap dapat memasang *service* tersebut secara manual kapan saja dengan perintah:
```bash
sudo cloudflared service install <TOKEN_ANDA_DISINI>
```
