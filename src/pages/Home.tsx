import React, { useContext, useEffect, useState, useMemo } from 'react';
import AuthContext from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useNavigate, Link } from 'react-router-dom';

type Stream = {
  id: string;
  title: string;
  streamer: string;
  thumbnailUrl: string;
  viewerCount: number;
  category: string;
  isLive: boolean;
  duration?: string;
};

type Category = {
  id: string;
  name: string;
};

type HomeTab = 'following' | 'explore';
type SortOption = 'viewers' | 'recent' | 'title';

export default function Home() {
  const { user, logout, loading } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [categories] = useState<Category[]>([
    { id: 'games', name: 'Games' },
    { id: 'software-development', name: 'Software Development' },
    { id: 'irl', name: 'IRL' },
    { id: 'just-chatting', name: 'Just Chatting' },
    { id: 'cooking', name: 'Cooking' },
    { id: 'events', name: 'Events' },
  ]);
  
  const [activeTab, setActiveTab] = useState<HomeTab>('following');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('viewers');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Simulate API call - replace with actual API integration
  useEffect(() => {
    // Remove the redirect logic - allow public access
    // if (!loading && !user) {
    //   navigate('/login');
    //   return;
    // }

    // TODO: Replace with actual API calls
    const mockStreams: Stream[] = [
      {
        id: '1',
        title: 'Epic Gaming Session - Road to Rank 1!',
        streamer: 'ProGamer_2024',
        thumbnailUrl: 'https://picsum.photos/400/300?random=1',
        viewerCount: 2847,
        category: 'games',
        isLive: true,
      },
      {
        id: '2',
        title: 'Building a React App from Scratch',
        streamer: 'CodeMaster_Dev',
        thumbnailUrl: 'https://picsum.photos/400/300?random=2',
        viewerCount: 1523,
        category: 'software-development',
        isLive: true,
      },
      {
        id: '3',
        title: 'Cooking Italian Pasta Tonight!',
        streamer: 'ChefAnna',
        thumbnailUrl: 'https://picsum.photos/400/300?random=3',
        viewerCount: 892,
        category: 'cooking',
        isLive: true,
      },
      {
        id: '4',
        title: 'Just Chatting and Q&A Session',
        streamer: 'TalkShow_Host',
        thumbnailUrl: 'https://picsum.photos/400/300?random=4',
        viewerCount: 645,
        category: 'just-chatting',
        isLive: true,
      },
      {
        id: '5',
        title: 'Virtual Concert Live Stream',
        streamer: 'MusicStream',
        thumbnailUrl: 'https://picsum.photos/400/300?random=5',
        viewerCount: 3421,
        category: 'events',
        isLive: true,
      },
      {
        id: '6',
        title: 'Morning Walk in the City',
        streamer: 'CityExplorer',
        thumbnailUrl: 'https://picsum.photos/400/300?random=6',
        viewerCount: 234,
        category: 'irl',
        isLive: true,
      },
    ];
    setStreams(mockStreams);
  }, [loading, activeTab]); // Removed user and navigate dependencies

  // Filter and sort streams
  const filteredStreams = useMemo(() => {
    let filtered = streams.filter(stream => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          stream.title.toLowerCase().includes(query) ||
          stream.streamer.toLowerCase().includes(query)
        );
      }
      
      if (activeTab === 'explore' && selectedCategory !== 'all') {
        return stream.category === selectedCategory;
      }
      
      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'viewers':
          return b.viewerCount - a.viewerCount;
        case 'recent':
          return b.id.localeCompare(a.id);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [streams, searchQuery, sortBy, selectedCategory, activeTab]);

  const formatViewerCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

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
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {activeTab === 'explore' && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? 'bg-gray-900 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="viewers">Most Viewers</option>
              <option value="recent">Recently Started</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>
        </div>

        {/* Content Based on Tab */}
        {activeTab === 'following' ? (
          <div className="text-center py-16">
            <div className="mb-4">
              <svg className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            {user ? (
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
            )}
          </div>
        ) : (
          <div>
            {filteredStreams.length === 0 ? (
              <div className="text-center py-16">
                <div className="mb-4">
                  <svg className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className={`text-lg font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  No streams available
                </h3>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Check back later for live streams, or try adjusting your search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStreams.map((stream) => (
                  <Link
                    to={`/stream/${stream.id}`}
                    key={stream.id}
                    className={`group rounded-lg overflow-hidden shadow-sm border hover:shadow-md transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-gray-900 border-gray-800'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={stream.thumbnailUrl}
                        alt={`${stream.title} thumbnail`}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      
                      {stream.isLive ? (
                        <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                          LIVE
                        </div>
                      ) : (
                        <div className="absolute top-3 left-3 bg-gray-900 bg-opacity-80 text-white text-xs px-2 py-1 rounded-full">
                          {stream.duration}
                        </div>
                      )}
                      
                      <div className="absolute top-3 right-3 bg-gray-900 bg-opacity-80 text-white text-xs px-2 py-1 rounded-full">
                        {formatViewerCount(stream.viewerCount)} viewers
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
                        {stream.streamer}
                      </p>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {categories.find(c => c.id === stream.category)?.name || stream.category}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}