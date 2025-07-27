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

const API_BASE_URL = 'http://lb-01.homelab.com/api';

export const getStreamKey = async (token: string): Promise<StreamKeyData> => {
  const response = await fetch(`${API_BASE_URL}/user/stream-key`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch stream key');
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
  category?: string;
  isLive?: boolean;
  status?: 'live' | 'offline';
  uptime?: string;
  followerCount?: number;
  playbackUrl: string;
  createdAt?: string;
  profilePicture?: string; // Add profile picture to stream data
}

export const getPublicStreamData = async (username: string): Promise<PublicStreamData> => {
  const response = await fetch(`${API_BASE_URL}/user/${username}/stream`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch stream data');
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

// Get public user profile (for displaying other users' profile pictures)
export const getPublicUserProfile = async (username: string): Promise<{ profilePicture?: string }> => {
  const response = await fetch(`${API_BASE_URL}/user/${username}/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    // If profile endpoint doesn't exist or user not found, return empty
    return {};
  }

  const data = await response.json();
  return { profilePicture: data.profilePicture };
};

