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
# Hapus .env lama jika ada, supaya nilai baru selalu ditulis
rm -f .env
cat > .env <<EOF
DB_HOST=$DB_HOST
MYSQL_DATABASE=$MYSQL_DATABASE
MYSQL_USER=$MYSQL_USER
MYSQL_PASSWORD=$MYSQL_PASSWORD
RADIUS_CONTAINER_PREFIX=radiusbillingcoolify
ENABLE_TELEGRAM_BOT_LISTENER=true
EOF

echo "Membangun dan menjalankan aplikasi Docker (WEB)..."
DOCKER_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    if docker compose version &> /dev/null; then
        DOCKER_CMD="docker compose"
    else
        echo "Error: docker-compose atau docker compose tidak ditemukan."
        exit 1
    fi
fi
$DOCKER_CMD -f docker-compose_web.yml up -d --build

echo ""
echo "========================================================"
echo "Instalasi Web Server Selesai!"
echo "Silakan akses web panel di: http://<IP_VPS_ANDA>:8088"
echo "========================================================"
echo ""
echo "⚠️ CATATAN PENTING (Khusus Setup Terpisah):"
echo "Pastikan Anda sudah membuka port 3306 (Database) dan 8080 (Webhook Auto-Reload)"
echo "di Firewall Core Server Anda. Jika tidak, aplikasi Web tidak akan bisa terhubung"
echo "ke Database atau tidak bisa merestart FreeRADIUS secara otomatis saat menambah NAS."
echo "========================================================"
