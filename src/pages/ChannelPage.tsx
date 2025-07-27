import { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import AuthContext from '../contexts/AuthContext';
import { getPublicStreamData, getMyFollowers, getMySubscribers, updateUserProfile, getUserProfile, getActivityFeed, updateStreamTitle, getStreamTitle } from '../services/streamApi';
import BitrateGraph from '../components/BitrateGraph';

type ChannelInfo = {
  username: string;
  bio: string;
  totalFollowers: number;
  live: boolean;
  title?: string;
  viewerCount?: number;
  uptime?: string;
};

type UserReference = {
  id: number;
  username: string;
  displayName?: string;
  profilePicture?: string;
  followedAt?: string;
  subscribedAt?: string;
};

type ActivityItem = {
  id: number;
  type: 'follow' | 'unfollow' | 'subscribe';
  username: string;
  displayName?: string;
  timestamp: string;
};

export default function ChannelPage() {
  const { username } = useParams<{ username: string }>();
  const { isDarkMode } = useDarkMode();
  const { user, token } = useContext(AuthContext);
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [followers, setFollowers] = useState<UserReference[]>([]);
  const [subscribers, setSubscribers] = useState<UserReference[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showSubscribers, setShowSubscribers] = useState(false);
  
  // Session time tracking
  
  // About section editing
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState('');
  const [savingAbout, setSavingAbout] = useState(false);
  
  // Stream title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  
  // Activity feed
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  

  // Utility function to format activity timestamp
  const formatActivityTime = (timestamp: string): string => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return activityTime.toLocaleDateString();
  };

  const isOwnChannel = user?.username === username;


  // Fetch real channel info from API
  useEffect(() => {
    const fetchChannelData = async () => {
      if (!username) {
        console.error('No username provided');
        return;
      }
      
      console.log('Fetching channel data for username:', username);
      
      try {
        // Get stream data from the public API
        const streamData = await getPublicStreamData(username);
        console.log('Channel data received for:', username);
        
        // Convert stream data to channel info format
        const channelInfo: ChannelInfo = {
          username: streamData.username || streamData.streamer || username,
          bio: streamData.description || `${username}'s channel`,
          totalFollowers: streamData.followerCount || 0,
          live: streamData.status === 'live' || streamData.isLive || false,
          title: streamData.title,
          viewerCount: streamData.viewerCount || 0,
          uptime: streamData.uptime,
        };
        
        // If we already have a more accurate follower count from the followers API, preserve it
        setChannel(prev => {
          
          if (prev && prev.totalFollowers > channelInfo.totalFollowers) {
            // Keep the higher count (from followers API)
            console.log('Preserving higher follower count:', prev.totalFollowers, 'vs', channelInfo.totalFollowers);
            return {
              ...channelInfo,
              totalFollowers: prev.totalFollowers
            };
          }
          console.log('Setting channel info:', channelInfo);
          
          // Initialize about text if this is the own channel
          if (isOwnChannel && !aboutText) {
            setAboutText(channelInfo.bio);
          }
          
          return channelInfo;
        });
      } catch (error) {
        console.error('Failed to fetch channel data:', error);
        console.log('Using fallback data for username:', username);
        
        // Set error state but still show fallback
        setError(error instanceof Error ? error.message : 'Failed to load channel data');
        
        // Fallback to basic channel info
        const fallbackInfo: ChannelInfo = {
          username: username,
          bio: `${username}'s channel`,
          totalFollowers: 0,
          live: false,
        };
        setChannel(fallbackInfo);
      }
    };

    // Initial fetch with small delay to ensure the component mounts properly
    const timeoutId = setTimeout(() => {
      fetchChannelData();
    }, 100);

    // Poll every 30 seconds to keep live status current
    const pollInterval = setInterval(() => {
      if (username) {
        fetchChannelData();
        
        // Note: Removed automatic follower fetching to reduce API load
        // Followers are now only fetched on manual refresh or when user clicks to view them
      }
    }, 30000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(pollInterval);
    };
  }, [username]);

  // Fetch followers data when showing followers section
  const fetchFollowers = async () => {
    if (!token || !isOwnChannel || loadingFollowers) return;
    
    setLoadingFollowers(true);
    try {
      const data = await getMyFollowers(token);
      setFollowers(data.followers);
      // Update the channel's totalFollowers count
      setChannel(prev => prev ? {
        ...prev,
        totalFollowers: data.totalCount || data.followers.length
      } : null);
    } catch (error) {
      console.error('Failed to fetch followers:', error);
    } finally {
      setLoadingFollowers(false);
    }
  };

  // Fetch subscribers data when showing subscribers section
  const fetchSubscribers = async () => {
    if (!token || !isOwnChannel || loadingSubscribers) return;
    
    setLoadingSubscribers(true);
    try {
      const data = await getMySubscribers(token);
      setSubscribers(data.subscribers);
    } catch (error) {
      console.error('Failed to fetch subscribers:', error);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const handleShowFollowers = () => {
    setShowFollowers(!showFollowers);
    if (!showFollowers && followers.length === 0) {
      fetchFollowers();
    }
  };

  const handleShowSubscribers = () => {
    setShowSubscribers(!showSubscribers);
    if (!showSubscribers && subscribers.length === 0) {
      fetchSubscribers();
    }
  };

  // Fetch stream title for own channel
  useEffect(() => {
    const fetchStreamTitle = async () => {
      if (!isOwnChannel) return;
      
      try {
        const data = await getStreamTitle(token!);
        setStreamTitle(data.title || '');
      } catch (error) {
        console.error('Failed to fetch stream title:', error);
        setStreamTitle('');
      }
    };

    fetchStreamTitle();
  }, [isOwnChannel, token]);

  const handleSaveTitle = async () => {
    if (!token || !isOwnChannel || savingTitle) return;
    
    setSavingTitle(true);
    try {
      await updateStreamTitle(token, streamTitle);
      setIsEditingTitle(false);
      console.log('Stream title updated successfully');
    } catch (error) {
      console.error('Failed to update stream title:', error);
      // Optionally show error message to user
    } finally {
      setSavingTitle(false);
    }
  };

  const handleCancelTitle = () => {
    // Reset to the original title if available
    const fetchCurrentTitle = async () => {
      if (!token) return;
      try {
        const data = await getStreamTitle(token!);
        setStreamTitle(data.title || '');
      } catch (error) {
        console.error('Failed to fetch current stream title:', error);
        setStreamTitle('');
      }
    };
    fetchCurrentTitle();
    setIsEditingTitle(false);
  };

  const handleSaveAbout = async () => {
    if (!token || !isOwnChannel || savingAbout) return;
    
    setSavingAbout(true);
    try {
      // First get the current profile data
      const currentProfile = await getUserProfile(token);
      
      // Update the profile with the new bio
      const updatedProfile = {
        username: currentProfile.username,
        email: currentProfile.email,
        displayName: currentProfile.displayName,
        bio: aboutText
      };
      
      await updateUserProfile(token, updatedProfile);
      
      // Update the channel info with the new bio
      setChannel(prev => prev ? {
        ...prev,
        bio: aboutText
      } : null);
      
      setIsEditingAbout(false);
      console.log('Channel description updated successfully');
    } catch (error) {
      console.error('Failed to update channel description:', error);
      // Optionally show error message to user
    } finally {
      setSavingAbout(false);
    }
  };

  const handleCancelAbout = () => {
    if (channel) {
      setAboutText(channel.bio);
    }
    setIsEditingAbout(false);
  };

  // Fetch activity feed data
  const fetchActivityFeed = useCallback(async () => {
    if (!isOwnChannel) {
      console.log('🔍 fetchActivityFeed - skipping:', { isOwnChannel });
      return;
    }
    
    // Check loading state inside the function to avoid dependency loop
    if (loadingActivities) {
      console.log('🔍 fetchActivityFeed - already loading, skipping');
      return;
    }
    
    console.log('🔍 fetchActivityFeed - starting for user:', username);
    setLoadingActivities(true);
    try {
      const data = await getActivityFeed(token!, 10);
      console.log('🔍 ACTIVITY FEED DEBUG - Raw API response:', data);
      console.log('🔍 ACTIVITY FEED DEBUG - Activities array:', data.activities);
      console.log('🔍 ACTIVITY FEED DEBUG - Activities length:', data.activities?.length || 0);
      
      if (data.activities && Array.isArray(data.activities)) {
        setActivities(data.activities);
        console.log('✅ Activity feed updated with', data.activities.length, 'real items');
        
        if (data.activities.length === 0) {
          console.log('⚠️ Backend returned empty activities array despite logged activity');
          console.log('⚠️ Please verify that /api/user/activity is reading from the same database table where activity is being stored');
        }
      } else {
        console.warn('⚠️ Invalid activities data structure:', data);
        setActivities([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch activity feed:', error);
      // Keep existing activities on error
    } finally {
      setLoadingActivities(false);
    }
  }, [token, isOwnChannel, username]);

  const handleRefreshStatus = async () => {
    if (!username || refreshing) return;
    
    setRefreshing(true);
    try {
      const streamData = await getPublicStreamData(username);
      console.log('Channel data refreshed for:', username);
      
      const channelInfo: ChannelInfo = {
        username: streamData.username || streamData.streamer || username,
        bio: streamData.description || `${username}'s channel`,
        totalFollowers: streamData.followerCount || 0,
        live: streamData.status === 'live' || streamData.isLive || false,
        title: streamData.title,
        viewerCount: streamData.viewerCount || 0,
        uptime: streamData.uptime,
      };
      
      // If we already have a more accurate follower count from the followers API, preserve it
      setChannel(prev => {
        
        if (prev && prev.totalFollowers > channelInfo.totalFollowers) {
          // Keep the higher count (from followers API)
          console.log('Refresh: Preserving higher follower count:', prev.totalFollowers, 'vs', channelInfo.totalFollowers);
          return {
            ...channelInfo,
            totalFollowers: prev.totalFollowers
          };
        }
        console.log('Refresh: Setting channel info:', channelInfo);
        return channelInfo;
      });

      // Also refresh followers data on manual refresh (if own channel)
      if (isOwnChannel && token) {
        console.log('Manual refresh: Also fetching followers data');
        fetchFollowers();
      }
    } catch (error) {
      console.error('Failed to refresh channel data:', error);
    } finally {
      setRefreshing(false);
    }
  };


  // Fetch activity feed for own channel
  useEffect(() => {
    console.log('🔍 Activity feed useEffect - checking conditions:', { 
      isOwnChannel, 
      hasToken: !!token, 
      username,
      tokenPreview: token?.substring(0, 20) + '...',
      currentUser: user?.username
    });
    
    if (!isOwnChannel || !token) {
      console.log('🔍 Activity feed useEffect - skipping:', { isOwnChannel, hasToken: !!token });
      return;
    }

    console.log('🔍 Activity feed useEffect - initial fetch for', username);

    // Initial fetch only (no auto-polling to reduce API load)
    fetchActivityFeed();
  }, [isOwnChannel, fetchActivityFeed]);

  if (!channel) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading Channel...</p>
          {error && (
            <p className="text-sm text-red-500 mt-2">
              Debug: {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-gray-50'} p-6`}>
      <header className="mb-6">
        <Link 
          to="/home" 
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all hover:bg-opacity-80 ${
            isDarkMode 
              ? 'bg-gray-800 text-white hover:bg-gray-700' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Browse</span>
        </Link>
        <div className="flex items-center mt-4">
          <div className={`h-16 w-16 rounded-full mr-4 flex items-center justify-center text-xl font-bold ${
            isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-300 text-gray-800'
          }`}>
            {channel.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {channel.username}
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Followers: {channel.totalFollowers.toLocaleString()}
            </p>
          </div>
        </div>
      </header>

      {/* Channel Information Section - Only show for own channel */}
      {isOwnChannel && (
        <div className={`p-6 rounded-lg shadow-md mb-6 ${
          isDarkMode 
            ? 'bg-gray-900 border border-gray-800' 
            : 'bg-white'
        }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Channel Information
          </h2>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* About Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-md font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                About
              </h3>
              {isOwnChannel && !isEditingAbout && (
                <button
                  onClick={() => setIsEditingAbout(true)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Edit
                </button>
              )}
            </div>
            
            {isEditingAbout && isOwnChannel ? (
              <div className="space-y-3">
                <textarea
                  value={aboutText}
                  onChange={(e) => setAboutText(e.target.value)}
                  placeholder="Tell viewers about your channel..."
                  maxLength={500}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {aboutText.length}/500 characters
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancelAbout}
                      disabled={savingAbout}
                      className={`text-xs px-3 py-1 rounded-md transition-colors ${
                        isDarkMode
                          ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                          : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                      } ${savingAbout ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAbout}
                      disabled={savingAbout}
                      className={`text-xs px-3 py-1 rounded-md transition-colors ${
                        savingAbout
                          ? 'opacity-50 cursor-not-allowed bg-blue-600 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {savingAbout ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`p-3 rounded-md border ${
                isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
              }`}>
                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {channel.bio || (isOwnChannel ? 'Click Edit to add a description of your channel.' : 'No description available.')}
                </p>
              </div>
            )}
          </div>

          {/* Stream Title Section */}
          {isOwnChannel && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-md font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Stream Title
                </h3>
                {!isEditingTitle && (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${
                      isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Edit
                  </button>
                )}
              </div>
              
              {isEditingTitle ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    placeholder="Enter your stream title..."
                    maxLength={100}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {streamTitle.length}/100 characters
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCancelTitle}
                        disabled={savingTitle}
                        className={`text-xs px-3 py-1 rounded-md transition-colors ${
                          isDarkMode
                            ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                            : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                        } ${savingTitle ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTitle}
                        disabled={savingTitle}
                        className={`text-xs px-3 py-1 rounded-md transition-colors ${
                          savingTitle
                            ? 'opacity-50 cursor-not-allowed bg-blue-600 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {savingTitle ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-3 rounded-md border ${
                  isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
                }`}>
                  <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {streamTitle || 'Click Edit to set your stream title.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Stream Status Section */}
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <h3 className={`text-md font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Stream Status
              </h3>
              {channel.live && (
                <Link
                  to={`/${channel.username}`}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-full w-fit transition-colors hover:opacity-80 ${
                    isDarkMode ? 'bg-red-900' : 'bg-red-100'
                  }`}
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-red-300' : 'text-red-700'
                  }`}>LIVE</span>
                  {channel.viewerCount !== undefined && (
                    <span className={`text-xs ${
                      isDarkMode ? 'text-red-300' : 'text-red-600'
                    }`}>
                      {channel.viewerCount} viewers
                    </span>
                  )}
                  {channel.uptime && (
                    <span className={`text-xs ${
                      isDarkMode ? 'text-red-300' : 'text-red-600'
                    }`}>• {channel.uptime}</span>
                  )}
                </Link>
              )}
            </div>

            {channel.live ? (
              <div className="space-y-3">
                {channel.uptime && (
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Live for {channel.uptime}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to={`/${channel.username}`}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-full w-fit transition-colors hover:opacity-80 ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>OFFLINE</span>
                </Link>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  This channel is not live currently.
                </p>
              </div>
            )}

            {/* Bitrate Monitor - Below stream status for own channel when live */}
            {isOwnChannel && user && token && channel.live && (
              <div className="mt-4">
                <BitrateGraph 
                  streamUsername={username}
                  isLive={channel.live}
                  className=""
                  compact={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      )}


      {/* Audience Section - Only show for own channel */}
      {isOwnChannel && (
        <div className={`mt-6 p-6 rounded-lg shadow-md ${ 
          isDarkMode 
            ? 'bg-gray-900 border border-gray-800' 
            : 'bg-white'
        }`}>
          <h2 className={`text-lg font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Audience
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Activity Feed Card */}
            <div className={`rounded-lg border p-6 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <svg className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Activity Feed
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={fetchActivityFeed}
                    disabled={loadingActivities}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${
                      isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-700 hover:bg-gray-200'
                    } ${loadingActivities ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Refresh activity feed"
                  >
                    <svg className={`w-3 h-3 ${loadingActivities ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isDarkMode ? 'bg-purple-400' : 'bg-purple-500'}`}></div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Live
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Real-time activity
                </p>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {loadingActivities ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                    <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Loading activity...
                    </span>
                  </div>
                ) : activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-2 text-xs">
                      <div className={`w-1 h-1 rounded-full ${
                        activity.type === 'follow' || activity.type === 'unfollow'
                          ? (isDarkMode ? 'bg-blue-400' : 'bg-blue-500')
                          : (isDarkMode ? 'bg-green-400' : 'bg-green-500')
                      }`}></div>
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        <span className="font-medium">
                          {activity.displayName || activity.username}
                        </span>
                        {activity.type === 'follow' && ' followed you'}
                        {activity.type === 'unfollow' && ' unfollowed you'}
                        {activity.type === 'subscribe' && ' subscribed'}
                      </span>
                      <span className={`ml-auto ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {formatActivityTime(activity.timestamp)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className={`text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <p className="text-xs">No recent activity</p>
                    <p className="text-xs mt-1">New follows and subscribes will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Followers Card */}
            <div className={`rounded-lg border p-6 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <svg className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Followers
                  </h3>
                </div>
                <button
                  onClick={handleShowFollowers}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {showFollowers ? 'Hide' : 'Show'}
                </button>
              </div>
              
              <div className="mb-4">
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {channel?.totalFollowers || 0}
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total followers
                </p>
              </div>

              {showFollowers && (
                <div>
                  {loadingFollowers ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Loading...
                      </span>
                    </div>
                  ) : followers.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {followers.slice(0, 5).map((follower) => (
                        <div key={follower.id} className="flex items-center space-x-2">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {follower.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {follower.displayName || follower.username}
                            </p>
                          </div>
                        </div>
                      ))}
                      {followers.length > 5 && (
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          +{followers.length - 5} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No followers yet
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Subscribers Card */}
            <div className={`rounded-lg border p-6 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <svg className={`w-6 h-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Subscribers
                  </h3>
                </div>
                <button
                  onClick={handleShowSubscribers}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {showSubscribers ? 'Hide' : 'Show'}
                </button>
              </div>
              
              <div className="mb-4">
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {subscribers.length}
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total subscribers
                </p>
              </div>

              {showSubscribers && (
                <div>
                  {loadingSubscribers ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
                      <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Loading...
                      </span>
                    </div>
                  ) : subscribers.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {subscribers.slice(0, 5).map((subscriber) => (
                        <div key={subscriber.id} className="flex items-center space-x-2">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {subscriber.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {subscriber.displayName || subscriber.username}
                            </p>
                          </div>
                        </div>
                      ))}
                      {subscribers.length > 5 && (
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          +{subscribers.length - 5} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No subscribers yet
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
