import os
import re

directory = r'c:\Users\Mayibongwe\Documents\GitHub\24-7-DIgiHealth\project\app\api'
target_secret = "'secret123!'"
patterns = [
    r"process\.env\.JWT_SECRET \|\| 'secret'",
    r"process\.env\.JWT_SECRET \|\| 'fallback-secret-for-dev-only'"
]

replacement = r"process.env.JWT_SECRET || 'secret123!'"

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for pattern in patterns:
                new_content = re.sub(pattern, replacement, new_content)
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {path}")
