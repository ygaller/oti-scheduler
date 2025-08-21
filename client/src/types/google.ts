// Google authentication and API types for client

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export interface StoredGoogleAuth {
  accessToken: string;
  refreshToken?: string;
  expiryDate: number; // Unix timestamp
  userInfo: GoogleUserInfo;
}

export interface GoogleAuthStatus {
  isAuthenticated: boolean;
  userInfo?: GoogleUserInfo;
  expiryDate?: number;
}

export interface GoogleAuthResponse {
  success: boolean;
  auth?: StoredGoogleAuth;
  error?: string;
  message?: string;
}

export interface GoogleConfigStatus {
  isConfigured: boolean;
  hasCredentials: boolean;
}

export interface GoogleSheetsExportResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  error?: string;
  message?: string;
}
