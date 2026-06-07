import re

with open('backend/routes/pppoe_redirect.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_warning = """router.get('/warning-page', async (req, res) => {
  res.redirect('/isolir');
});
"""

# Replace from `router.get('/warning-page'` to `module.exports = router;`
content = re.sub(r"router\.get\('/warning-page'.*?(?=module\.exports = router;)", new_warning + '\n', content, flags=re.DOTALL)

with open('backend/routes/pppoe_redirect.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated /warning-page to redirect to /isolir')
