# Security Implementation Guide

## 🔐 Auto-Generated JWT Secrets

This application automatically generates and manages JWT secrets, eliminating the need to manually set `JWT_SECRET` in environment variables.

### How It Works

#### Development Environment
```
📁 server/data/secrets/jwt.secret (128-character secret)
```

#### Production Electron Environment  
```
📁 {USER_DATA_PATH}/secrets/jwt.secret (128-character secret)
```

### Security Features

✅ **Auto-Generation**: Cryptographically secure 512-bit (128-character) secrets  
✅ **Persistent**: Secrets persist between app restarts  
✅ **Secure Storage**: File permissions set to `600` (owner read/write only)  
✅ **No Version Control**: Secrets never committed to git  
✅ **Cross-Platform**: Works on Windows, macOS, and Linux  
✅ **Fallback Protection**: In-memory secret if file system fails  

### File Locations

| Environment | Secret Location | Permissions |
|-------------|-----------------|-------------|
| **Development** | `server/data/secrets/jwt.secret` | `600 (-rw--------)` |
| **Electron Production** | `{userData}/secrets/jwt.secret` | `600 (-rw--------)` |

### Environment Variables

**Required:**
```env
GOOGLE_CLIENT_ID=your-google-client-id
```

**Optional (for custom database):**
```env
DATABASE_URL=postgresql://user:pass@host:port/db
```

**Not Required (Auto-Generated):**
```env
# JWT_SECRET - This is now auto-generated!
```

## 🔒 Token Storage (Client-Side)

### Web Browser
- Uses `localStorage` for JWT token storage
- Suitable for development and web deployment

### Electron App
- **Windows**: Windows Credential Manager (DPAPI)
- **macOS**: Keychain Services  
- **Linux**: Secret Service API (gnome-keyring)
- **Fallback**: Secure file storage with restricted permissions

### Implementation

```typescript
// Automatically detects environment and uses appropriate storage
await ElectronAuthService.setToken(jwtToken);
const token = await ElectronAuthService.getToken();
```

## 🛡️ Security Levels

| Component | Security Level | Description |
|-----------|----------------|-------------|
| **JWT Secret Generation** | 🔒 High | Cryptographically secure random generation |
| **JWT Secret Storage** | 🔒 High | File permissions + secure directory |
| **Token Storage (Electron)** | 🔒 High | OS-level encryption (Keychain/Credential Manager) |
| **Token Storage (Web)** | 🔒 Medium | localStorage (standard web security) |
| **Network Transport** | 🔒 High | HTTPS + Bearer token headers |

## 📊 Security Info Endpoint

Check security status:
```bash
curl http://localhost:3001/api/auth/security-info
```

Response:
```json
{
  "jwtSecret": {
    "exists": true,
    "length": 128,
    "isSecure": true,
    "path": "jwt.secret"
  },
  "googleOAuth": {
    "configured": true,
    "clientIdLength": 72
  }
}
```

## 🚀 Setup Instructions

### 1. Development Setup
```bash
# No JWT_SECRET needed!
cd server
cp env.example .env
# Edit .env and add your GOOGLE_CLIENT_ID
npm run dev
```

### 2. Production Electron
```bash
# JWT secrets auto-generated in user data directory
# Just ensure GOOGLE_CLIENT_ID is set
```

### 3. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID
3. Add authorized origins: `http://localhost:3000`
4. Add redirect URIs: `http://localhost:3000/auth/callback`
5. Copy Client ID to your `.env` files

## 🧹 Secret Management

### Regenerate Secrets (Development)
```bash
# Delete the secret file - new one will be generated on next start
rm server/data/secrets/jwt.secret
npm run dev
```

### Cleanup (Electron Uninstall)
```javascript
// In Electron main process
const { SecretManager } = require('./src/config/secrets');
const secretManager = new SecretManager();
secretManager.cleanup(); // Removes all secrets
```

## 🎯 Benefits

1. **Zero Configuration**: No manual secret generation required
2. **Secure by Default**: Cryptographically strong secrets
3. **Cross-Platform**: Works everywhere Electron runs  
4. **Developer Friendly**: No secrets in version control
5. **Production Ready**: Enterprise-grade security standards
