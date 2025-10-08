import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import AuthContext from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';

export default function TwoFactor() {
  const { completeTwoFactorLogin, pending2FAUserId, requires2FA } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not in 2FA flow
  useEffect(() => {
    if (!requires2FA || !pending2FAUserId) {
      navigate('/login');
    }
  }, [requires2FA, pending2FAUserId, navigate]);

  const handleVerify = async () => {
    if (!code || code.length !== 6 || !pending2FAUserId) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await completeTwoFactorLogin(pending2FAUserId, code);
    } catch (err) {
      setError(err instanceof Error ? err.message : '2FA verification failed');
      setCode(''); // Clear the code on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render if not in 2FA flow
  if (!requires2FA || !pending2FAUserId) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center min-h-screen ${
      isDarkMode ? 'bg-black' : 'bg-gray-50'
    }`}>
      <div className={`w-full max-w-md p-8 rounded-xl shadow-md text-center ${
        isDarkMode
          ? 'bg-gray-900 border border-gray-800'
          : 'bg-white'
      }`}>
        <div className="mb-6">
          <svg className={`mx-auto h-12 w-12 mb-4 ${
            isDarkMode ? 'text-blue-400' : 'text-blue-600'
          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className={`text-2xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Two-Factor Authentication
          </h2>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Enter the 6-digit code from your authenticator app to complete login.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm rounded-md text-red-700 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className={`block text-sm font-medium mb-3 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Authentication Code
          </label>
          <div className="flex justify-center gap-2">
            {[...Array(6)].map((_, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={code[index] || ''}
                onChange={(e) => {
                  const newCode = code.split('');
                  newCode[index] = e.target.value;
                  const updatedCode = newCode.join('');
                  setCode(updatedCode);
                  
                  // Auto-focus next input
                  if (e.target.value && index < 5) {
                    const nextInput = document.querySelector(`input[data-2fa-index="${index + 1}"]`) as HTMLInputElement;
                    if (nextInput) nextInput.focus();
                  }
                }}
                onKeyDown={(e) => {
                  // Handle backspace
                  if (e.key === 'Backspace' && !code[index] && index > 0) {
                    const prevInput = document.querySelector(`input[data-2fa-index="${index - 1}"]`) as HTMLInputElement;
                    if (prevInput) prevInput.focus();
                  }
                }}
                data-2fa-index={index}
                className={`w-12 h-12 text-center text-lg font-mono border rounded-md ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              />
            ))}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleVerify}
          disabled={isSubmitting || code.length !== 6}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting ? 'Verifying…' : 'Verify Code'}
        </Button>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className={`text-sm transition-colors ${
              isDarkMode
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ← Back to Login
          </button>
        </div>

        <div className={`mt-6 p-3 rounded-lg text-xs ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700 text-gray-400'
            : 'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          <p className="font-medium mb-1">Having trouble?</p>
          <p>Check your authenticator app for the current 6-digit code. Each code is valid for 30 seconds.</p>
        </div>
      </div>
    </div>
  );
}
