with open('C:\\Users\\maula\\.gemini\\antigravity-ide\\brain\\fee50dc3-ebbf-4883-a89f-053454615f7f\\task.md', 'r') as f:
    c = f.read()

c = c.replace('- [/] 1. Create spam_history table in ackend/server.js', '- [x] 1. Create spam_history table in ackend/server.js')
c = c.replace('- [ ] 2. Update ackend/routes/online_store.js to increment spam_history during Auto-Block', '- [x] 2. Update ackend/routes/online_store.js to increment spam_history during Auto-Block')
c = c.replace('- [ ] 3. Update GET /api/online-store/top-spammers to fetch from spam_history', '- [x] 3. Update GET /api/online-store/top-spammers to fetch from spam_history')
c = c.replace('- [ ] 4. Update UI labels in rontend/src/pages/OnlineStoreCenter.jsx to reflect historical block counts', '- [/] 4. Update UI labels in rontend/src/pages/OnlineStoreCenter.jsx to reflect historical block counts')

with open('C:\\Users\\maula\\.gemini\\antigravity-ide\\brain\\fee50dc3-ebbf-4883-a89f-053454615f7f\\task.md', 'w') as f:
    f.write(c)
