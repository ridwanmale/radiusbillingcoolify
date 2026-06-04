import re

with open('backend/routes/online_store.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Extract spam-blocklist routes
spam_pattern = r'(\s*// 5\. GET Spam Blocklist\s*router\.get\(\'/spam-blocklist\'.*?router\.delete\(\'/spam-blocklist/:id\'.*?\}\s*\);\s*)module\.exports = router;'
spam_match = re.search(spam_pattern, c, re.DOTALL)
if not spam_match:
    print("Spam routes not found!")
    exit(1)

spam_block = spam_match.group(1)

# Remove spam_block from original location
c = c.replace(spam_block, '\n')

# Find where to insert it: before // 11. Cek Status Transaksi (Untuk Polling di Portal)
insert_pattern = r'(\s*// 11\. Cek Status Transaksi \(Untuk Polling di Portal\))'
insert_match = re.search(insert_pattern, c)
if not insert_match:
    print("Insert point not found!")
    exit(1)

# Insert spam block before the polling route
c = c.replace(insert_match.group(1), f"\n{spam_block}\n{insert_match.group(1)}")

with open('backend/routes/online_store.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("Success")
