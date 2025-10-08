import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import { getPublicUserProfile } from '../services/streamApi';

type VideoItem = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration: string;
  viewCount: number;
  createdAt: string;
  description?: string;
};

type VideoType = 'vods' | 'clips';

export default function Videos() {
  const { username } = useParams<{ username: string }>();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [streamerProfile, setStreamerProfile] = useState<{
    username: string;
    profilePicture?: string;
    bio?: string;
    followerCount: number;
  } | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  
  // Determine the current video type from URL path
  const currentPath = window.location.pathname;
  const currentType: VideoType = currentPath.includes('/clips') ? 'clips' : 'vods';
  const isVoDs = currentType === 'vods';

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

  // Fetch videos based on type
  useEffect(() => {
    const fetchVideos = async () => {
      if (!username) return;
      
      try {
        // TODO: Replace with actual API calls
        // const response = await (isVoDs ? getVoDs(username) : getClips(username));
        
        // Mock data for now - different data for VoDs vs Clips
        const mockVideos: VideoItem[] = isVoDs ? [
          {
            id: 'vod1',
            title: 'Epic 6-Hour Gaming Marathon - Building the Ultimate City',
            duration: '6:23:45',
            viewCount: 2847,
            createdAt: '2025-01-20',
            description: 'Join me for an incredible gaming session where we build the ultimate city from scratch!'
          },
          {
            id: 'vod2',
            title: 'Morning Coffee & Coding Session',
            duration: '2:15:30',
            viewCount: 1205,
            createdAt: '2025-01-19',
            description: 'Relaxed morning stream working on some exciting new projects'
          },
          {
            id: 'vod3',
            title: 'Community Game Night - Multiplayer Madness',
            duration: '4:45:12',
            viewCount: 3912,
            createdAt: '2025-01-18',
            description: 'Playing games with viewers and having a blast!'
          },
          {
            id: 'vod4',
            title: 'Late Night Study Stream - Learning React',
            duration: '3:28:15',
            viewCount: 1876,
            createdAt: '2025-01-17',
            description: 'Deep dive into React hooks and modern patterns'
          }
        ] : [
          {
            id: 'clip1',
            title: 'Epic Boss Fight Victory! 🔥',
            duration: '0:32',
            viewCount: 15420,
            createdAt: '2025-01-20',
            description: 'Finally defeated the hardest boss after 50+ attempts!'
          },
          {
            id: 'clip2',
            title: 'Hilarious Chat Reaction 😂',
            duration: '0:28',
            viewCount: 8934,
            createdAt: '2025-01-20',
            description: 'Chat\'s reaction to the most unexpected plot twist'
          },
          {
            id: 'clip3',
            title: 'Perfect Speedrun Segment ⚡',
            duration: '0:45',
            viewCount: 12567,
            createdAt: '2025-01-19',
            description: 'Nailed this tricky section with a new personal best!'
          },
          {
            id: 'clip4',
            title: 'Funny Glitch Discovery 🐛',
            duration: '0:24',
            viewCount: 6789,
            createdAt: '2025-01-19',
            description: 'Found the funniest glitch in the game!'
          },
          {
            id: 'clip5',
            title: 'Insane Clutch Play 🎯',
            duration: '0:38',
            viewCount: 18234,
            createdAt: '2025-01-18',
            description: '1v5 clutch that saved the entire match!'
          },
          {
            id: 'clip6',
            title: 'Viewer Question Goes Wrong',
            duration: '0:15',
            viewCount: 5432,
            createdAt: '2025-01-18',
            description: 'When answering chat questions leads to chaos'
          },
          {
            id: 'clip7',
            title: 'Music Sync Moment 🎵',
            duration: '0:29',
            viewCount: 9876,
            createdAt: '2025-01-17',
            description: 'Perfect timing with the background music!'
          },
          {
            id: 'clip8',
            title: 'Compilation of Fails 💀',
            duration: '0:52',
            viewCount: 7654,
            createdAt: '2025-01-17',
            description: 'All the best fails from this week'
          }
        ];
        
        setVideos(mockVideos);
      } catch (error) {
        console.error('Failed to fetch videos:', error);
        setVideos([]);
      }
    };

    fetchVideos();
  }, [username, currentType]);

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleTypeChange = (newType: VideoType) => {
    navigate(`/${username}/${newType}`);
  };

  const openVideoOverlay = (video: VideoItem) => {
    setSelectedVideo(video);
    setShowVideoOverlay(true);
  };

  const closeVideoOverlay = () => {
    setShowVideoOverlay(false);
    setSelectedVideo(null);
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
          <p className="text-lg">Loading Videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className={`rounded-xl p-6 shadow-lg mb-8 ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}>
          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={() => navigate(`/${username}`)}
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

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Profile Picture - Clickable to go to stream page */}
              <Link
                to={`/${username}`}
                className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold overflow-hidden border border-gray-600 bg-black text-white hover:opacity-80 transition-opacity"
              >
                {streamerProfile?.profilePicture ? (
                  <img 
                    src={streamerProfile.profilePicture} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full object-cover"
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
              <div>
                <h1 className={`text-2xl font-bold mb-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {streamerProfile?.username}'s {isVoDs ? 'Past Broadcasts' : 'Clips'}
                </h1>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {videos.length} {isVoDs ? 'broadcasts' : 'clips'} available
                </p>
              </div>
            </div>

            {/* Type Selector Dropdown */}
            <div className="flex items-center space-x-4">
              <div className={`relative ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
              } rounded-lg p-1`}>
                <button
                  onClick={() => handleTypeChange('vods')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isVoDs
                      ? 'bg-blue-600 text-white'
                      : isDarkMode 
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Past Broadcasts
                </button>
                <button
                  onClick={() => handleTypeChange('clips')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    !isVoDs
                      ? 'bg-blue-600 text-white'
                      : isDarkMode 
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Clips
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        <div className={`rounded-xl p-6 shadow-lg ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}>
          {videos.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No {isVoDs ? 'past broadcasts' : 'clips'} available
              </p>
              <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                {isVoDs 
                  ? 'Past broadcasts will appear here once they are processed' 
                  : 'Clips will appear here when viewers create them during streams'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className={`cursor-pointer group rounded-lg overflow-hidden transition-transform hover:scale-105 ${
                    isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                  }`}
                  onClick={() => openVideoOverlay(video)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gray-700 relative flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      <img 
                        src={video.thumbnailUrl} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-white">
                        <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs opacity-75">No thumbnail</p>
                      </div>
                    )}
                    
                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-all">
                      <div className="bg-white bg-opacity-90 rounded-full p-3 scale-0 group-hover:scale-100 transition-transform">
                        <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Video Info */}
                  <div className="p-4">
                    <h3 className={`font-semibold text-sm line-clamp-2 mb-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {video.title}
                    </h3>
                    <div className={`flex items-center justify-between text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <span>{formatViewCount(video.viewCount)} views</span>
                      <span>{formatDate(video.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video Player Overlay */}
        {showVideoOverlay && selectedVideo && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={closeVideoOverlay}
          >
            <div 
              className={`relative w-full max-w-5xl mx-4 rounded-xl overflow-hidden shadow-2xl ${
                isDarkMode ? 'bg-gray-900' : 'bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex-1 mr-4">
                  <h3 className={`text-lg font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {selectedVideo.title}
                  </h3>
                  <div className={`flex items-center space-x-4 text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <span>{formatDate(selectedVideo.createdAt)}</span>
                    <span>•</span>
                    <span>{selectedVideo.duration}</span>
                    <span>•</span>
                    <span>{formatViewCount(selectedVideo.viewCount)} views</span>
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
                  <h3 className="text-xl font-semibold mb-2">
                    {isVoDs ? 'VoD' : 'Clip'} Player Coming Soon
                  </h3>
                  <p className="text-gray-400">
                    Video playback will be connected to the backend storage server
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedVideo.description && (
                <div className={`p-4 border-t ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {selectedVideo.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}