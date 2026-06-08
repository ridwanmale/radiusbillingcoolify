#!/bin/bash

# Pastikan script dijalankan sebagai root
if [ "$EUID" -ne 0 ]; then
  echo "Harap jalankan script ini sebagai root (gunakan sudo)"
  exit
fi

echo "================================================"
echo "  Memulai Instalasi RadiusBilling (Proxmox/VPS) "
echo "================================================"
echo ""

# Simpan lokasi awal eksekusi script
CURRENT_DIR=$(pwd)

# --- SESI INPUT DARI USER ---

# 0. Link GitHub
read -p "Masukkan link GitHub repositori (Kosongkan untuk default: https://github.com/ridwanmale/radiusbillingcoolify.git): " GITHUB_URL
GITHUB_URL=${GITHUB_URL:-https://github.com/ridwanmale/radiusbillingcoolify.git}

# 1. Direktori Instalasi
read -p "Masukkan path direktori instalasi (tekan Enter untuk default: /opt/radiusbilling): " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/opt/radiusbilling}
# Hapus trailing slash jika ada
INSTALL_DIR=${INSTALL_DIR%/}

# 2. MySQL Root Password
while [[ -z "$MYSQL_ROOT_PASSWORD" ]]; do
    read -p "Masukkan MySQL Root Password: " MYSQL_ROOT_PASSWORD
done

# 3. Nama Database
read -p "Masukkan nama Database MySQL (tekan Enter untuk default: radius): " MYSQL_DATABASE
MYSQL_DATABASE=${MYSQL_DATABASE:-radius}

# 4. MySQL User
read -p "Masukkan nama User MySQL (tekan Enter untuk default: radius): " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-radius}

# 5. MySQL User Password
while [[ -z "$MYSQL_PASSWORD" ]]; do
    read -p "Masukkan Password User MySQL ($MYSQL_USER): " MYSQL_PASSWORD
done

echo ""
echo "--- Pengaturan URL Portal ---"
echo "Secara default, portal akan mencoba menghubungi Web Admin di IP yang sama pada port 8088."
echo "Namun, jika Anda menggunakan Cloudflare/Domain untuk Web Admin, silakan masukkan URL-nya."
read -p "Masukkan URL Web Admin (kosongkan untuk default otomatis): " INPUT_WEB_ADMIN_URL
if [[ -n "$INPUT_WEB_ADMIN_URL" ]]; then
    # Bersihkan slash di akhir URL jika ada
    WEB_ADMIN_URL=${INPUT_WEB_ADMIN_URL%/}
fi

echo ""
echo "================================================"
echo "Mengupdate sistem dan menginstal dependensi dasar (Git, Curl, SSH)..."
apt-get update
apt-get install -y ca-certificates curl gnupg git openssh-server

echo "Mengkonfigurasi SSH (Mengizinkan Login Root)..."
# Mengubah atau menambahkan setting PermitRootLogin
if grep -q "^#*PermitRootLogin" /etc/ssh/sshd_config; then
    sed -i 's/^#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
else
    echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
fi

# Mengubah atau menambahkan setting PasswordAuthentication
if grep -q "^#*PasswordAuthentication" /etc/ssh/sshd_config; then
    sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
else
    echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config
fi

# Restart SSH service
systemctl restart sshd || systemctl restart ssh
echo "SSH Root Login berhasil diaktifkan."


echo "Menyiapkan file aplikasi..."
if [[ -n "$GITHUB_URL" ]]; then
    echo "Link GitHub terdeteksi. Mengkloning repositori dari $GITHUB_URL..."
    
    # Keluar dari direktori saat ini untuk menghindari error "Unable to read current working directory" 
    # jika user menjalankan script dari dalam direktori target yang akan dihapus.
    cd /tmp || exit
    
    # Menghapus instalasi lama agar git clone tidak error direktori tidak kosong
    rm -rf "$INSTALL_DIR"
    
    # Lakukan cloning ke INSTALL_DIR
    git clone "$GITHUB_URL" "$INSTALL_DIR"
    
    if [ ! -d "$INSTALL_DIR" ]; then
        echo "Gagal melakukan git clone. Pastikan link GitHub benar dan publik, atau periksa koneksi internet."
        exit 1
    fi
