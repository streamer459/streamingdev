interface StreamKeyData {
  streamKey: string;
  rtmpUrl: string;
  playbackUrl: string;
  title: string;
  status: 'live' | 'offline' | 'online'; // Support both 'live' and 'online' for backend compatibility
  createdAt: string;
}

interface RegenerateStreamKeyResponse {
  success: boolean;
  message: string;
  streamKey: string;
  rtmpUrl: string;
  playbackUrl: string;
  title: string;
  status: 'live' | 'offline' | 'online'; // Support both 'live' and 'online' for backend compatibility
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getStreamKey = async (token: string): Promise<StreamKeyData> => {
  console.log('🔑 Getting stream key, token provided:', !!token, 'length:', token?.length);
  console.log('🔑 Token preview (first 20 chars):', token?.substring(0, 20));
  
  const response = await fetch(`${API_BASE_URL}/user/stream-key`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.log('❌ Stream key API error:', response.status, response.statusText);
    
    // Try to get error details from response
    let errorDetails;
    try {
      errorDetails = await response.json();
      console.log('❌ Error details:', errorDetails);
    } catch (e) {
      console.log('❌ Could not parse error response');
    }
    
    // Handle invalid token specifically
    if (response.status === 403 && errorDetails?.error === 'Invalid token') {
      console.log('🚨 TOKEN EXPIRED - Analyzing token details:');
      const token = localStorage.getItem('authToken');
      const tokenType = localStorage.getItem('authTokenType');
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('📊 Token details:');
          console.log('  - Token type stored:', tokenType);
          console.log('  - Token issued at (iat):', payload.iat ? new Date(payload.iat * 1000) : 'N/A');
          console.log('  - Token expires at (exp):', payload.exp ? new Date(payload.exp * 1000) : 'N/A');
          console.log('  - Current time:', new Date());
          if (payload.exp) {
            const timeLeft = new Date(payload.exp * 1000).getTime() - new Date().getTime();
            if (timeLeft > 0) {
              const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
              const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
              const timeDisplay = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
              console.log('  - Time until expiry:', timeDisplay);
            } else {
              console.log('  - Time until expiry: EXPIRED');
            }
          }
        } catch (e) {
          console.log('❌ Failed to decode token for analysis');
        }
      }
      
      // Clear the invalid token from storage
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      throw new Error('Your session has expired. Please log in again.');
    }
    
    throw new Error(errorDetails?.message || errorDetails?.error || 'Failed to fetch stream key');
  }

  const data = await response.json();
  console.log('Stream key data fetched successfully (not logging sensitive data)');
  return data;
};

export const regenerateStreamKey = async (token: string): Promise<RegenerateStreamKeyResponse> => {
  const response = await fetch(`${API_BASE_URL}/user/regenerate-stream-key`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to regenerate stream key');
  }

  return await response.json();
};

export const testRTMPAuth = async (streamKey: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/auth/rtmp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `name=${encodeURIComponent(streamKey)}`,
  });

  return response.ok;
};

interface PublicStreamData {
  id: string | number;
  title: string;
  streamer?: string;
  username?: string;
  viewerCount?: number;
  description?: string;
  bio?: string; // Bio field for About section
  category?: string;
  isLive?: boolean;
  status?: 'live' | 'offline';
  uptime?: string;
  followerCount?: number;
  playbackUrl: string;
  createdAt?: string;
  profilePicture?: string; // Add profile picture to stream data
  displayName?: string; // Display name
  thumbnail?: string; // Add thumbnail URL for stream previews
}

export const getPublicStreamData = async (username: string): Promise<PublicStreamData> => {
  const response = await fetch(`${API_BASE_URL}/user/${username}/stream`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Streamer not found (404)');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to fetch stream data (${response.status})`);
  }

  return await response.json();
};

