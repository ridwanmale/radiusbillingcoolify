with open('frontend/src/pages/OnlineStoreCenter.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

old_desc = "Tabel ini menampilkan perangkat (UUID) yang sedang memiliki jumlah transaksi PENDING terbanyak (belum dibayar) dan belum masuk ke Blacklist Permanen."
new_desc = "Tabel ini menampilkan rekam jejak perangkat (UUID) yang paling sering terkena blokir otomatis (Auto-Block) sepanjang waktu, dan belum masuk ke Blacklist Permanen."
c = c.replace(old_desc, new_desc)

old_th = "<th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Jumlah Transaksi PENDING</th>"
new_th = "<th style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Total Pelanggaran (Terblokir)</th>"
c = c.replace(old_th, new_th)

old_td = "<td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ef4444', fontWeight: 'bold' }}>{ts.spam_count} transaksi</td>"
new_td = "<td style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ef4444', fontWeight: 'bold' }}>{ts.spam_count} kali diblokir</td>"
c = c.replace(old_td, new_td)

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("Updated frontend history labels")
