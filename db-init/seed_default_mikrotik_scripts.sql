-- =============================================================================
-- SEED: DEFAULT MIKROTIK SCRIPT TEMPLATES
-- Dijalankan otomatis oleh auto_install_vps.sh jika tabel kosong
-- =============================================================================

-- Pastikan tabel ada terlebih dahulu
CREATE TABLE IF NOT EXISTS mikrotik_script_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  ros_version VARCHAR(10) NOT NULL DEFAULT 'v7',
  script_content TEXT NOT NULL,
  parameters TEXT,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Hanya insert jika tabel BENAR-BENAR kosong
INSERT INTO mikrotik_script_templates (name, ros_version, script_content, parameters, description)
SELECT * FROM (SELECT
  'RADIUS Direct - IP Publik (v7)' AS name,
  'v7' AS ros_version,
  '# ==================================================
# SCRIPT MIKROTIK - RADIUS DIRECT (IP PUBLIK) - ROS v7
# ==================================================
# Copy & paste langsung ke Terminal MikroTik
# Variabel yang perlu diisi manual:
#   #server_ip#  = IP Publik server billing VPS
#   #nasname#    = IP MikroTik yang terdaftar di billing
#   #secret#     = RADIUS Secret dari halaman NAS
#   #auth_port#  = Auth Port (default: 1812)
#   #acct_port#  = Acct Port (default: 1813)

# 1. Hapus konfigurasi RADIUS lama
:foreach i in=[/radius find comment="Radius Billing Direct"] do={/radius remove $i}

# 2. Tambah RADIUS Server baru
/radius add \
  service="hotspot,ppp" \
  address="#server_ip#" \
  secret="#secret#" \
  authentication-port=#auth_port# \
  accounting-port=#acct_port# \
  timeout=3000ms \
  comment="Radius Billing Direct"

# 3. Aktifkan RADIUS Incoming (untuk CoA/Disconnect)
/radius incoming set accept=yes port=3799

# 4. PPPoE Profile Normal & Isolir
:foreach i in=[/ip pool find name="ARMPOOL"]   do={/ip pool remove $i}
:foreach i in=[/ip pool find name="ARMISOLIR"] do={/ip pool remove $i}
/ip pool add name="ARMPOOL"   ranges="10.30.192.100-10.30.207.254"
/ip pool add name="ARMISOLIR" ranges="10.30.208.10-10.30.209.254"

:foreach i in=[/ppp profile find name="ARM_RADIUS"] do={/ppp profile remove $i}
:foreach i in=[/ppp profile find name="ARM_ISOLIR"] do={/ppp profile remove $i}
/ppp profile add name="ARM_RADIUS" remote-address=ARMPOOL   only-one=yes use-compression=no
/ppp profile add name="ARM_ISOLIR" remote-address=ARMISOLIR only-one=yes use-compression=no

# 5. Aktifkan RADIUS di semua Hotspot & PPP
/ip hotspot profile set [find] use-radius=yes
/ppp aaa set use-radius=yes

:log info "Radius Billing: Konfigurasi Direct berhasil diterapkan!"
:put "=== SELESAI: RADIUS Direct (IP Publik) Terkonfigurasi ==="' AS script_content,
  '#server_ip#,#nasname#,#secret#,#auth_port#,#acct_port#' AS parameters,
  'Script RADIUS langsung via IP Publik MikroTik, cocok untuk koneksi direct tanpa VPN' AS description
) t
WHERE NOT EXISTS (SELECT 1 FROM mikrotik_script_templates);

-- Template 2: RADIUS VPN L2TP v7
INSERT INTO mikrotik_script_templates (name, ros_version, script_content, parameters, description)
SELECT * FROM (SELECT
  'RADIUS via VPN L2TP/IPsec (v7)' AS name,
  'v7' AS ros_version,
  '# ==================================================
# SCRIPT MIKROTIK - RADIUS VPN L2TP/IPsec - ROS v7
# ==================================================
# Copy & paste langsung ke Terminal MikroTik
# Variabel yang perlu diisi manual:
#   #server_ip#   = IP Publik VPS server billing
#   #vpn_user#    = Username VPN dari halaman NAS
#   #vpn_pass#    = Password VPN dari halaman NAS
#   #vpn_psk#     = IPsec PSK dari halaman NAS
#   #vpn_local_ip# = Gateway VPN (dari Settings)
#   #secret#      = RADIUS Secret
#   #auth_port#   = Auth Port (default: 1812)
#   #acct_port#   = Acct Port (default: 1813)

# 0. Buat PPP Profile untuk tunnel (mencegah pool error)
:foreach i in=[/ppp profile find name="ARMTunnel"] do={/ppp profile remove $i}
/ppp profile add name="ARMTunnel"

# 1. Konfigurasi L2TP Client (VPN ke server billing)
:foreach i in=[/interface l2tp-client find name="vpn-radius"] do={/interface l2tp-client remove $i}
/interface l2tp-client add \
  name="vpn-radius" \
  connect-to="#server_ip#" \
  user="#vpn_user#" \
  password="#vpn_pass#" \
  profile="ARMTunnel" \
  use-ipsec=yes \
  ipsec-secret="#vpn_psk#" \
  disabled=no

# 2. Tambah RADIUS Server via gateway VPN
:foreach i in=[/radius find comment="Radius Billing VPN"] do={/radius remove $i}
/radius add \
  service="hotspot,ppp" \
  address="#vpn_local_ip#" \
  secret="#secret#" \
  authentication-port=#auth_port# \
  accounting-port=#acct_port# \
  comment="Radius Billing VPN"

# 3. Aktifkan RADIUS Incoming
/radius incoming set accept=yes port=3799

# 4. PPPoE Profile Normal & Isolir
:foreach i in=[/ip pool find name="ARMPOOL"]   do={/ip pool remove $i}
:foreach i in=[/ip pool find name="ARMISOLIR"] do={/ip pool remove $i}
/ip pool add name="ARMPOOL"   ranges="10.30.192.100-10.30.207.254"
/ip pool add name="ARMISOLIR" ranges="10.30.208.10-10.30.209.254"

:foreach i in=[/ppp profile find name="ARM_RADIUS"] do={/ppp profile remove $i}
:foreach i in=[/ppp profile find name="ARM_ISOLIR"] do={/ppp profile remove $i}
/ppp profile add name="ARM_RADIUS" remote-address=ARMPOOL   only-one=yes use-compression=no
/ppp profile add name="ARM_ISOLIR" remote-address=ARMISOLIR only-one=yes use-compression=no

# 5. Aktifkan RADIUS di semua Hotspot & PPP
/ip hotspot profile set [find] use-radius=yes
/ppp aaa set use-radius=yes

:log info "Radius Billing: Konfigurasi VPN L2TP berhasil diterapkan!"
:put "=== SELESAI: RADIUS VPN L2TP/IPsec Terkonfigurasi ==="' AS script_content,
  '#server_ip#,#vpn_user#,#vpn_pass#,#vpn_psk#,#vpn_local_ip#,#secret#,#auth_port#,#acct_port#' AS parameters,
  'Script RADIUS via VPN L2TP/IPsec untuk MikroTik RouterOS v7, cocok untuk MikroTik di jaringan NAT/private' AS description
) t
WHERE (SELECT COUNT(*) FROM mikrotik_script_templates) < 2;