// Get follower count for a specific user (public endpoint)
export const getPublicFollowerCount = async (username: string): Promise<{ followerCount: number }> => {
  // First try the dedicated count endpoint
  try {
    const response = await fetch(`${API_BASE_URL}/user/${username}/followers/count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('Dedicated count endpoint not available, trying alternative approach');
  }

  // Fallback: Try to get the count from the channel/stream endpoint
  try {
    const streamResponse = await fetch(`${API_BASE_URL}/user/${username}/stream`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (streamResponse.ok) {
      const streamData = await streamResponse.json();
      if (streamData.followerCount !== undefined) {
        return { followerCount: streamData.followerCount };
      }
    }
  } catch (error) {
    console.log('Could not get follower count from stream endpoint');
  }

  // Last resort: return 0
  console.log('No follower count available, returning 0');
  return { followerCount: 0 };
};

// Search for users/channels (public endpoint)
interface SearchResult {
  id: number;
  username: string;
  displayName?: string;
  bio?: string;
  isLive?: boolean;
  followerCount?: number;
}

interface SearchResponse {
  users: SearchResult[];
  totalCount: number;
}

export const searchUsers = async (query: string): Promise<SearchResponse> => {
  const response = await fetch(`${API_BASE_URL}/search/users?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // If search endpoint doesn't exist, return empty results
    if (response.status === 404) {
      console.log('User search endpoint not available');
      return { users: [], totalCount: 0 };
    }
    const error = await response.json();
    throw new Error(error.message || 'Failed to search users');
  }

  return await response.json();
};

interface UserProfile {
  id: number;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

interface UpdateProfileData {
  username: string;
  email: string;
  displayName: string;
  bio?: string;
}

interface UpdateProfileResponse {
  success: boolean;
  message: string;
  user: UserProfile;
}

export const getUserProfile = async (token: string): Promise<UserProfile> => {
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch user profile');
  }

  return await response.json();
};

export const updateUserProfile = async (token: string, profileData: UpdateProfileData): Promise<UpdateProfileResponse> => {
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update profile');
  }

  return await response.json();
};

// Follow/Unfollow functionality
interface FollowResponse {
  success: boolean;
  message: string;
  isFollowing: boolean;
}

export const followUser = async (token: string, username: string): Promise<FollowResponse> => {
  const response = await fetch(`${API_BASE_URL}/user/${username}/follow`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to follow user');
  }

  return await response.json();
};

export const unfollowUser = async (token: string, username: string): Promise<FollowResponse> => {
  const response = await fetch(`${API_BASE_URL}/user/${username}/unfollow`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to unfollow user');
  }

  return await response.json();
};

export const checkFollowStatus = async (token: string, username: string): Promise<{ isFollowing: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/user/${username}/follow-status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to check follow status');
  }

  return await response.json();
};

// Followers and Subscribers functionality
interface UserReference {
  id: number;
  username: string;
  displayName?: string;
  profilePicture?: string;
  followedAt?: string;
  subscribedAt?: string;
}

interface FollowersResponse {
  followers: UserReference[];
  totalCount: number;
}

interface SubscribersResponse {
  subscribers: UserReference[];
  totalCount: number;
}

interface UserSubscriptionsResponse {
  subscriptions: UserReference[];
  totalCount: number;
}

export const getMyFollowers = async (token: string): Promise<FollowersResponse> => {
  const response = await fetch(`${API_BASE_URL}/user/followers`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } else {
        const text = await response.text();
        if (text.includes('<!DOCTYPE') || text.includes('<html>')) {
          errorMessage = `Server returned HTML instead of JSON. Status: ${response.status}`;
        } else {
          errorMessage = text || errorMessage;
        }
      }
    } catch (parseError) {
      // Keep the original error message if we can't parse the response
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch (parseError) {
    throw new Error('Server returned invalid JSON response');
  }
};

export const getMySubscribers = async (token: string): Promise<SubscribersResponse> => {
  const response = await fetch(`${API_BASE_URL}/user/subscribers`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } else {
        const text = await response.text();
        if (text.includes('<!DOCTYPE') || text.includes('<html>')) {
          errorMessage = `Server returned HTML instead of JSON. Status: ${response.status}`;
        } else {
          errorMessage = text || errorMessage;
        }
      }
    } catch (parseError) {
      // Keep the original error message if we can't parse the response
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch (parseError) {
    throw new Error('Server returned invalid JSON response');
  }
};

