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

**None required for authentication** - JWT secrets are auto-generated!

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

## 📊 Security Status

JWT secrets are automatically managed by the system:
- Secrets are generated automatically when the server starts
- No manual configuration required
- Secrets are stored securely with proper file permissions

## 🚀 Setup Instructions

### 1. Development Setup
```bash
# No JWT_SECRET needed!
cd server
cp env.example .env
npm run dev
```

### 2. Production Electron
```bash
# JWT secrets auto-generated in user data directory
# No additional configuration needed!
```

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
