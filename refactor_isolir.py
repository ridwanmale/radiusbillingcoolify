import re

with open('frontend/src/pages/pppoe/IsolirNotice.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (r"style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*justifyContent:\s*'center',\s*alignItems:\s*'center',\s*minHeight:\s*'100vh',\s*backgroundColor:\s*'#0f172a',\s*padding:\s*'20px',\s*fontFamily:\s*'system-ui, -apple-system, sans-serif'\s*\}\}", 'className="isolir-container"'),
    (r"style=\{\{\s*background:\s*'#1e293b',\s*padding:\s*'40px',\s*borderRadius:\s*'16px',\s*boxShadow:\s*'0 10px 30px rgba\(0,0,0,0\.5\)',\s*maxWidth:\s*'500px',\s*width:\s*'100%',\s*textAlign:\s*'center',\s*borderTop:\s*`6px solid \$\{settings\.accent_color \|\| '#ef4444'\}`,?\s*border:\s*'1px solid rgba\(255,255,255,0\.05\)'\s*\}\}", 'className="isolir-card" style={{ borderTop: `6px solid ${settings.accent_color || \'#ef4444\'}` }}'),
    (r"style=\{\{\s*width:\s*'80px',\s*height:\s*'80px',\s*background:\s*`\$\{settings\.accent_color \|\| '#ef4444'\}22`,\s*borderRadius:\s*'50%',\s*display:\s*'flex',\s*alignItems:\s*'center',\s*justifyContent:\s*'center',\s*margin:\s*'0 auto 20px'\s*\}\}", 'className="isolir-icon-wrapper" style={{ background: `${settings.accent_color || \'#ef4444\'}22` }}'),
    (r"style=\{\{\s*color:\s*'white',\s*fontSize:\s*'24px',\s*marginBottom:\s*'10px',\s*fontWeight:\s*'800'\s*\}\}", 'className="isolir-title"'),
    (r"style=\{\{\s*color:\s*'#94a3b8',\s*fontSize:\s*'15px',\s*lineHeight:\s*'1\.6',\s*marginBottom:\s*'25px'\s*\}\}", 'className="isolir-desc"'),
    (r"style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*gap:\s*'15px',\s*marginTop:\s*'30px'\s*\}\}", 'className="isolir-actions"'),
    (r"style=\{\{\s*borderTop:\s*'1px solid rgba\(255,255,255,0\.1\)',\s*paddingTop:\s*'20px',\s*marginTop:\s*'30px'\s*\}\}", 'className="isolir-footer"'),
    (r"style=\{\{\s*fontSize:\s*'13px',\s*color:\s*'#64748b',\s*margin:\s*0\s*\}\}", '')
]

original_content = content
for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

# Clean up empty style tags left over from the last replacement
content = content.replace(' <p >', ' <p>')

if content != original_content:
    with open('frontend/src/pages/pppoe/IsolirNotice.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('IsolirNotice refactored successfully.')
else:
    print('No matches found for IsolirNotice refactoring.')
