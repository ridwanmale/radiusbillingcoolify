import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # We will look for <button ... Prev ... > and then extract manually the parent div
    # to avoid regex failures.

    matches = list(re.finditer(r'<button[^>]*>\s*Prev\s*</button>', content, re.IGNORECASE))
    
    # Process from right to left to avoid messing up indices
    for match in reversed(matches):
        prev_btn_start = match.start()
        prev_btn_end = match.end()
        
        # Find next button
        next_btn_match = re.search(r'<button[^>]*>\s*Next\s*</button>', content[prev_btn_end:], re.IGNORECASE)
        if not next_btn_match: continue
        next_btn_end = prev_btn_end + next_btn_match.end()
        
        # Find wrapper </div> after next button
        end_div_match = re.search(r'\s*</div>', content[next_btn_end:])
        if not end_div_match: continue
        wrapper_end = next_btn_end + end_div_match.end()
        
        # Find wrapper <div before prev button
        # Search backwards from prev_btn_start for <div
        wrapper_start = content.rfind('<div', 0, prev_btn_start)
        if wrapper_start == -1: continue
        
        full_match = content[wrapper_start:wrapper_end]
        
        # Validate it's a pagination block
        if 'currentPage' not in full_match: continue
        if len(full_match) > 4000: continue
        
        # Extract props
        prev_btn_html = match.group(0)
        next_btn_html = next_btn_match.group(0)
        
        def extract_props(tag):
            on_click = re.search(r'(onClick=\{[\s\S]*?\})', tag)
            disabled = re.search(r'(disabled=\{[\s\S]*?\})', tag)
            props = []
            if on_click: props.append(on_click.group(1))
            if disabled: props.append(disabled.group(1))
            return ' '.join(props)

        props1 = extract_props(prev_btn_html)
        props2 = extract_props(next_btn_html)
        
        # Find text between prev and next
        middle = content[prev_btn_end:prev_btn_end + next_btn_match.start()]
        middle_text = re.search(r'>([^<]*\{[^\}]*\}[^<]*)<', middle)
        if middle_text:
            mid_str = middle_text.group(1).strip()
        else:
            # Fallback
            if 'Halaman' in middle:
                m2 = re.search(r'>([^<]*Halaman[^<]*)<', middle)
                mid_str = m2.group(1).strip() if m2 else '{currentPage} / {totalPages}'
            else:
                mid_str = '{currentPage} / {totalPages}'
                
        replacement = (
            '<div className="pagination-wrapper">\n'
            f'  <button className="pagination-btn" {props1}>Prev</button>\n'
            f'  <div className="pagination-text">{mid_str}</div>\n'
            f'  <button className="pagination-btn" {props2}>Next</button>\n'
            '</div>'
        )
        
        content = content[:wrapper_start] + replacement + content[wrapper_end:]

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
