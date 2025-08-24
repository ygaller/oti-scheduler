# Electron Desktop Application

This document explains how to build and distribute the scheduling application as a desktop app for Windows and macOS.

## Prerequisites

- Node.js (v16 or later)
- npm
- PostgreSQL (for development)

### Platform-specific requirements:

**For macOS builds:**
- macOS (for code signing and notarization)
- Xcode Command Line Tools

**For Windows builds:**
- Windows (recommended) or cross-compilation setup
- Windows SDK (for native dependencies)

## Development

### 1. Install Dependencies
```bash
npm run setup
```

### 2. Run in Development Mode
```bash
# Start both server and client, then launch Electron
npm run electron:dev
```

This will:
- Start the Node.js backend server on port 3001
- Start the React development server on port 3000
- Launch the Electron app pointing to the development servers

## Building for Distribution

### 1. Prepare the Build
```bash
npm run prepare:electron
```

This script will:
- Install all dependencies
- Build the server (TypeScript → JavaScript)
- Install production dependencies for the server
- Build the React client for production
- Prepare icon files

### 2. Build Platform-specific Installers

**For macOS only:**
```bash
npm run dist:mac
```

**For Windows only:**
```bash
npm run dist:win
```

**For both platforms:**
```bash
npm run dist:all
```

The built applications will be in the `dist-electron` directory.

## Application Structure

```
scheduling/
├── electron/           # Electron main process files
│   ├── main.js        # Main Electron process
│   ├── preload.js     # Preload script for security
│   ├── server.js      # Server management
│   └── icons/         # Application icons
├── client/            # React frontend
├── server/            # Node.js backend
└── dist-electron/     # Built applications (after build)
```

## Database

The Electron app uses an embedded PostgreSQL database that runs locally within the application. No external database setup is required for end users.

- **Development**: Uses the same embedded PostgreSQL as the web version
- **Production**: Creates a local database in the user's app data directory

## Features

- **Self-contained**: Includes both frontend and backend
- **Database included**: Embedded PostgreSQL, no external setup needed
- **Cross-platform**: Runs on Windows and macOS
- **Auto-updates**: Ready for future update mechanism
- **Native menus**: Platform-appropriate application menus
- **Desktop integration**: System notifications, file associations

## Troubleshooting

### Build Issues

1. **Missing dependencies**: Run `npm run setup` to ensure all dependencies are installed
2. **PostgreSQL errors**: Ensure PostgreSQL is installed for development builds
3. **Icon issues**: Check that icon files exist in `electron/icons/`

### Runtime Issues

1. **Server won't start**: Check that port 3001 is available
2. **Database errors**: Check user permissions for app data directory
3. **White screen**: Verify that client build completed successfully

## Distribution

### macOS
- Creates a `.dmg` file for distribution
- Includes automatic installation to Applications folder
- Ready for App Store distribution (with additional signing setup)

### Windows
- Creates an `.exe` installer using NSIS
- Supports custom installation directory
- Creates desktop and start menu shortcuts
- Ready for Windows Store distribution (with additional packaging)

## Configuration

Key configuration files:
- `package.json`: Build configuration, dependencies, scripts
- `electron/main.js`: Main process configuration
- `electron/preload.js`: Security and IPC configuration
- `electron/env`: Development environment variables
- `electron/config.json`: Runtime configuration generated during build

### Google OAuth in Electron

- During build, a `electron/config.json` file is generated with `googleClientId`, `apiUrl`, and `redirectUri`.
- At runtime, the app loads configuration from `electron/config.json`. If that file is missing (e.g., on Windows updates or manual edits), it falls back to loading `config.json` from the user data directory:
  - Windows: `%AppData%/oti-scheduler/config.json`
  - macOS: `~/Library/Application Support/oti-scheduler/config.json`

Example `config.json`:
```json
{
  "googleClientId": "your_google_client_id_here",
  "apiUrl": "http://localhost:3001/api",
  "redirectUri": "http://localhost:8080/callback",
  "isDevelopment": false
}
```

Notes:
- Desktop apps use PKCE and do not require `GOOGLE_CLIENT_SECRET`.
- If `googleClientId` is not set, Google integration will be disabled and the UI will show a warning.

## Security

The Electron app follows security best practices:
- Context isolation enabled
- Node.js integration disabled in renderer
- Preload script for safe IPC
- External link handling
- Content Security Policy ready

## Next Steps

- Set up code signing for both platforms
- Implement auto-updater
- Add native menus
- Set up CI/CD for automated builds
- Configure app store submissions
