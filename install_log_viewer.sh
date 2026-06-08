#!/bin/bash
echo "================================================="
echo "   Instalasi Dozzle (Web Log Viewer)"
echo "================================================="
echo ""

# Pastikan script dijalankan sebagai root
if [ "$EUID" -ne 0 ]; then
  echo "Harap jalankan script ini sebagai root (gunakan sudo) jika terjadi error permission."
fi

CURRENT_DIR=$(pwd)
TOOLS_DIR="$CURRENT_DIR/tools"

if [ ! -d "$TOOLS_DIR" ]; then
    echo "Folder tools tidak ditemukan! Pastikan Anda menjalankan skrip ini dari dalam folder radiusbillingcoolify."
    exit 1
fi

cd "$TOOLS_DIR" || exit 1

read -p "Masukkan port yang ingin digunakan untuk Dozzle [Default: 8888]: " INPUT_PORT
PORT=${INPUT_PORT:-8888}

echo "DOZZLE_PORT=$PORT" > .env

echo "Mengekstrak image dan menjalankan Dozzle di port $PORT..."
docker compose -f docker-compose_logs.yml up -d --build

echo ""
echo "======================================================="
echo "✅ Dozzle berhasil diinstal dan berjalan di latar belakang!"
echo "👉 Silakan buka browser Anda dan akses: http://<IP-VPS-ANDA>:$PORT"
echo ""
echo "💡 Tips Keamanan:"
echo "Gunakan Cloudflare Tunnel yang sebelumnya sudah Anda instal"
echo "untuk mengamankan akses ke halaman log ini dari luar."
echo "======================================================="
