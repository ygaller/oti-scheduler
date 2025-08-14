const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Electron application...');

// Ensure all dependencies are installed
console.log('📦 Installing dependencies...');
execSync('npm run install:all', { stdio: 'inherit' });

// Build the server
console.log('🏗️  Building server...');
execSync('npm run server:build', { stdio: 'inherit' });

// Install server production dependencies in the correct location
console.log('📦 Installing server production dependencies...');
execSync('cd server && npm ci --production', { stdio: 'inherit' });

// Build the client
console.log('🎨 Building client...');
execSync('npm run client:build', { stdio: 'inherit' });

// Ensure electron directory has all necessary files
console.log('📁 Preparing Electron files...');
const electronDir = path.join(__dirname, '..', 'electron');
const iconsDir = path.join(electronDir, 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Copy icons if they don't exist
const iconFiles = ['icon.png', 'icon.ico', 'icon.icns'];
iconFiles.forEach(iconFile => {
  const iconPath = path.join(iconsDir, iconFile);
  if (!fs.existsSync(iconPath)) {
    const sourcePath = path.join(__dirname, '..', 'client', 'public', 'oti-logo.png');
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, iconPath);
      console.log(`✅ Created ${iconFile}`);
    }
  }
});

console.log('✅ Build preparation complete!');
console.log('');
console.log('Next steps:');
console.log('  • For macOS: npm run dist:mac');
console.log('  • For Windows: npm run dist:win');
console.log('  • For both: npm run dist:all');
console.log('');
