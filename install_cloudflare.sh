#!/bin/bash
# install_cloudflare.sh - Script to install Cloudflare Tunnel (cloudflared) on Ubuntu/Debian

set -e

echo "Updating package list..."
sudo apt-get update

echo "Installing curl if not present..."
sudo apt-get install -y curl

echo "Downloading Cloudflare Tunnel (cloudflared)..."
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

echo "Installing cloudflared..."
sudo dpkg -i cloudflared.deb

echo "Cleaning up..."
rm cloudflared.deb

echo "======================================================="
echo "Cloudflare Tunnel (cloudflared) installed successfully!"
echo "Version:"
cloudflared --version
echo "======================================================="

# Meminta input token dari user
read -p "Masukkan Cloudflare Tunnel Token Anda (atau tekan Enter untuk melewati): " CF_TOKEN

if [ -n "$CF_TOKEN" ]; then
    echo "Menginstal Cloudflare Tunnel sebagai service..."
    sudo cloudflared service install "$CF_TOKEN"
    echo "Service Cloudflare Tunnel berhasil diinstal dan dijalankan!"
else
    echo "Token tidak dimasukkan. Anda dapat menjalankan perintah berikut secara manual nanti jika sudah memiliki token:"
    echo "sudo cloudflared service install <TOKEN_ANDA>"
fi
