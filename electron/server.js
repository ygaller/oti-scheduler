const { app } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let serverProcess = null;

const startEmbeddedServer = () => {
  return new Promise((resolve, reject) => {
    const isDev = process.env.NODE_ENV === 'development';
    const disableEmbedded = process.env.DISABLE_EMBEDDED_SERVER === '1';
    
    // Also check if we're running from source (not packaged)
    const isPackaged = app.isPackaged;
    
    if (isDev || disableEmbedded || !isPackaged) {
      // In development or unpackaged mode, assume server is already running
      const reason = !isPackaged ? 'Unpackaged mode' : 
                    disableEmbedded ? 'Embedded server disabled via env' : 
                    'Development mode';
      console.log(`${reason} - expecting external server on port 3001`);
      resolve();
      return;
    }

    // In production, start the bundled server
    const appPath = app.getAppPath();
    const userDataPath = app.getPath('userData');
    
    // Write debug info to file for post-mortem analysis
    const debugLogPath = path.join(userDataPath, 'server-debug.log');
    const logDebug = (message) => {
      console.log(message);
      try {
        require('fs').appendFileSync(debugLogPath, `${new Date().toISOString()} - ${message}\n`);
      } catch (e) {
        console.error('Failed to write debug log:', e.message);
      }
    };

    // Debug: Log all available paths and environment
    logDebug('🔍 Debug info:');
    logDebug(`  process.execPath: ${process.execPath}`);
    logDebug(`  __dirname: ${__dirname}`);
    logDebug(`  appPath: ${appPath}`);
    logDebug(`  process.resourcesPath: ${process.resourcesPath}`);
    logDebug(`  app.isPackaged: ${app.isPackaged}`);
    
    // For Windows, the unpacked files are in resources/app.asar.unpacked
    // Based on the error path: C:\Users\mirol\AppData\Local\Programs\oti-scheduler\resources\app.asar\server\dist\index.js
    // The correct path should be: C:\Users\mirol\AppData\Local\Programs\oti-scheduler\resources\app.asar.unpacked\server\dist\index.js
    
    const serverEntryPointCandidates = [
      // Primary location: unpacked files next to asar
      path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'dist', 'index.js'),
      // Alternative: in the parent of asar file
      path.join(path.dirname(appPath), 'app.asar.unpacked', 'server', 'dist', 'index.js'),
      // Fallback: inside asar (shouldn't work but let's try)
      path.join(appPath, 'server', 'dist', 'index.js'),
      // Alternative resource paths
      path.join(process.resourcesPath, 'app', 'server', 'dist', 'index.js'),
      // Direct resources path
      path.join(path.dirname(process.execPath), 'resources', 'app.asar.unpacked', 'server', 'dist', 'index.js')
    ];
    
    let serverEntryPoint = null;
    logDebug('🔍 Checking server entry point candidates:');
    for (const candidate of serverEntryPointCandidates) {
      logDebug(`  Trying: ${candidate}`);
      try {
        if (require('fs').existsSync(candidate)) {
          serverEntryPoint = candidate;
          logDebug(`  ✅ Found server entry point: ${candidate}`);
          break;
        } else {
          logDebug(`  ❌ Not found: ${candidate}`);
        }
      } catch (error) {
        logDebug(`  ❌ Error checking: ${candidate} - ${error.message}`);
      }
    }
    
    if (!serverEntryPoint) {
      // List what's actually in the directories to help debug
      logDebug('🔍 Directory contents for debugging:');
      const debugPaths = [
        appPath, 
        process.resourcesPath, 
        path.dirname(appPath),
        path.join(process.resourcesPath, 'app.asar.unpacked'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'server'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'node_modules')
      ];
      
      for (const debugPath of debugPaths) {
        try {
          if (require('fs').existsSync(debugPath)) {
            const contents = require('fs').readdirSync(debugPath);
            logDebug(`  ${debugPath}: [${contents.join(', ')}]`);
            
            // If this is the unpacked server directory, also check the dist folder
            if (debugPath.includes('server') && contents.includes('dist')) {
              const distPath = path.join(debugPath, 'dist');
              if (require('fs').existsSync(distPath)) {
                const distContents = require('fs').readdirSync(distPath);
                logDebug(`    ${distPath}: [${distContents.join(', ')}]`);
              }
            }
          } else {
            logDebug(`  ${debugPath}: does not exist`);
          }
        } catch (error) {
          logDebug(`  ${debugPath}: error reading - ${error.message}`);
        }
      }
      
      // Last resort: try to extract server files from asar if they exist there
      logDebug('🔄 Attempting to extract server files from asar as fallback...');
      try {
        const asarServerPath = path.join(appPath, 'server', 'dist', 'index.js');
        const tempServerDir = path.join(userDataPath, 'server', 'dist');
        const tempServerEntry = path.join(tempServerDir, 'index.js');
        
        logDebug(`🔍 Checking asar server path: ${asarServerPath}`);
        
        // Check if server files exist in asar
        if (require('fs').existsSync(asarServerPath)) {
          logDebug('✅ Found server files in asar, extracting to temp location...');
          
          // Create temp directory
          require('fs').mkdirSync(tempServerDir, { recursive: true });
          
          // Copy the entire server dist directory
          const asarDistDir = path.join(appPath, 'server', 'dist');
          const copyRecursive = (src, dest) => {
            logDebug(`📁 Copying: ${src} -> ${dest}`);
            const stats = require('fs').statSync(src);
            if (stats.isDirectory()) {
              require('fs').mkdirSync(dest, { recursive: true });
              const entries = require('fs').readdirSync(src);
              for (const entry of entries) {
                copyRecursive(path.join(src, entry), path.join(dest, entry));
              }
            } else {
              require('fs').copyFileSync(src, dest);
            }
          };
          
          copyRecursive(asarDistDir, tempServerDir);
          
          // Also copy node_modules if they exist in asar
          const asarNodeModules = path.join(appPath, 'server', 'node_modules');
          const tempNodeModules = path.join(path.dirname(tempServerDir), 'node_modules');
          if (require('fs').existsSync(asarNodeModules)) {
            logDebug(`📦 Copying node_modules from asar: ${asarNodeModules} -> ${tempNodeModules}`);
            copyRecursive(asarNodeModules, tempNodeModules);
          } else {
            logDebug(`❌ No node_modules found in asar at: ${asarNodeModules}`);
          }
          
          if (require('fs').existsSync(tempServerEntry)) {
            serverEntryPoint = tempServerEntry;
            logDebug(`✅ Successfully extracted server to: ${tempServerEntry}`);
          } else {
            logDebug(`❌ Extraction completed but entry point not found: ${tempServerEntry}`);
          }
        } else {
          logDebug(`❌ Server files not found in asar at: ${asarServerPath}`);
          
          // Try to find what IS in the asar
          logDebug('🔍 Checking what exists in asar root:');
          try {
            const asarRoot = appPath;
            if (require('fs').existsSync(asarRoot)) {
              const asarContents = require('fs').readdirSync(asarRoot);
              logDebug(`  Asar root contents: [${asarContents.join(', ')}]`);
              
              // Check if there's a server directory at all
              const asarServerDir = path.join(appPath, 'server');
              if (require('fs').existsSync(asarServerDir)) {
                const serverContents = require('fs').readdirSync(asarServerDir);
                logDebug(`  Server dir contents: [${serverContents.join(', ')}]`);
              } else {
                logDebug('  No server directory found in asar');
              }
            }
          } catch (listError) {
            logDebug(`❌ Error listing asar contents: ${listError.message}`);
          }
        }
      } catch (extractError) {
        logDebug(`❌ Failed to extract server files: ${extractError.message}`);
        logDebug(`❌ Extract error stack: ${extractError.stack}`);
      }
      
      if (!serverEntryPoint) {
        const error = new Error(`Could not find server entry point. Tried ${serverEntryPointCandidates.length} locations and extraction failed.`);
        console.error('❌ Server entry point not found after all attempts');
        reject(error);
        return;
      }
    }
    
    logDebug('Starting embedded server...');
    logDebug(`App path: ${appPath}`);
    logDebug(`Resources path: ${process.resourcesPath}`);
    logDebug(`Server entry: ${serverEntryPoint}`);
    logDebug(`User data path: ${userDataPath}`);

    // Debug: Check node_modules availability near the server entry point
    const serverDir = path.dirname(serverEntryPoint);
    const serverParentDir = path.dirname(serverDir);
    const possibleNodeModules = [
      path.join(serverParentDir, 'node_modules'),
      path.join(serverDir, 'node_modules'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'node_modules')
    ];
    
    logDebug('🔍 Checking for node_modules near server entry:');
    for (const nmPath of possibleNodeModules) {
      if (require('fs').existsSync(nmPath)) {
        try {
          const nmContents = require('fs').readdirSync(nmPath);
          logDebug(`  ✅ Found node_modules at: ${nmPath} [${nmContents.slice(0, 5).join(', ')}${nmContents.length > 5 ? '...' : ''}]`);
          
          // Check specifically for express
          const expressPath = path.join(nmPath, 'express');
          if (require('fs').existsSync(expressPath)) {
            logDebug(`  ✅ Express module found at: ${expressPath}`);
          } else {
            logDebug(`  ❌ Express module not found in: ${nmPath}`);
          }
        } catch (e) {
          logDebug(`  ❌ Error reading node_modules at ${nmPath}: ${e.message}`);
        }
      } else {
        logDebug(`  ❌ No node_modules at: ${nmPath}`);
      }
    }

    // Set environment variables for the server
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      ELECTRON: 'true',
      USER_DATA_PATH: userDataPath,
      PORT: '3001',
      ELECTRON_RUN_AS_NODE: '1'
    };

    // Set NODE_PATH to help Node.js find modules in the unpacked location
    const unpackedServerPath = path.dirname(serverEntryPoint);
    const unpackedNodeModules = path.join(path.dirname(unpackedServerPath), 'node_modules');
    
    // Collect all possible NODE_PATH locations
    const nodePaths = [];
    
    if (require('fs').existsSync(unpackedNodeModules)) {
      logDebug(`📦 Found unpacked node_modules at: ${unpackedNodeModules}`);
      nodePaths.push(unpackedNodeModules);
    } else {
      logDebug(`❌ Unpacked node_modules not found at: ${unpackedNodeModules}`);
    }
    
    // Try alternative locations
    const altNodeModules = [
      path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'node_modules'),
      path.join(process.resourcesPath, 'node_modules'),
      path.join(path.dirname(process.execPath), 'node_modules'),
      path.join(appPath, 'server', 'node_modules'), // In case they're in asar
      path.join(appPath, 'node_modules')
    ];
    
    for (const altPath of altNodeModules) {
      if (require('fs').existsSync(altPath)) {
        logDebug(`✅ Found alternative node_modules at: ${altPath}`);
        if (!nodePaths.includes(altPath)) {
          nodePaths.push(altPath);
        }
      } else {
        logDebug(`❌ Alternative node_modules not found at: ${altPath}`);
      }
    }
    
    // Set NODE_PATH to include all found node_modules directories
    if (nodePaths.length > 0) {
      env.NODE_PATH = nodePaths.join(process.platform === 'win32' ? ';' : ':');
      logDebug(`🔧 Setting NODE_PATH to: ${env.NODE_PATH}`);
    } else {
      logDebug(`❌ No node_modules directories found anywhere!`);
    }

    // Set working directory to the server directory for proper module resolution
    const serverWorkingDir = path.dirname(serverEntryPoint);
    logDebug(`🔧 Setting working directory to: ${serverWorkingDir}`);

    serverProcess = spawn(process.execPath, [serverEntryPoint], {
      env,
      cwd: serverWorkingDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    let serverReady = false;

    // Persist server output to disk for post-mortem debugging
    const logDir = userDataPath;
    const outStream = fs.createWriteStream(path.join(logDir, 'server-out.log'), { flags: 'a' });
    const errStream = fs.createWriteStream(path.join(logDir, 'server-err.log'), { flags: 'a' });
    serverProcess.stdout.pipe(outStream);
    serverProcess.stderr.pipe(errStream);

    // Handle server output
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[SERVER]', output);
      
      // Check if server is ready
      if (output.includes('Ready to accept requests') && !serverReady) {
        serverReady = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      console.error('[SERVER ERROR]', errorOutput);
      if (errorOutput.includes('Error: P1001') || errorOutput.includes('Failed to start server')) {
        reject(new Error(`Server startup error: ${errorOutput}`));
      }
    });

    serverProcess.on('error', (error) => {
      console.error('Failed to spawn server process:', error);
      reject(error);
    });

    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
      if (code !== 0 && !serverReady) { // If server exited with an error code and wasn't ready
        reject(new Error(`Server process exited with code ${code} during startup.`));
      } else if (serverReady && code !== 0) {
        console.warn('Server process exited after being ready, this might be unexpected.');
      }
      serverProcess = null;
    });

    // Removed the setTimeout that resolves assuming ready;
    // rely on 'Ready to accept requests' or explicit error/close.
  });
};

const stopEmbeddedServer = () => {
  if (serverProcess) {
    console.log('Stopping embedded server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
};

module.exports = {
  startEmbeddedServer,
  stopEmbeddedServer
};
