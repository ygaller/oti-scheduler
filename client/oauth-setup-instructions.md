# Google OAuth Setup Instructions

## Create a New OAuth 2.0 Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client IDs**
5. Choose **Web application**
6. Give it a name (e.g., "Scheduling App Dev")

## Configure Origins and Redirect URIs

### Authorized JavaScript origins:
Add exactly these (copy-paste to avoid typos):
```
http://localhost:3000
https://localhost:3000
http://localhost:3001
https://localhost:3001
```

### Authorized redirect URIs:
Add these:
```
http://localhost:3000/auth/callback
http://localhost:3000/oauth-callback.html
http://localhost:3000/auth-callback.html
```

## Save and Test

1. Click **CREATE**
2. Copy the new Client ID
3. Update your `.env` file:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=your_new_client_id_here
   ```
4. Restart your development server: `npm start`

## Current Client ID for Reference
Your current client ID: `483131887736-eie526kjmk2ba233828adfj4vtc35s6n.apps.googleusercontent.com`

## Test URLs
- Main app: http://localhost:3000
- Test page: http://localhost:3000/google-test.html
