import { useForm } from 'react-hook-form';
import { useState, useEffect, useContext } from 'react';
import Input from '../../components/Input';
import Button from '../../components/Button';
import TwoFactorManager from '../../components/TwoFactorManager';
import { useDarkMode } from '../../contexts/DarkModeContext';
import AuthContext from '../../contexts/AuthContext';
import { getStreamKey, regenerateStreamKey, changePassword } from '../../services/streamApi';

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

type SecurityTab = 'stream' | '2fa' | 'password';

interface StreamKeyData {
  streamKey: string;
  rtmpUrl: string;
  playbackUrl: string;
  title: string;
  status: 'live' | 'offline' | 'online'; // Support both 'live' and 'online' for backend compatibility
  createdAt: string;
}

export default function Security() {
  const { isDarkMode } = useDarkMode();
  const { token } = useContext(AuthContext);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    mode: 'onBlur',
  });
  
  const [activeTab, setActiveTab] = useState<SecurityTab>('stream');
  const [streamData, setStreamData] = useState<StreamKeyData | null>(null);
  const [streamLoading, setStreamLoading] = useState(true);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState<{ show: boolean; target?: string }>({ show: false });

  useEffect(() => {
    const fetchStreamData = async () => {
      if (!token) {
        console.log('❌ No token available for stream key fetch');
        return;
      }
      
      console.log('🚀 Security page fetching stream data, token available:', !!token);
      console.log('🚀 Token preview (first 20 chars):', token?.substring(0, 20));
      
      try {
        const data = await getStreamKey(token);
        console.log('Stream settings loaded successfully');
        setStreamData(data);
      } catch (error: any) {
        console.error('Failed to fetch stream data:', error);
        
        // If session expired, show a helpful message
        if (error.message?.includes('session has expired')) {
          setPasswordMessage({ 
            type: 'error', 
            text: 'Your session has expired. Please refresh the page and log in again.' 
          });
        }
      } finally {
        setStreamLoading(false);
      }
    };

    // Initial fetch
    fetchStreamData();

    // Poll every 30 seconds to keep status current
    const pollInterval = setInterval(() => {
      if (token) {
        fetchStreamData();
      }
    }, 90000); // Reduced from 30s to 90s to avoid rate limiting

    return () => clearInterval(pollInterval);
  }, [token]);

  const handleRefreshStatus = async () => {
    if (!token || refreshing) return;
    
    setRefreshing(true);
    try {
      const data = await getStreamKey(token);
      console.log('Stream settings refreshed successfully');
      setStreamData(data);
    } catch (error) {
      console.error('Failed to refresh stream data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!token) return;
    
    setRegenerating(true);
    try {
      const newData = await regenerateStreamKey(token);
      setStreamData({
        streamKey: newData.streamKey,
        rtmpUrl: newData.rtmpUrl,
        playbackUrl: newData.playbackUrl,
        title: newData.title,
        status: newData.status,
        createdAt: new Date().toISOString(),
      });
      setShowRegenerateConfirm(false);
      alert('Stream key regenerated successfully!');
    } catch (error) {
      console.error('Failed to regenerate stream key:', error);
      alert('Failed to regenerate stream key. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = async (text: string, target: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      // Show toast notification above the specific button
      setShowCopiedToast({ show: true, target });
      setTimeout(() => setShowCopiedToast({ show: false }), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Keep alert for errors since user needs to know it failed
      alert('Failed to copy to clipboard');
    }
  };

  const onSubmit = async (data: PasswordForm) => {
    if (!token) {
      setPasswordMessage({ type: 'error', text: 'Not authenticated' });
      return;
    }

    // Validate password confirmation
    if (data.newPassword !== data.confirmNewPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    // Clear previous messages
    setPasswordMessage(null);

    try {
      await changePassword(token, data.currentPassword, data.newPassword);
      setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
      
      // Reset form
      const form = document.querySelector('form') as HTMLFormElement;
      form?.reset();
      
    } catch (err) {
      console.error('Password change failed:', err);
      setPasswordMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Failed to change password' 
      });
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h2 className={`text-2xl font-bold mb-6 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Security Settings
        </h2>
        
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className={`flex space-x-1 rounded-lg p-1 shadow-sm border ${
            isDarkMode 
              ? 'bg-gray-900 border-gray-800' 
              : 'bg-white border-gray-200'
          }`}>
            <button
              onClick={() => setActiveTab('stream')}
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'stream'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : `${isDarkMode 
                      ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
              }`}
            >
              Stream Settings
            </button>
            <button
              onClick={() => setActiveTab('2fa')}
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === '2fa'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : `${isDarkMode 
                      ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
              }`}
            >
              2FA
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'password'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : `${isDarkMode 
                      ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
              }`}
            >
              Password
            </button>
          </div>
        </div>
        
        {/* Stream Settings Tab */}
        {activeTab === 'stream' && (
          <div className={`p-6 rounded-lg shadow-md ${
            isDarkMode 
              ? 'bg-gray-900 border border-gray-800' 
              : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Stream Settings
            </h3>
            
            {streamLoading ? (
              <div className={`text-center py-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Loading stream settings...
              </div>
            ) : streamData ? (
              <div className="space-y-4">
                {/* Stream Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Status:
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      streamData.status === 'live' || streamData.status === 'online'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-1 ${
                        streamData.status === 'live' || streamData.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                      }`} />
                      {streamData.status === 'live' || streamData.status === 'online' ? 'Live' : 'Offline'}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleRefreshStatus}
                    disabled={refreshing}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                      isDarkMode
                        ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                    } ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Refresh stream status"
                  >
                    <svg className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                {/* Stream Key */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Stream Key
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={showStreamKey ? streamData.streamKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                        readOnly
                        className={`flex-1 px-3 py-2 border rounded-md font-mono text-sm ${
                          isDarkMode
                            ? 'bg-gray-800 border-gray-600 text-gray-300'
                            : 'bg-gray-50 border-gray-300 text-gray-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowStreamKey(!showStreamKey)}
                        title={showStreamKey ? 'Hide stream key' : 'Reveal stream key'}
                        className={`px-2 py-2 border rounded-md transition-colors ${
                          isDarkMode
                            ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                            : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {showStreamKey ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(streamData.streamKey, 'streamkey')}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md text-xs font-medium transition-colors hover:bg-blue-700 whitespace-nowrap"
                        >
                          Copy
                        </button>
                        {/* Toast for stream key copy */}
                        {showCopiedToast.show && showCopiedToast.target === 'streamkey' && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                            <div className={`px-3 py-1 rounded-md shadow-lg text-xs font-medium flex items-center gap-1 animate-fade-in-out ${
                              isDarkMode 
                                ? 'bg-green-900 border border-green-800 text-green-200' 
                                : 'bg-green-100 border border-green-200 text-green-800'
                            }`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copied!
                              {/* Arrow pointing down */}
                              <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                                isDarkMode ? 'border-t-green-900' : 'border-t-green-100'
                              }`}></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {showStreamKey && (
                      <div className={`text-xs p-2 rounded ${
                        isDarkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-50 text-yellow-800'
                      }`}>
                        ⚠️ Keep your stream key private. Anyone with this key can stream to your channel.
                      </div>
                    )}
                  </div>
                </div>

                {/* RTMP URL */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    RTMP Server URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value="rtmp://lb-01.distorted.live:1935/live/"
                      readOnly
                      className={`flex-1 px-3 py-2 border rounded-md font-mono text-sm ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-600 text-gray-300'
                          : 'bg-gray-50 border-gray-300 text-gray-900'
                      }`}
                    />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => copyToClipboard('rtmp://lb-01.distorted.live:1935/live/', 'rtmpurl')}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md text-xs font-medium transition-colors hover:bg-blue-700 whitespace-nowrap"
                      >
                        Copy
                      </button>
                      {/* Toast for RTMP URL copy */}
                      {showCopiedToast.show && showCopiedToast.target === 'rtmpurl' && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                          <div className={`px-3 py-1 rounded-md shadow-lg text-xs font-medium flex items-center gap-1 animate-fade-in-out ${
                            isDarkMode 
                              ? 'bg-green-900 border border-green-800 text-green-200' 
                              : 'bg-green-100 border border-green-200 text-green-800'
                          }`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                            {/* Arrow pointing down */}
                            <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                              isDarkMode ? 'border-t-green-900' : 'border-t-green-100'
                            }`}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Regenerate Key Button */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    onClick={() => setShowRegenerateConfirm(true)}
                    disabled={regenerating}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {regenerating ? 'Regenerating...' : 'Regenerate Stream Key'}
                  </Button>
                  <p className={`text-xs mt-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Warning: Regenerating will invalidate your current stream key. You'll need to update OBS with the new key.
                  </p>
                </div>

                {/* OBS Instructions */}
                <div className={`mt-4 p-4 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-800 border border-gray-700' 
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <h4 className={`text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-800'
                  }`}>
                    OBS Studio Setup Instructions
                  </h4>
                  <ol className={`text-xs space-y-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-blue-700'
                  }`}>
                    <li>1. Open OBS Studio and go to Settings → Stream</li>
                    <li>2. Set Service to "Custom..."</li>
                    <li>3. Copy the RTMP Server URL above into the "Server" field</li>
                    <li>4. Reveal and copy the Stream Key above into the "Stream Key" field</li>
                    <li>5. Click OK to save and start streaming!</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className={`text-center py-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Failed to load stream settings. Please refresh the page.
              </div>
            )}
          </div>
        )}

        {/* 2FA Tab */}
        {activeTab === '2fa' && (
          <TwoFactorManager />
        )}
        
        {/* Password Tab */}
        {activeTab === 'password' && (
          <form 
            onSubmit={handleSubmit(onSubmit)} 
            className={`p-6 rounded-lg shadow-md ${
              isDarkMode 
                ? 'bg-gray-900 border border-gray-800' 
                : 'bg-white'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Change Password
            </h3>
            
            {passwordMessage && (
              <div className={`mb-4 p-3 text-sm rounded-md ${
                passwordMessage.type === 'success'
                  ? 'text-green-700 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                  : 'text-red-700 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
              }`}>
                {passwordMessage.text}
              </div>
            )}
            
            <Input
              label="Current Password"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword', { required: 'Current password is required' })}
            />
            {errors.currentPassword && (
              <p className="text-sm text-red-500 mb-2">{errors.currentPassword.message}</p>
            )}

            <Input
              label="New Password"
              type="password"
              autoComplete="new-password"
              {...register('newPassword', {
                required: 'New password is required',
                minLength: { value: 8, message: 'Password must be ≥8 chars' },
              })}
            />
            {errors.newPassword && (
              <p className="text-sm text-red-500 mb-2">{errors.newPassword.message}</p>
            )}

            <Input
              label="Confirm New Password"
              type="password"
              autoComplete="new-password"
              {...register('confirmNewPassword', {
                required: 'Please confirm your new password',
                validate: (val, formValues) =>
                  val === formValues.newPassword || 'Passwords do not match',
              })}
            />
            {errors.confirmNewPassword && (
              <p className="text-sm text-red-500 mb-2">{errors.confirmNewPassword.message}</p>
            )}

            <div className={`mb-6 p-4 rounded-lg ${
              isDarkMode 
                ? 'bg-gray-800 border border-gray-700' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 flex items-center ${
                isDarkMode ? 'text-blue-400' : 'text-blue-800'
              }`}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Security Tips
              </h3>
              <ul className={`text-xs space-y-1 ${
                isDarkMode ? 'text-gray-300' : 'text-blue-700'
              }`}>
                <li>• Use a strong password with at least 8 characters</li>
                <li>• Include uppercase, lowercase, and numbers</li>
                <li>• Don't reuse passwords from other sites</li>
                <li>• Keep your account secure with strong authentication</li>
              </ul>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        )}

        {/* Regenerate Confirmation Modal */}
        {showRegenerateConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg max-w-md w-full mx-4 ${
              isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Regenerate Stream Key?
              </h3>
              <p className={`text-sm mb-6 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                This will create a new stream key and invalidate the current one. Any streaming software using the old key will need to be updated.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  onClick={() => setShowRegenerateConfirm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleRegenerateKey}
                  disabled={regenerating}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {regenerating ? 'Regenerating...' : 'Regenerate'}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}