/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0
 * Used for secure OAuth flows without client secrets
 */

/**
 * Generate a cryptographically random string for PKCE
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => charset[v % charset.length]).join('');
}

/**
 * Generate SHA256 hash and encode as base64url
 */
async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  // Convert ArrayBuffer to base64url
  const hashArray = new Uint8Array(hash);
  let binary = '';
  for (let i = 0; i < hashArray.byteLength; i++) {
    binary += String.fromCharCode(hashArray[i]);
  }
  
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate PKCE code verifier and challenge
 */
export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}> {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await sha256(codeVerifier);
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256'
  };
}

/**
 * Build OAuth authorization URL with PKCE parameters
 */
export function buildAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scopes: string[];
  state?: string;
}): string {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  
  authUrl.searchParams.append('client_id', params.clientId);
  authUrl.searchParams.append('redirect_uri', params.redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', params.scopes.join(' '));
  authUrl.searchParams.append('code_challenge', params.codeChallenge);
  authUrl.searchParams.append('code_challenge_method', params.codeChallengeMethod);
  
  if (params.state) {
    authUrl.searchParams.append('state', params.state);
  }
  
  return authUrl.toString();
}

/**
 * Exchange authorization code for tokens using PKCE
 */
export async function exchangeCodeForTokens(params: {
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  const body = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
    code: params.code,
    code_verifier: params.codeVerifier,
  });
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }
  
  return response.json();
}
