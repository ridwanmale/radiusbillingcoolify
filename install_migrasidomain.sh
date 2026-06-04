#!/bin/bash
# install_migrasidomain.sh - Script untuk migrasi/mengganti Cloudflare Tunnel
# Berguna jika Anda mengganti domain dan membuat Tunnel baru dengan token baru di Cloudflare.

set -e

echo "======================================================="
echo "        SCRIPT MIGRASI DOMAIN (CLOUDFLARE TUNNEL)      "
echo "======================================================="
echo ""

# 1. Hapus service tunnel yang lama (jika ada)
if command -v cloudflared &> /dev/null; then
    echo "Menghapus konfigurasi Cloudflare Tunnel yang lama..."
    sudo cloudflared service uninstall || true
    echo "Service lama berhasil dihapus."
else
    echo "Cloudflared belum terinstal. Menginstal sekarang..."
    sudo apt-get update
    sudo apt-get install -y curl
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared.deb
    rm cloudflared.deb
fi

echo ""
# 2. Minta token baru
read -p "Masukkan TOKEN Cloudflare Tunnel BARU Anda: " CF_TOKEN

if [ -z "$CF_TOKEN" ]; then
    echo "Error: Token tidak boleh kosong! Proses dibatalkan."
    exit 1
fi

echo "Menginstal Cloudflare Tunnel dengan token baru..."
sudo cloudflared service install "$CF_TOKEN"
sudo systemctl start cloudflared || true

echo ""
echo "======================================================="
echo "✅ Migrasi Domain / Tunnel Berhasil!"
echo "Service Cloudflare Tunnel baru sudah diikat ke server ini."
echo "======================================================="
echo "⚠️ PERHATIAN SANGAT PENTING SEKARANG ⚠️"
echo "1. Pastikan di Dashboard Cloudflare Zero Trust, Anda sudah"
echo "   mengarahkan Public Hostname domain baru ke localhost."
echo "2. Login ke Dashboard Payment Gateway (Tripay/Midtrans) Anda,"
echo "   lalu PERBARUI Callback URL / Webhook URL dengan domain baru!"
echo "   Contoh: https://domain-baru.com/api/payment/callback"
echo "   Jika ini dilewatkan, voucher otomatis tidak akan keluar!"
echo "======================================================="
