import { io, Socket } from 'socket.io-client';
import { handleProfilePictureUpdate } from './streamApi';

let profileSocket: Socket | null = null; // Separate socket for profile updates
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Extract the base URL without the /api path for WebSocket connection
const getWebSocketUrl = () => {
  if (API_BASE_URL) {
    // Remove /api from the end if present
    return API_BASE_URL.replace(/\/api$/, '');
  }
  // Fallback to current domain
  return window.location.origin;
};

// Initialize PROFILE WebSocket (separate from chat)
export const initializeWebSocket = () => {
  if (profileSocket?.connected) {
    console.log('🔄 Reusing existing PROFILE WebSocket connection');
    return profileSocket;
  }

  if (profileSocket && !profileSocket.connected) {
    console.log('🔄 PROFILE WebSocket exists but disconnected, reconnecting...');
    profileSocket.connect();
    return profileSocket;
  }

  const wsUrl = getWebSocketUrl();

  // Connect to MAIN namespace for profile updates (separate from chat)
  profileSocket = io(wsUrl, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  });

  profileSocket.on('connect', () => {
    // Profile WebSocket connected - ready to receive profile updates
  });

  profileSocket.on('disconnect', (reason) => {
    console.log('Profile WebSocket disconnected:', reason);
  });

  profileSocket.on('connect_error', (error) => {
    console.warn('Profile WebSocket connection error:', error.message);
  });

  // Listen for profile picture updates
  profileSocket.on('profile_picture_updated', (data: { username: string }) => {
    handleProfilePictureUpdate(data.username);
  });

  return profileSocket;
};

export const disconnectWebSocket = () => {
  if (profileSocket) {
    profileSocket.disconnect();
    profileSocket = null;
    console.log('PROFILE WebSocket disconnected');
  }
};

export const getSocket = () => profileSocket;

// Add profile update listener (use existing socket, don't create new one)
export const addProfileUpdateListener = (callback: (data: { username: string; bio: string; displayName: string }) => void) => {
  if (profileSocket) {
    console.log('Adding profile_updated listener, socket connected:', profileSocket.connected);
    profileSocket.on('profile_updated', callback);
  } else {
    console.error('No profile socket available when adding listener');
  }
  return profileSocket;
};

// Remove profile update listener
export const removeProfileUpdateListener = (callback: (data: { username: string; bio: string; displayName: string }) => void) => {
  if (profileSocket) {
    profileSocket.off('profile_updated', callback);
  }
};

// Re-export the profile update handler for convenience
export { handleProfilePictureUpdate } from './streamApi';