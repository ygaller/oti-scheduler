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
// First clean any existing node_modules to ensure fresh install
const serverNodeModulesPath = path.join(__dirname, '..', 'server', 'node_modules');
if (fs.existsSync(serverNodeModulesPath)) {
  console.log('🧹 Cleaning existing server node_modules...');
  execSync('cd server && rm -rf node_modules', { stdio: 'inherit' });
}
execSync('cd server && npm ci --omit=dev', { stdio: 'inherit' });

// Generate Prisma client for production
console.log('🔧 Generating Prisma client...');
execSync('cd server && npx prisma generate', { stdio: 'inherit' });

// Verify production dependencies are installed
console.log('🔍 Verifying server production dependencies...');
if (fs.existsSync(serverNodeModulesPath)) {
  const nodeModulesContents = fs.readdirSync(serverNodeModulesPath);
  console.log(`✅ Server node_modules found with ${nodeModulesContents.length} packages`);
  
  // Check for key dependencies
  const keyDeps = ['express', 'cors', 'dotenv', 'pg', 'portfinder'];
  const scopedDeps = ['@prisma']; // Check for scoped packages
  
  const missingDeps = keyDeps.filter(dep => !nodeModulesContents.includes(dep));
  const missingScopedDeps = scopedDeps.filter(dep => !nodeModulesContents.includes(dep));
  
  if (missingDeps.length > 0 || missingScopedDeps.length > 0) {
    const allMissing = [...missingDeps, ...missingScopedDeps];
    console.error(`❌ Missing key dependencies: ${allMissing.join(', ')}`);
    console.error('This will likely cause the Windows build to fail!');
    
    // List what we actually have for debugging
    console.log('📋 Available dependencies:', nodeModulesContents.slice(0, 20).join(', ') + (nodeModulesContents.length > 20 ? '...' : ''));
    process.exit(1);
  } else {
    console.log('✅ All key dependencies present');
    
    // Also verify express can be required
    try {
      require(`${serverNodeModulesPath}/express/package.json`);
      console.log('✅ Express module is properly accessible');
    } catch (e) {
      console.error('❌ Express module exists but cannot be required:', e.message);
      process.exit(1);
    }
  }
} else {
  console.error('❌ Server node_modules not found after production install!');
  process.exit(1);
}

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

// Generate electron/config.json with Google OAuth settings
console.log('🛠️  Generating Electron config.json...');
try {
  // Helper to read simple .env files
  const parseEnvFile = (filePath) => {
    const vars = {};
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        content.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex === -1) return;
          const key = trimmed.substring(0, eqIndex).trim();
          let value = trimmed.substring(eqIndex + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
            value = value.slice(1, -1);
          }
          vars[key] = value;
        });
      }
    } catch (_) {}
    return vars;
  };

  const rootEnv = parseEnvFile(path.join(__dirname, '..', '.env'));
  const serverEnv = parseEnvFile(path.join(__dirname, '..', 'server', '.env'));

  const getVar = (name, fallback = '') => {
    return process.env[name] || serverEnv[name] || rootEnv[name] || fallback;
  };

  const googleClientId = getVar('GOOGLE_CLIENT_ID', '');
  const apiUrl = getVar('API_URL', 'http://localhost:3001/api');
  let redirectUri = getVar('GOOGLE_REDIRECT_URI_ELECTRON', '') || 'http://localhost:8080/callback';

  // Safety: if a web redirect accidentally leaks in, fix to Electron callback
  if (/localhost:3000\//i.test(redirectUri)) {
    console.warn(`⚠️  Detected web redirect URI (${redirectUri}). Using Electron default http://localhost:8080/callback instead.`);
    redirectUri = 'http://localhost:8080/callback';
  }

  const config = {
    googleClientId,
    apiUrl,
    redirectUri,
    isDevelopment: false
  };

  // Ensure electron dir exists
  if (!fs.existsSync(electronDir)) {
    fs.mkdirSync(electronDir, { recursive: true });
  }

  const configPath = path.join(electronDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ Wrote ${configPath}`);
  console.log(`   googleClientId: ${config.googleClientId ? config.googleClientId.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`   apiUrl: ${config.apiUrl}`);
  console.log(`   redirectUri: ${config.redirectUri}`);
} catch (e) {
  console.warn('⚠️  Failed to generate electron/config.json automatically:', e.message);
}

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
