import re

with open('backend/routes/pppoe_redirect.js', 'r', encoding='utf-8') as f:
    content = f.read()

# We will replace the existing /pay-invoice with two new routes:
# 1. /invoice-check (returns JSON with invoice and payment methods)
# 2. /process-payment (processes the chosen payment method)

new_routes = """
// 4b. Check Invoice and Available Payment Methods (JSON)
router.get('/invoice-check', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    let cleanIp = clientIp;
    if (clientIp.includes('::ffff:')) {
      cleanIp = clientIp.split('::ffff:')[1];
    }

    const [sessions] = await db.query(
      "SELECT username FROM radacct WHERE framedipaddress = ? AND acctstoptime IS NULL ORDER BY radacctid DESC LIMIT 1",
      [cleanIp]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Sesi tidak terdeteksi', message: 'Sistem tidak dapat mendeteksi username PPPoE Anda dari IP ' + cleanIp });
    }

    const pppoe_username = sessions[0].username;

    const [customers] = await db.query(
      "SELECT id, name, phone, pppoe_username FROM pppoe_customers WHERE pppoe_username = ?",
      [pppoe_username]
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Akun tidak terdaftar', message: 'Username PPPoE tidak terdaftar.' });
    }

    const customer = customers[0];

    const [invoices] = await db.query(
      "SELECT id, invoice_number, amount FROM pppoe_invoices WHERE customer_id = ? AND status = 'unpaid' ORDER BY id ASC LIMIT 1",
      [customer.id]
    );

    if (invoices.length === 0) {
      return res.status(200).json({ status: 'paid', message: 'Tagihan sudah lunas.' });
    }

    const invoice = invoices[0];

    // Get Payment Methods Configuration
    const [portalRows] = await db.query("SELECT * FROM portal_settings WHERE id = 1");
    const settings = portalRows[0] || {};
    
    // We use the new pppoe_enable_* columns if they exist, otherwise fallback to the hotspot settings
    const activeMethods = [];
    if (settings.pppoe_enable_payment_bridge === 1 || (settings.pppoe_enable_payment_bridge === undefined && settings.enable_payment_bridge === 1)) {
        activeMethods.push({ id: 'payment_bridge', name: 'Payment Bridge / Transfer' });
    }
    if (settings.pppoe_enable_midtrans === 1 || (settings.pppoe_enable_midtrans === undefined && settings.enable_midtrans === 1)) {
        activeMethods.push({ id: 'midtrans', name: 'Midtrans (Virtual Account / QRIS)' });
    }
    if (settings.pppoe_enable_duitku === 1 || (settings.pppoe_enable_duitku === undefined && settings.enable_duitku === 1)) {
        activeMethods.push({ id: 'duitku', name: 'Duitku (E-Wallet / Retail)' });
    }
    if (settings.pppoe_enable_tripay === 1 || (settings.pppoe_enable_tripay === undefined && settings.enable_tripay === 1)) {
        activeMethods.push({ id: 'tripay', name: 'Tripay' });
    }

    res.json({
      status: 'unpaid',
      customer: { name: customer.name, username: customer.pppoe_username },
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount
      },
      payment_methods: activeMethods
    });

  } catch (err) {
    console.error('[Invoice Check Error]:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4c. Process Payment based on selected method
router.post('/process-payment', async (req, res) => {
  const { invoice_id, method } = req.body;
  if (!invoice_id || !method) return res.status(400).json({ error: 'Data tidak lengkap' });

  try {
    const [invoices] = await db.query("SELECT i.*, c.name, c.phone, c.pppoe_username FROM pppoe_invoices i JOIN pppoe_customers c ON i.customer_id = c.id WHERE i.id = ? AND i.status = 'unpaid'", [invoice_id]);
    if (invoices.length === 0) return res.status(404).json({ error: 'Tagihan tidak ditemukan atau sudah lunas' });
    
    const invoice = invoices[0];
    const order_id = `INV-PPPOE-${invoice.id}-${Date.now()}`;
    const paymentAmount = parseInt(invoice.amount);

    const [gatewayRows] = await db.query("SELECT payment_gateway_config FROM settings WHERE id = 1");
    const [portalRows] = await db.query("SELECT * FROM portal_settings WHERE id = 1");
    const settings = portalRows[0] || {};
    
    let config = {};
    if (gatewayRows.length > 0 && gatewayRows[0].payment_gateway_config) {
      try { config = JSON.parse(gatewayRows[0].payment_gateway_config); } catch (e) {}
    }

    const protocol = req.secure ? 'https' : 'http';
    const host = req.headers.host;
    const publicUrl = `${protocol}://${host}`;

    if (method === 'midtrans') {
      const midtransClient = require('midtrans-client');
      let snap = new midtransClient.Snap({
        isProduction: false,
        serverKey: config.midtrans.server_key
      });
      let parameter = {
        transaction_details: { order_id: order_id, gross_amount: paymentAmount },
        customer_details: { first_name: invoice.name, phone: invoice.phone || '08123456789' },
        item_details: [{ id: `INV-${invoice.id}`, price: paymentAmount, quantity: 1, name: `Internet PPPoE #${invoice.invoice_number}` }],
        callbacks: { finish: `${publicUrl}/pay-invoice?status=success&order_id=${order_id}` }
      };
      const transaction = await snap.createTransaction(parameter);
      return res.json({ payment_url: transaction.redirect_url });
    } 
    else if (method === 'duitku') {
      const axios = require('axios');
      const crypto = require('crypto');
      const merchantCode = settings.duitku_merchant_code;
      const merchantKey = settings.duitku_api_key;
      const signature = crypto.createHash('md5').update(merchantCode + order_id + paymentAmount + merchantKey).digest('hex');
      const payload = {
        merchantCode, paymentAmount, merchantOrderId: order_id, productDetails: `Internet PPPoE #${invoice.invoice_number}`,
        email: 'customer@example.com', phoneNumber: invoice.phone || '08123456789', signature,
        callbackUrl: `${publicUrl}/api/online-store/duitku/callback`, returnUrl: `${publicUrl}/pay-invoice?status=success&order_id=${order_id}`,
        expiryPeriod: 1440
      };
      const response = await axios.post('https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry', payload);
      if (response.data && response.data.paymentUrl) return res.json({ payment_url: response.data.paymentUrl });
      throw new Error(response.data.message || 'Duitku inquiry failed');
    }
    // Add logic for payment_bridge if needed (e.g., returning static QRIS string)
    else {
      return res.status(400).json({ error: 'Metode pembayaran tidak didukung' });
    }
  } catch (err) {
    console.error('[Process Payment Error]:', err);
    res.status(500).json({ error: 'Gagal memproses pembayaran: ' + err.message });
  }
});
"""

# Regex to replace everything from `// 4b. Unified Online Payment...` until `module.exports = router;`
pattern = re.compile(r"// 4b\. Unified Online Payment Checkout for PPPoE Overdue Invoice.*?(?=module\.exports = router;)", re.DOTALL)
new_content = pattern.sub(new_routes, content)

with open('backend/routes/pppoe_redirect.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Updated pppoe_redirect.js")
