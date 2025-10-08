import { useEffect, useState, useRef, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import AuthContext from '../contexts/AuthContext';
import ChatComponent from '../components/ChatComponent';
import { getPublicStreamData, followUser, unfollowUser, checkFollowStatus, getPublicFollowerCount, getStreamTitle, getPublicUserProfile, cleanupStreamThumbnails, joinStream, leaveStream, cleanupPreviousViewerSession } from '../services/streamApi';
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
  playbackUrl: string;
};

type QualityOption = {
  label: string;
  value: string;
  url: string;
};

type QualityState = {
  available: QualityOption[];
  current: string;
  isMultibitrate: boolean;
};


export default function StreamPage() {
  const { username } = useParams<{ username: string }>();
  const { isDarkMode } = useDarkMode();
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Helper function for safe player disposal
  const safeDisposePlayer = (resetPlayerInitialized = true) => {
    if (!playerRef.current) return;
    
    const player = playerRef.current;
    
    // Add a small delay to let any running Video.js timers complete
    setTimeout(() => {
      try {
        // Check if player still exists and has dispose method
        if (player && typeof player.dispose === 'function') {
          // Remove all event listeners before disposal (with proper signature)
          try {
            player.off('*'); // Remove all listeners with wildcard
          } catch (e) {
            // If wildcard doesn't work, ignore
          }
          // Check if player element still exists before disposing
          if (player.el() && player.el().parentNode) {
            player.dispose();
          }
        }
      } catch (e) {
        console.log('Player disposal error (expected):', e);
      } finally {
        playerRef.current = null;
        if (resetPlayerInitialized) {
          setPlayerInitialized(false);
        }
      }
    }, 50); // 50ms delay to let timers finish
  };
  const [stream, setStream] = useState<StreamInfo | null>(null);
  const [streamerNotFound, setStreamerNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [playerInitialized, setPlayerInitialized] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamerProfilePicture, setStreamerProfilePicture] = useState<string | null>(null);
  const [streamerBio, setStreamerBio] = useState<string | null>(null);
  const [qualityState, setQualityState] = useState<QualityState>({
    available: [],
    current: 'auto',
    isMultibitrate: false
  });
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  const previousUsernameRef = useRef<string | undefined>(username);
  

  // Track whether follower count has been locally modified
  const [followerCountModified, setFollowerCountModified] = useState(false);
  
  // Track whether viewer count has been locally modified
  const [viewerCountModified, setViewerCountModified] = useState(false);
  
  // Track whether user has joined the stream for view counting
  const [hasJoinedStream, setHasJoinedStream] = useState(false);
  
  
  // Hybrid uptime tracking: backend initial value + client-side incrementation
  const [baseUptime, setBaseUptime] = useState<number>(0); // Base uptime in seconds from backend
  const [uptimeOffset, setUptimeOffset] = useState<number>(0); // Client-side offset in seconds
  const [displayUptime, setDisplayUptime] = useState<string>(''); // Formatted uptime for display
  
  // Utility function to parse backend uptime string to seconds
  const parseUptimeToSeconds = (uptimeString: string): number => {
    if (!uptimeString) return 0;
    
    const parts = uptimeString.split(':');
    if (parts.length === 2) {
      // MM:SS format
      const minutes = parseInt(parts[0], 10) || 0;
      const seconds = parseInt(parts[1], 10) || 0;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // H:MM:SS format
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const seconds = parseInt(parts[2], 10) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  };

  // Utility function to format seconds back to uptime string
  const formatSecondsToUptime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  // Utility function to calculate stream start time for tooltip
  const getStreamStartTime = (): string => {
    if (!baseUptime && !uptimeOffset) return '';
    
    const totalUptimeSeconds = baseUptime + uptimeOffset;
    const now = new Date();
    const startTime = new Date(now.getTime() - (totalUptimeSeconds * 1000));
    
    const month = (startTime.getMonth() + 1).toString().padStart(2, '0');
    const day = startTime.getDate().toString().padStart(2, '0');
    const year = startTime.getFullYear();
    
    const timeString = startTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    return `Stream Uptime (since ${month}/${day}/${year}, ${timeString})`;
  };


  // Quality management functions

  const detectQualities = async (): Promise<QualityState> => {
    if (!stream || !username) {
      return {
        available: [{ label: "Source", value: "source", url: "index.m3u8" }],
        current: 'source',
        isMultibitrate: false
      };
    }

    // Try username-only first (backend may have changed from username_streamId to just username)
    const baseUrl = `https://lb-01.distorted.live/stream/${username}`;
    
    console.log('Detecting qualities for baseUrl:', baseUrl);

    try {
      // 1. Try master playlist first (transcoded qualities)
      const masterPlaylistUrl = `${baseUrl}/index.m3u8`;
      console.log('Trying master playlist:', masterPlaylistUrl);
      
      const masterResponse = await fetch(masterPlaylistUrl);
      console.log('Master playlist response status:', masterResponse.status);
      
      if (masterResponse.ok) {
        const masterPlaylist = await masterResponse.text();
        console.log('Master playlist content:', masterPlaylist);

        if (masterPlaylist.includes('#EXT-X-STREAM-INF')) {
          // Multi-bitrate available!
          console.log('Multi-bitrate detected!');
          const qualities = [
            { label: "Auto", value: "auto", url: `${baseUrl}/index.m3u8` },
            { label: "1080p", value: "1080p", url: `${baseUrl}/1080p/index.m3u8` },
            { label: "720p", value: "720p", url: `${baseUrl}/720p/index.m3u8` },
            { label: "480p", value: "480p", url: `${baseUrl}/480p/index.m3u8` },
            { label: "Audio Only", value: "audio", url: `${baseUrl}/audio/index.m3u8` }
          ];

          return {
            available: qualities,
            current: localStorage.getItem(`quality_${username}`) || 'auto',
            isMultibitrate: true
          };
        }
      }
    } catch (error) {
      console.log('Master playlist error:', error);
    }

    // 2. Fallback to single quality from API
    const fallbackUrl = `${baseUrl}/index.m3u8`;
    console.log('Falling back to single quality:', fallbackUrl);
    
    return {
      available: [{ label: "Source", value: "source", url: fallbackUrl }],
      current: 'source',
      isMultibitrate: false
    };
  };

  const switchQuality = (qualityValue: string) => {
    if (!playerRef.current || !stream || !username) return;
    
    // Check if player is still valid before using it
    try {
      if (!playerRef.current.el()) {
        console.log('Player element no longer valid, skipping quality switch');
        return;
      }
    } catch (e) {
      console.log('Player no longer accessible, skipping quality switch');
      return;
    }

    const quality = qualityState.available.find(q => q.value === qualityValue);
    if (!quality) return;

    // Use the full URL from the quality object
    const newUrl = quality.url;

    // Remember current time
    const currentTime = playerRef.current.currentTime();

    // Switch source
    playerRef.current.src({
      src: newUrl,
      type: 'application/x-mpegURL'
    });

    // Try to seek back to current time after load
    playerRef.current.one('loadeddata', () => {
      if (playerRef.current && currentTime && currentTime > 0) {
        playerRef.current.currentTime(currentTime);
      }
    });

    // Update state and save preference
    setQualityState(prev => ({ ...prev, current: qualityValue }));
    localStorage.setItem(`quality_${username}`, qualityValue);
    setShowSettingsMenu(false);
  };



  // Fetch stream info from API
  useEffect(() => {
    const fetchStreamData = async (isPolling = false) => {
      if (!username) {
        console.error('No username provided in URL');
        return;
      }
      
      
      try {
        const streamData = await getPublicStreamData(username);
        console.log('🔍 Full stream data received:', streamData);
        console.log('📄 Stream bio field:', streamData.bio);
        console.log('🎥 Stream playbackUrl from API:', streamData.playbackUrl);
        
        // Convert API response to StreamInfo format - trust the API status
        let actuallyLive = streamData.status === 'live' || streamData.isLive || false;
        
        // If API says live but we're polling (not initial load), double-check playlist exists
        if (actuallyLive && isPolling && streamData.playbackUrl) {
          try {
            const playlistCheck = await fetch(streamData.playbackUrl, { method: 'HEAD' });
            if (!playlistCheck.ok) {
              console.log('🔴 Playlist 404 during polling, stream ended');
              actuallyLive = false;
            }
          } catch (error) {
            console.log('🔴 Playlist unreachable during polling, stream ended');
            actuallyLive = false;
          }
        }
        let followerCount = streamData.followerCount || 0;
        
        // Only fetch follower count separately on initial load, not during polling
        if (!isPolling && (followerCount === 0 || streamData.followerCount === undefined)) {
          try {
            const followerData = await getPublicFollowerCount(username);
            followerCount = followerData.followerCount;
          } catch (error) {
            console.log('Follower count fetch failed, using 0:', error);
            // Keep the original count or 0
          }
        }

        // Use backend title from Streamlabs OBS if available, fallback to localStorage for stream owner
        let displayTitle = streamData.title;
        
        // Only use localStorage title if backend doesn't provide one AND user is viewing their own stream
        if (!displayTitle && user && token && user.username === username) {
          try {
            const storedTitleData = await getStreamTitle(token);
            if (storedTitleData.title) {
              displayTitle = storedTitleData.title;
            }
          } catch (error) {
          }
        }
        

        const convertedStream: StreamInfo = {
          id: streamData.id.toString(),
          title: displayTitle,
          streamer: streamData.username || streamData.streamer || username,
          viewerCount: streamData.viewerCount || 0, // Backend doesn't track this yet
          description: streamData.description || '',
          category: streamData.category || '', // Don't show category if not provided
          isLive: actuallyLive,
          uptime: streamData.uptime || '', // Don't show uptime if not provided
          followerCount: followerCount,
          playbackUrl: streamData.playbackUrl,
        };
        
        // Use bio from stream data instead of separate profile call
        const bioValue = streamData.bio || null;
        console.log('📄 Setting bio value:', bioValue, '(from stream bio field)');
        setStreamerBio(bioValue);
        
        
        
        // Handle uptime synchronization
        if (convertedStream.isLive && convertedStream.uptime) {
          const backendUptimeSeconds = parseUptimeToSeconds(convertedStream.uptime);
          
          if (!isPolling) {
            // Initial load: set base uptime and reset offset
            setBaseUptime(backendUptimeSeconds);
            setUptimeOffset(0);
            setDisplayUptime(convertedStream.uptime);
          } else {
            // Polling update: sync base uptime, keep client incrementation
            setBaseUptime(backendUptimeSeconds);
            setUptimeOffset(0); // Reset offset to stay in sync
          }
        } else {
          // Stream is offline, clear uptime
          setBaseUptime(0);
          setUptimeOffset(0);
          setDisplayUptime('');
        }
        
        // Check if backend actually provides viewer count data
        // NOTE: Backend currently returns viewerCount: 0 but this isn't connected to Redis viewer tracking yet
        // So we'll ignore the backend viewerCount until it's properly implemented
        const backendProvidesViewerCount = false; // Temporarily disable backend viewer count usage
        
        console.log(`🔍 Backend viewerCount data: ${streamData.viewerCount}, using backend data: ${backendProvidesViewerCount}`);
        
        // If this is polling and we've locally modified counts, preserve them
        if (isPolling && (followerCountModified || viewerCountModified)) {
          setStream(prev => prev ? {
            ...convertedStream,
            followerCount: followerCountModified ? prev.followerCount : convertedStream.followerCount,
            // Use backend viewer count if available, otherwise keep local count
            viewerCount: (viewerCountModified && !backendProvidesViewerCount) ? prev.viewerCount : convertedStream.viewerCount
          } : convertedStream);
          
          // Only reset viewerCountModified if backend actually provides viewer count data
          if (backendProvidesViewerCount) {
            setViewerCountModified(false);
            console.log('🔄 Backend provided viewer count, reset viewerCountModified flag');
          }
        } else {
          // During polling, preserve viewer count if backend doesn't provide it and we have a local count
          if (isPolling && viewerCountModified && !backendProvidesViewerCount) {
            setStream(prev => prev ? {
              ...convertedStream,
              viewerCount: prev.viewerCount // Keep the locally tracked viewer count
            } : convertedStream);
          } else {
            setStream(convertedStream);
          }
          setFollowerCountModified(false); // Reset the flag on fresh data
          
          // Only reset viewerCountModified if backend provides viewer count OR this is initial load
          if (backendProvidesViewerCount || !isPolling) {
            setViewerCountModified(false);
            if (!isPolling) {
              console.log('🔄 Initial load, reset viewerCountModified flag');
            } else {
              console.log('🔄 Backend provided viewer count, reset viewerCountModified flag');
            }
          } else {
            console.log('🔄 Backend does not provide viewer count, keeping viewerCountModified flag');
          }
          
          // Clean up any previous viewer session for this stream (only on initial load)
          if (!isPolling && convertedStream.id) {
            cleanupPreviousViewerSession(convertedStream.id);
          }
          
          // Also check if stream data includes profile picture
          if (streamData.profilePicture) {
            setStreamerProfilePicture(streamData.profilePicture);
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch stream data:', error);
        console.log('Error message:', error.message);
        
        // Check if this is a rate limiting error
        if (error.message?.includes('429') || error.message?.includes('Rate limit') || error.message?.includes('Too Many Requests')) {
          console.log('⚠️ Rate limited, skipping this poll cycle');
          return; // Skip this cycle, don't change any state
        }
        
        // Check if this is a 404 error (streamer not found)
        if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('Streamer not found')) {
          console.log('Setting streamer not found to true');
          setStreamerNotFound(true);
          return; // Exit early, don't set dummy data
        } else if (!isPolling) {
          // Only use fallback data on initial load for other errors
          const dummy: StreamInfo = {
            id: username,
            title: 'Live Stream',
            streamer: username,
            viewerCount: 0,
            description: '',
            category: '', // Don't show category for dummy data
            isLive: false, // Default to offline for dummy data
            uptime: '', // Don't show uptime for dummy data
            followerCount: Math.floor(Math.random() * 10000) + 500,
            playbackUrl: `https://lb-01.distorted.live/stream/${username}/index.m3u8`,
          };
          setStream(dummy);
        }
      }
    };

    // Initial fetch
    fetchStreamData(false);

    // Poll every 60 seconds for updated data (reduced from 15s to avoid rate limiting)
    const pollInterval = setInterval(() => {
      fetchStreamData(true);
    }, 60000); // 60 second polling to avoid 429 rate limits

    return () => clearInterval(pollInterval);
  }, [username, followerCountModified, viewerCountModified]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 StreamPage unmounting, cleaning up player');
      safeDisposePlayer(false); // Don't reset playerInitialized on unmount
    };
  }, []);

  // Check follow status when user is authenticated (skip for own stream)
  useEffect(() => {
    const checkUserFollowStatus = async () => {
      if (!user || !token || !username) return;
      
      // Skip follow status check if user is viewing their own stream
      if (user.username === username) {
        setIsFollowing(false); // User can't follow themselves
        return;
      }
      
      try {
        const { isFollowing: followStatus } = await checkFollowStatus(token, username);
        setIsFollowing(followStatus);
      } catch (error) {
        console.error('Failed to check follow status:', error);
        // Don't show error to user, just assume not following
        setIsFollowing(false);
      }
    };

    checkUserFollowStatus();
  }, [user, token, username]);

  // Fetch streamer's profile picture only (bio comes from stream data)
  useEffect(() => {
    const fetchStreamerProfilePicture = async () => {
      if (!username) {
        return;
      }
      
      try {
        console.log('🔍 Frontend requesting profile picture for:', username);
        const profile = await getPublicUserProfile(username);
        setStreamerProfilePicture(profile.profilePicture || null);
      } catch (error) {
        console.error('❌ Failed to fetch streamer profile picture:', error);
        setStreamerProfilePicture(null);
      }
    };

    fetchStreamerProfilePicture();
  }, [username]);

  // Client-side uptime incrementation timer
  useEffect(() => {
    if (!stream?.isLive || baseUptime === 0) {
      return;
    }

    const updateDisplayUptime = () => {
      const totalSeconds = baseUptime + uptimeOffset;
      setDisplayUptime(formatSecondsToUptime(totalSeconds));
    };

    // Update immediately
    updateDisplayUptime();

    // Then update every second
    const interval = setInterval(() => {
      setUptimeOffset(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [baseUptime, stream?.isLive]);

  // Update display uptime when offset changes
  useEffect(() => {
    if (baseUptime > 0) {
      const totalSeconds = baseUptime + uptimeOffset;
      setDisplayUptime(formatSecondsToUptime(totalSeconds));
    }
  }, [baseUptime, uptimeOffset]);

  // Detect available qualities when stream loads
  useEffect(() => {
    if (stream?.isLive && stream?.id && username) {
      console.log('🟢 Stream went live, detecting qualities');
      detectQualities().then(setQualityState);
      // Reset player initialization flag so player can be created
      setPlayerInitialized(false);
    } else if (stream && !stream.isLive) {
      console.log('🔴 Stream went offline');
      // Clear quality state for offline streams
      setQualityState({ available: [], current: 'source', isMultibitrate: false });
    }
  }, [stream?.isLive, stream?.id, username]);

  // Initialize Video.js once when stream data is first available and stream is live
  useEffect(() => {
    // Only initialize if we have stream data, a video element, haven't initialized yet, stream is live, and quality detection is complete
    if (!stream || !videoRef.current || playerInitialized || !stream.isLive || qualityState.available.length === 0) {
      return;
    }

    // Use the playback URL from the API response
    const streamUrl = stream.playbackUrl;

    // Small delay to ensure DOM is ready
    const initializePlayer = () => {
      if (!videoRef.current || playerInitialized) return;
      
      // Ensure the element is actually in the DOM
      if (!document.contains(videoRef.current)) {
        return;
      }

      try {
        playerRef.current = videojs(videoRef.current, {
        controls: true,
        fluid: true,
        responsive: true,
        autoplay: true,
        muted: true,
        preload: 'auto',
        playsinline: true,
        liveui: true,
        inactivityTimeout: 0,
        bigPlayButton: false,
        fill: true,
        userActions: {
          hotkeys: true,
        },
        // Disable unwanted features for live streams
        playbackRates: false,
        chaptersButton: false,
        descriptionsButton: false,
        subsCapsButton: false,
        audioTrackButton: false,
        html5: {
          vhs: {
            enableLowInitialPlaylist: true,
            experimentalBufferBasedABR: true,
            experimentalLLHLS: true,
            overrideNative: true,
            // Add HLS timeout settings
            withCredentials: false,
            handlePartialData: true,
            bandwidth: 4194304,
            segmentRequestTimeout: 10000,
            playlistRequestTimeout: 10000,
          },
          nativeVideoTracks: false,
          nativeAudioTracks: false,
          nativeTextTracks: false,
        },
        });
      } catch (error) {
        console.error('Failed to initialize video player:', error);
        return;
      }

      // Set source after player is created
      playerRef.current.ready(() => {
        if (playerRef.current) {
          // Use selected quality or default stream URL
          let sourceUrl = streamUrl;
          if (qualityState.available.length > 0) {
            const selectedQuality = qualityState.available.find(q => q.value === qualityState.current);
            if (selectedQuality) {
              sourceUrl = selectedQuality.url;
              console.log('Using quality URL:', sourceUrl);
            } else {
              console.log('Selected quality not found, using stream URL:', sourceUrl);
            }
          } else {
            console.log('No qualities available, using stream URL:', sourceUrl);
          }
          
          playerRef.current.src({
            src: sourceUrl,
            type: 'application/x-mpegURL',
          });

          // Force controls to be visible
          playerRef.current.controls(true);
          playerRef.current.show();
          
          // Prevent video element from being focused (which causes scroll)
          const videoElement = playerRef.current.el()?.querySelector('video');
          if (videoElement) {
            videoElement.setAttribute('tabindex', '-1');
            videoElement.style.outline = 'none';
          }
          
          // Ensure control bar is visible
          const controlBar = playerRef.current.getChild('controlBar');
          if (controlBar) {
            controlBar.show();
            
            // Remove unwanted buttons from control bar
            const unwantedButtons = [
              'playbackRatesMenuButton',
              'chaptersButton', 
              'descriptionsButton',
              'subsCapsButton',
              'audioTrackButton',
              'pictureInPictureToggle'
            ];
            
            // For live streams, also remove the progress control (time slider), skip buttons, and live display
            if (stream.isLive) {
              unwantedButtons.push(
                'progressControl',
                'skipBackward',
                'skipForward',
                'liveDisplay',
                'seekToLive'
              );
            }
            
            unwantedButtons.forEach(buttonName => {
              const button = controlBar.getChild(buttonName);
              if (button) {
                controlBar.removeChild(button);
              }
            });
            
            // Add custom settings button for quality/info controls
            const settingsButton = controlBar.addChild('button', {
              className: 'vjs-settings-button vjs-control vjs-button',
              title: 'Settings'
            });
            
            // Add custom theater mode button before fullscreen button (both will be on the right)
            const fullscreenButton = controlBar.getChild('fullscreenToggle');
            const theaterButton = controlBar.addChild('button', {
              className: 'vjs-theater-button vjs-control vjs-button',
              title: 'Theater Mode'
            });
            
            // Move buttons to correct positions: settings, then theater, then fullscreen
            if (fullscreenButton && theaterButton && settingsButton) {
              const controlBarEl = controlBar.el();
              const settingsEl = settingsButton.el();
              const theaterEl = theaterButton.el();
              const fullscreenEl = fullscreenButton.el();
              
              // Insert settings first (leftmost of right side buttons)
              controlBarEl.insertBefore(settingsEl, fullscreenEl);
              // Insert theater between settings and fullscreen
              controlBarEl.insertBefore(theaterEl, fullscreenEl);
              
              // Make fullscreen icon bigger to match theater mode button
              const fullscreenIcon = fullscreenEl.querySelector('.vjs-icon-fullscreen-enter, .vjs-icon-fullscreen-exit') as HTMLElement;
              if (fullscreenIcon) {
                fullscreenIcon.style.width = '18px';
                fullscreenIcon.style.height = '18px';
              }
            }
            
            // For live streams, add a spacer after the left-side controls to push right-side buttons to the right
            if (stream.isLive) {
              // Insert spacer after volume control but before settings button
              const volumeControl = controlBar.getChild('volumePanel') || controlBar.getChild('muteToggle');
              const spacer = controlBar.addChild('component', {
                className: 'vjs-spacer vjs-control'
              });
              const spacerEl = spacer.el() as HTMLElement;
              spacerEl.style.flex = '1';
              spacerEl.style.minWidth = '0';
              
              // Move spacer to the correct position (after volume, before settings)
              if (volumeControl && settingsButton) {
                const controlBarEl = controlBar.el();
                const spacerElMove = spacer.el();
                const settingsEl = settingsButton.el();
                controlBarEl.insertBefore(spacerElMove, settingsEl);
              }
            }
            
            // Set up settings button icon and functionality
            settingsButton.el().innerHTML = `
              <span class="vjs-icon-placeholder" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 18px; height: 18px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <span class="vjs-control-text" aria-live="polite">Settings</span>
            `;
            
            // Add click handler for settings button
            settingsButton.on('click', () => {
              setShowSettingsMenu(prev => !prev);
            });
            
            // Set initial icon and text based on current state
            const updateTheaterButton = (currentTheaterMode: boolean) => {
              theaterButton.el().innerHTML = `
                <span class="vjs-icon-placeholder" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 18px; height: 18px;">
                    ${currentTheaterMode ? 
                      '<path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9V4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15v4.5m0-4.5h4.5m-4.5 0l5.5 5.5" />' :
                      '<path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />'
                    }
                  </svg>
                </span>
                <span class="vjs-control-text" aria-live="polite">${currentTheaterMode ? 'Exit Theater Mode' : 'Theater Mode'}</span>
              `;
              theaterButton.el().setAttribute('title', currentTheaterMode ? 'Exit Theater Mode' : 'Theater Mode');
            };
            
            // Set initial state
            updateTheaterButton(isTheaterMode);
            
            // Add click handler that properly toggles state
            theaterButton.on('click', () => {
              // If currently in fullscreen, exit fullscreen first, then enter theater mode
              if (isFullscreen) {
                document.exitFullscreen?.() || 
                (document as any).webkitExitFullscreen?.() || 
                (document as any).mozCancelFullScreen?.() || 
                (document as any).msExitFullscreen?.();
                
                // Set theater mode after exiting fullscreen
                setTimeout(() => {
                  setIsTheaterMode(true);
                  updateTheaterButton(true);
                }, 100);
              } else {
                // Normal toggle behavior
                setIsTheaterMode(prev => {
                  const newTheaterMode = !prev;
                  updateTheaterButton(newTheaterMode);
                  return newTheaterMode;
                });
              }
            });
            
            // Store reference for updates
            (playerRef.current as any).theaterButton = theaterButton;
            (playerRef.current as any).updateTheaterButton = updateTheaterButton;
          }

          // Load the video first
          playerRef.current.load();

          // Force autoplay after source is loaded
          playerRef.current.one('canplay', () => {
            if (playerRef.current) {
              // Small delay to ensure the stream is fully ready
              setTimeout(() => {
                if (playerRef.current) {
                  playerRef.current.play()?.catch(() => {
                    // Autoplay blocked by browser policy
                  });
                }
              }, 100);
            }
          });
          
          // Additional attempts for stubborn browsers
          playerRef.current.one('loadeddata', () => {
            setTimeout(() => {
              if (playerRef.current && playerRef.current.paused()) {
                playerRef.current.play()?.catch(() => {});
              }
            }, 500);
          });

          // Add error handling and logging
          playerRef.current.on('error', (event: any) => {
            console.error('Video.js error:', event);
            const error = playerRef.current?.error();
            if (error) {
              console.error('Error details:', {
                code: error.code,
                message: error.message
              });
              
              // Handle playlist/network errors that indicate stream is offline
              if (error.code === 2 || error.code === 4) { // MEDIA_ERR_NETWORK or MEDIA_ERR_SRC_NOT_SUPPORTED
                console.log('Stream appears to be offline due to network/source error, disposing player');
                // Force stream status to offline
                setStream(prevStream => prevStream ? { ...prevStream, isLive: false } : null);
                
                // Use safe disposal
                safeDisposePlayer();
              }
            }
          });

          playerRef.current.on('ended', () => {
            console.log('🔴 Video stream ended, marking as offline');
            // Force stream status to offline when video ends
            setStream(prevStream => prevStream ? { ...prevStream, isLive: false } : null);
          });

          playerRef.current.on('pause', () => {
            // Handle video pause if needed
          });

          playerRef.current.on('stalled', () => {
            // Handle video stall if needed
          });

          playerRef.current.on('waiting', () => {
            // Handle video waiting if needed
          });

          // Remove direct tech access to avoid "dangerous" warning

          // Video timeupdate event removed - was too verbose
        }
      });
    };

    // Initialize player after a small delay
    const timeoutId = setTimeout(() => {
      initializePlayer();
      setPlayerInitialized(true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      // Also dispose player if initialization fails
      if (playerRef.current && !playerInitialized) {
        safeDisposePlayer();
      }
    };
  }, [stream?.id, stream?.isLive, stream?.playbackUrl, qualityState.available.length, qualityState.current]);

  // Clean up player when stream goes offline
  useEffect(() => {
    if (stream && !stream.isLive && playerRef.current) {
      safeDisposePlayer();
      
      // Cleanup thumbnails when stream goes offline
      if (user && token && stream.id) {
        console.log('🧹 Cleaning up thumbnails for stream:', stream.id);
        cleanupStreamThumbnails(token, stream.id);
      }
    } else if (stream && !stream.isLive && !playerRef.current) {
      // Still try to cleanup thumbnails even without player
      if (user && token && stream.id) {
        cleanupStreamThumbnails(token, stream.id);
      }
    }
  }, [stream?.isLive, stream?.id, user, token]);

  // Clean up player when username changes (navigation)
  useEffect(() => {
    const previousUsername = previousUsernameRef.current;
    previousUsernameRef.current = username;
    
    // Only cleanup if username actually changed (not on first render)
    if (previousUsername && previousUsername !== username) {
      if (playerRef.current) {
        safeDisposePlayer();
      }
      
      // Cleanup thumbnails for the previous stream
      if (stream && user && token && stream.id) {
        cleanupStreamThumbnails(token, stream.id);
      }
    }
  }, [username]);

  // Cleanup thumbnails when page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (stream && user && token && stream.id) {
        // Use sendBeacon for reliable cleanup on page unload
        const cleanupUrl = `${import.meta.env.VITE_API_BASE_URL}/stream/${stream.id}/cleanup-thumbnails`;
        const headers = new Headers();
        headers.append('Authorization', `Bearer ${token}`);
        
        // Try sendBeacon first (most reliable for page unload)
        if (navigator.sendBeacon) {
          navigator.sendBeacon(cleanupUrl, '');
        } else {
          // Fallback to synchronous fetch
          fetch(cleanupUrl, {
            method: 'DELETE',
            headers: headers,
            keepalive: true
          }).catch(() => {}); // Ignore errors during page unload
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [stream, user, token]);

  // About section updates are handled by My Channel page directly, no WebSocket needed here

  // Viewer tracking - Join stream when live video starts playing
  useEffect(() => {
    if (stream?.isLive && stream?.id && !hasJoinedStream && playerRef.current && playerInitialized) {
      // Only join when stream is live and player is actually playing
      const handleJoinStream = async () => {
        try {
          console.log(`🔗 Joining stream ${stream.id} for view tracking`);
          const result = await joinStream(stream.id);
          if (result.success) {
            setHasJoinedStream(true);
            // Update local view count if API provides it
            if (result.viewerCount >= 0) { // Accept 0 or positive viewer counts
              console.log(`🎯 Updating UI viewer count to: ${result.viewerCount}`);
              setStream(prev => prev ? { ...prev, viewerCount: result.viewerCount } : null);
              setViewerCountModified(true); // Mark as locally modified
              
              // Reset viewerCountModified after 2 minutes to allow fresh data
              setTimeout(() => {
                setViewerCountModified(false);
              }, 120000);
            }
          }
        } catch (error) {
          console.warn('Failed to join stream for view tracking:', error);
        }
      };

      // Wait for player to actually start playing before counting as a viewer
      const player = playerRef.current;
      if (player) {
        const onPlay = () => {
          handleJoinStream();
          player.off('play', onPlay); // Only join once
        };
        
        // If already playing, join immediately
        if (!player.paused()) {
          handleJoinStream();
        } else {
          player.on('play', onPlay);
        }
      }
    }
  }, [stream?.isLive, stream?.id, hasJoinedStream, playerInitialized]);

  // Viewer tracking - Leave stream when component unmounts or stream goes offline
  useEffect(() => {
    return () => {
      if (hasJoinedStream && stream?.id) {
        console.log(`🔗 Leaving stream ${stream.id} for view tracking`);
        leaveStream(stream.id).catch(error => 
          console.warn('Failed to leave stream for view tracking:', error)
        );
      }
    };
  }, [hasJoinedStream, stream?.id]);

  // Viewer tracking - Leave stream when it goes offline
  useEffect(() => {
    if (hasJoinedStream && stream && !stream.isLive && stream.id) {
      console.log(`🔗 Stream ${stream.id} went offline, leaving for view tracking`);
      leaveStream(stream.id).then(result => {
        setHasJoinedStream(false);
        if (result.viewerCount >= 0) {
          console.log(`🎯 Updating UI viewer count to: ${result.viewerCount} (stream offline)`);
          setStream(prev => prev ? { ...prev, viewerCount: result.viewerCount } : null);
          setViewerCountModified(true); // Mark as locally modified
        }
      }).catch(error => 
        console.warn('Failed to leave stream for view tracking:', error)
      );
    }
  }, [stream?.isLive, hasJoinedStream, stream?.id]);

  // Viewer tracking - Leave stream when username changes (navigation)
  useEffect(() => {
    const previousUsername = previousUsernameRef.current;
    
    if (previousUsername && previousUsername !== username && hasJoinedStream && stream?.id) {
      console.log(`🔗 Username changed from ${previousUsername} to ${username}, leaving stream for view tracking`);
      leaveStream(stream.id).then(() => {
        setHasJoinedStream(false);
      }).catch(error => 
        console.warn('Failed to leave stream for view tracking:', error)
      );
    }
  }, [username, hasJoinedStream, stream?.id]);

  // Viewer tracking - Handle page visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasJoinedStream && stream?.id) {
        // User switched away from tab - leave stream
        console.log(`🔗 Page hidden, leaving stream ${stream.id} for view tracking`);
        leaveStream(stream.id).then(() => {
          setHasJoinedStream(false);
        }).catch(error => 
          console.warn('Failed to leave stream for view tracking:', error)
        );
      } else if (!document.hidden && !hasJoinedStream && stream?.isLive && stream?.id && playerRef.current && !playerRef.current.paused()) {
        // User returned to tab and video is playing - rejoin stream
        console.log(`🔗 Page visible and video playing, rejoining stream ${stream.id} for view tracking`);
        joinStream(stream.id).then(result => {
          if (result.success) {
            setHasJoinedStream(true);
            if (result.viewerCount >= 0) {
              console.log(`🎯 Updating UI viewer count to: ${result.viewerCount} (tab visible)`);
              setStream(prev => prev ? { ...prev, viewerCount: result.viewerCount } : null);
              setViewerCountModified(true); // Mark as locally modified
            }
          }
        }).catch(error => 
          console.warn('Failed to rejoin stream for view tracking:', error)
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasJoinedStream, stream?.id, stream?.isLive]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenActive = !!(document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement);
      
      // If exiting fullscreen, check if we should enter theater mode
      if (!isFullscreenActive && isFullscreen) {
        // Add a small delay to allow state to settle
        // Handle fullscreen exit
      }
      
      setIsFullscreen(isFullscreenActive);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Update theater button and resize player when theater mode changes
  useEffect(() => {
    if (!playerRef.current || !playerInitialized) return;
    
    try {
      // Update theater button
      if ((playerRef.current as any).updateTheaterButton) {
        (playerRef.current as any).updateTheaterButton(isTheaterMode);
      }
      
      // Simple resize trigger - let VideoJS handle the details
      setTimeout(() => {
        if (playerRef.current && playerInitialized) {
          try {
            playerRef.current.trigger('resize');
          } catch (error) {
            // Ignore resize errors
          }
        }
      }, 300);
    } catch (error) {
      // Ignore theater mode update errors
    }
  }, [isTheaterMode, playerInitialized]);

  // Prevent automatic scrolling on default stream page only (not theater mode)
  useEffect(() => {
    if (!isTheaterMode) {
      // Disable scroll restoration for default stream page
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      
      // Ensure page stays at top when stream page loads - immediate
      window.scrollTo(0, 0);
      
      // Prevent any scrolling during video player initialization
      const handleScroll = () => {
        window.scrollTo(0, 0);
      };
      
      // Add scroll listener to prevent any scrolling
      window.addEventListener('scroll', handleScroll, { passive: false });
      
      // Remove the scroll listener after video player has had time to initialize
      const scrollTimeout = setTimeout(() => {
        window.removeEventListener('scroll', handleScroll);
        // Restore scroll restoration behavior after initialization
        if ('scrollRestoration' in history) {
          history.scrollRestoration = 'auto';
        }
      }, 1000);
      
      return () => {
        clearTimeout(scrollTimeout);
        window.removeEventListener('scroll', handleScroll);
        // Restore scroll restoration behavior when leaving
        if ('scrollRestoration' in history) {
          history.scrollRestoration = 'auto';
        }
      };
    }
  }, [isTheaterMode]);

  // Handle theater mode state changes (navbar hiding and body overflow)
  useEffect(() => {
    if (isTheaterMode) {
      // Disable body scrolling
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      // Set a global attribute to completely hide navbar
      document.documentElement.setAttribute('data-theater-mode', 'true');
    } else {
      // Re-enable scrolling when exiting theater mode
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      // Remove theater mode attribute
      document.documentElement.removeAttribute('data-theater-mode');
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.documentElement.removeAttribute('data-theater-mode');
    };
  }, [isTheaterMode]);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSettingsMenu) {
        // Check if click is outside the settings menu and settings button
        const target = event.target as Element;
        const settingsMenu = target.closest('.settings-menu');
        const settingsButton = target.closest('.vjs-settings-button');
        
        if (!settingsMenu && !settingsButton) {
          setShowSettingsMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  const handleFollowToggle = async () => {
    if (!user || !token || !username) {
      // Redirect to login if not authenticated
      navigate('/login');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(token, username);
        setIsFollowing(false);
        // Update follower count in stream state
        if (stream) {
          setStream(prev => prev ? {
            ...prev,
            followerCount: Math.max(0, prev.followerCount - 1)
          } : null);
          setFollowerCountModified(true); // Mark as locally modified
        }
      } else {
        await followUser(token, username);
        setIsFollowing(true);
        // Update follower count in stream state
        if (stream) {
          setStream(prev => prev ? {
            ...prev,
            followerCount: prev.followerCount + 1
          } : null);
          setFollowerCountModified(true); // Mark as locally modified
        }
      }

      // After 2 seconds, refresh the data from the API to get the accurate count
      setTimeout(() => {
        setFollowerCountModified(false); // Allow fresh data to be used
      }, 2000);
    } catch (error) {
      console.error('Follow action failed:', error);
      // Could add a toast notification here
    } finally {
      setFollowLoading(false);
    }
  };


  const formatViewerCount = (count: number | undefined) => {
    if (!count || count === 0) return '0';
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  // Show streamer not found message
  if (streamerNotFound) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="text-center">
          <div className="mb-6">
            <svg className={`mx-auto h-24 w-24 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Streamer Not Found
          </h1>
          <p className={`text-lg mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            We can't find a streamer with the username "{username}"
          </p>
          <div className="space-y-4">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              The streamer might have changed their username, or the link might be incorrect.
            </p>
            <div className="flex gap-4 justify-center">
              <Link 
                to="/home" 
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Home
              </Link>
              <button
                onClick={() => navigate(-1)}
                className={`px-6 py-2 rounded-lg border transition-colors ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-800' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    <div 
      className={`${
        isTheaterMode ? 'h-screen overflow-auto bg-transparent' : 'min-h-screen'
      } ${
        isDarkMode ? (isTheaterMode ? 'text-white' : 'bg-black text-white') : 'bg-gray-50 text-gray-900'
      }`}
      style={{ position: 'relative', top: 0 }}
    >

      <div className={`${
        isTheaterMode 
          ? 'h-screen grid grid-cols-[1fr_320px] gap-0' 
          : 'max-w-7xl mx-auto px-4 py-6'
      }`} style={isTheaterMode ? {minHeight: '100vh'} : {}}>
        <div className={`${
          isTheaterMode 
            ? 'h-full contents'
            : 'grid grid-cols-1 lg:grid-cols-4 gap-6'
        }`}>
          {/* Main Content */}
          <div className={`${
            isTheaterMode 
              ? 'h-full'
              : 'lg:col-span-3 space-y-6'
          }`}>
            {/* Video Player */}
            <div className={`${
              isTheaterMode ? 'h-full w-full relative' : 'relative'
            }`}>
              <div className={`${
                isTheaterMode 
                  ? 'h-full w-full bg-black relative' 
                  : 'aspect-video rounded-xl overflow-hidden shadow-2xl bg-black relative'
              }`}>
                {/* Video Player - Only show when live */}
                {stream.isLive && (
                  <div data-vjs-player className="w-full h-full relative">
                    <video 
                      ref={videoRef} 
                      className={`video-js vjs-default-skin vjs-big-play-centered ${
                        isTheaterMode ? 'w-full h-full' : 'w-full h-full'
                      }`}
                      autoPlay
                      muted
                      playsInline
                      data-setup="{}"
                    />
                  
                  {/* Settings Menu Overlay - positioned above control bar */}
                  {showSettingsMenu && (
                    <div className="absolute bottom-16 right-20 z-30">
                      <div className={`settings-menu rounded-lg shadow-lg border min-w-48 ${
                        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                      }`}>
                        <div className={`px-3 py-2 border-b font-medium text-sm ${
                          isDarkMode ? 'border-gray-700 text-white' : 'border-gray-200 text-gray-900'
                        }`}>
                          Quality
                        </div>
                        <div className="py-1">
                          {qualityState.available.map((quality) => (
                            <button
                              key={quality.value}
                              onClick={() => switchQuality(quality.value)}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                                isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                              } ${
                                qualityState.current === quality.value 
                                  ? (isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900 font-medium')
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{quality.label}</span>
                                {qualityState.current === quality.value && (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LIVE Indicator and Theater Mode Buttons Overlay */}
                  {stream.isLive && (
                    <div className="video-overlay-buttons">
                      {/* Theater Mode Follow/Sub Buttons - Show to the left of LIVE indicator */}
                      {isTheaterMode && user && token && user?.username !== username && (
                        <>
                          <button
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                            className={`px-3 py-1 rounded-lg font-semibold text-xs border-0 transition-all duration-200 ${
                              isFollowing
                                ? 'bg-gray-600 text-gray-300 hover:bg-gray-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={{
                              backgroundColor: isFollowing 
                                ? '#4b5563' 
                                : '#16a34a',
                              color: isFollowing ? '#d1d5db' : 'white'
                            }}
                            onMouseEnter={(e) => {
                              if (!followLoading) {
                                e.currentTarget.style.backgroundColor = isFollowing ? '#374151' : '#15803d';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!followLoading) {
                                e.currentTarget.style.backgroundColor = isFollowing ? '#4b5563' : '#16a34a';
                              }
                            }}
                          >
                            {followLoading ? '...' : isFollowing ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                              </svg>
                            ) : 'Follow'}
                          </button>
                          
                          <button
                            onClick={() => {
                              if (!user) {
                                navigate('/login');
                                return;
                              }
                              // TODO: Implement subscription functionality
                              alert('Subscription feature coming soon! This will support the streamer and platform.');
                            }}
                            className="px-3 py-1 rounded-lg font-semibold text-xs border-0 bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200"
                            style={{
                              backgroundColor: '#2563eb',
                              color: 'white'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#1d4ed8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#2563eb';
                            }}
                          >
                            Subscribe
                          </button>
                        </>
                      )}
                      
                      {/* LIVE Indicator */}
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                        isDarkMode ? 'bg-red-900' : 'bg-red-100'
                      }`}>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className={`text-sm font-medium ${
                          isDarkMode ? 'text-red-300' : 'text-red-700'
                        }`}>
                          LIVE
                        </span>
                      </div>
                    </div>
                  )}
                  </div>
                )}
                
                {/* Offline Message - Outside video player container */}
                {!stream.isLive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                    <div className="text-center text-white">
                      <div className="mb-4">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold">{stream.streamer} is Offline</h3>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stream Info - Hidden in theater mode */}
            {!isTheaterMode && (
              <div className={`rounded-xl p-6 shadow-lg mb-96 ${
                isDarkMode ? 'bg-gray-900' : 'bg-white'
              }`}>
                {/* Streamer Info Section */}
                <div className="flex items-start space-x-4">
                  {/* Streamer Info */}
                  <div className="flex-1">
                    {/* Top line: Streamer name + VoD/Clips placeholders + Counters */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-4">
                        {/* Streamer Profile Picture */}
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold overflow-hidden border border-gray-600 bg-black text-white">
                          {streamerProfilePicture ? (
                            <img 
                              src={streamerProfilePicture} 
                              alt="Profile" 
                              className="w-16 h-16 rounded-full object-cover"
                              onError={() => {
                                console.log('Profile picture failed to load, falling back to initials');
                                setStreamerProfilePicture(null);
                              }}
                            />
                          ) : (
                            stream.streamer?.[0]?.toUpperCase() || 'U'
                          )}
                        </div>
                        <Link 
                          to={`/schedule/${stream.streamer}`}
                          className={`font-semibold text-lg hover:underline ${
                            isDarkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}
                        >
                          {stream.streamer}
                        </Link>
                        
                        {/* VoD and Clips buttons */}
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/${username}/vods`}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                              isDarkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            VoDs
                          </Link>
                          <Link
                            to={`/${username}/clips`}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                              isDarkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Clips
                          </Link>
                        </div>
                      </div>

                      {/* Follow/Subscribe buttons and counters - Far right */}
                      <div className="flex items-center space-x-3">
                        {/* Follow/Subscribe buttons - Only show if not watching own stream */}
                        {user?.username !== username && (
                          <>
                            <button
                              onClick={handleFollowToggle}
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                                isFollowing
                                  ? (isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {isFollowing ? (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                  </svg>
                                  Following
                                </span>
                              ) : 'Follow'}
                            </button>
                            
                            <button
                              onClick={() => {
                                if (!user) {
                                  navigate('/login');
                                  return;
                                }
                                // TODO: Implement subscription functionality
                                alert('Subscription feature coming soon! This will support the streamer and platform.');
                              }}
                              className="px-4 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
                            >
                              Subscribe
                            </button>
                          </>
                        )}

                        {/* Uptime and viewer count badges */}
                        {stream.isLive && displayUptime && (
                          <span 
                            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium cursor-help ${
                              isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'
                            }`}
                            title={getStreamStartTime()}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{displayUptime}</span>
                          </span>
                        )}
                        {stream.isLive && (
                          <span className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                            isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
                          }`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>{formatViewerCount(stream.viewerCount)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Stream Title */}
                    <h1 className={`text-xl font-bold mb-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stream.title}
                    </h1>
                    
                    {/* About Section - Show always for debugging public endpoint */}
                    <div className={`mb-3 p-3 rounded-lg border ${
                      isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          About
                        </h3>
                        {user?.username === username && (
                          <Link
                            to={`/u/${username}`}
                            className={`text-xs px-2 py-1 rounded-md transition-colors ${
                              isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Edit
                          </Link>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {streamerBio || "This streamer is a mystery!"}
                      </p>
                    </div>
                    
                    {/* Stream Description */}
                    {stream.description && (
                      <p className={`text-sm leading-relaxed mb-3 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {stream.description}
                      </p>
                    )}

                    {/* Stream metadata */}
                    <div className="flex items-center space-x-4 text-sm mb-4">
                      {stream.category && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          isDarkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {stream.category}
                        </span>
                      )}
                    </div>


                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Chat Sidebar */}
          <div className={`${
            isTheaterMode 
              ? 'h-screen shadow-lg border-l' 
              : 'rounded-xl shadow-lg overflow-hidden h-[600px]'
          } ${
            isDarkMode ? 'border-gray-800' : 'border-gray-200'
          }`} style={isTheaterMode ? {overflow: 'auto'} : {}}>
            <ChatComponent 
              streamId={stream.id}
              streamName={username}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
