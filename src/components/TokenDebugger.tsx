import { useContext, useState } from 'react';
import AuthContext from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';

interface TokenInfo {
  exp?: number;
  iat?: number;
  sub?: string;
  tokenType?: string;
  expiresAt?: string;
  issuedAt?: string;
  timeUntilExpiry?: string;
  isExpired?: boolean;
}

export default function TokenDebugger() {
  const { token, user } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();
  const [showDebug, setShowDebug] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  const analyzeToken = () => {
    if (!token) {
      setTokenInfo({ timeUntilExpiry: 'No token found' });
      return;
    }

    try {
      // Decode JWT payload
      const parts = token.split('.');
      if (parts.length !== 3) {
        setTokenInfo({ timeUntilExpiry: 'Invalid JWT format' });
        return;
      }

      const payload = JSON.parse(atob(parts[1]));
      const tokenType = localStorage.getItem('authTokenType') || 'unknown';
      
      const info: TokenInfo = {
        exp: payload.exp,
        iat: payload.iat,
        sub: payload.sub || payload.id || payload.userId,
        tokenType,
      };

      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        const now = new Date();
        const timeLeft = expDate.getTime() - now.getTime();
        
        info.expiresAt = expDate.toLocaleString();
        info.isExpired = timeLeft <= 0;
        
        if (timeLeft <= 0) {
          info.timeUntilExpiry = 'EXPIRED';
        } else {
          const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          
          if (days > 0) {
            info.timeUntilExpiry = `${days}d ${hours}h ${minutes}m`;
          } else {
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            info.timeUntilExpiry = `${hours}h ${minutes}m ${seconds}s`;
          }
        }
      }

      if (payload.iat) {
        const iatDate = new Date(payload.iat * 1000);
        info.issuedAt = iatDate.toLocaleString();
      }

      setTokenInfo(info);
    } catch (e) {
      setTokenInfo({ timeUntilExpiry: 'Failed to decode token' });
    }
  };

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 left-4">
        <button
          onClick={() => {
            setShowDebug(true);
            analyzeToken();
          }}
          className={`px-3 py-1 text-xs rounded-md opacity-50 hover:opacity-100 transition-opacity ${
            isDarkMode 
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Debug Token
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className={`p-4 rounded-lg shadow-lg border max-w-md ${
        isDarkMode 
          ? 'bg-gray-900 border-gray-700 text-white' 
          : 'bg-white border-gray-200 text-gray-900'
      }`}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">Token Debug Info</h3>
          <button
            onClick={() => setShowDebug(false)}
            className={`text-xs px-2 py-1 rounded ${
              isDarkMode 
                ? 'hover:bg-gray-800 text-gray-400' 
                : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            ✕
          </button>
        </div>
        
        {user && (
          <div className="text-xs mb-2">
            <strong>User:</strong> {user.username}
          </div>
        )}

        {tokenInfo && (
          <div className="text-xs space-y-1">
            {tokenInfo.tokenType && (
              <div>
                <strong>Type:</strong> <span className={
                  tokenInfo.tokenType === 'long-lived' 
                    ? 'text-green-500' 
                    : tokenInfo.tokenType === 'remember-me' 
                      ? 'text-blue-500' 
                      : 'text-orange-500'
                }>{tokenInfo.tokenType}</span>
                {tokenInfo.tokenType === 'long-lived' && <span className="text-xs text-green-400 ml-1">(1yr)</span>}
                {tokenInfo.tokenType === 'remember-me' && <span className="text-xs text-blue-400 ml-1">(30d)</span>}
                {tokenInfo.tokenType === 'standard' && <span className="text-xs text-orange-400 ml-1">(24h)</span>}
              </div>
            )}
            {tokenInfo.issuedAt && (
              <div><strong>Issued:</strong> {tokenInfo.issuedAt}</div>
            )}
            {tokenInfo.expiresAt && (
              <div><strong>Expires:</strong> {tokenInfo.expiresAt}</div>
            )}
            {tokenInfo.timeUntilExpiry && (
              <div>
                <strong>Time Left:</strong> 
                <span className={tokenInfo.isExpired ? 'text-red-500' : 'text-green-500'}>
                  {tokenInfo.timeUntilExpiry}
                </span>
              </div>
            )}
            {tokenInfo.sub && (
              <div><strong>Subject:</strong> {tokenInfo.sub}</div>
            )}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={analyzeToken}
            className={`text-xs px-2 py-1 rounded ${
              isDarkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Refresh
          </button>
          <button
            onClick={() => {
              console.log('Raw token:', token);
              console.log('Token info:', tokenInfo);
              console.log('LocalStorage authTokenType:', localStorage.getItem('authTokenType'));
              console.log('LocalStorage authToken length:', localStorage.getItem('authToken')?.length);
            }}
            className={`text-xs px-2 py-1 rounded ${
              isDarkMode 
                ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            Log to Console
          </button>
        </div>
      </div>
    </div>
  );
}