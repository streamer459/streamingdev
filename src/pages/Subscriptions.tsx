import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import AuthContext from '../contexts/AuthContext';
import { getUserSubscriptions } from '../services/streamApi';

type UserReference = {
  id: number;
  username: string;
  displayName?: string;
  profilePicture?: string;
  subscribedAt?: string;
};

export default function Subscriptions() {
  const { isDarkMode } = useDarkMode();
  const { user, token } = useContext(AuthContext);
  const [subscriptions, setSubscriptions] = useState<UserReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!token) {
        setLoading(false);
        setError('You must be logged in to view subscriptions');
        return;
      }

      try {
        const data = await getUserSubscriptions(token);
        setSubscriptions(data.subscriptions);
      } catch (error) {
        console.error('Failed to fetch subscriptions:', error);
        let errorMessage = 'Failed to load subscriptions';
        
        if (error instanceof Error) {
          if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'Subscriptions feature is not yet implemented on the server. Please check back later.';
          } else if (error.message.includes('HTML instead of JSON')) {
            errorMessage = 'The subscriptions API endpoint is not available. This feature may not be fully implemented yet.';
          } else {
            errorMessage = error.message;
          }
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [token]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${ 
        isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${ 
        isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to view your subscriptions.</p>
          <Link 
            to="/login" 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            My Subscriptions
          </h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage your channel subscriptions
          </p>
        </div>

        {error ? (
          <div className={`p-6 rounded-lg shadow-md ${
            isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'
          }`}>
            <div className="text-center">
              <svg className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Error Loading Subscriptions
              </h3>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {error}
              </p>
            </div>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className={`p-6 rounded-lg shadow-md ${
            isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'
          }`}>
            <div className="text-center">
              <svg className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                No Subscriptions Yet
              </h3>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                You haven't subscribed to any channels yet. Explore streamers and subscribe to support them!
              </p>
              <Link 
                to="/home" 
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Explore Streams
              </Link>
            </div>
          </div>
        ) : (
          <div className={`rounded-lg shadow-md ${
            isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Your Subscriptions ({subscriptions.length})
              </h2>
              
              <div className="space-y-4">
                {subscriptions.map((subscription) => (
                  <div 
                    key={subscription.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-semibold ${
                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {subscription.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link 
                          to={`/u/${subscription.username}`}
                          className={`text-lg font-medium hover:underline ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {subscription.displayName || subscription.username}
                        </Link>
                        {subscription.username !== subscription.displayName && (
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            @{subscription.username}
                          </p>
                        )}
                        {subscription.subscribedAt && (
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Subscribed {new Date(subscription.subscribedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Link
                        to={`/${subscription.username}`}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isDarkMode 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        Watch
                      </Link>
                      
                      <button
                        onClick={() => {
                          // TODO: Implement unsubscribe functionality
                          alert('Unsubscribe functionality will be implemented soon!');
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          isDarkMode 
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-800' 
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Unsubscribe
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}