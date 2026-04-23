const fs = require('fs');
const path = require('path');

const directory = 'c:\\Users\\Mayibongwe\\Documents\\GitHub\\24-7-DIgiHealth\\project\\app\\api';
const targetSecret = "'secret123!'";
const patterns = [
    /process\.env\.JWT_SECRET \|\| 'secret'/g,
    /process\.env\.JWT_SECRET \|\| 'fallback-secret-for-dev-only'/g
];

const replacement = "process.env.JWT_SECRET || 'secret123!'";

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content;
            for (const pattern of patterns) {
                newContent = newContent.replace(pattern, replacement);
            }
            if (newContent !== content) {
                fs.writeFileSync(fullPath, newContent);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

walk(directory);
