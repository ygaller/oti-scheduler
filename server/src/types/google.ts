// Google authentication and API types

export interface GoogleTokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: 'Bearer';
  scope: string;
  id_token?: string;
}

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

export interface GoogleSheetsExportRequest {
  scheduleData: {
    sessions: any[];
    employees: any[];
    rooms: any[];
    patients: any[];
    activities: any[];
  };
  scheduleName: string;
  exportType: 'all' | 'employee' | 'room' | 'patient';
  patientId?: string; // Required if exportType is 'patient'
}

export interface GoogleSheetsExportResponse {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  error?: string;
  message?: string;
}
