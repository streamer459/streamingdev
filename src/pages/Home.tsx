import { useContext, useEffect, useState, useMemo } from 'react';
import AuthContext from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useNavigate, Link } from 'react-router-dom';
import { searchUsers } from '../services/streamApi';

type Stream = {
  id: number;
  stream_key: string;
  username: string;
  title: string;
  status: 'offline' | 'live';
  created_at: string;
  rtmpUrl: string;
  playbackUrl: string;
  user_id?: number;
  thumbnail?: string; // Add thumbnail URL
  profilePicture?: string; // Add profile picture URL
};


type HomeTab = 'following' | 'explore';
type SortOption = 'status' | 'recent' | 'title';

export default function Home() {
  const { user, loading, token } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Scroll to top when component mounts (navigation from stream page)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  const [activeTab, setActiveTab] = useState<HomeTab>('following');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('status');
  const [showOffline, setShowOffline] = useState<boolean>(false);
  // Removed category selection since backend doesn't support categories yet

  // Fetch streams from backend API
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        let url = 'http://lb-01.homelab.com/api/streams';
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        console.log('Fetching streams for tab:', activeTab, 'showOffline:', showOffline, 'hasToken:', !!token);
        
        // Use different endpoints based on tab
        if (activeTab === 'explore') {
          // Try using query parameters instead of different endpoints
          if (showOffline) {
            // Try with a query parameter first, fallback to different approaches
            url = 'http://lb-01.homelab.com/api/streams/live?includeOffline=true';
            console.log('Explore tab (with offline) - trying URL with query param:', url);
          } else {
            url = 'http://lb-01.homelab.com/api/streams/live';
            console.log('Explore tab (live only) - URL:', url);
          }
          console.log('Explore tab - headers:', headers);
          // Don't add Authorization header for explore tab
        } else if (activeTab === 'following') {
          if (!token) {
            // Not authenticated, can't show following
            console.log('Following tab but no token, returning empty');
            setStreams([]);
            return;
          }
          // User's following streams - auth required
          headers['Authorization'] = `Bearer ${token}`;
          
          // Apply offline filter to following tab too
          if (showOffline) {
            // Try using the same endpoint pattern that works for explore
            url = 'http://lb-01.homelab.com/api/streams/following?includeOffline=true'; 
            console.log('Following tab (with offline) - trying following-specific URL:', url);
          } else {
            // For live only, try following-specific live endpoint
            url = 'http://lb-01.homelab.com/api/streams/following'; 
            console.log('Following tab (live only) - URL:', url);
          }
          console.log('Following tab - headers:', headers);
        } else {
          // Unknown tab
          console.log('Unknown tab:', activeTab);
          setStreams([]);
          return;
        }
        
        console.log('Making request to:', url, 'with headers:', headers);
        console.log('🔍 REQUEST DEBUG:', { 
          tab: activeTab, 
          showOffline: showOffline, 
          hasToken: !!token,
          url: url 
        });
        let response = await fetch(url, { headers });
        
        // If the request failed, try fallback approaches based on tab
        if (!response.ok) {
          console.log('First attempt failed (', response.status, '), trying fallback approaches...');
          console.log('💡 Note: If you see 404 for /api/streams/following, the backend may need to implement this endpoint');
          
          if (activeTab === 'explore' && showOffline) {
            // Fallback for explore tab
            try {
              console.log('Explore fallback: Trying /api/streams without auth...');
              const fallbackResponse = await fetch('http://lb-01.homelab.com/api/streams', { 
                headers: { 'Content-Type': 'application/json' } 
              });
              if (fallbackResponse.ok) {
                response = fallbackResponse;
                console.log('Explore fallback successful!');
              }
            } catch (fallbackError) {
              console.log('Explore fallback also failed:', fallbackError);
            }
          } else if (activeTab === 'following') {
            // Since the backend wants /api/streams/following, try different variations
            try {
              // Try without the query parameter first
              const fallbackUrl1 = 'http://lb-01.homelab.com/api/streams/following';
              console.log('Following fallback 1: Trying', fallbackUrl1);
              let fallbackResponse = await fetch(fallbackUrl1, { headers });
              
              if (fallbackResponse.ok) {
                response = fallbackResponse;
                console.log('Following fallback 1 successful!');
              } else {
                // Try the old approach as last resort
                const fallbackUrl2 = showOffline 
                  ? 'http://lb-01.homelab.com/api/streams?includeOffline=true'
                  : 'http://lb-01.homelab.com/api/streams';
                console.log('Following fallback 2: Trying', fallbackUrl2);
                fallbackResponse = await fetch(fallbackUrl2, { headers });
                if (fallbackResponse.ok) {
                  response = fallbackResponse;
                  console.log('Following fallback 2 successful!');
                }
              }
            } catch (fallbackError) {
              console.log('All following fallbacks failed:', fallbackError);
            }
          }
        }
        
        if (!response.ok) {
          console.error('API request failed:', response.status, response.statusText);
          // If we're trying to show offline and it's a 401, give a helpful message
          if (activeTab === 'explore' && showOffline && response.status === 401) {
            console.warn('Backend /api/streams endpoint requires authentication but should be public for "Show Offline" feature');
          }
          throw new Error(`Failed to fetch streams: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API response received:', { 
          totalCount: data.totalCount, 
          includeOffline: data.includeOffline, 
          streamsCount: data.streams?.length || 0 
        });
        console.log('API response structure validated');
        console.log('Stream data received from API');
        
        // Extract username from stream_key for each stream
        // Assumes stream_key format is "username_randomnumbers"
        const streams = data.streams || [];
        console.log('Streams count:', streams.length);
        console.log('🔍 RAW STREAM DETAILS:');
        streams.forEach((s: any, i: number) => {
          const extractedUsername = s.username || (s.stream_key ? s.stream_key.split('_')[0] : 'unknown');
          console.log(`  Stream ${i+1}: username="${extractedUsername}", status="${s.status}", has_thumbnail="${!!s.thumbnail}"`);
        });
        
        const streamsWithUsername = streams.map((stream: any) => ({
          ...stream,
          // Handle both old format (stream_key) and new format (username field)
          username: stream.username || (stream.stream_key ? stream.stream_key.split('_')[0] : 'unknown')
        }));
        
        // Remove duplicates based on username (in case API returns duplicates)
        const uniqueStreams = streamsWithUsername.filter((stream: any, index: number, self: any[]) => 
          self.findIndex((s: any) => s.username === stream.username) === index
        );
        
        console.log('Stream processing completed');
        console.log('✅ FINAL STREAMS SHOWN IN UI:');
        uniqueStreams.forEach((s: any, i: number) => {
          console.log(`  Final ${i+1}: username="${s.username}", status="${s.status}"`);
        });
        setStreams(uniqueStreams);
      } catch (error) {
        console.error('Error fetching streams:', error);
        // Fallback to empty array or show error message
        setStreams([]);
      }
    };

    // Fetch immediately
    fetchStreams();

    // Set up polling every 30 seconds to check for live status updates
    const pollInterval = setInterval(fetchStreams, 30000);

    return () => clearInterval(pollInterval);
  }, [loading, activeTab, token, showOffline]);

  // Search users when search query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        console.log('Searching for users:', searchQuery);
        const results = await searchUsers(searchQuery.trim());
        console.log('Search results:', results);
        
        // Convert search results to stream-like format for display
        const convertedResults = results.users.map(user => ({
          id: user.id,
          stream_key: `${user.username}_search`, // Fake stream key for consistency
          username: user.username,
          title: user.displayName || `${user.username}'s Channel`,
          status: user.isLive ? 'live' : 'offline',
          created_at: new Date().toISOString(), // Placeholder
          rtmpUrl: '',
          playbackUrl: '',
        }));
        
        setSearchResults(convertedResults);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search by 500ms
    const searchTimeout = setTimeout(performSearch, 500);
    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  // Filter and sort streams
  const filteredStreams = useMemo(() => {
    // If actively searching (not empty search), use search results instead of regular streams
    const isActivelySearching = searchQuery.trim().length > 0;
    const sourceStreams = isActivelySearching ? searchResults : streams;
    
    console.log('Filtering - isActivelySearching:', isActivelySearching, 'sourceStreams length:', sourceStreams.length);
    console.log('Search query:', `"${searchQuery}"`, 'Search results:', searchResults.length);
    
    const filtered = sourceStreams.filter((_stream: any) => {
      // If we're using search results, don't filter further
      if (isActivelySearching) {
        return true;
      }
      
      // Otherwise, apply regular filtering (this code shouldn't be needed now but keeping for safety) 
      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'status':
          // Sort by status (live first)
          if (a.status === 'live' && b.status === 'offline') return -1;
          if (a.status === 'offline' && b.status === 'live') return 1;
          return 0;
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [streams, searchResults, searchQuery, sortBy]);


  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-black' : 'bg-gray-50'
      }`}>
        <div className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Loading...
        </div>
      </div>
    );
  }

  // Remove the user check - allow public access
  // if (!user) {
  //   return null;
  // }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className={`flex space-x-1 rounded-lg p-1 shadow-sm border ${
            isDarkMode 
              ? 'bg-gray-900 border-gray-800' 
              : 'bg-white border-gray-200'
          }`}>
            <button
              onClick={() => setActiveTab('following')}
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'following'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : `${isDarkMode 
                      ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
              }`}
            >
              Following
            </button>
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'explore'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : `${isDarkMode 
                      ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
              }`}
            >
              Explore
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search streams and streamers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {isSearching ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="status">Live First</option>
              <option value="recent">Recently Created</option>
              <option value="title">Title A-Z</option>
            </select>
            
            <label className={`flex items-center gap-2 px-4 py-2 border rounded-lg shadow-sm cursor-pointer transition-colors ${
              isDarkMode
                ? 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
              <input
                type="checkbox"
                checked={showOffline}
                onChange={(e) => setShowOffline(e.target.checked)}
                className={`w-4 h-4 rounded focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-600 text-blue-600'
                    : 'bg-white border-gray-300 text-blue-600'
                }`}
              />
              <span className="text-sm font-medium">Show Offline</span>
            </label>
          </div>
        </div>

        {/* Content Based on Tab */}
        <div>
          {filteredStreams.length === 0 ? (
            <div className="text-center py-16">
              <div className="mb-4">
                <svg className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {activeTab === 'following' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  )}
                </svg>
              </div>
              
              {activeTab === 'following' ? (
                user ? (
                  // Logged in user - show following message
                  <>
                    <h3 className={`text-lg font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Follow streamers to see their content here
                    </h3>
                    <p className={`mb-6 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      When you follow streamers, their live streams and content will appear in this feed.
                    </p>
                    <button
                      onClick={() => setActiveTab('explore')}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Explore Streams
                    </button>
                  </>
                ) : (
                  // Not logged in - show login prompt
                  <>
                    <h3 className={`text-lg font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Log in to follow your favorite streamers
                    </h3>
                    <p className={`mb-6 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Create an account to follow streamers and get personalized recommendations.
                    </p>
                    <div className="space-x-4">
                      <button
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Log In
                      </button>
                      <button
                        onClick={() => setActiveTab('explore')}
                        className={`inline-flex items-center px-6 py-3 font-medium rounded-lg transition-colors border ${
                          isDarkMode
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Browse Streams
                      </button>
                    </div>
                  </>
                )
              ) : (
                // Explore tab empty state
                <>
                  <h3 className={`text-lg font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    No streams available
                  </h3>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Check back later for live streams, or try adjusting your search.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredStreams.map((stream) => {
                console.log('🎨 RENDERING STREAM CARD:', { username: stream.username, status: stream.status, id: stream.id, tab: activeTab });
                return (
                  <Link
                    to={`/${stream.username}`}
                    key={stream.id}
                    className={`group rounded-lg overflow-hidden shadow-sm border hover:shadow-md transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-gray-900 border-gray-800'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {stream.status === 'live' ? (
                      // Live Stream Card - Thumbnail with profile picture overlay
                      <>
                        <div className="relative">
                          <div className={`w-full h-48 flex items-center justify-center overflow-hidden ${
                            isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                          }`}>
                            {stream.thumbnail ? (
                              <img 
                                src={stream.thumbnail} 
                                alt={`${stream.username} stream thumbnail`}
                                className="w-full h-full object-cover"
                                onLoad={() => {
                                  console.log('✅ Thumbnail loaded successfully:', stream.thumbnail);
                                }}
                                onError={(e) => {
                                  console.error('❌ Thumbnail failed to load:', stream.thumbnail);
                                  // Fallback to placeholder icon if thumbnail fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <svg class="h-16 w-16 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    `;
                                  }
                                }}
                              />
                            ) : (
                              <svg className={`h-16 w-16 ${
                                isDarkMode ? 'text-gray-600' : 'text-gray-400'
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          
                          {/* LIVE Badge */}
                          <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                            LIVE
                          </div>
                          
                          {/* Profile Picture Overlay - Bottom Right */}
                          <div className="absolute bottom-3 right-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden border-2 border-white shadow-lg bg-black text-white">
                              {stream.profilePicture ? (
                                <img 
                                  src={stream.profilePicture} 
                                  alt={`${stream.username} profile`}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                stream.username?.[0]?.toUpperCase() || 'U'
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <h3 className={`font-semibold mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {stream.title}
                          </h3>
                          <p className={`text-sm mb-1 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {stream.username}
                          </p>
                        </div>
                      </>
                    ) : (
                      // Offline Stream Card - Profile picture focused layout
                      <>
                        <div className={`p-6 text-center ${
                          isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                        }`}>
                          {/* Large Profile Picture */}
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-xl font-semibold overflow-hidden border border-gray-600 bg-black text-white">
                            {stream.profilePicture ? (
                              <img 
                                src={stream.profilePicture} 
                                alt={`${stream.username} profile`}
                                className="w-20 h-20 rounded-full object-cover"
                              />
                            ) : (
                              stream.username?.[0]?.toUpperCase() || 'U'
                            )}
                          </div>
                          
                          {/* OFFLINE Badge */}
                          <div className="inline-block bg-gray-600 text-white text-xs px-2 py-1 rounded-full mb-2">
                            OFFLINE
                          </div>
                          
                          {/* Username */}
                          <h3 className={`font-semibold text-lg group-hover:text-blue-600 transition-colors ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {stream.username}
                          </h3>
                          
                          {/* Stream Title - Always reserve space for consistent spacing */}
                          <div className="h-6 mt-2">
                            {stream.title && stream.title !== `${stream.username}'s Stream` && (
                              <p className={`text-sm ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {stream.title}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className={`p-4 border-t ${
                          isDarkMode ? 'border-gray-700' : 'border-gray-200'
                        }`}>
                          <p className={`text-center text-sm ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            Currently offline
                          </p>
                        </div>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}