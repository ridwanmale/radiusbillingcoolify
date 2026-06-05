import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    def str_replacer(match):
        quote = match.group(1)
        text = match.group(2)
        t_lower = text.strip().lower()
        
        if t_lower.startswith('menyimpan'):
            return quote + 'MENYIMPAN...' + quote
        elif t_lower.startswith('⌛ menyimpan'):
            return quote + '⌛ MENYIMPAN...' + quote
        elif t_lower.startswith('simpan'):
            return quote + 'SIMPAN' + quote
        elif t_lower.startswith('perbarui'):
            return quote + 'SIMPAN' + quote
        elif t_lower.startswith('update paket'):
            return quote + 'SIMPAN' + quote
        elif t_lower.startswith('aktifkan & simpan'):
            return quote + 'SIMPAN' + quote
        return match.group(0)

    def text_replacer(match):
        text = match.group(1)
        if not text.strip():
            return match.group(0)
            
        t_lower = text.strip().lower()
        
        if t_lower.startswith('menyimpan'):
            return '>MENYIMPAN...<'
        elif t_lower.startswith('⌛ menyimpan'):
            return '>⌛ MENYIMPAN...<'
        elif t_lower.startswith('simpan'):
            return '>SIMPAN<'
        elif t_lower.startswith('perbarui'):
            return '>SIMPAN<'
        elif t_lower.startswith('aktifkan & simpan'):
            return '>SIMPAN<'
        return match.group(0)

    def button_replacer(match):
        btn = match.group(0)
        
        # 1. Replace string literals inside the button HTML
        btn = re.sub(r'([\'"])(.*?)\1', str_replacer, btn)
        
        # 2. Replace text nodes inside the button HTML
        btn = re.sub(r'>([^<]+)<', text_replacer, btn)
        
        return btn

    # Find buttons
    content = re.sub(r'<button[\s\S]*?</button>', button_replacer, content, flags=re.IGNORECASE)

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
