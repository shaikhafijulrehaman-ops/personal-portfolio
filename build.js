const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Files to copy directly to dist
const filesToCopy = [
    'index.html',
    'style.css',
    'admin.html',
    'admin.css',
    'login.html',
    'uxi.html',
    'resume.pdf',
    'removed_bg_hafi.png'
];

filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied ${file} to dist/`);
    } else {
        console.warn(`File ${file} does not exist, skipping.`);
    }
});

// Helper to copy directory recursively
function copyDirSync(srcDir, destDir) {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (let entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Copy images directory
const imagesSrc = path.join(__dirname, 'images');
const imagesDest = path.join(distDir, 'images');
if (fs.existsSync(imagesSrc)) {
    copyDirSync(imagesSrc, imagesDest);
    console.log('Copied images/ directory to dist/images/');
}

console.log('Build completed successfully!');
