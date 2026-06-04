with open('frontend/src/pages/PaymentBridgeCenter.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

start_str = '      {showCleanupModal && ('
end_str = '        {/* CUSTOM CONFIRMATION MODAL */}'

start = c.find(start_str)
end = c.find(end_str)

if start != -1 and end != -1:
    c = c[:start] + c[end:]
    with open('frontend/src/pages/PaymentBridgeCenter.jsx', 'w', encoding='utf-8') as f:
        f.write(c)
