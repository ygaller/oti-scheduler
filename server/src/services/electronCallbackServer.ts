import http from 'http';
import url from 'url';
import { EventEmitter } from 'events';

/**
 * Simple HTTP server to handle OAuth callbacks for Electron PKCE flow
 */
class ElectronCallbackServer extends EventEmitter {
  private server: http.Server | null = null;
  private port = 8080;

  constructor() {
    super();
  }

  /**
   * Start the callback server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, 'localhost', () => {
        console.log(`Electron callback server started on http://localhost:${this.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('Callback server error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the callback server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('Electron callback server stopped');
    }
  }

  /**
   * Handle incoming requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!req.url) {
      this.sendErrorResponse(res, 'Invalid request');
      return;
    }

    const parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.pathname === '/callback') {
      this.handleCallback(parsedUrl.query, res);
    } else {
      this.sendErrorResponse(res, 'Not found', 404);
    }
  }

  /**
   * Handle OAuth callback
   */
  private handleCallback(query: any, res: http.ServerResponse): void {
    if (query.error) {
      console.error('OAuth error:', query.error, query.error_description);
      this.emit('error', {
        error: query.error,
        description: query.error_description
      });
      this.sendErrorResponse(res, `Authentication failed: ${query.error_description || query.error}`);
      return;
    }

    if (!query.code) {
      this.sendErrorResponse(res, 'No authorization code received');
      return;
    }

    // Emit success with the authorization code
    this.emit('success', {
      code: query.code,
      state: query.state
    });

    // Send success response
    this.sendSuccessResponse(res);
  }

  /**
   * Send success response
   */
  private sendSuccessResponse(res: http.ServerResponse): void {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
              margin: 0 auto;
            }
            .success {
              color: #4CAF50;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .message {
              color: #666;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓ Authentication Successful</div>
            <div class="message">
              You can now close this browser window and return to the OTI Scheduler application.
            </div>
          </div>
          <script>
            // Auto-close after 3 seconds
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Send error response
   */
  private sendErrorResponse(res: http.ServerResponse, message: string, statusCode = 400): void {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
              margin: 0 auto;
            }
            .error {
              color: #f44336;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .message {
              color: #666;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">✗ Authentication Error</div>
            <div class="message">${message}</div>
          </div>
        </body>
      </html>
    `;

    res.writeHead(statusCode, { 'Content-Type': 'text/html' });
    res.end(html);
  }
}

export default ElectronCallbackServer;
