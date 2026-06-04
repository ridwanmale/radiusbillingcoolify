import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()
    
    orig = c
    
    # Match: new Date(something).toLocaleString(something).replace(something)
    # The regex needs to carefully capture the arguments to new Date()
    # It also handles optional .replace() calls chained to it.
    pattern1 = r"new Date\(([^)]*)\)\.toLocaleString\([^)]*\)(?:\.replace\([^)]*\))?(?:\.replace\([^)]*\))?"
    c = re.sub(pattern1, r"formatDateTime(\1)", c)
    
    # Match specific known date variables
    pattern2 = r"(currentTime|dDate|d)\.toLocaleString\([^)]*\)(?:\.replace\([^)]*\))?(?:\.replace\([^)]*\))?"
    c = re.sub(pattern2, r"formatDateTime(\1)", c)
    
    if orig != c:
        # Determine import path depth based on directory
        if 'pages/pppoe' in filepath.replace('\\', '/'):
            import_stmt = "import { formatDateTime } from '../../utils/dateFormatter';\n"
        else:
            import_stmt = "import { formatDateTime } from '../utils/dateFormatter';\n"
            
        # Insert import after the last import statement
        if import_stmt not in c:
            last_import = c.rfind("import ")
            if last_import != -1:
                newline_pos = c.find("\n", last_import)
                c = c[:newline_pos+1] + import_stmt + c[newline_pos+1:]
            else:
                c = import_stmt + c
                
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f"Updated {filepath}")

# Walk through src/pages
pages_dir = os.path.join('frontend', 'src', 'pages')
for root, dirs, files in os.walk(pages_dir):
    for f in files:
        if f.endswith('.jsx'):
            process_file(os.path.join(root, f))
