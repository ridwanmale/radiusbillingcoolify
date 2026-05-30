const fetch = require('node-fetch');

fetch('http://localhost:5000/api/nas/5/servers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ server_name: 'hsprof1' })
})
.then(async r => {
  console.log('Status:', r.status);
  console.log('Body:', await r.text());
})
.catch(console.error);