export const getUserSubscriptions = async (token: string): Promise<UserSubscriptionsResponse> => {
  const response = await fetch(`${API_BASE_URL}/user/subscriptions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } else {
        // If it's not JSON, it might be an HTML error page
        const text = await response.text();
        if (text.includes('<!DOCTYPE') || text.includes('<html>')) {
          errorMessage = `Server returned HTML instead of JSON. Status: ${response.status}`;
        } else {
          errorMessage = text || errorMessage;
        }
      }
    } catch (parseError) {
      // Keep the original error message if we can't parse the response
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch (parseError) {
    throw new Error('Server returned invalid JSON response');
  }
};

// Activity Feed functionality
interface ActivityItem {
  id: number;
  type: 'follow' | 'unfollow' | 'subscribe';
  username: string;
  displayName?: string;
  timestamp: string;
}

interface ActivityFeedResponse {
  activities: ActivityItem[];
  totalCount: number;
}

export const getActivityFeed = async (token: string, limit: number = 10): Promise<ActivityFeedResponse> => {
  const url = `${API_BASE_URL}/user/activity?limit=${limit}`;
  console.log('🌐 ACTIVITY API - Making request to:', url);
  console.log('🌐 ACTIVITY API - Token (first 20 chars):', token?.substring(0, 20) + '...');
  console.log('🌐 ACTIVITY API - API_BASE_URL:', API_BASE_URL);
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  console.log('🌐 ACTIVITY API - Request headers:', headers);
  
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  console.log('🌐 ACTIVITY API - Response status:', response.status);
  console.log('🌐 ACTIVITY API - Response statusText:', response.statusText);
  console.log('🌐 ACTIVITY API - Response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    console.error('🌐 ACTIVITY API - Request failed with status:', response.status);
    
    // If the endpoint doesn't exist yet, return empty data
    if (response.status === 404) {
      console.log('⚠️ Activity feed endpoint not available yet (404)');
      return { activities: [], totalCount: 0 };
    }
    
    // Check for authentication issues
    if (response.status === 401) {
      console.error('🌐 ACTIVITY API - Authentication failed! Token may be invalid or expired');
      console.error('🌐 ACTIVITY API - Current token:', token);
    }
    
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        console.log('🌐 ACTIVITY API - Error response body:', error);
        errorMessage = error.message || error.error || errorMessage;
      } else {
        const text = await response.text();
        console.log('🌐 ACTIVITY API - Non-JSON error response:', text);
      }
    } catch (parseError) {
      console.log('🌐 ACTIVITY API - Failed to parse error response:', parseError);
    }
    throw new Error(errorMessage);
  }

  try {
    const jsonData = await response.json();
    console.log('🌐 ACTIVITY API - Success response body:', jsonData);
    console.log('🌐 ACTIVITY API - Activities count:', jsonData.activities?.length || 0);
    console.log('🌐 ACTIVITY API - Total count:', jsonData.totalCount);
    return jsonData;
  } catch (parseError) {
    console.error('🌐 ACTIVITY API - Failed to parse JSON response:', parseError);
    const textResponse = await response.text();
    console.error('🌐 ACTIVITY API - Raw response text:', textResponse);
    throw new Error('Server returned invalid JSON response');
  }
};

// Stream Title Management
interface UpdateStreamTitleResponse {
  success: boolean;
  message: string;
  title: string;
}

// Stream title management - attempts backend API first, falls back to localStorage
export const updateStreamTitle = async (token: string, title: string): Promise<UpdateStreamTitleResponse> => {
  try {
    // Try backend API first
    const response = await fetch(`${API_BASE_URL}/user/stream-title`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Stream title updated via backend API:', title);
      return data;
    } else {
      console.log('Backend API not available, using localStorage fallback');
      // Fallback to localStorage
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.id || payload.userId;
      
      if (userId) {
        localStorage.setItem(`streamTitle_${userId}`, title);
      }
      
      return {
        success: true,
        message: 'Stream title updated successfully (stored locally)',
        title: title
      };
    }
  } catch (error) {
    console.error('API error, falling back to localStorage:', error);
    // Fallback to localStorage
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.id || payload.userId;
      
      if (userId) {
        localStorage.setItem(`streamTitle_${userId}`, title);
      }
      
      return {
        success: true,
        message: 'Stream title updated successfully (stored locally)',
        title: title
      };
    } catch (fallbackError) {
      console.error('Both API and localStorage failed:', fallbackError);
      throw new Error('Failed to update stream title');
    }
  }
};

export const getStreamTitle = async (token: string): Promise<{ title: string }> => {
  try {
    // Try backend API first
    const response = await fetch(`${API_BASE_URL}/user/stream-title`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Stream title retrieved from backend API:', data.title);
      return data;
    } else {
      console.log('Backend API not available, using localStorage fallback');
      // Fallback to localStorage
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.id || payload.userId;
      
      let title = '';
      if (userId) {
        title = localStorage.getItem(`streamTitle_${userId}`) || '';
      }
      
      return { title };
    }
  } catch (error) {
    console.error('API error, falling back to localStorage:', error);
    // Fallback to localStorage
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.id || payload.userId;
      
      let title = '';
      if (userId) {
        title = localStorage.getItem(`streamTitle_${userId}`) || '';
      }
      
      return { title };
    } catch (fallbackError) {
      console.error('Both API and localStorage failed:', fallbackError);
      return { title: '' };
    }
  }
};

// Profile Picture Upload
interface ProfilePictureUploadResponse {
  success: boolean;
  message: string;
  profilePictureUrl: string;
}

export const uploadProfilePicture = async (token: string, file: File): Promise<ProfilePictureUploadResponse> => {
  const formData = new FormData();
  formData.append('profilePicture', file);

  const response = await fetch(`${API_BASE_URL}/user/profile-picture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to upload profile picture' }));
    throw new Error(error.message || 'Failed to upload profile picture');
  }

  return await response.json();
};

