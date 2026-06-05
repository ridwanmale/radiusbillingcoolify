import os
import re

COLORS = {
    '#ef4444': ['delete', 'auto_delete', 'cancel', 'block', 'error', 'remove_circle'],
    '#f59e0b': ['edit', 'settings', 'manage_accounts'],
    '#3b82f6': ['refresh', 'sync', 'download'],
    '#10b981': ['add_circle', 'add', 'check_circle', 'save'],
    'var(--accent-primary)': ['visibility', 'content_copy', 'info']
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    for color, icons in COLORS.items():
        for icon in icons:
            # Pattern: <span className="material-symbols-rounded" ...>icon</span>
            pattern = re.compile(r'(<span[^>]*className=["\']material-symbols-rounded["\'][^>]*>)\s*' + re.escape(icon) + r'\s*</span>')
            
            def replace_match(match):
                span_tag = match.group(1)
                
                # If color is already defined, skip it
                if 'color:' in span_tag or 'color :' in span_tag:
                    return match.group(0)
                
                # Check if style={{ exists
                style_match = re.search(r'style=\{\{\s*', span_tag)
                if style_match:
                    insertion_point = style_match.end()
                    new_style = f"color: '{color}', "
                    new_span_tag = span_tag[:insertion_point] + new_style + span_tag[insertion_point:]
                    return new_span_tag + icon + '</span>'
                else:
                    # No style attribute, add one
                    # Find the last >
                    # but wait, if it's <span ... > we just insert before >
                    # However, could end with ' >' or '" >'
                    last_gt_idx = span_tag.rfind('>')
                    new_style_attr = f' style={{{{ color: \'{color}\' }}}}'
                    new_span_tag = span_tag[:last_gt_idx] + new_style_attr + span_tag[last_gt_idx:]
                    return new_span_tag + icon + '</span>'

            content = pattern.sub(replace_match, content)

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
