# Panduan Live Logging Radius Billing

Dokumen ini berisi daftar perintah untuk melihat *live logging* (log secara *real-time*) dari semua komponen di Radius Billing. Gunakan perintah ini untuk melakukan *troubleshooting* atau memantau sistem Anda.

---

## 1. Log Database (MySQL) & FreeRADIUS (Core)

Komponen ini berada di dalam direktori proyek Core. Anda harus masuk ke direktori tersebut terlebih dahulu.

```bash
cd /opt/radiusbilling-core
```

**Melihat live log Database (MySQL):**
```bash
docker compose -f docker-compose_core.yml logs -f db
```

**Melihat live log FreeRADIUS:**
```bash
docker compose -f docker-compose_core.yml logs -f radius
```

---

## 2. Log Backend (Node.js API) & Frontend (React UI)

Komponen ini berada di dalam direktori proyek Web Admin.

```bash
cd /opt/radiusbilling-web
```

**Melihat live log Backend:**
```bash
docker compose -f docker-compose_web.yml logs -f backend
```

**Melihat live log Frontend:**
```bash
docker compose -f docker-compose_web.yml logs -f frontend
```

---

## 3. Log Portal Voucher (Online)

Komponen ini berada di dalam direktori proyek Portal. 

```bash
cd /opt/radiusbilling-portal
```
*(Catatan: Sesuaikan `/opt/radiusbilling-portal` dengan direktori instalasi Anda jika Anda menginstalnya di tempat lain, misalnya `/home/armradius`).*

**Melihat live log Portal:**
```bash
docker compose -f docker-compose_portalonlinevoucher.yml logs -f portal
```

---

## 💡 Tips & Trik Tambahan

1. **Keluar dari Live Log:** Tekan tombol `Ctrl + C` pada keyboard Anda untuk berhenti mengikuti (*follow*) log dan kembali ke prompt terminal.
2. **Melihat Log Seluruh Service Sekaligus:** Hilangkan nama service di akhir perintah. Contoh: 
   ```bash
   docker compose -f docker-compose_web.yml logs -f
   ```
   *(Perintah ini akan menampilkan log dari Backend dan Frontend secara bersamaan, berguna untuk melacak error yang saling berkaitan).*
3. **Melihat Beberapa Baris Terakhir Saja:** Jika log terlalu panjang dan Anda hanya ingin melihat 100 baris terakhir, tambahkan `--tail 100`. Contoh:
   ```bash
   docker compose -f docker-compose_web.yml logs -f --tail 100 backend
   ```
