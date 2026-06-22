import os
import re

html_dir = r"y:\Home Asistan\Fronted\Pages"

button_html = """
            <button type="button" class="auth-action sidebar-auth-action" id="authActionBtn">
                <i class="fas fa-sign-in-alt"></i>
                <span>Giriş Yap</span>
            </button>
"""
script_html = '<script src="/Fronted/Js/auth.js"></script>\n'

for filename in os.listdir(html_dir):
    if filename.endswith(".html") and filename not in ["Login.html", "Register.html"]:
        filepath = os.path.join(html_dir, filename)
        
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            encoding_used = "utf-8"
        except UnicodeDecodeError:
            with open(filepath, "r", encoding="ISO-8859-9") as f:
                content = f.read()
            encoding_used = "ISO-8859-9"

        changed = False

        if "id=\"authActionBtn\"" not in content and "</nav>" in content:
            # Insert button after </nav>
            content = re.sub(r'(</nav>\s*)(</aside>)', r'\1' + button_html + r'        \2', content)
            changed = True

        if "auth.js" not in content:
            # Insert script before </body>
            content = content.replace("</body>", "    " + script_html + "</body>")
            changed = True

        if changed:
            with open(filepath, "w", encoding=encoding_used) as f:
                f.write(content)
            print(f"Patched {filename}")
