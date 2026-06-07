import re

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (r"style=\{\{\s*fontSize:\s*'0\.8rem',\s*color:\s*'#94a3b8',\s*fontWeight:\s*'700',\s*marginBottom:\s*'8px',\s*display:\s*'block'\s*\}\}", 'className="label-premium"'),
    (r"style=\{\{\s*margin:\s*'0 0 20px 0',\s*fontSize:\s*'1\.2rem',\s*fontWeight:\s*'800',\s*color:\s*'white',\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'8px'\s*\}\}", 'className="title-premium"'),
    (r"style=\{\{\s*width:\s*'100%',\s*borderCollapse:\s*'collapse',\s*textAlign:\s*'left',\s*fontSize:\s*'0\.85rem'\s*\}\}", 'className="table-premium"'),
    (r"style=\{\{\s*padding:\s*'12px 15px',\s*borderBottom:\s*'1px solid rgba\(255,255,255,0\.1\)',\s*textAlign:\s*'left',\s*fontWeight:\s*'600',\s*color:\s*'#94a3b8'\s*\}\}", 'className="th-premium"'),
    (r"style=\{\{\s*padding:\s*'12px 15px',\s*borderBottom:\s*'1px solid rgba\(255,255,255,0\.1\)',\s*textAlign:\s*'center',\s*fontWeight:\s*'600',\s*color:\s*'#94a3b8'\s*\}\}", 'className="th-premium-center"'),
    (r"style=\{\{\s*padding:\s*'12px 15px',\s*borderBottom:\s*'1px solid rgba\(255,255,255,0\.1\)'\s*\}\}", 'className="td-premium"'),
    (r"style=\{\{\s*padding:\s*'12px 15px',\s*borderBottom:\s*'1px solid rgba\(255,255,255,0\.1\)',\s*textAlign:\s*'center'\s*\}\}", 'className="td-premium-center"'),
    (r"style=\{\{\s*background:\s*'rgba\(0,0,0,0\.2\)',\s*borderRadius:\s*'10px',\s*overflow:\s*'hidden',\s*border:\s*'1px solid rgba\(255,255,255,0\.05\)'\s*\}\}", 'className="card-store"'),
    (r"style=\{\{\s*background:\s*'rgba\(255,255,255,0\.05\)',\s*color:\s*'#94a3b8',\s*padding:\s*'12px 15px',\s*borderBottom:\s*'1px solid rgba\(255,255,255,0\.1\)',\s*textAlign:\s*'center',\s*fontWeight:\s*'700'\s*\}\}", 'className="card-store-header"'),
    (r"style=\{\{\s*padding:\s*'20px',\s*textAlign:\s*'center',\s*color:\s*'#64748b'\s*\}\}", 'className="card-store-body"'),
    (r"style=\{\{\s*display:\s*'flex',\s*alignItems:\s*'center',\s*justifyContent:\s*'center'\s*\}\}", 'className="flex-center"')
]

original_content = content
for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

if content != original_content:
    with open('frontend/src/pages/OnlineStoreCenter.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('OnlineStoreCenter refactored successfully.')
else:
    print('No matches found for refactoring.')
