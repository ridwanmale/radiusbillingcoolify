import re

with open('backend/routes/online_store.js', 'r', encoding='utf-8') as f:
    content = f.read()

ensure_cols_func = """
const ensurePppoeColumns = async () => {
  const cols = [
    ['pppoe_enable_payment_bridge', 'TINYINT(1) DEFAULT 1'],
    ['pppoe_enable_midtrans', 'TINYINT(1) DEFAULT 0'],
    ['pppoe_enable_duitku', 'TINYINT(1) DEFAULT 0'],
    ['pppoe_enable_tripay', 'TINYINT(1) DEFAULT 0']
  ];
  for (const [colName, colType] of cols) {
    try {
      await db.query(`ALTER TABLE portal_settings ADD COLUMN ${colName} ${colType}`);
    } catch (err) {}
  }
};
"""

content = re.sub(r'(function getPublicUrl[\s\S]*?}\n)', r'\1\n' + ensure_cols_func, content)
content = re.sub(r'(router\.get\(\'/settings\',.*?async.*?=>.*?{)', r'\1\n  await ensurePppoeColumns();', content)
content = re.sub(r'(router\.post\(\'/settings\',.*?async.*?=>.*?{)', r'\1\n  await ensurePppoeColumns();', content)

with open('backend/routes/online_store.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated online_store.js')
