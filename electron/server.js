const { app } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let serverProcess = null;

const startEmbeddedServer = () => {
  return new Promise((resolve, reject) => {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // In development, assume server is already running
      console.log('Development mode - expecting external server on port 3001');
      resolve();
      return;
    }

    // In production, start the bundled server
    const serverEntryPoint = path.join(__dirname, '..', 'server', 'dist', 'index.js');
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
      PORT: '3001'
    };

    serverProcess = spawn(process.execPath, [serverEntryPoint], {
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverReady = false;

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
