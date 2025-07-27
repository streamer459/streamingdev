import { useEffect, useState, useRef, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import AuthContext from '../contexts/AuthContext';
import ChatComponent from '../components/ChatComponent';
import { getPublicStreamData, followUser, unfollowUser, checkFollowStatus, getPublicFollowerCount, getStreamTitle, getPublicUserProfile } from '../services/streamApi';
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


export default function StreamPage() {
  const { username } = useParams<{ username: string }>();
  const { isDarkMode } = useDarkMode();
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stream, setStream] = useState<StreamInfo | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [playerInitialized, setPlayerInitialized] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamerProfilePicture, setStreamerProfilePicture] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  

  // Track whether follower count has been locally modified
  const [followerCountModified, setFollowerCountModified] = useState(false);
  
  
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


  // Prevent automatic scrolling when page loads
  useEffect(() => {
    // Disable scroll restoration for this page
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
    }, 1000);
    
    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
      // Restore scroll restoration behavior when leaving
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // Fetch stream info from API
  useEffect(() => {
    const fetchStreamData = async (isPolling = false) => {
      if (!username) {
        console.error('No username provided in URL');
        return;
      }
      
      console.log('Fetching stream data for username:', username, isPolling ? '(polling)' : '(initial)');
      
      try {
        const streamData = await getPublicStreamData(username);
        console.log('Stream data received for:', username);
        console.log('Follower count from API:', streamData.followerCount);
        
        // Debug stream title fields
        console.log('🔍 STREAM TITLE DEBUG - Checking all possible title fields:', {
          title: streamData.title,
          streamTitle: (streamData as any).streamTitle,
          name: (streamData as any).name,
          displayName: (streamData as any).displayName,
          streamName: (streamData as any).streamName,
          allFields: Object.keys(streamData)
        });
        
        // Convert API response to StreamInfo format
        let followerCount = streamData.followerCount || 0;
        
        // If follower count is missing or 0, try to fetch it separately
        if (followerCount === 0 || streamData.followerCount === undefined) {
          try {
            console.log('Follower count missing, fetching separately...');
            const followerData = await getPublicFollowerCount(username);
            followerCount = followerData.followerCount;
            console.log('Fetched follower count separately:', followerCount);
          } catch (error) {
            console.log('Could not fetch follower count separately:', error);
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
              console.log('Using stored stream title as fallback:', displayTitle);
            }
          } catch (error) {
            console.log('Could not fetch stored title:', error);
          }
        }
        
        if (displayTitle) {
          console.log('Using stream title from backend:', displayTitle);
        }

        const convertedStream: StreamInfo = {
          id: streamData.id.toString(),
          title: displayTitle,
          streamer: streamData.username || streamData.streamer || username,
          viewerCount: streamData.viewerCount || 0, // Backend doesn't track this yet
          description: streamData.description || '',
          category: streamData.category || '', // Don't show category if not provided
          isLive: streamData.status === 'live' || streamData.isLive || false,
          uptime: streamData.uptime || '', // Don't show uptime if not provided
          followerCount: followerCount,
          playbackUrl: streamData.playbackUrl,
        };
        
        console.log('Stream data converted successfully');
        console.log('Final follower count:', convertedStream.followerCount);
        
        // Handle uptime synchronization
        if (convertedStream.isLive && convertedStream.uptime) {
          const backendUptimeSeconds = parseUptimeToSeconds(convertedStream.uptime);
          
          if (!isPolling) {
            // Initial load: set base uptime and reset offset
            console.log('Initial uptime sync:', convertedStream.uptime, '=', backendUptimeSeconds, 'seconds');
            setBaseUptime(backendUptimeSeconds);
            setUptimeOffset(0);
            setDisplayUptime(convertedStream.uptime);
          } else {
            // Polling update: sync base uptime, keep client incrementation
            console.log('Uptime sync during polling:', convertedStream.uptime, '=', backendUptimeSeconds, 'seconds');
            setBaseUptime(backendUptimeSeconds);
            setUptimeOffset(0); // Reset offset to stay in sync
          }
        } else {
          // Stream is offline, clear uptime
          setBaseUptime(0);
          setUptimeOffset(0);
          setDisplayUptime('');
        }
        
        // If this is polling and we've locally modified the follower count, preserve it
        if (isPolling && followerCountModified) {
          setStream(prev => prev ? {
            ...convertedStream,
            followerCount: prev.followerCount // Keep the locally modified follower count
          } : convertedStream);
        } else {
          setStream(convertedStream);
          setFollowerCountModified(false); // Reset the flag on fresh data
          
          // Also check if stream data includes profile picture
          if (streamData.profilePicture) {
            setStreamerProfilePicture(streamData.profilePicture);
          }
        }
      } catch (error) {
        console.error('Failed to fetch stream data:', error);
        // Only use fallback data on initial load, not during polling
        if (!isPolling) {
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
            playbackUrl: `http://192.168.1.162:8080/${username}/index.m3u8`,
          };
          console.log('Using fallback dummy data');
          setStream(dummy);
        }
      }
    };

    // Initial fetch
    fetchStreamData(false);

    // Poll every 30 seconds for updated data (like viewer counts)
    const pollInterval = setInterval(() => {
      console.log('Polling for updated stream data...');
      fetchStreamData(true);
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [username, followerCountModified]);

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

  // Fetch streamer's profile picture
  useEffect(() => {
    const fetchStreamerProfile = async () => {
      if (!username) return;
      
      try {
        const profile = await getPublicUserProfile(username);
        setStreamerProfilePicture(profile.profilePicture || null);
      } catch (error) {
        console.error('Failed to fetch streamer profile:', error);
        setStreamerProfilePicture(null);
      }
    };

    fetchStreamerProfile();
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

  // Initialize Video.js once when stream data is first available and stream is live
  useEffect(() => {
    // Only initialize if we have stream data, a video element, haven't initialized yet, and stream is live
    if (!stream || !videoRef.current || playerInitialized || !stream.isLive) {
      return;
    }

    // Use the playback URL from the API response
    const streamUrl = stream.playbackUrl;
    console.log('Initializing video player');

    // Small delay to ensure DOM is ready
    const initializePlayer = () => {
      if (!videoRef.current || playerInitialized) return;

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

      // Set source after player is created
      playerRef.current.ready(() => {
        if (playerRef.current) {
          playerRef.current.src({
            src: streamUrl,
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
            
            unwantedButtons.forEach(buttonName => {
              const button = controlBar.getChild(buttonName);
              if (button) {
                controlBar.removeChild(button);
              }
            });
            
            // Add custom theater mode button before fullscreen button
            // Get reference to fullscreen button to insert theater button before it
            const fullscreenButton = controlBar.getChild('fullscreenToggle');
            const theaterButton = controlBar.addChild('button', {
              className: 'vjs-theater-button vjs-control vjs-button',
              title: 'Theater Mode'
            });
            
            // Move theater button before fullscreen button if fullscreen exists
            if (fullscreenButton && theaterButton) {
              const controlBarEl = controlBar.el();
              const theaterEl = theaterButton.el();
              const fullscreenEl = fullscreenButton.el();
              controlBarEl.insertBefore(theaterEl, fullscreenEl);
            }
            
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
            }
          });

          playerRef.current.on('ended', () => {
            console.log('Video ended event');
          });

          playerRef.current.on('pause', () => {
            console.log('Video paused event');
          });

          playerRef.current.on('stalled', () => {
            console.log('Video stalled event');
          });

          playerRef.current.on('waiting', () => {
            console.log('Video waiting event');
          });

          playerRef.current.on('timeupdate', () => {
            if (playerRef.current) {
              const currentTime = playerRef.current.currentTime();
              if (currentTime !== undefined && currentTime % 30 < 1) { // Log every 30 seconds
                console.log('Video playing, current time:', currentTime);
              }
            }
          });
        }
      });
    };

    // Initialize player after a small delay
    const timeoutId = setTimeout(() => {
      initializePlayer();
      setPlayerInitialized(true);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [stream, stream?.isLive]);

  // Clean up player when stream goes offline
  useEffect(() => {
    if (stream && !stream.isLive && playerRef.current) {
      console.log('Stream went offline, disposing video player');
      playerRef.current.dispose();
      playerRef.current = null;
      setPlayerInitialized(false);
    }
  }, [stream?.isLive]);

  // Clean up player when username changes
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      setPlayerInitialized(false);
    };
  }, [username]);
  

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
        setTimeout(() => {
          console.log('Exited fullscreen, theater mode state:', isTheaterMode);
        }, 100);
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
    if (playerRef.current) {
      console.log('Theater mode changed to:', isTheaterMode);
      
      // Update theater button
      if ((playerRef.current as any).updateTheaterButton) {
        (playerRef.current as any).updateTheaterButton(isTheaterMode);
      }
      
      // Force player to resize to fit new container with longer delay
      setTimeout(() => {
        if (playerRef.current) {
          console.log('Triggering player resize for theater mode');
          
          // Get the player element and container
          const playerEl = playerRef.current.el() as HTMLElement;
          const videoEl = playerRef.current.tech().el() as HTMLVideoElement;
          
          if (playerEl) {
            console.log('Player element dimensions before resize:', {
              width: playerEl.offsetWidth,
              height: playerEl.offsetHeight
            });
            
            // Reset dimensions
            playerEl.style.width = '100%';
            playerEl.style.height = '100%';
            
            if (videoEl) {
              videoEl.style.width = '100%';
              videoEl.style.height = '100%';
            }
            
            // Force layout recalculation
            playerEl.offsetHeight; // Trigger reflow
            
            // Trigger Video.js resize
            playerRef.current.trigger('resize');
            
            // Also try the responsive method
            if (playerRef.current.responsive) {
              playerRef.current.responsive(true);
            }
            
            console.log('Player element dimensions after resize:', {
              width: playerEl.offsetWidth,
              height: playerEl.offsetHeight
            });
          }
        }
      }, 200);
    }
  }, [isTheaterMode]);

  // Prevent scrolling in theater mode
  useEffect(() => {
    if (isTheaterMode) {
      // Disable scrolling
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isTheaterMode]);

  const handleFollowToggle = async () => {
    if (!user || !token || !username) {
      // Redirect to login if not authenticated
      navigate('/login');
      return;
    }

    try {
      if (isFollowing) {
        const response = await unfollowUser(token, username);
        setIsFollowing(false);
        // Update follower count in stream state
        if (stream) {
          setStream(prev => prev ? {
            ...prev,
            followerCount: Math.max(0, prev.followerCount - 1)
          } : null);
          setFollowerCountModified(true); // Mark as locally modified
        }
        console.log('Unfollowed:', response.message);
      } else {
        const response = await followUser(token, username);
        setIsFollowing(true);
        // Update follower count in stream state
        if (stream) {
          setStream(prev => prev ? {
            ...prev,
            followerCount: prev.followerCount + 1
          } : null);
          setFollowerCountModified(true); // Mark as locally modified
        }
        console.log('Followed:', response.message);
      }

      // After 2 seconds, refresh the data from the API to get the accurate count
      setTimeout(() => {
        console.log('Refreshing follower count from API after follow action');
        setFollowerCountModified(false); // Allow fresh data to be used
      }, 2000);
    } catch (error) {
      console.error('Follow action failed:', error);
      // Could add a toast notification here
    }
  };


  const formatViewerCount = (count: number | undefined) => {
    if (!count || count === 0) return '0';
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
    <div 
      className={`${
        isTheaterMode ? 'h-screen overflow-hidden bg-transparent' : 'min-h-screen'
      } ${
        isDarkMode ? (isTheaterMode ? 'text-white' : 'bg-black text-white') : 'bg-gray-50 text-gray-900'
      }`}
      style={{ position: 'relative', top: 0 }}
    >

      <div className={`${
        isTheaterMode 
          ? 'h-screen grid grid-cols-[1fr_320px] gap-0' 
          : 'max-w-7xl mx-auto px-4 py-6'
      }`} style={isTheaterMode ? {height: '100vh', overflow: 'hidden'} : {}}>
        <div className={`${
          isTheaterMode 
            ? 'h-screen contents'
            : 'grid grid-cols-1 lg:grid-cols-4 gap-6'
        }`}>
          {/* Main Content */}
          <div className={`${
            isTheaterMode 
              ? 'h-screen'
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
                  
                  {/* LIVE Indicator Overlay */}
                  {stream.isLive && (
                    <div className="video-overlay-buttons">
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
                            />
                          ) : (
                            stream.streamer?.[0]?.toUpperCase() || 'U'
                          )}
                        </div>
                        <Link 
                          to={`/u/${stream.streamer}`}
                          className={`font-semibold text-lg hover:underline ${
                            isDarkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}
                        >
                          {stream.streamer}
                        </Link>
                        
                        {/* VoD and Clips placeholders */}
                        <div className="flex items-center space-x-2">
                          <button 
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                              isDarkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            disabled
                          >
                            VoDs
                          </button>
                          <button 
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                              isDarkMode 
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            disabled
                          >
                            Clips
                          </button>
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
          }`} style={isTheaterMode ? {overflow: 'hidden', maxHeight: '100vh'} : {}}>
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