// Long-term cache for profile data (localStorage-backed for persistence)
const profileCache = new Map<string, { data: { profilePicture?: string; bio?: string; username?: string; followerCount?: number }, timestamp: number }>();
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days - profile pictures rarely change

// Load cache from localStorage on startup
const loadCacheFromStorage = () => {
  try {
    const stored = localStorage.getItem('profilePictureCache');
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.entries(parsed).forEach(([key, value]: [string, any]) => {
        profileCache.set(key, value);
      });
      console.log(`Loaded ${profileCache.size} profile pictures from cache`);
    }
  } catch (error) {
    console.warn('Failed to load profile cache from storage:', error);
  }
};

// Save cache to localStorage
const saveCacheToStorage = () => {
  try {
    const cacheObject = Object.fromEntries(profileCache.entries());
    localStorage.setItem('profilePictureCache', JSON.stringify(cacheObject));
  } catch (error) {
    console.warn('Failed to save profile cache to storage:', error);
  }
};

// Get public user profile (for displaying other users' profile pictures and bio)
export const getPublicUserProfile = async (username: string): Promise<{ profilePicture?: string; bio?: string; username?: string; followerCount?: number }> => {
  // Check cache first - profile pictures rarely change, so we trust long-term cache
  const cached = profileCache.get(username);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Only make API call if we don't have recent cached data
  try {
    const response = await fetch(`${API_BASE_URL}/user/${username}/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  
    if (!response.ok) {
      // If rate limited or error, return cached data if available (even if expired)
      if (cached) {
        console.log(`API error for ${username}, using cached data`);
        return cached.data;
      }
      
      // If no cached data, return empty result and cache it briefly
      const emptyResult = { profilePicture: undefined, bio: undefined, username: undefined, followerCount: undefined };
      profileCache.set(username, { data: emptyResult, timestamp: Date.now() });
      saveCacheToStorage();
      return emptyResult;
    }

    const data = await response.json();
    
    const result = { 
      profilePicture: data.profilePicture,
      bio: data.bio,
      username: data.username,
      followerCount: data.followerCount
    };
    
    // Cache the successful result long-term
    profileCache.set(username, { data: result, timestamp: Date.now() });
    saveCacheToStorage();
    
    return result;
  } catch (error) {
    console.error(`Error fetching profile for ${username}:`, error);
    
    // On network errors, use cached data if available (even if expired)
    if (cached) {
      return cached.data;
    }
    
    // If no cached data available, return empty result
    return { profilePicture: undefined, bio: undefined, username: undefined, followerCount: undefined };
  }
};

// Clear profile cache for a specific user (call when profile is updated via PUSH notification)
export const clearProfileCache = (username: string) => {
  profileCache.delete(username);
  saveCacheToStorage();
  console.log(`Cleared profile cache for ${username} due to profile update`);
};

// Handle profile picture update notification (call this when receiving PUSH notification)
export const handleProfilePictureUpdate = (username: string) => {
  clearProfileCache(username);
  // Optionally pre-fetch the new profile picture
  // getPublicUserProfile(username);
};

// Clear all profile cache (only use for debugging/emergencies)
export const clearAllProfileCache = () => {
  profileCache.clear();
  localStorage.removeItem('profilePictureCache');
  console.log('Cleared all profile picture cache');
};

// Initialize cache from localStorage on startup
loadCacheFromStorage();

// Past streams functionality
interface PastStream {
  id: string;
  title: string;
  date: string;
  duration: string;
  viewerCount: number;
  thumbnailUrl?: string;
}

interface PastStreamsResponse {
  streams: PastStream[];
  totalCount: number;
}

export const getPastStreams = async (username: string): Promise<PastStreamsResponse> => {
  const response = await fetch(`${API_BASE_URL}/user/${username}/past-streams`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // If past streams endpoint doesn't exist, return empty results
    if (response.status === 404) {
      console.log('Past streams endpoint not available');
      return { streams: [], totalCount: 0 };
    }
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch past streams');
  }

  return await response.json();
};

// VoDs and Clips functionality
interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration: string;
  viewCount: number;
  createdAt: string;
  description?: string;
}

interface VoDsResponse {
  videos: VideoItem[];
  totalCount: number;
}

interface ClipsResponse {
  clips: VideoItem[];
  totalCount: number;
}

export const getVoDs = async (username: string): Promise<VoDsResponse> => {
  const response = await fetch(`${API_BASE_URL}/user/${username}/vods`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // If VoDs endpoint doesn't exist, return empty results
    if (response.status === 404) {
      console.log('VoDs endpoint not available');
      return { videos: [], totalCount: 0 };
    }
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch VoDs');
  }

  return await response.json();
};

export const getClips = async (username: string): Promise<ClipsResponse> => {
  const response = await fetch(`${API_BASE_URL}/user/${username}/clips`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // If clips endpoint doesn't exist, return empty results
    if (response.status === 404) {
      console.log('Clips endpoint not available');
      return { clips: [], totalCount: 0 };
    }
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch clips');
  }

  return await response.json();
};

// Create clip functionality (for future clip button implementation)
interface CreateClipResponse {
  success: boolean;
  message: string;
  clipId?: string;
  clipUrl?: string;
}

export const createClip = async (token: string, streamId: string, title?: string): Promise<CreateClipResponse> => {
  const response = await fetch(`${API_BASE_URL}/stream/${streamId}/clip`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title || 'Untitled Clip',
      // Backend will handle capturing the last 30 seconds
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create clip');
  }

  return await response.json();
};

// Password management functionality
export const changePassword = async (token: string, currentPassword: string, newPassword: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/user/change-password`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to change password');
  }

  const data = await response.json();
  return data;
};

export const requestPasswordReset = async (email: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to request password reset');
  }

  const data = await response.json();
  return data;
};

