import os, re
pages_dir = 'frontend/src/pages'
for root, dirs, files in os.walk(pages_dir):
    for file in files:
        if file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            matches = re.finditer(r'<button[^>]*>[\s\S]*?<span[^>]*class(?:Name)?=[\'\"].*?material-symbols-rounded.*?[\'\"][^>]*>\s*(edit|delete)\s*</span>[\s\S]*?</button>', content)
            for m in matches:
                print(f'---\nFile: {filepath}')
                print(m.group(0).strip())
