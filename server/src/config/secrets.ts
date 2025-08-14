import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

class SecretManager {
  private secretsDir: string;
  private jwtSecretPath: string;

  constructor() {
    // For development: store in server directory
    // For production Electron: will be overridden by Electron's userData path
    this.secretsDir = process.env.USER_DATA_PATH 
      ? path.join(process.env.USER_DATA_PATH, 'secrets')
      : path.join(__dirname, '../../data/secrets');
    
    this.jwtSecretPath = path.join(this.secretsDir, 'jwt.secret');
    this.ensureSecretsDir();
  }

  private ensureSecretsDir(): void {
    if (!fs.existsSync(this.secretsDir)) {
      fs.mkdirSync(this.secretsDir, { recursive: true, mode: 0o700 }); // Secure directory permissions
    }
  }

  /**
   * Get or generate JWT secret
   * - Generates a new secret if none exists
   * - Uses existing secret if available
   * - Returns a cryptographically secure 512-bit secret
   */
  getJwtSecret(): string {
    try {
      // Try to read existing secret
      if (fs.existsSync(this.jwtSecretPath)) {
        const existingSecret = fs.readFileSync(this.jwtSecretPath, 'utf8').trim();
        if (existingSecret && existingSecret.length >= 64) {
          console.log('✅ Using existing JWT secret');
          return existingSecret;
        }
      }

      // Generate new secret if none exists or invalid
      const newSecret = crypto.randomBytes(64).toString('hex');
      fs.writeFileSync(this.jwtSecretPath, newSecret, { mode: 0o600 }); // Secure file permissions
      
      console.log('🔑 Generated new JWT secret (512-bit)');
      console.log(`📁 Secret stored at: ${this.jwtSecretPath}`);
      
      return newSecret;
    } catch (error) {
      console.error('❌ Error managing JWT secret:', error);
      console.warn('⚠️  Using in-memory secret (not persistent)');
      
      // Fallback to in-memory secret (not ideal but prevents crash)
      return crypto.randomBytes(64).toString('hex');
    }
  }

  /**
   * Regenerate JWT secret (invalidates all existing tokens)
   */
  regenerateJwtSecret(): string {
    try {
      if (fs.existsSync(this.jwtSecretPath)) {
        fs.unlinkSync(this.jwtSecretPath);
      }
      return this.getJwtSecret();
    } catch (error) {
      console.error('❌ Error regenerating JWT secret:', error);
      throw error;
    }
  }

  /**
   * Clean up secrets (for uninstall or reset)
   */
  cleanup(): void {
    try {
      if (fs.existsSync(this.jwtSecretPath)) {
        fs.unlinkSync(this.jwtSecretPath);
        console.log('🧹 JWT secret cleaned up');
      }
    } catch (error) {
      console.error('❌ Error cleaning up secrets:', error);
    }
  }

  /**
   * Get info about the current secret
   */
  getSecretInfo(): { exists: boolean; path: string; length?: number } {
    const exists = fs.existsSync(this.jwtSecretPath);
    let length: number | undefined;
    
    if (exists) {
      try {
        const secret = fs.readFileSync(this.jwtSecretPath, 'utf8').trim();
        length = secret.length;
      } catch (error) {
        // Ignore read errors
      }
    }

    return {
      exists,
      path: this.jwtSecretPath,
      length
    };
  }
}

// Singleton instance
export const secretManager = new SecretManager();

// Export the class for Electron usage
export { SecretManager };
