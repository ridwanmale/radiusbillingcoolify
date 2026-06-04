import re

with open('backend/routes/online_store.js', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Capture the new variable
old_capture = '''    const spam_max_pending = req.body.spam_max_pending !== undefined ? req.body.spam_max_pending : existing.spam_max_pending;'''
new_capture = '''    const spam_max_pending = req.body.spam_max_pending !== undefined ? req.body.spam_max_pending : existing.spam_max_pending;
    const spam_auto_unblock_minutes = req.body.spam_auto_unblock_minutes !== undefined ? req.body.spam_auto_unblock_minutes : existing.spam_auto_unblock_minutes;'''

if old_capture in c:
    c = c.replace(old_capture, new_capture)

# 2. Update the SQL query text
old_sql = '''          auto_cleanup_enabled = ?, auto_cleanup_hours = ?, spam_protection_enabled = ?, spam_max_pending = ?
        WHERE id = 1'''
new_sql = '''          auto_cleanup_enabled = ?, auto_cleanup_hours = ?, spam_protection_enabled = ?, spam_max_pending = ?, spam_auto_unblock_minutes = ?
        WHERE id = 1'''

if old_sql in c:
    c = c.replace(old_sql, new_sql)

# 3. Update the SQL array params
old_params = '''      auto_cleanup_enabled, auto_cleanup_hours, spam_protection_enabled, spam_max_pending
      ]);'''
new_params = '''      auto_cleanup_enabled, auto_cleanup_hours, spam_protection_enabled, spam_max_pending, spam_auto_unblock_minutes
      ]);'''

if old_params in c:
    c = c.replace(old_params, new_params)

with open('backend/routes/online_store.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("API logic updated")
