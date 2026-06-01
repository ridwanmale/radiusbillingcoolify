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

# --- SESI INPUT DARI USER ---

# 0. Link GitHub
read -p "Masukkan link GitHub repositori (Kosongkan jika ingin pakai file lokal): " GITHUB_URL

# 1. Direktori Instalasi
read -p "Masukkan path direktori instalasi (tekan Enter untuk default: /opt/radiusbilling): " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/opt/radiusbilling}

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
echo "================================================"
echo "Mengupdate sistem dan menginstal dependensi dasar (Git, Curl)..."
apt-get update
apt-get install -y ca-certificates curl gnupg git

echo "Menyiapkan file aplikasi..."
if [[ -n "$GITHUB_URL" ]]; then
    echo "Link GitHub terdeteksi. Mengkloning repositori dari $GITHUB_URL..."
    # Menghapus instalasi lama di folder yang sama agar git clone tidak bentrok
    rm -rf "$INSTALL_DIR"
    git clone "$GITHUB_URL" "$INSTALL_DIR"
else
    echo "Link GitHub kosong. Menyalin file dari direktori lokal saat ini..."
    mkdir -p "$INSTALL_DIR"
    cp -r ./* "$INSTALL_DIR/"
fi

# Pindah ke direktori kerja
cd "$INSTALL_DIR" || exit

# Install Docker jika belum ada
if ! command -v docker &> /dev/null; then
    echo "Menginstal Docker..."
    install -m 0755 -d /etc/apt/keyrings
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
