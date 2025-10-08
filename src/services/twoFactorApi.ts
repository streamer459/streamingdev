const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://lb-01.distorted.live/api';

export interface TwoFactorStatus {
  enabled: boolean;
}

export interface TwoFactorSetup {
  qrCodeUrl: string;
  manualEntryKey: string;
}

export interface TwoFactorVerifySetup {
  success: boolean;
  backupCodes: string[];
}

export interface TwoFactorVerify {
  success: boolean;
  token?: string;
  backupCodeUsed?: boolean;
}

export interface BackupCodesResponse {
  backupCodes: string[];
}

// Get 2FA status for current user
export async function getTwoFactorStatus(token: string): Promise<TwoFactorStatus> {
  console.log('🔒 Getting 2FA status, token length:', token?.length);
  const response = await fetch(`${API_BASE_URL}/auth/2fa/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.log('❌ 2FA API error:', response.status, response.statusText);
    
    // Handle invalid token specifically
    if (response.status === 403) {
      console.log('🚨 2FA TOKEN EXPIRED - Analyzing token details:');
      const token = localStorage.getItem('authToken');
      const tokenType = localStorage.getItem('authTokenType');
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('📊 2FA Token details:');
          console.log('  - Token type stored:', tokenType);
          console.log('  - Token issued at (iat):', payload.iat ? new Date(payload.iat * 1000) : 'N/A');
          console.log('  - Token expires at (exp):', payload.exp ? new Date(payload.exp * 1000) : 'N/A');
          console.log('  - Current time:', new Date());
          if (payload.exp) {
            const timeLeft = new Date(payload.exp * 1000).getTime() - new Date().getTime();
            if (timeLeft > 0) {
              const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
              const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
              const timeDisplay = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
              console.log('  - Time until expiry:', timeDisplay);
            } else {
              console.log('  - Time until expiry: EXPIRED');
            }
          }
        } catch (e) {
          console.log('❌ Failed to decode 2FA token for analysis');
        }
      }
      
      // Clear the invalid token from storage
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      throw new Error('Your session has expired. Please log in again.');
    }
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded (429). Please wait before trying again.');
    }
    throw new Error(`Failed to get 2FA status: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Start 2FA setup - generate secret and QR code
export async function setupTwoFactor(token: string): Promise<TwoFactorSetup> {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/setup`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 500) {
      throw new Error('Server error while setting up 2FA. Please try again later or contact support.');
    }
    throw new Error(`Failed to setup 2FA: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Verify setup code and enable 2FA
export async function verifyTwoFactorSetup(token: string, code: string): Promise<TwoFactorVerifySetup> {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/verify-setup`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error(`Failed to verify 2FA setup: ${response.statusText}`);
  }

  return response.json();
}

// Verify 2FA code during login
export async function verifyTwoFactor(userId: string, code: string): Promise<TwoFactorVerify> {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, code }),
  });

  if (!response.ok) {
    throw new Error(`Failed to verify 2FA: ${response.statusText}`);
  }

  return response.json();
}

// Disable 2FA
export async function disableTwoFactor(token: string, password: string, code: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/disable`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password, code }),
  });

  if (!response.ok) {
    throw new Error(`Failed to disable 2FA: ${response.statusText}`);
  }
}

// Get new backup codes
export async function generateBackupCodes(token: string): Promise<BackupCodesResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/backup-codes`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to generate backup codes: ${response.statusText}`);
  }

  return response.json();
}