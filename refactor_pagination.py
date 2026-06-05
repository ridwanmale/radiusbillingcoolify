import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. Match the wrapper div:
    # <div style={{... display: 'flex' ... padding: '4px' }}> ... <button ... Prev ... <div ... {currentPage} / {totalPages} ... <button ... Next ... </div>
    # Because formatting varies widely, we will use a loose regex that captures:
    # 1. <div style={...}> (the wrapper)
    # 2. <button ...>Prev</button>
    # 3. <div ...>X / Y</div>
    # 4. <button ...>Next</button>
    # 5. </div>

    pattern = re.compile(
        r'<div[^>]*style=\{\{\s*display:\s*[\'"]flex[\'"][\s\S]*?padding:\s*[\'"]4px[\'"]\s*\}\}[^>]*>'
        r'(\s*)<button([^>]*?)>(\s*)Prev(\s*)</button>'
        r'(\s*)<div[^>]*style=\{\{[\s\S]*?fontFamily:\s*[\'"]monospace[\'"]\s*\}\}[^>]*>'
        r'([\s\S]*?)</div>'
        r'(\s*)<button([^>]*?)>(\s*)Next(\s*)</button>'
        r'(\s*)</div>',
        re.IGNORECASE
    )

    def replacer(match):
        indent1 = match.group(1)
        btn1_attrs = match.group(2)
        indent2 = match.group(3)
        indent3 = match.group(4)
        indent4 = match.group(5)
        text_content = match.group(6)
        indent5 = match.group(7)
        btn2_attrs = match.group(8)
        indent6 = match.group(9)
        indent7 = match.group(10)
        indent8 = match.group(11)

        # Clean btn attrs: remove className="..." and style={{...}}
        def clean_attrs(attrs):
            a = re.sub(r'className=[\'"][^\'"]*[\'"]', '', attrs)
            a = re.sub(r'style=\{\{[\s\S]*?\}\}', '', a)
            # clean up extra spaces
            a = re.sub(r'\s+', ' ', a).strip()
            return a

        btn1_clean = clean_attrs(btn1_attrs)
        btn2_clean = clean_attrs(btn2_attrs)

        return (
            '<div className="pagination-wrapper">' +
            f'{indent1}<button className="pagination-btn" {btn1_clean}>{indent2}Prev{indent3}</button>' +
            f'{indent4}<div className="pagination-text">' +
            f'{text_content}</div>' +
            f'{indent5}<button className="pagination-btn" {btn2_clean}>{indent6}Next{indent7}</button>' +
            f'{indent8}</div>'
        )

    content = pattern.sub(replacer, content)

    # Some pagination might not have the exact wrapping styling padding: '4px'. 
    # Let's try another pattern for StoreTransactions.jsx which had:
    # <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white', cursor: 'pointer' }}>Prev</button>
    # <span style={{ color: 'var(--text-secondary)' }}>Halaman {currentPage} dari {totalPages}</span>
    # <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white', cursor: 'pointer' }}>Next</button>
    
    pattern2 = re.compile(
        r'<button([^>]*?)>Prev</button>\s*<span([^>]*?)>([^<]*Halaman[^<]*)</span>\s*<button([^>]*?)>Next</button>',
        re.IGNORECASE
    )

    def replacer2(match):
        btn1_attrs = match.group(1)
        span_attrs = match.group(2)
        text_content = match.group(3)
        btn2_attrs = match.group(4)

        def clean_attrs(attrs):
            a = re.sub(r'className=[\'"][^\'"]*[\'"]', '', attrs)
            a = re.sub(r'style=\{\{[\s\S]*?\}\}', '', a)
            a = re.sub(r'\s+', ' ', a).strip()
            return a

        btn1_clean = clean_attrs(btn1_attrs)
        btn2_clean = clean_attrs(btn2_attrs)

        return (
            '<div className="pagination-wrapper">\n' +
            f'  <button className="pagination-btn" {btn1_clean}>Prev</button>\n' +
            f'  <div className="pagination-text">{text_content}</div>\n' +
            f'  <button className="pagination-btn" {btn2_clean}>Next</button>\n' +
            '</div>'
        )

    content = pattern2.sub(replacer2, content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

def main():
    pages_dir = r"c:\Users\maula\OneDrive\Documents\my file\Ngoprek\radiusbillingcoolify\frontend\src\pages"
    for root, dirs, files in os.walk(pages_dir):
        for file in files:
            if file.endswith('.jsx'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
