const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Electron application...');

// Ensure all dependencies are installed
console.log('📦 Installing dependencies...');
execSync('npm run install:all', { stdio: 'inherit' });

// Build the server (ensure dev dependencies are available for TypeScript compilation)
console.log('🏗️  Building server...');
console.log('📦 Ensuring server dev dependencies are available...');
execSync('cd server && npm ci', { stdio: 'inherit' });

console.log('🔍 Checking TypeScript availability...');
try {
  execSync('cd server && npx tsc --version', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ TypeScript not available, installing...');
  execSync('cd server && npm install --save-dev typescript', { stdio: 'inherit' });
}

console.log('🔨 Compiling TypeScript...');
try {
  execSync('npm run server:build', { stdio: 'inherit' });
} catch (buildError) {
  console.error('❌ Server build failed:', buildError.message);
  console.log('🔍 Checking server directory structure...');
  try {
    execSync('ls -la server/', { stdio: 'inherit' });
    execSync('ls -la server/src/', { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to list directories:', e.message);
  }
  throw buildError;
}

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

// Verify server files exist before packaging
console.log('🔍 Verifying server build...');
const serverDistPath = path.join(__dirname, '..', 'server', 'dist', 'index.js');
if (fs.existsSync(serverDistPath)) {
  console.log('✅ Server dist files found');
  console.log(`  Main entry: ${serverDistPath}`);
  const distDir = path.dirname(serverDistPath);
  const distContents = fs.readdirSync(distDir);
  console.log(`  Dist contents: [${distContents.join(', ')}]`);
} else {
  console.error('❌ Server dist files not found! Build may be incomplete.');
  console.error(`  Expected: ${serverDistPath}`);
  process.exit(1);
}

console.log('✅ Build preparation complete!');
console.log('');
console.log('Next steps:');
console.log('  • For macOS: npm run dist:mac');
console.log('  • For Windows: npm run dist:win');
console.log('  • For both: npm run dist:all');
console.log('');
