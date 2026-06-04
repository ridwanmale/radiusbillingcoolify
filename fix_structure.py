import re

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Extract the Keamanan block
keamanan_pattern = r'(\s*<div style=\{\{ display: activeTab === \'keamanan\' \? \'block\' : \'none\' \}\}>.*?\/\* SECTION: KEAMANAN & SPAM \*\/.*?<\/div>\s*<\/div>\s*<\/div>)'
keamanan_match = re.search(keamanan_pattern, c, re.DOTALL)
if not keamanan_match:
    print("Keamanan match not found!")
    exit(1)

keamanan_block = keamanan_match.group(1)
# Remove Keamanan block from its current place
c = c.replace(keamanan_block, '')

# Now extract the Submit button
submit_pattern = r'(\s*<button type="submit" disabled=\{isSaving\}.*?<\/button>)'
submit_match = re.search(submit_pattern, c, re.DOTALL)
if submit_match:
    submit_block = submit_match.group(1)
    c = c.replace(submit_block, '')
else:
    print("Submit block not found!")
    exit(1)

# The form ends with:
#           </div>
#         </form>
form_end_pattern = r'(          <\/div>\s*<\/form>)'
form_end_match = re.search(form_end_pattern, c)

if form_end_match:
    # Insert Keamanan block and Submit button right before the form closes
    # But Keamanan block already has <div display: activeTab === 'keamanan' ...> wrapper!
    # Wait, where does the grid end? The grid ends at           </div> right before         </form>
    # So we replace           </div>\n        </form> with:
    #           </div> (closing the grid)
    #           {keamanan_block}
    #           {submit_block}
    #         </form>
    
    new_tail = f"          </div>\n{keamanan_block}\n{submit_block}\n        </form>"
    c = c.replace(form_end_match.group(1), new_tail)
else:
    print("Form end not found!")
    exit(1)

with open('frontend/src/pages/OnlineStoreCenter.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
print("Success")
