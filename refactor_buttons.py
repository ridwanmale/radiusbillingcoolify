import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Regex finds `<button ...> ... <span>edit|delete</span> ... </button>`
    # We must be careful not to match too much.
    # We can match `<button` followed by any chars up to <span>(edit|delete)</span> and then `</button>`
    # using non-greedy `.*?`
    
    # Let's break the file into chunks of buttons.
    button_pattern = re.compile(r'<button[\s\S]*?</button>', re.IGNORECASE)
    
    def replace_button(match):
        btn_html = match.group(0)
        
        # Check if it wraps a material-symbols-rounded edit or delete
        inner_span_match = re.search(r'<span[^>]*material-symbols-rounded[^>]*>\s*(edit|delete)\s*</span>', btn_html, re.IGNORECASE)
        
        if not inner_span_match:
            return btn_html
            
        icon_type = inner_span_match.group(1).lower()
        new_class = 'btn-glass-edit' if icon_type == 'edit' else 'btn-glass-delete'
        
        # Extract just the <button ...> part
        open_tag_match = re.search(r'^<button([^>]*)>', btn_html, re.IGNORECASE)
        if not open_tag_match:
            return btn_html
            
        open_tag = open_tag_match.group(0)
        attrs = open_tag_match.group(1)
        
        # Replace or insert className
        if 'className=' in open_tag:
            # We want to replace whatever is in className with the new class
            # But wait, what if it's `className={`btn ${foo}`}`?
            # Usually it's `className="btn ..."`
            # Let's just replace the whole className attribute if it's a simple string.
            # If it's a complex JS expression, we might just replace the literal part.
            # To be safe, if `className="` is there:
            new_open_tag = re.sub(r'className=["\'][^"\']*["\']', f'className="{new_class}"', open_tag)
        else:
            new_open_tag = open_tag.replace('<button', f'<button className="{new_class}"')
            
        # Remove style attribute if it exists
        new_open_tag = re.sub(r'\s*style=\{\{[^\}]*\}\}', '', new_open_tag)
        
        # Also, inside the inner span, ensure color is correct or remove its color if we want CSS to handle it?
        # The user wants red for delete, amber for edit. I already injected inline styles for colors earlier,
        # so we can just keep them. The glassy background of the button is the main change.
        
        return btn_html.replace(open_tag, new_open_tag)

    content = button_pattern.sub(replace_button, content)

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
