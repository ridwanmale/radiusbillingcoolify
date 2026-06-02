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
read -p "Masukkan link GitHub repositori (Kosongkan jika ingin pakai file lokal): " GITHUB_URL
read -p "Masukkan path file backup database .sql (kosongkan jika install database kosong/baru): " DB_BACKUP_FILE

read -p "Masukkan path direktori instalasi (tekan Enter untuk default: /opt/radiusbilling-core): " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/opt/radiusbilling-core}
INSTALL_DIR=${INSTALL_DIR%/}

# Konversi DB_BACKUP_FILE ke absolute path agar tidak error setelah cd
if [[ -n "$DB_BACKUP_FILE" && "$DB_BACKUP_FILE" != /* ]]; then
    DB_BACKUP_FILE="$CURRENT_DIR/$DB_BACKUP_FILE"
fi

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
if [[ -n "$DB_BACKUP_FILE" && -f "$DB_BACKUP_FILE" ]]; then
    echo "Cleaning previous DB volume and importing backup..."
    docker compose -f docker-compose_core.yml down -v
    # Amankan file backup dulu ke /tmp jika letaknya di dalam db-init/
    cp "$DB_BACKUP_FILE" /tmp/00-restore.sql
    rm -rf db-init/*
    mv /tmp/00-restore.sql db-init/00-restore.sql
else
    echo "No backup provided – starting with fresh database."
    docker compose -f docker-compose_core.yml down -v
    rm -rf db-init/*
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
