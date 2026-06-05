with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

import_idx = -1
route_idx = -1
for i, line in enumerate(lines):
    if 'import CustomerPortal' in line:
        import_idx = i
    if 'path="/portal"' in line or "path='/portal'" in line:
        route_idx = i

if import_idx != -1 and route_idx != -1:
    lines.insert(import_idx + 1, "import IsolirNotice from './pages/pppoe/IsolirNotice';\nimport PayInvoice from './pages/pppoe/PayInvoice';\n")
    route_idx += 1
    lines.insert(route_idx + 1, "          <Route path=\"/isolir\" element={<IsolirNotice />} />\n          <Route path=\"/pay-invoice\" element={<PayInvoice />} />\n")
    
    with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('Updated App.jsx successfully')
else:
    print('Failed to find markers')
