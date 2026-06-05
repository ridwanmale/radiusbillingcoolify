import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # We want to match:
    # <div [something that has flex and center or padding] ...>
    #   ...
    #   <button ... onClick={...}>Prev</button>
    #   ... {currentPage} / {totalPages} ...
    #   <button ... onClick={...}>Next</button>
    # </div>
    
    pattern = re.compile(
        r'<div[^>]*>\s*<button([^>]*onClick=\{[^}]*\}[^>]*)>\s*Prev\s*</button>([\s\S]*?)<button([^>]*onClick=\{[^}]*\}[^>]*)>\s*Next\s*</button>\s*</div>',
        re.IGNORECASE
    )

    def replacer(match):
        full_match = match.group(0)
        
        # If it's too large, we captured too much
        if len(full_match) > 3000:
            return full_match

        # Extract props for btn 1
        btn1 = match.group(1)
        btn2 = match.group(3)
        middle = match.group(2)
        
        def extract_props(tag):
            on_click = re.search(r'(onClick=\{[\s\S]*?\})', tag)
            disabled = re.search(r'(disabled=\{[\s\S]*?\})', tag)
            
            props = []
            if on_click: props.append(on_click.group(1))
            if disabled: props.append(disabled.group(1))
            return ' '.join(props)
            
        props1 = extract_props(btn1)
        props2 = extract_props(btn2)
        
        middle_text = re.search(r'>([^<]*\{[^\}]*\}[^<]*)<', middle)
        if middle_text:
            mid_str = middle_text.group(1).strip()
        else:
            mid_str = "{currentPage} / {totalPages}"
            
        return (
            '<div className="pagination-wrapper">\n'
            f'  <button className="pagination-btn" {props1}>Prev</button>\n'
            f'  <div className="pagination-text">{mid_str}</div>\n'
            f'  <button className="pagination-btn" {props2}>Next</button>\n'
            '</div>'
        )

    content = pattern.sub(replacer, content)

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
