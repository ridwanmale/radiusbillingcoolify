import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Change auto_delete to delete
    content = re.sub(
        r'(<span[^>]*className=["\']material-symbols-rounded["\'][^>]*>)\s*auto_delete\s*</span>',
        r'\g<1>delete</span>',
        content
    )

    # 2. Force all delete icons to be red (#ef4444)
    # We find any span with material-symbols-rounded that contains 'delete'
    # and replace any color: '#...' with color: '#ef4444'
    def replace_color(match):
        span_tag = match.group(1)
        # If it has color: '...', replace it
        new_span_tag = re.sub(r'color\s*:\s*[\'"][^\'"]+[\'"]', "color: '#ef4444'", span_tag)
        # If it doesn't have color at all, we add it. (My previous script did this, but some might be left)
        if "color: '#ef4444'" not in new_span_tag:
            style_match = re.search(r'style=\{\{\s*', new_span_tag)
            if style_match:
                new_span_tag = new_span_tag[:style_match.end()] + "color: '#ef4444', " + new_span_tag[style_match.end():]
            else:
                last_gt_idx = new_span_tag.rfind('>')
                new_style_attr = " style={{ color: '#ef4444' }}"
                new_span_tag = new_span_tag[:last_gt_idx] + new_style_attr + new_span_tag[last_gt_idx:]
        return new_span_tag + 'delete</span>'

    pattern = re.compile(r'(<span[^>]*className=["\']material-symbols-rounded["\'][^>]*>)\s*delete\s*</span>')
    content = pattern.sub(replace_color, content)

    if content != original_content:
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