// Thumbnail cleanup function
export const cleanupStreamThumbnails = async (token: string, streamId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/stream/${streamId}/cleanup-thumbnails`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Don't throw error if cleanup endpoint doesn't exist yet
      if (response.status === 404) {
        return;
      }
      const error = await response.json().catch(() => ({ message: 'Failed to cleanup thumbnails' }));
      throw new Error(error.message || 'Failed to cleanup thumbnails');
    }

    const result = await response.json().catch(() => ({}));
    return result;
  } catch (error) {
    // Don't throw - thumbnail cleanup should be non-blocking
  }
};

// Viewer tracking functionality
interface ViewerTrackingResponse {
  success: boolean;
  viewerCount: number;
}

// Generate unique viewer ID for this browser/device (persistent across page refreshes)
const generateViewerId = (): string => {
  // Use a combination of timestamp and random string for uniqueness
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `viewer_${timestamp}_${randomStr}`;
};

// Get or create persistent viewer ID for this browser/device
const getViewerId = (): string => {
  // Check if we have a persistent viewer ID in localStorage
  let viewerId = localStorage.getItem('viewerId');
  
  if (!viewerId) {
    // Generate new viewer ID and persist it
    viewerId = generateViewerId();
    localStorage.setItem('viewerId', viewerId);
    console.log(`🆔 Generated new persistent viewerId: ${viewerId}`);
  } else {
    console.log(`🆔 Using existing persistent viewerId: ${viewerId}`);
  }
  
  return viewerId;
};

// Join a stream as a viewer (increment view count)
export const joinStream = async (streamId: string): Promise<ViewerTrackingResponse> => {
  try {
    const viewerId = getViewerId();
    console.log(`🔗 Joining stream ${streamId} with viewerId: ${viewerId}`);
    
    const response = await fetch(`${API_BASE_URL}/streams/${streamId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ viewerId }),
    });

    if (!response.ok) {
      // If endpoint doesn't exist yet, return mock success
      if (response.status === 404) {
        console.log('Stream join endpoint not available yet');
        return { success: true, viewerCount: 1 };
      }
      const error = await response.json().catch(() => ({ message: 'Failed to join stream' }));
      throw new Error(error.message || 'Failed to join stream');
    }

    const result = await response.json();
    console.log(`✅ Successfully joined stream ${streamId}, viewer count: ${result.viewerCount}`);
    return result;
  } catch (error) {
    console.warn('Stream join failed, continuing without tracking:', error);
    return { success: false, viewerCount: 0 };
  }
};

