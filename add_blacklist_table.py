with open('backend/server.js', 'r', encoding='utf-8') as f:
    c = f.read()

old_schema = '''      await pool.query(
        CREATE TABLE IF NOT EXISTS spam_blocklist (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ip_address VARCHAR(45),
          device_id VARCHAR(128),
          blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          reason VARCHAR(255)
        ) ENGINE=InnoDB;
      );'''

new_schema = '''      await pool.query(
        CREATE TABLE IF NOT EXISTS spam_blocklist (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ip_address VARCHAR(45),
          device_id VARCHAR(128),
          blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          reason VARCHAR(255)
        ) ENGINE=InnoDB;
      );

      await pool.query(
        CREATE TABLE IF NOT EXISTS blacklist_uuid (
          id INT AUTO_INCREMENT PRIMARY KEY,
          device_id VARCHAR(128) NOT NULL UNIQUE,
          reason VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      );'''

if old_schema in c:
    c = c.replace(old_schema, new_schema)
    with open('backend/server.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Table blacklist_uuid added")
else:
    print("Failed to add table blacklist_uuid")
