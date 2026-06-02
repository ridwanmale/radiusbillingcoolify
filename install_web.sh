#!/bin/bash

# Pastikan script dijalankan sebagai root
if [ "$EUID" -ne 0 ]; then
  echo "Harap jalankan script ini sebagai root (gunakan sudo)"
  exit
fi

echo "================================================"
echo "  Memulai Instalasi WEB SERVER (Frontend & Backend) "
echo "================================================"
echo ""

CURRENT_DIR=$(pwd)

# --- SESI INPUT DARI USER ---
read -p "Masukkan link GitHub repositori (Kosongkan jika ingin pakai file lokal): " GITHUB_URL

read -p "Masukkan path direktori instalasi (tekan Enter untuk default: /opt/radiusbilling-web): " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/opt/radiusbilling-web}
INSTALL_DIR=${INSTALL_DIR%/}

echo "--- Koneksi ke Core Server ---"
while [[ -z "$DB_HOST" ]]; do
    read -p "Masukkan IP Address CORE SERVER (Database): " DB_HOST
done

read -p "Masukkan nama Database MySQL di Core Server (default: radius): " MYSQL_DATABASE
MYSQL_DATABASE=${MYSQL_DATABASE:-radius}

read -p "Masukkan nama User MySQL di Core Server (default: radius): " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-radius}

while [[ -z "$MYSQL_PASSWORD" ]]; do
    read -p "Masukkan Password User MySQL ($MYSQL_USER): " MYSQL_PASSWORD
done

echo ""
echo "Mengupdate sistem dan menginstal dependensi dasar..."
apt-get update
apt-get install -y ca-certificates curl gnupg git

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
DB_HOST=$DB_HOST
MYSQL_DATABASE=$MYSQL_DATABASE
MYSQL_USER=$MYSQL_USER
MYSQL_PASSWORD=$MYSQL_PASSWORD
RADIUS_CONTAINER_PREFIX=radiusbillingcoolify
ENABLE_TELEGRAM_BOT_LISTENER=true
EOF

echo "Membangun dan menjalankan aplikasi Docker (WEB)..."
docker compose -f docker-compose_web.yml up -d --build

echo ""
echo "========================================================"
echo "Instalasi Web Server Selesai!"
echo "Silakan akses web panel di: http://<IP_VPS_ANDA>:8088"
echo "========================================================"
