import { useContext, useEffect, useState, useMemo } from 'react';
import AuthContext from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useNavigate, Link } from 'react-router-dom';
import { searchUsers, getPublicUserProfile } from '../services/streamApi';

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

  // Update default tab based on login status
  useEffect(() => {
    if (!loading) {
      setActiveTab(user ? 'following' : 'explore');
    }
  }, [user, loading]);
  
  const [activeTab, setActiveTab] = useState<HomeTab>(user ? 'following' : 'explore');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('status');
  const [showOffline, setShowOffline] = useState<boolean>(false);
  // Removed category selection since backend doesn't support categories yet

  // Track streams that just went live to poll for their initial thumbnails
  const [newlyLiveStreams, setNewlyLiveStreams] = useState<Set<string>>(new Set());

  // Poll for thumbnails on newly live streams
  useEffect(() => {
    if (newlyLiveStreams.size === 0) return;

    const pollNewThumbnails = async () => {
      const streamsToCheck = Array.from(newlyLiveStreams);
      
      for (const username of streamsToCheck) {
        // Wait 30 seconds after stream goes live (mirror thumbnail generator timing)
        setTimeout(async () => {
          const thumbnailUrl = `https://lb-01.distorted.live/stream/${username}/thumbnail.jpg?t=${Date.now()}`;
          
          try {
            const response = await fetch(thumbnailUrl, { method: 'HEAD' });
            if (response.ok) {
              // Thumbnail exists, update the stream
              setStreams(prevStreams => {
                return prevStreams.map(stream => {
                  if (stream.username === username && stream.status === 'live') {
                    return { ...stream, thumbnail: thumbnailUrl };
                  }
                  return stream;
                });
              });
              
              // Remove from newly live tracking
              setNewlyLiveStreams(prev => {
                const newSet = new Set(prev);
                newSet.delete(username);
                return newSet;
              });
            }
          } catch (error) {
            // Thumbnail not ready yet, will try again on next polling cycle
          }
        }, 30000);
      }
    };

    pollNewThumbnails();
  }, [newlyLiveStreams])

  // Fetch streams from backend API
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        let url = 'https://lb-01.distorted.live/api/streams';
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        
        // Use different endpoints based on tab
        if (activeTab === 'explore') {
          // Try using query parameters instead of different endpoints
          if (showOffline) {
            // Try with a query parameter first, fallback to different approaches
            url = `${import.meta.env.VITE_API_BASE_URL}/streams/live?includeOffline=true`;
          } else {
            url = `${import.meta.env.VITE_API_BASE_URL}/streams/live`;
          }
          // For offline streams, we might need auth - try adding token if available
          if (showOffline && token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        } else if (activeTab === 'following') {
          if (!token) {
            // Not authenticated, can't show following
            setStreams([]);
            return;
          }
          // User's following streams - auth required
          headers['Authorization'] = `Bearer ${token}`;
          
          // Always include offline streams in following tab
          url = `${import.meta.env.VITE_API_BASE_URL}/streams/following?includeOffline=true`;
        } else {
          // Unknown tab
          setStreams([]);
          return;
        }
        
        let response = await fetch(url, { headers });
        
        // If the request failed, try fallback approaches based on tab
        if (!response.ok) {
          
          if (activeTab === 'explore' && showOffline) {
            // Fallback for explore tab - use the same correct endpoint
            try {
              const fallbackResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/streams/live?includeOffline=true`, { 
                headers: { 'Content-Type': 'application/json' } 
              });
              if (fallbackResponse.ok) {
                response = fallbackResponse;
              }
            } catch (fallbackError) {
            }
          } else if (activeTab === 'following') {
            // Try different following endpoint variations, but never fallback to all streams
            try {
              // Try without the query parameter first
              const fallbackUrl1 = `${import.meta.env.VITE_API_BASE_URL}/streams/following`;
              const fallbackResponse = await fetch(fallbackUrl1, { headers });
              
              if (fallbackResponse.ok) {
                response = fallbackResponse;
              } else {
                // If following endpoints don't work, show empty state instead of all streams
                console.warn('Following endpoints not available, showing empty following list');
                setStreams([]);
                return;
              }
            } catch (fallbackError) {
              // If following endpoint fails, show empty state
              console.warn('Following endpoint failed, showing empty following list');
              setStreams([]);
              return;
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
        
        // Extract username from stream_key for each stream
        // Assumes stream_key format is "username_randomnumbers"
        const streams = data.streams || [];
        
        const streamsWithUsername = streams.map((stream: any) => {
          const username = stream.username || (stream.stream_key ? stream.stream_key.split('_')[0] : 'unknown');
          
          // Trust the API status completely - no frontend verification
          const status = stream.status || (stream.isLive ? 'live' : 'offline');
          
          // Only try thumbnails for streams the API says are live
          let thumbnailUrl = stream.thumbnail || stream.thumbnailUrl;
          if (!thumbnailUrl && status === 'live') {
            thumbnailUrl = `https://lb-01.distorted.live/stream/${username}/thumbnail.jpg`;
          }
          
          return {
            ...stream,
            username: username,
            status: status,
            thumbnail: thumbnailUrl
          };
        });
        
        // Remove duplicates based on username (in case API returns duplicates)
        let uniqueStreams = streamsWithUsername.filter((stream: any, index: number, self: any[]) => 
          self.findIndex((s: any) => s.username === stream.username) === index
        );
        
        // Additional safety: never show user's own stream in Following tab
        if (activeTab === 'following' && user?.username) {
          uniqueStreams = uniqueStreams.filter((stream: any) => stream.username !== user.username);
        }
        
        // Preserve existing profile pictures and detect newly live streams
        setStreams(prevStreams => {
          const updatedStreams = uniqueStreams.map((newStream: Stream) => {
            // Find existing stream to preserve profile picture
            const existingStream = prevStreams.find(s => s.username === newStream.username);
            
            // Check if this stream just went live
            if (newStream.status === 'live' && 
                existingStream && 
                existingStream.status !== 'live') {
              // Stream just went live, add to newly live tracking
              setNewlyLiveStreams(prev => new Set(prev).add(newStream.username));
            }
            
            return {
              ...newStream,
              profilePicture: existingStream?.profilePicture || newStream.profilePicture
            };
          });
          
          return updatedStreams;
        });
      } catch (error) {
        console.error('Error fetching streams:', error);
        // Fallback to empty array or show error message
        setStreams([]);
      }
    };

    // Fetch immediately
    fetchStreams();

    // Set up polling every 45 seconds to check for live status updates
    const pollInterval = setInterval(fetchStreams, 45000);

    return () => clearInterval(pollInterval);
  }, [loading, activeTab, token, showOffline]);

  // Fetch profile pictures when streams change (but not on every poll)
  useEffect(() => {
    const fetchProfilePictures = async (streamList: Stream[]) => {
      try {
        // Only fetch for streams that don't already have profile pictures
        const streamsNeedingProfilePics = streamList.filter(stream => !stream.profilePicture);
        
        if (streamsNeedingProfilePics.length === 0) {
          return; // All streams already have profile pictures
        }

        const updatedStreams = await Promise.all(
          streamList.map(async (stream) => {
            // Skip if already has profile picture (from cache or previous fetch)
            if (stream.profilePicture) {
              return stream;
            }
            
            try {
              const profile = await getPublicUserProfile(stream.username);
              return {
                ...stream,
                profilePicture: profile.profilePicture || undefined
              };
            } catch (error) {
              // If profile fetch fails, keep the stream without profile picture
              return stream;
            }
          })
        );
        
        setStreams(updatedStreams);
      } catch (error) {
        console.error('Error fetching profile pictures:', error);
        // Keep streams without profile pictures if fetch fails
      }
    };

    if (streams.length > 0) {
      fetchProfilePictures(streams);
    }
  }, [streams.length]); // Only trigger when number of streams changes

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
        const query = searchQuery.trim().toLowerCase();
        
        // First, search within currently loaded streams (especially important when offline streams are shown)
        const localResults = streams.filter(stream => 
          stream.username.toLowerCase().includes(query) ||
          stream.title.toLowerCase().includes(query)
        );
        
        // If we found results in current streams, use those
        if (localResults.length > 0) {
          setSearchResults(localResults);
          setIsSearching(false);
          return;
        }
        
        // If no local results, try the API search as fallback
        const results = await searchUsers(searchQuery.trim());
        
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
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search by 500ms
    const searchTimeout = setTimeout(performSearch, 500);
    return () => clearTimeout(searchTimeout);
  }, [searchQuery, streams]); // Added streams as dependency

  // Filter and sort streams
  const filteredStreams = useMemo(() => {
    // If actively searching (not empty search), use search results instead of regular streams
    const isActivelySearching = searchQuery.trim().length > 0;
    const sourceStreams = isActivelySearching ? searchResults : streams;
    
    
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
            
            {/* Only show "Show Offline" toggle on explore tab */}
            {activeTab === 'explore' && (
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
            )}
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
                                onError={(e) => {
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
                        </div>
                        
                        <div className="p-4">
                          <div className="flex items-start space-x-3">
                            {/* Profile Picture */}
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden border border-gray-600 bg-black text-white flex-shrink-0">
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
                            
                            {/* Stream Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {stream.title}
                              </h3>
                              <p className={`text-sm ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {stream.username}
                              </p>
                            </div>
                          </div>
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