#!/bin/bash
# install_cloudflare.sh - Script to install Cloudflare Tunnel (cloudflared) on Ubuntu/Debian

set -e

echo "Updating package list..."
sudo apt-get update

echo "Installing curl if not present..."
sudo apt-get install -y curl

echo "Adding Cloudflare package repository..."
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

# Get OS codename (e.g. jammy, focal)
OS_CODENAME=$(lsb_release -cs)
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $OS_CODENAME main" | sudo tee /etc/apt/sources.list.d/cloudflared.list

echo "Updating package list with Cloudflare repo..."
sudo apt-get update

echo "Installing cloudflared via apt..."
sudo apt-get install -y cloudflared

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
