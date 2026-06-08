#!/bin/bash

# Pastikan script dijalankan sebagai root
if [ "$EUID" -ne 0 ]; then
  echo "Harap jalankan script ini sebagai root (gunakan sudo)"
  exit
fi

echo "================================================"
echo "  Memulai Instalasi CORE SERVER (Database & FreeRADIUS) "
echo "================================================"
echo ""

CURRENT_DIR=$(pwd)

# --- SESI INPUT DARI USER ---
read -p "Masukkan link GitHub repositori (Kosongkan untuk default: https://github.com/ridwanmale/radiusbillingcoolify.git): " GITHUB_URL
GITHUB_URL=${GITHUB_URL:-https://github.com/ridwanmale/radiusbillingcoolify.git}

read -p "Masukkan path direktori instalasi (tekan Enter untuk default: /opt/radiusbilling-core): " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/opt/radiusbilling-core}
INSTALL_DIR=${INSTALL_DIR%/}

while [[ -z "$MYSQL_ROOT_PASSWORD" ]]; do
    read -p "Masukkan MySQL Root Password: " MYSQL_ROOT_PASSWORD
done

read -p "Masukkan nama Database MySQL (tekan Enter untuk default: radius): " MYSQL_DATABASE
MYSQL_DATABASE=${MYSQL_DATABASE:-radius}

read -p "Masukkan nama User MySQL (tekan Enter untuk default: radius): " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-radius}

while [[ -z "$MYSQL_PASSWORD" ]]; do
    read -p "Masukkan Password User MySQL ($MYSQL_USER): " MYSQL_PASSWORD
done

echo ""
echo "Mengupdate sistem dan menginstal dependensi dasar..."
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git openssh-server

echo "Mengonfigurasi akses SSH Root..."
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
systemctl restart sshd || systemctl restart ssh

echo "Menyiapkan file aplikasi..."
if [[ -n "$GITHUB_URL" ]]; then
    cd /tmp || exit
    rm -rf "$INSTALL_DIR"
    git clone "$GITHUB_URL" "$INSTALL_DIR"
else
    mkdir -p "$INSTALL_DIR"
    if [ "$CURRENT_DIR" != "$INSTALL_DIR" ]; then
        cp -r "$CURRENT_DIR"/* "$INSTALL_DIR/"
    fi
fi

cd "$INSTALL_DIR" || exit 1

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
    docker compose -f docker-compose_core.yml down -v
    # Amankan file backup dulu ke /tmp jika letaknya di dalam db-init/
    cp "$DB_BACKUP_FILE" /tmp/00-restore.sql
    
    # Menghapus DEFINER dari file backup agar tidak terjadi error hak akses saat import
    sed -i 's/DEFINER=[^*]*\*/\*/g' /tmp/00-restore.sql
    
    rm -rf db-init/*
    mv /tmp/00-restore.sql db-init/00-restore.sql
else
    echo "Memulai dengan fresh database bawaan."
    docker compose -f docker-compose_core.yml down -v
    
    # Amankan schema default bawaan aplikasi sebelum folder dibersihkan
    cp db-init/schema_clean.sql /tmp/01-schema.sql 2>/dev/null || true
    cp db-init/trigger.sql /tmp/02-trigger.sql 2>/dev/null || true
    
    rm -rf db-init/*
    
    # Kembalikan schema default ke dalam folder db-init agar MariaDB meng-initnya
    mv /tmp/01-schema.sql db-init/01-schema.sql 2>/dev/null || true
    mv /tmp/02-trigger.sql db-init/02-trigger.sql 2>/dev/null || true
fi

if ! command -v docker &> /dev/null; then
    echo "Menginstal Docker..."
    install -m 0755 -d /etc/apt/keyrings
    rm -f /etc/apt/keyrings/docker.gpg
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

apt-get remove --purge -y apparmor
systemctl daemon-reload
systemctl enable docker
systemctl start docker

echo "Membuat file konfigurasi (.env)..."
cat > .env <<EOF
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
MYSQL_DATABASE=$MYSQL_DATABASE
MYSQL_USER=$MYSQL_USER
MYSQL_PASSWORD=$MYSQL_PASSWORD
RADIUS_CONTAINER_PREFIX=radiusbillingcoolify
EOF

echo "Membangun dan menjalankan aplikasi Docker (CORE)..."
docker compose -f docker-compose_core.yml up -d --build

echo ""
echo "========================================================"
echo "Instalasi Core Server Selesai!"
echo "Server siap menerima koneksi dari Web Server."
echo "========================================================"
