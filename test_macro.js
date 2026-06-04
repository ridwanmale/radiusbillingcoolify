const axios = require('axios');
const http = require('http');

const body = {
  device_id: 'test_device',
  source_app: 'com.dana.id',
  notification_title: 'DANA',
  notification_text: 'You received Rp 50.000',
  amount_detected: 'Rp 50.000',
  received_at: 'invalid date',
  idempotency_key: 'test_123'
};

async function run() {
  try {
    const res = await axios.post('http://localhost:8088/api/payment-detections/armradius', body, {
      headers: { Authorization: 'Bearer test_token' }
    });
    console.log(res.data);
  } catch (err) {
    console.log(err.response ? err.response.data : err.message);
  }
}
run();