-- Template 3: RADIUS VPN L2TP v6 (Legacy)
INSERT INTO mikrotik_script_templates (name, ros_version, script_content, parameters, description)
SELECT * FROM (SELECT
  'RADIUS via VPN L2TP/IPsec (v6)' AS name,
  'v6' AS ros_version,
  '# ==================================================
# SCRIPT MIKROTIK - RADIUS VPN L2TP/IPsec - ROS v6
# ==================================================
# Khusus RouterOS versi 6.x (legacy)
# Variabel yang perlu diisi manual:
#   #server_ip#    = IP Publik VPS server billing
#   #vpn_user#     = Username VPN dari halaman NAS
#   #vpn_pass#     = Password VPN dari halaman NAS
#   #vpn_psk#      = IPsec PSK dari halaman NAS
#   #vpn_local_ip# = Gateway VPN (dari Settings)
#   #secret#       = RADIUS Secret
#   #auth_port#    = Auth Port (default: 1812)
#   #acct_port#    = Acct Port (default: 1813)

# 0. Buat PPP Profile untuk tunnel
:foreach i in=[/ppp profile find name="ARMTunnel"] do={/ppp profile remove $i}
/ppp profile add name="ARMTunnel"

# 1. Konfigurasi L2TP Client (ROS v6 - parameter sedikit berbeda)
:foreach i in=[/interface l2tp-client find name="vpn-radius"] do={/interface l2tp-client remove $i}
/interface l2tp-client add \
  name="vpn-radius" \
  connect-to="#server_ip#" \
  user="#vpn_user#" \
  password="#vpn_pass#" \
  profile="ARMTunnel" \
  use-ipsec=yes \
  ipsec-secret="#vpn_psk#" \
  disabled=no

# 2. Tambah RADIUS Server via gateway VPN
:foreach i in=[/radius find comment="Radius Billing VPN"] do={/radius remove $i}
/radius add \
  service=hotspot,ppp \
  address="#vpn_local_ip#" \
  secret="#secret#" \
  authentication-port=#auth_port# \
  accounting-port=#acct_port# \
  comment="Radius Billing VPN"

# 3. Aktifkan RADIUS Incoming
/radius incoming set accept=yes port=3799

# 4. PPPoE Profile Normal & Isolir
:foreach i in=[/ip pool find name="ARMPOOL"]   do={/ip pool remove $i}
:foreach i in=[/ip pool find name="ARMISOLIR"] do={/ip pool remove $i}
/ip pool add name="ARMPOOL"   ranges="10.30.192.100-10.30.207.254"
/ip pool add name="ARMISOLIR" ranges="10.30.208.10-10.30.209.254"

:foreach i in=[/ppp profile find name="ARM_RADIUS"] do={/ppp profile remove $i}
:foreach i in=[/ppp profile find name="ARM_ISOLIR"] do={/ppp profile remove $i}
/ppp profile add name="ARM_RADIUS" remote-address=ARMPOOL   only-one=yes use-compression=no
/ppp profile add name="ARM_ISOLIR" remote-address=ARMISOLIR only-one=yes use-compression=no

# 5. Aktifkan RADIUS di semua Hotspot & PPP
/ip hotspot profile set [find] use-radius=yes
/ppp aaa set use-radius=yes

:log info "Radius Billing: Konfigurasi VPN L2TP (v6) berhasil diterapkan!"
:put "=== SELESAI: RADIUS VPN L2TP/IPsec ROS v6 Terkonfigurasi ==="' AS script_content,
  '#server_ip#,#vpn_user#,#vpn_pass#,#vpn_psk#,#vpn_local_ip#,#secret#,#auth_port#,#acct_port#' AS parameters,
  'Script RADIUS via VPN L2TP/IPsec untuk MikroTik RouterOS v6.x (legacy), kompatibel penuh dengan ROS lama' AS description
) t
WHERE (SELECT COUNT(*) FROM mikrotik_script_templates) < 3;

SELECT CONCAT('✔ Mikrotik Script Templates: ', COUNT(*), ' template tersedia.') AS status
FROM mikrotik_script_templates;