// Leave a stream as a viewer (decrement view count)
export const leaveStream = async (streamId: string): Promise<ViewerTrackingResponse> => {
  try {
    const viewerId = getViewerId();
    console.log(`🔗 Leaving stream ${streamId} with viewerId: ${viewerId}`);
    
    const response = await fetch(`${API_BASE_URL}/streams/${streamId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ viewerId }),
    });

    if (!response.ok) {
      // If endpoint doesn't exist yet, return mock success
      if (response.status === 404) {
        console.log('Stream leave endpoint not available yet');
        return { success: true, viewerCount: 0 };
      }
      const error = await response.json().catch(() => ({ message: 'Failed to leave stream' }));
      throw new Error(error.message || 'Failed to leave stream');
    }

    const result = await response.json();
    console.log(`✅ Successfully left stream ${streamId}, viewer count: ${result.viewerCount}`);
    return result;
  } catch (error) {
    console.warn('Stream leave failed, continuing without tracking:', error);
    return { success: false, viewerCount: 0 };
  }
};

// Clean up any previous viewer session for this stream (call when page loads)
export const cleanupPreviousViewerSession = async (streamId: string): Promise<void> => {
  try {
    const viewerId = getViewerId();
    console.log(`🧹 Cleaning up any previous viewer session for stream ${streamId} with viewerId: ${viewerId}`);
    
    // Always try to leave in case we were previously viewing this stream
    await leaveStream(streamId);
  } catch (error) {
    // Silently ignore cleanup errors
    console.log('Previous session cleanup completed (errors ignored)');
  }
};

