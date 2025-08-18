const { app } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let serverProcess = null;

const startEmbeddedServer = () => {
  return new Promise((resolve, reject) => {
    const isDev = process.env.NODE_ENV === 'development';
    const disableEmbedded = process.env.DISABLE_EMBEDDED_SERVER === '1';
    
    if (isDev || disableEmbedded) {
      // In development, assume server is already running
      console.log(`${disableEmbedded ? 'Embedded server disabled via env' : 'Development mode'} - expecting external server on port 3001`);
      resolve();
      return;
    }

    // In production, start the bundled server
    const appPath = app.getAppPath();
    const serverEntryPoint = path.join(appPath, 'server', 'dist', 'index.js');
    const userDataPath = app.getPath('userData');
    
    console.log('Starting embedded server...');
    console.log('Server entry:', serverEntryPoint);
    console.log('User data path:', userDataPath);

    // Set environment variables for the server
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      ELECTRON: 'true',
      USER_DATA_PATH: userDataPath,
      PORT: '3001',
      ELECTRON_RUN_AS_NODE: '1'
    };

    serverProcess = spawn(process.execPath, [serverEntryPoint], {
      env,
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
