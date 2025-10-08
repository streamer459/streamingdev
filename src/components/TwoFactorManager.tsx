import { useState, useEffect, useContext } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { useDarkMode } from '../contexts/DarkModeContext';
import AuthContext from '../contexts/AuthContext';
import Button from './Button';
import Input from './Input';
import { 
  getTwoFactorStatus, 
  setupTwoFactor, 
  verifyTwoFactorSetup, 
  disableTwoFactor, 
  generateBackupCodes 
} from '../services/twoFactorApi';

type TwoFactorState = 'loading' | 'disabled' | 'enabled' | 'setting-up' | 'verifying-setup' | 'showing-backup-codes' | 'disabling';

// QR Code wrapper with simplified TOTP URL
function QRCodeWrapper({ qrCodeUrl, manualKey, userEmail }: { qrCodeUrl: string, manualKey: string, userEmail?: string }) {
  try {
    // Create a simplified TOTP URL if the original is too complex
    let urlToUse = qrCodeUrl;
    
    if (qrCodeUrl.length > 200 || !qrCodeUrl) {
      // Create a simplified TOTP URL using just the essential parts
      const accountName = userEmail || 'user';
      const issuer = 'Distorted';
      urlToUse = `otpauth://totp/${issuer}:${accountName}?secret=${manualKey}&issuer=${issuer}`;
    }
    
    return (
      <QRCode 
        value={urlToUse} 
        size={200}
        level="L"
        includeMargin={true}
        style={{
          imageRendering: "pixelated"
        }}
      />
    );
  } catch (error) {
    console.error('QR Code error:', error);
    return (
      <div className="w-48 h-48 flex items-center justify-center bg-gray-100 text-gray-600 text-sm text-center p-4">
        QR code error.<br/>
        Please use the manual entry key below.
      </div>
    );
  }
}

