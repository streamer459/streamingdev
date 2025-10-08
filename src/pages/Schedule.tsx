import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import { getPublicUserProfile, getPastStreams } from '../services/streamApi';

type PastStream = {
  id: string;
  title: string;
  date: string;
  duration: string;
  viewerCount: number;
  thumbnailUrl?: string;
};

export default function Schedule() {
  const { username } = useParams<{ username: string }>();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [streamerProfile, setStreamerProfile] = useState<{
    username: string;
    profilePicture?: string;
    bio?: string;
    followerCount: number;
  } | null>(null);
  const [pastStreams, setPastStreams] = useState<PastStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStream, setSelectedStream] = useState<PastStream | null>(null);
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);

  // Fetch streamer profile
  useEffect(() => {
    const fetchStreamerProfile = async () => {
      if (!username) return;
      
      try {
        const profile = await getPublicUserProfile(username);
        setStreamerProfile({
          username: profile.username || username,
          profilePicture: profile.profilePicture,
          bio: profile.bio,
          followerCount: profile.followerCount || 0
        });
      } catch (error) {
        console.error('Failed to fetch streamer profile:', error);
        // Set fallback data
        setStreamerProfile({
          username: username,
          followerCount: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStreamerProfile();
  }, [username]);

  // Fetch past streams from API
  useEffect(() => {
    const fetchPastStreams = async () => {
      if (!username) return;
      
      try {
        const response = await getPastStreams(username);
        setPastStreams(response.streams);
      } catch (error) {
        console.error('Failed to fetch past streams:', error);
        // Set empty array on error
        setPastStreams([]);
      }
    };

    fetchPastStreams();
  }, [username]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  // Calendar helper functions
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the beginning of the week that contains the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // End at the end of the week that contains the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days = [];
    const currentDay = new Date(startDate);
    
    while (currentDay <= endDate) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const getStreamsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return pastStreams.filter(stream => stream.date === dateStr);
  };

  const navigateCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  };

  const openVideoOverlay = (stream: PastStream) => {
    setSelectedStream(stream);
    setShowVideoOverlay(true);
  };

  const closeVideoOverlay = () => {
    setShowVideoOverlay(false);
    setSelectedStream(null);
  };

  // Handle keyboard events for overlay
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showVideoOverlay) {
        closeVideoOverlay();
      }
    };

    if (showVideoOverlay) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showVideoOverlay]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading Schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className={`rounded-xl p-6 shadow-lg mb-8 ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}>
          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={() => navigate(-1)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back</span>
            </button>
          </div>

          <div className="flex items-center space-x-6">
            {/* Profile Picture - Clickable to go to stream page */}
            <Link
              to={`/${username}`}
              className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-semibold overflow-hidden border border-gray-600 bg-black text-white hover:opacity-80 transition-opacity"
            >
              {streamerProfile?.profilePicture ? (
                <img 
                  src={streamerProfile.profilePicture} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full object-cover"
                  onError={() => {
                    console.log('Profile picture failed to load, falling back to initials');
                    setStreamerProfile(prev => prev ? { ...prev, profilePicture: undefined } : null);
                  }}
                />
              ) : (
                streamerProfile?.username?.[0]?.toUpperCase() || 'U'
              )}
            </Link>
            
            {/* Streamer Info */}
            <div className="flex-1">
              <h1 className={`text-3xl font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {streamerProfile?.username}'s Schedule
              </h1>
              <p className={`text-lg mb-4 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {streamerProfile?.bio || 'Past streams and schedule'}
              </p>
              <div className="flex items-center space-x-6">
                <div className={`flex items-center space-x-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{formatViewerCount(streamerProfile?.followerCount || 0)} followers</span>
                </div>
                <Link
                  to={`/${username}`}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-semibold"
                >
                  Watch Live
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className={`rounded-xl p-6 shadow-lg ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}>
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Stream Schedule
            </h2>
            
            {/* View Toggle */}
            <div className="flex items-center space-x-4">
              <div className={`flex rounded-lg p-1 ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'month'
                      ? 'bg-blue-600 text-white'
                      : isDarkMode 
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'week'
                      ? 'bg-blue-600 text-white'
                      : isDarkMode 
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Week
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateCalendar('prev')}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {viewMode === 'month' 
                ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              }
            </h3>
            
            <button
              onClick={() => navigateCalendar('next')}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          {viewMode === 'month' ? (
            <div className="space-y-2">
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className={`text-center text-sm font-medium py-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {getMonthDays(currentDate).map((date, index) => {
                  const streams = getStreamsForDate(date);
                  const hasStreams = streams.length > 0;
                  const isCurrentMonth = isSameMonth(date);
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[80px] p-2 rounded-lg border transition-colors ${
                        isToday(date)
                          ? isDarkMode 
                            ? 'bg-blue-900 border-blue-700' 
                            : 'bg-blue-50 border-blue-200'
                          : isDarkMode 
                            ? 'border-gray-700 hover:border-gray-600' 
                            : 'border-gray-200 hover:border-gray-300'
                      } ${
                        !isCurrentMonth 
                          ? isDarkMode ? 'opacity-30' : 'opacity-40'
                          : ''
                      }`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        isToday(date)
                          ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                          : isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {date.getDate()}
                      </div>
                      
                      {hasStreams && (
                        <div className="space-y-1">
                          {streams.slice(0, 2).map((stream, streamIndex) => (
                            <button
                              key={streamIndex}
                              onClick={() => openVideoOverlay(stream)}
                              className={`w-full text-xs p-1 rounded text-left hover:opacity-80 transition-opacity ${
                                isDarkMode 
                                  ? 'bg-green-900 text-green-300 hover:bg-green-800' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                              title={`${stream.title} (${stream.duration})`}
                            >
                              <div className="truncate font-medium">
                                {stream.title.length > 12 ? stream.title.substring(0, 12) + '...' : stream.title}
                              </div>
                              <div className="text-xs opacity-75">
                                {stream.duration}
                              </div>
                            </button>
                          ))}
                          {streams.length > 2 && (
                            <button
                              onClick={() => openVideoOverlay(streams[2])}
                              className={`w-full text-xs text-center py-1 rounded transition-opacity hover:opacity-80 ${
                                isDarkMode 
                                  ? 'text-gray-400 hover:text-gray-300 bg-gray-800' 
                                  : 'text-gray-600 hover:text-gray-700 bg-gray-200'
                              }`}
                            >
                              +{streams.length - 2} more
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Week View
            <div className="space-y-2">
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {getWeekDays(currentDate).map((date, index) => (
                  <div key={index} className={`text-center py-2 ${
                    isToday(date)
                      ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                      : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <div className="text-sm font-medium">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-bold ${
                      isToday(date)
                        ? isDarkMode 
                          ? 'bg-blue-900 text-blue-300 rounded-full w-8 h-8 flex items-center justify-center mx-auto mt-1' 
                          : 'bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center mx-auto mt-1'
                        : ''
                    }`}>
                      {date.getDate()}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Week calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {getWeekDays(currentDate).map((date, index) => {
                  const streams = getStreamsForDate(date);
                  const hasStreams = streams.length > 0;
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-3 rounded-lg border transition-colors ${
                        isToday(date)
                          ? isDarkMode 
                            ? 'bg-blue-900 border-blue-700' 
                            : 'bg-blue-50 border-blue-200'
                          : isDarkMode 
                            ? 'border-gray-700 hover:border-gray-600' 
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {hasStreams && (
                        <div className="space-y-2">
                          {streams.map((stream, streamIndex) => (
                            <button
                              key={streamIndex}
                              onClick={() => openVideoOverlay(stream)}
                              className={`w-full text-xs p-2 rounded text-left hover:opacity-80 transition-opacity ${
                                isDarkMode 
                                  ? 'bg-green-900 text-green-300 hover:bg-green-800' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              <div className="font-medium truncate" title={stream.title}>
                                {stream.title}
                              </div>
                              <div className="text-xs opacity-75 mt-1">
                                {stream.duration} • {formatViewerCount(stream.viewerCount)} viewers
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {pastStreams.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No past streams available
              </p>
            </div>
          )}
        </div>

        {/* Past Streams List (for fallback/additional info) */}
        {pastStreams.length > 0 && (
          <div className={`rounded-xl p-6 shadow-lg ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <h2 className={`text-2xl font-bold mb-6 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Recent Streams
            </h2>
            <div className="space-y-4">
              {pastStreams.slice(0, 5).map((stream) => (
                <div 
                  key={stream.id}
                  className={`p-4 rounded-lg border transition-colors hover:shadow-md ${
                    isDarkMode 
                      ? 'border-gray-700 bg-gray-800 hover:bg-gray-750' 
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold mb-1 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {stream.title}
                      </h3>
                      <div className={`flex items-center space-x-4 text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <span>{formatDate(stream.date)}</span>
                        <span>•</span>
                        <span>{stream.duration}</span>
                        <span>•</span>
                        <span>{formatViewerCount(stream.viewerCount)} viewers</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        disabled
                      >
                        VoD Unavailable
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        </div>
        )}

        {/* Video Player Overlay */}
        {showVideoOverlay && selectedStream && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={closeVideoOverlay}
          >
            <div 
              className={`relative w-full max-w-4xl mx-4 rounded-xl overflow-hidden shadow-2xl ${
                isDarkMode ? 'bg-gray-900' : 'bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div>
                  <h3 className={`text-lg font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {selectedStream.title}
                  </h3>
                  <div className={`flex items-center space-x-4 text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <span>{formatDate(selectedStream.date)}</span>
                    <span>•</span>
                    <span>{selectedStream.duration}</span>
                    <span>•</span>
                    <span>{formatViewerCount(selectedStream.viewerCount)} viewers</span>
                  </div>
                </div>
                <button
                  onClick={closeVideoOverlay}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Video Player Placeholder */}
              <div className="aspect-video bg-black flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="mb-4">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">VoD Player Coming Soon</h3>
                  <p className="text-gray-400">
                    Video on Demand playback will be connected to the backend storage server
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className={`p-4 border-t ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Streamer: {streamerProfile?.username}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={closeVideoOverlay}
                      className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors text-sm font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}