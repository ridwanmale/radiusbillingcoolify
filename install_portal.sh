#!/bin/bash
echo "================================================="
echo "   Instalasi Portal Pembelian Voucher Online"
echo "================================================="
echo ""

# Pastikan script dijalankan sebagai root (opsional tergantung lingkungan, namun disarankan)
if [ "$EUID" -ne 0 ]; then
  echo "Harap jalankan script ini sebagai root (gunakan sudo) jika terjadi error permission."
fi

CURRENT_DIR=$(pwd)

# --- SESI INPUT DARI USER ---
read -p "Masukkan link GitHub repositori (Kosongkan untuk default ridwanmale): " GITHUB_URL
GITHUB_URL=${GITHUB_URL:-https://github.com/ridwanmale/radiusbillingcoolify.git}

read -p "Masukkan path direktori instalasi (tekan Enter untuk default: /opt/radiusbilling-portal): " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/opt/radiusbilling-portal}
INSTALL_DIR=${INSTALL_DIR%/}

# Meminta port dari pengguna
read -p "Masukkan port yang ingin digunakan untuk portal ini [Default: 8089]: " INPUT_PORT

# Jika kosong, gunakan default 8089
PORTAL_PORT=${INPUT_PORT:-8089}

echo ""
echo "Mengatur portal berjalan di port: $PORTAL_PORT"
echo ""

echo "Menyiapkan file aplikasi..."
if [[ -n "$GITHUB_URL" ]]; then
    # Memastikan git terinstal
    if ! command -v git &> /dev/null; then
        echo "Git belum terinstal. Mencoba menginstal git..."
        if [ "$EUID" -eq 0 ]; then
            apt-get update -qq && apt-get install -y -qq git
        else
            sudo apt-get update -qq && sudo apt-get install -y -qq git
        fi
    fi

    cd /tmp || exit
    rm -rf "$INSTALL_DIR"
    git clone "$GITHUB_URL" "$INSTALL_DIR"
    if [ $? -ne 0 ]; then
        echo "Gagal mengunduh repository dari GitHub. Pastikan link benar dan koneksi internet lancar."
        exit 1
    fi
else
    mkdir -p "$INSTALL_DIR"
    if [ "$CURRENT_DIR" != "$INSTALL_DIR" ]; then
        cp -r "$CURRENT_DIR"/* "$INSTALL_DIR/"
    fi
fi

cd "$INSTALL_DIR" || exit 1

# Export port sebagai environment variable untuk docker-compose
export PORTAL_PORT=$PORTAL_PORT

# Memastikan direktori dan file konfigurasi ada
if [ ! -f "docker-compose_portalonlinevoucher.yml" ]; then
    echo "Error: docker-compose_portalonlinevoucher.yml tidak ditemukan di $INSTALL_DIR."
    exit 1
fi

if [ ! -d "portal" ]; then
    echo "Error: Direktori portal tidak ditemukan di $INSTALL_DIR."
    exit 1
fi

# Pastikan docker-compose terinstall (menggunakan versi v2 'docker compose' sebagai fallback jika 'docker-compose' tidak ada)
DOCKER_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    if docker compose version &> /dev/null; then
        DOCKER_CMD="docker compose"
    else
        echo "Docker Compose tidak ditemukan. Menginstal Docker..."
        if [ "$EUID" -eq 0 ]; then
            install -m 0755 -d /etc/apt/keyrings
            rm -f /etc/apt/keyrings/docker.gpg
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            chmod a+r /etc/apt/keyrings/docker.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            apt-get update -qq
            apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        else
            sudo install -m 0755 -d /etc/apt/keyrings
            rm -f /etc/apt/keyrings/docker.gpg
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            sudo chmod a+r /etc/apt/keyrings/docker.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt-get update -qq
            sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        fi
        
        # Cek ulang setelah instalasi
        if docker compose version &> /dev/null; then
            DOCKER_CMD="docker compose"
        elif command -v docker-compose &> /dev/null; then
            DOCKER_CMD="docker-compose"
        else
            echo "Error: Gagal menginstal Docker Compose. Silakan instal secara manual."
            exit 1
        fi
    fi
fi

# Build dan jalankan container
echo "Membangun dan menjalankan container portal..."
$DOCKER_CMD -f docker-compose_portalonlinevoucher.yml up -d --build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Instalasi Berhasil!"
    echo "Portal Pembelian Voucher dapat diakses di: http://<IP_SERVER>:$PORTAL_PORT"
    echo ""
    echo "Catatan: Pastikan server backend Anda (port 5000) sedang berjalan"
    echo "agar portal dapat mengambil daftar paket dan memproses transaksi."
else
    echo ""
    echo "❌ Terjadi kesalahan saat menjalankan docker-compose."
fi