else
    echo "Link GitHub kosong. Menyalin file lokal..."
    mkdir -p "$INSTALL_DIR"
    
    # Hanya salin jika direktori eksekusi BUKAN direktori instalasi target
    if [ "$CURRENT_DIR" != "$INSTALL_DIR" ]; then
        cp -r "$CURRENT_DIR"/* "$INSTALL_DIR/"
    fi
fi

# Pindah ke direktori target yang sudah siap
cd "$INSTALL_DIR" || { echo "Gagal masuk ke direktori $INSTALL_DIR"; exit 1; }

if [[ -n "$WEB_ADMIN_URL" ]]; then
    echo "Menginjeksi URL Web Admin ke dalam portal.js..."
    sed -i "s|const API_URL.*|const API_URL = \`${WEB_ADMIN_URL}/api\`;|g" portal/portal.js
fi

# ---------- Persiapan Database ----------
echo ""
echo "=== PEMILIHAN DATABASE ==="
echo "Pilih opsi database yang ingin Anda gunakan:"
echo "0) Instalasi Baru (Gunakan database kosong bawaan)"
echo "1) Pilih file backup dari dalam repositori (db-init/)"
echo "2) Masukkan path file backup secara manual"
read -p "Masukkan pilihan Anda [0/1/2] (Default: 0): " DB_OPTION

DB_BACKUP_FILE=""

if [ "$DB_OPTION" = "1" ]; then
    echo ""
    echo "Daftar file backup yang tersedia di db-init/ :"
    # Cari file .sql selain schema utama
    sql_files=($(ls db-init/*.sql 2>/dev/null | grep -v "schema_clean.sql" | grep -v "trigger.sql"))
    if [ ${#sql_files[@]} -eq 0 ]; then
        echo "Tidak ada file backup tambahan yang ditemukan. Menggunakan instalasi baru."
    else
        for i in "${!sql_files[@]}"; do
            echo "$((i+1))) ${sql_files[$i]}"
        done
        read -p "Pilih nomor file: " file_num
        if [[ "$file_num" =~ ^[0-9]+$ ]] && [ "$file_num" -ge 1 ] && [ "$file_num" -le "${#sql_files[@]}" ]; then
            DB_BACKUP_FILE="${sql_files[$((file_num-1))]}"
            echo "Memilih: $DB_BACKUP_FILE"
        else
            echo "Pilihan tidak valid, fallback ke instalasi baru."
        fi
    fi
elif [ "$DB_OPTION" = "2" ]; then
    read -p "Masukkan absolute path ke file .sql Anda (contoh: /root/backup.sql): " DB_BACKUP_FILE
    if [ ! -f "$DB_BACKUP_FILE" ]; then
        echo "Peringatan: File tidak ditemukan! Fallback ke instalasi baru."
        DB_BACKUP_FILE=""
    fi
fi

if [[ -n "$DB_BACKUP_FILE" && -f "$DB_BACKUP_FILE" ]]; then
    echo "Membersihkan volume DB sebelumnya dan mengimpor backup..."
    docker compose down -v
    cp "$DB_BACKUP_FILE" /tmp/00-restore.sql
    
    # Menghapus DEFINER dari file backup agar tidak terjadi error hak akses saat import
    sed -i 's/DEFINER=[^*]*\*/\*/g' /tmp/00-restore.sql
    
    # Konversi Collation MySQL 8 (utf8mb4_0900_ai_ci) ke standar MariaDB (utf8mb4_unicode_ci)
    sed -i 's/utf8mb4_0900_ai_ci/utf8mb4_unicode_ci/g' /tmp/00-restore.sql
    
    rm -rf db-init/*
    mv /tmp/00-restore.sql db-init/00-restore.sql
else
    echo "Memulai dengan fresh database bawaan."
    docker compose down -v
    cp db-init/schema_clean.sql /tmp/01-schema.sql 2>/dev/null || true
    cp db-init/trigger.sql /tmp/02-trigger.sql 2>/dev/null || true
    rm -rf db-init/*
    mv /tmp/01-schema.sql db-init/01-schema.sql 2>/dev/null || true
    mv /tmp/02-trigger.sql db-init/02-trigger.sql 2>/dev/null || true
fi

# Install Docker jika belum ada
if ! command -v docker &> /dev/null; then
    echo "Menginstal Docker..."
    install -m 0755 -d /etc/apt/keyrings
    # Menghapus key lama jika ada agar tidak error saat diulang
    rm -f /etc/apt/keyrings/docker.gpg
    
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo "Docker sudah terinstal. Melanjutkan..."
fi

# Trik Khusus Proxmox LXC (Unprivileged)
# Menghapus AppArmor di dalam container agar Docker tidak mencoba memodifikasi kernel security host
echo "Menerapkan perbaikan khusus untuk Proxmox LXC (Mencegah error AppArmor)..."
apt-get remove --purge -y apparmor
systemctl daemon-reload

# Pastikan service Docker berjalan dan autorun
systemctl enable docker
systemctl start docker

# Membuat file .env sesuai input user
echo "Membuat file konfigurasi (.env)..."
cat > .env <<EOF
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
MYSQL_DATABASE=$MYSQL_DATABASE
MYSQL_USER=$MYSQL_USER
MYSQL_PASSWORD=$MYSQL_PASSWORD
RADIUS_CONTAINER_PREFIX=radiusbillingcoolify
ENABLE_TELEGRAM_BOT_LISTENER=true
EOF
echo "File .env berhasil dibuat."

# Build dan jalankan container di background
echo "Membangun dan menjalankan aplikasi Docker..."
docker compose up -d --build

echo ""
echo "========================================================"
echo "Instalasi Selesai!"
echo "Semua file telah diletakkan di: $INSTALL_DIR"
echo "Aplikasi Anda sekarang berjalan otomatis di background."
echo "Silakan akses web panel di: http://<IP_VPS_ANDA>:8088"
echo "========================================================"
