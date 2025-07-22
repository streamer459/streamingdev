import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import videojs from 'video.js';

type StreamInfo = {
  id: string;
  title: string;
  streamer: string;
  viewerCount: number;
  description: string;
  category: string;
  isLive: boolean;
  uptime: string;
  followerCount: number;
};

type ChatMessage = {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  isStreamer?: boolean;
  isModerator?: boolean;
};

export default function StreamPage() {
  const { id } = useParams<{ id: string }>();
  const { isDarkMode } = useDarkMode();
  const [stream, setStream] = useState<StreamInfo | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch dummy stream info
  useEffect(() => {
    const dummy: StreamInfo = {
      id: id || 'unknown',
      title: id === '1' ? 'Epic Gaming Session - Road to Rank 1!' : `Stream ${id} - Live Now!`,
      streamer: id === '1' ? 'ProGamer_2024' : `streamer_${id}`,
      viewerCount: Math.floor(Math.random() * 5000) + 100,
      description: id === '1' 
        ? 'Welcome to my stream! Today we\'re grinding ranked matches and trying some new strategies. Don\'t forget to hit that follow button!'
        : `This is an exciting live stream ${id} with great content!`,
      category: id === '1' ? 'Gaming' : 'Just Chatting',
      isLive: true,
      uptime: '2h 34m',
      followerCount: Math.floor(Math.random() * 10000) + 500,
    };
    setStream(dummy);

    // Generate some dummy chat messages
    const dummyMessages: ChatMessage[] = [
      { id: '1', username: 'ChatMaster', message: 'Hello everyone!', timestamp: new Date(Date.now() - 60000) },
      { id: '2', username: 'ProGamer_2024', message: 'Thanks for watching!', timestamp: new Date(Date.now() - 45000), isStreamer: true },
      { id: '3', username: 'GameFan42', message: 'Great plays!', timestamp: new Date(Date.now() - 30000) },
      { id: '4', username: 'ModeratorX', message: 'Keep it friendly in chat', timestamp: new Date(Date.now() - 15000), isModerator: true },
      { id: '5', username: 'ViewerOne', message: 'First time here, loving the content!', timestamp: new Date() },
    ];
    setChatMessages(dummyMessages);
  }, [id]);

  // Initialize Video.js when stream is ready
  useEffect(() => {
    if (stream && videoRef.current) {
      if (!playerRef.current) {
        playerRef.current = videojs(videoRef.current, {
          controls: true,
          fluid: true,
          responsive: true,
          playbackRates: [0.5, 1, 1.25, 1.5, 2],
          sources: [
            {
              src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
              type: 'application/x-mpegURL',
            },
          ],
        });
      }
    }
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [stream]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        username: 'You',
        message: chatInput.trim(),
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, newMessage]);
      setChatInput('');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  if (!stream) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading Stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 border-b ${
        isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      } px-4 py-3`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link 
            to="/home" 
            className={`flex items-center space-x-2 hover:opacity-75 transition-opacity ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Browse</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
              isDarkMode ? 'bg-red-900' : 'bg-red-100'
            }`}>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-red-300' : 'text-red-700'
              }`}>LIVE</span>
              <span className={`text-sm ${
                isDarkMode ? 'text-red-300' : 'text-red-600'
              }`}>{formatViewerCount(stream.viewerCount)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Video Player */}
            <div className="relative">
              <div className="aspect-video rounded-xl overflow-hidden shadow-2xl">
                <div data-vjs-player>
                  <video 
                    ref={videoRef} 
                    className="video-js vjs-big-play-centered w-full h-full" 
                  />
                </div>
              </div>
            </div>

            {/* Stream Info */}
            <div className={`rounded-xl p-6 shadow-lg ${
              isDarkMode ? 'bg-gray-900' : 'bg-white'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{stream.title}</h1>
                  <div className="flex items-center space-x-4 text-sm">
                    <Link 
                      to={`/u/${stream.streamer}`}
                      className={`font-semibold hover:underline ${
                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}
                    >
                      {stream.streamer}
                    </Link>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      isDarkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {stream.category}
                    </span>
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {stream.uptime} uptime
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={handleFollowToggle}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    isFollowing
                      ? (isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
              
              <p className={`text-sm leading-relaxed ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {stream.description}
              </p>
              
              <div className="flex items-center space-x-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-lg font-bold">{formatViewerCount(stream.viewerCount)}</div>
                  <div className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Viewers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{formatViewerCount(stream.followerCount)}</div>
                  <div className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Followers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className={`rounded-xl shadow-lg overflow-hidden ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            {/* Chat Header */}
            <div className={`px-4 py-3 border-b ${
              isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
            }`}>
              <h2 className="font-semibold">Stream Chat</h2>
            </div>
            
            {/* Chat Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="text-sm">
                  <div className="flex items-baseline space-x-2">
                    <span className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatTime(msg.timestamp)}
                    </span>
                    <span className={`font-medium ${
                      msg.isStreamer
                        ? (isDarkMode ? 'text-green-400' : 'text-green-600')
                        : msg.isModerator
                        ? (isDarkMode ? 'text-blue-400' : 'text-blue-600')
                        : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
                    }`}>
                      {msg.username}
                      {msg.isStreamer && ' 👑'}
                      {msg.isModerator && ' 🛡️'}
                    </span>
                  </div>
                  <p className={`mt-1 ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    {msg.message}
                  </p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            {/* Chat Input */}
            <div className={`p-4 border-t ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <form onSubmit={handleChatSubmit} className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