export default function TwoFactorManager() {
  const { isDarkMode } = useDarkMode();
  const { token, user } = useContext(AuthContext);
  
  const [state, setState] = useState<TwoFactorState>('loading');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [manualEntryKey, setManualEntryKey] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState<string>('');
  const [disableCode, setDisableCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hasCheckedOnMount, setHasCheckedOnMount] = useState(false);

  // Check 2FA status on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!token) return;
      
      try {
        const status = await getTwoFactorStatus(token);
        setState(status.enabled ? 'enabled' : 'disabled');
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error('Failed to check 2FA status:', err);
        
        // Handle specific error types
        if (err instanceof Error) {
          if (err.message.includes('429')) {
            setError('Too many requests. Please wait a moment and refresh the page.');
          } else if (err.message.includes('401')) {
            setError('Authentication required. Please log in again.');
          } else {
            setError('Failed to load 2FA status. Please refresh the page.');
          }
        } else {
          setError('Failed to load 2FA status. Please refresh the page.');
        }
        
        setState('disabled'); // Default to disabled state on error
      }
    };

    // Only check once when component first mounts with a valid token
    if (token && state === 'loading' && !hasCheckedOnMount) {
      setHasCheckedOnMount(true);
      checkStatus();
    }
  }, [token, state, hasCheckedOnMount]);

  const handleStartSetup = async () => {
    if (!token) return;
    
    setLoading(true);
    setError('');
    
    try {
      const setup = await setupTwoFactor(token);
      setQrCodeUrl(setup.qrCodeUrl);
      setManualEntryKey(setup.manualEntryKey);
      setState('setting-up');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    if (!token || !verificationCode) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await verifyTwoFactorSetup(token, verificationCode);
      if (result.success) {
        setBackupCodes(result.backupCodes);
        setState('showing-backup-codes');
        setSuccess('2FA has been enabled successfully!');
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSetup = () => {
    setState('enabled');
    setVerificationCode('');
    setQrCodeUrl('');
    setManualEntryKey('');
    setBackupCodes([]);
  };

  const handleStartDisable = () => {
    setState('disabling');
    setDisablePassword('');
    setDisableCode('');
    setError('');
  };

  const handleDisable = async () => {
    if (!token || !disablePassword || !disableCode) return;
    
    setLoading(true);
    setError('');
    
    try {
      await disableTwoFactor(token, disablePassword, disableCode);
      setState('disabled');
      setSuccess('2FA has been disabled successfully');
      setDisablePassword('');
      setDisableCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewBackupCodes = async () => {
    if (!token) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await generateBackupCodes(token);
      setBackupCodes(result.backupCodes);
      setState('showing-backup-codes');
      setSuccess('New backup codes generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate backup codes');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const content = `Distorted 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\\n')}\n\nEach code can only be used once. Store these codes in a safe place.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'distorted-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (state === 'loading') {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
        <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Loading 2FA status...
        </p>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg shadow-md mb-8 ${
      isDarkMode 
        ? 'bg-gray-900 border border-gray-800' 
        : 'bg-white'
    }`}>
      <h3 className={`text-lg font-semibold mb-4 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        Two-Factor Authentication
      </h3>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 text-sm rounded-md text-green-700 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 text-sm rounded-md text-red-700 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            {error.includes('429') && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setState('loading');
                  setHasCheckedOnMount(false);
                }}
                className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status Display */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            state === 'enabled'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              state === 'enabled' ? 'bg-green-500' : 'bg-gray-500'
            }`} />
            {state === 'enabled' ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {state === 'enabled' && (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleGenerateNewBackupCodes}
              disabled={loading}
              className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              New Backup Codes
            </Button>
            <Button
              type="button"
              onClick={handleStartDisable}
              disabled={loading}
              className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Disable 2FA
            </Button>
          </div>
        )}
      </div>

      {/* 2FA Enabled Benefits */}
      {state === 'enabled' && (
        <div className={`mb-4 p-3 rounded-lg border ${ 
          isDarkMode
            ? 'bg-green-900/20 border-green-800 text-green-300'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <div className="flex items-center mb-1">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Enhanced Security Active</span>
          </div>
          <p className="text-xs">
            Your account now has permanent login sessions and enhanced security protection.
          </p>
        </div>
      )}

      {/* Different states */}
      {state === 'disabled' && (
        <div>
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Two-factor authentication adds an extra layer of security to your account. 
            Use an authenticator app like Google Authenticator or Authy to generate codes.
          </p>
          
          <div className={`mb-4 p-3 rounded-lg border ${ 
            isDarkMode
              ? 'bg-blue-900/20 border-blue-800 text-blue-300'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center mb-1">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Enhanced Security Benefit</span>
            </div>
            <p className="text-xs">
              Users with 2FA enabled get 1-year authentication tokens and never need to log in again.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleStartSetup}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Setting up...' : 'Enable 2FA'}
          </Button>
        </div>
      )}

      {state === 'setting-up' && (
        <div>
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Scan this QR code with your authenticator app, then enter a code to verify setup.
          </p>
          
          {/* QR Code */}
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-white rounded-lg">
              <QRCodeWrapper 
                qrCodeUrl={qrCodeUrl}
                manualKey={manualEntryKey}
                userEmail={user?.email}
              />
            </div>
          </div>

          {/* Manual Entry Key */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Manual Entry Key (if you can't scan the QR code):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualEntryKey}
                readOnly
                className={`flex-1 px-3 py-2 border rounded-md font-mono text-sm ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-600 text-gray-300'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(manualEntryKey)}
                className="px-3 py-2 bg-blue-600 text-white rounded-md text-xs font-medium transition-colors hover:bg-blue-700 whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Verification Code Input */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Enter the 6-digit code from your authenticator app:
            </label>
            <div className="flex justify-center gap-2">
              {[...Array(6)].map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  value={verificationCode[index] || ''}
                  onChange={(e) => {
                    const newCode = verificationCode.split('');
                    newCode[index] = e.target.value;
                    const updatedCode = newCode.join('');
                    setVerificationCode(updatedCode);
                    
                    // Auto-focus next input
                    if (e.target.value && index < 5) {
                      const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                      if (nextInput) nextInput.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    // Handle backspace
                    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
                      const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
                      if (prevInput) prevInput.focus();
                    }
                  }}
                  data-index={index}
                  className={`w-12 h-12 text-center text-lg font-mono border rounded-md ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setState('disabled')}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleVerifySetup}
              disabled={loading || verificationCode.length !== 6}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </div>
        </div>
      )}

      {state === 'showing-backup-codes' && (
        <div>
          <div className="mb-4 p-4 rounded-lg border-2 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <h4 className={`text-sm font-medium mb-2 flex items-center ${
              isDarkMode ? 'text-orange-400' : 'text-orange-800'
            }`}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Important: Save Your Backup Codes
            </h4>
            <p className={`text-xs ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
              These codes can be used to access your account if you lose your authenticator device. 
              Each code can only be used once. Store them in a safe place.
            </p>
          </div>

          <div className="mb-4">
            <div className={`grid grid-cols-2 gap-2 p-4 rounded-lg font-mono text-sm ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              {backupCodes.map((code, index) => (
                <div key={index} className="text-center py-1">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={downloadBackupCodes}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Download Codes
            </Button>
            <Button
              type="button"
              onClick={handleFinishSetup}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              I've Saved My Codes
            </Button>
          </div>
        </div>
      )}

      {state === 'disabling' && (
        <div>
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            To disable 2FA, please enter your current password and a 2FA code.
          </p>
          
          <div className="space-y-4 mb-4">
            {/* Hidden username field for accessibility */}
            <input
              type="text"
              name="username"
              value={user?.username || ''}
              autoComplete="username"
              style={{ display: 'none' }}
              readOnly
            />
            <Input
              label="Current Password"
              type="password"
              autoComplete="current-password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                2FA Code:
              </label>
              <div className="flex justify-center gap-2">
                {[...Array(6)].map((_, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    value={disableCode[index] || ''}
                    onChange={(e) => {
                      const newCode = disableCode.split('');
                      newCode[index] = e.target.value;
                      const updatedCode = newCode.join('');
                      setDisableCode(updatedCode);
                      
                      // Auto-focus next input
                      if (e.target.value && index < 5) {
                        const nextInput = document.querySelector(`input[data-disable-index="${index + 1}"]`) as HTMLInputElement;
                        if (nextInput) nextInput.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      // Handle backspace
                      if (e.key === 'Backspace' && !disableCode[index] && index > 0) {
                        const prevInput = document.querySelector(`input[data-disable-index="${index - 1}"]`) as HTMLInputElement;
                        if (prevInput) prevInput.focus();
                      }
                    }}
                    data-disable-index={index}
                    className={`w-12 h-12 text-center text-lg font-mono border rounded-md ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setState('enabled')}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDisable}
              disabled={loading || !disablePassword || disableCode.length !== 6}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </Button>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className={`mt-6 p-4 rounded-lg ${
        isDarkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-blue-50 border border-blue-200'
      }`}>
        <h4 className={`text-sm font-medium mb-2 ${
          isDarkMode ? 'text-blue-400' : 'text-blue-800'
        }`}>
          About Two-Factor Authentication
        </h4>
        <ul className={`text-xs space-y-1 ${
          isDarkMode ? 'text-gray-300' : 'text-blue-700'
        }`}>
          <li>• Download an authenticator app like Google Authenticator or Authy</li>
          <li>• Codes change every 30 seconds for maximum security</li>
          <li>• Save your backup codes in case you lose your device</li>
          <li>• You'll need a code every time you log in</li>
        </ul>
      </div>
    </div>
  );
}