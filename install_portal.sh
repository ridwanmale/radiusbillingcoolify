#!/bin/bash
echo "================================================="
echo "   Instalasi Portal Pembelian Voucher Online"
echo "================================================="
echo ""

# Meminta port dari pengguna
read -p "Masukkan port yang ingin digunakan untuk portal ini [Default: 8089]: " INPUT_PORT

# Jika kosong, gunakan default 8089
PORTAL_PORT=${INPUT_PORT:-8089}

echo ""
echo "Mengatur portal berjalan di port: $PORTAL_PORT"
echo ""

# Export port sebagai environment variable untuk docker-compose
export PORTAL_PORT=$PORTAL_PORT

# Memastikan direktori dan file konfigurasi ada
if [ ! -f "docker-compose_portalonlinevoucher.yml" ]; then
    echo "Error: docker-compose_portalonlinevoucher.yml tidak ditemukan."
    exit 1
fi

if [ ! -d "portal" ]; then
    echo "Error: Direktori portal tidak ditemukan."
    exit 1
fi

# Build dan jalankan container
echo "Membangun dan menjalankan container portal..."
docker-compose -f docker-compose_portalonlinevoucher.yml up -d --build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Instalasi Berhasil!"
    echo "Portal Pembelian Voucher dapat diakses di: http://localhost:$PORTAL_PORT"
    echo ""
    echo "Catatan: Pastikan server backend Anda (port 5000) sedang berjalan"
    echo "agar portal dapat mengambil daftar paket dan memproses transaksi."
else
    echo ""
    echo "❌ Terjadi kesalahan saat menjalankan docker-compose."
fi
