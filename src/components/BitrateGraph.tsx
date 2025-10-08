import { useEffect, useState, useRef, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type TooltipItem
} from 'chart.js';
import { io, Socket } from 'socket.io-client';
import { useDarkMode } from '../contexts/DarkModeContext';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BitrateDataPoint {
  timestamp: number;
  bitrate: number;
  streamId?: number;
  username?: string;
}

interface BitrateGraphProps {
  streamUsername?: string;
  isLive?: boolean;
  className?: string;
  compact?: boolean;
  visible?: boolean; // For tab visibility to control subscriptions
}

export default function BitrateGraph({ 
  streamUsername, 
  isLive = false, 
  className = '', 
  compact = false, 
  visible = true 
}: BitrateGraphProps) {
  const { isDarkMode } = useDarkMode();
  const [bitrateData, setBitrateData] = useState<BitrateDataPoint[]>([]);
  const [bitrateQuality, setBitrateQuality] = useState<'good' | 'intermittent' | 'poor' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  // Analyze bitrate quality based on recent data
  const analyzeBitrateQuality = useCallback((data: BitrateDataPoint[]) => {
    if (data.length < 3) {
      setBitrateQuality('unknown');
      return;
    }

    // Analyze last 30 data points (about 2.5 minutes of data)
    const recent = data.slice(-30);
    const average = recent.reduce((sum, point) => sum + point.bitrate, 0) / recent.length;
    const minimum = Math.min(...recent.map(point => point.bitrate));
    const maximum = Math.max(...recent.map(point => point.bitrate));
    
    // Calculate stability metrics
    const significantDrops = recent.filter(point => point.bitrate < average * 0.75).length; // 25% below average
    const severeDrops = recent.filter(point => point.bitrate < average * 0.5).length; // 50% below average
    const dropPercentage = significantDrops / recent.length;
    const severeDropPercentage = severeDrops / recent.length;
    const stability = (maximum - minimum) / average; // Lower is more stable
    
    console.log('📊 Quality Analysis:', {
      points: recent.length,
      average: Math.round(average),
      minimum: Math.round(minimum), 
      maximum: Math.round(maximum),
      dropPercentage: Math.round(dropPercentage * 100) + '%',
      severeDropPercentage: Math.round(severeDropPercentage * 100) + '%',
      stability: Math.round(stability * 100) / 100
    });
    
    // Enhanced quality thresholds
    if (average >= 3000 && dropPercentage < 0.15 && severeDropPercentage === 0) {
      // GOOD: >3Mbps average, <15% drops, no severe drops
      setBitrateQuality('good');
    } else if (average >= 1500 && dropPercentage < 0.35 && severeDropPercentage < 0.1) {
      // INTERMITTENT: >1.5Mbps average, <35% drops, <10% severe drops  
      setBitrateQuality('intermittent');
    } else {
      // POOR: Low average, frequent drops, or many severe drops
      setBitrateQuality('poor');
    }
  }, []);

  // Initialize WebSocket connection for real-time bitrate updates
  const initializeSocket = useCallback(() => {
    if (!streamUsername || !isLive || !visible) return;
    
    if (socketRef.current?.connected) {
      console.log('🔄 Bitrate socket already connected');
      return socketRef.current;
    }

    console.log('🚀 Initializing bitrate WebSocket connection...');
    setConnectionStatus('connecting');
    
    // Connect to same endpoint as chat but for bitrate data
    socketRef.current = io('https://lb-01.distorted.live/chat', {
      transports: ['polling', 'websocket'], // Same order as chat
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      forceNew: false, // Allow reusing existing connection
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔗 Bitrate WebSocket connected');
      setConnectionStatus('connected');
      
      // Subscribe to bitrate updates
      console.log('📡 Emitting subscribe_bitrate for username:', streamUsername);
      socket.emit('subscribe_bitrate', { username: streamUsername });
    });

    socket.on('disconnect', (reason) => {
      console.log('📡 Bitrate WebSocket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.warn('⚠️ Bitrate WebSocket connection error:', error.message);
      setConnectionStatus('disconnected');
    });

    // Listen for real-time bitrate updates
    socket.on('bitrate_update', (data: BitrateDataPoint) => {
      console.log('📊 Received bitrate update:', data);
      
      setBitrateData(prev => {
        // Keep last 60 data points (5 minutes at 5-second intervals)
        const newData = [...prev, {
          timestamp: data.timestamp,
          bitrate: data.bitrate,
          streamId: data.streamId,
          username: data.username
        }].slice(-60);
        
        // Analyze quality after updating data
        analyzeBitrateQuality(newData);
        
        return newData;
      });
    });

    return socket;
  }, [streamUsername, isLive, visible, analyzeBitrateQuality]);

  // Clean up socket connection
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe_bitrate');
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnectionStatus('disconnected');
      console.log('📡 Bitrate WebSocket disconnected and cleaned up');
    }
  }, []);

  // Test API endpoints directly
  const testApiEndpoints = useCallback(async () => {
    if (!streamUsername) return;
    
    console.log('🧪 TESTING API ENDPOINTS FOR:', streamUsername);
    const API_BASE_URL = 'https://lb-01.distorted.live/api';
    
    // Test all three endpoints
    const endpoints = [
      { name: 'Current', url: `${API_BASE_URL}/streams/${streamUsername}/bitrate/current` },
      { name: 'History', url: `${API_BASE_URL}/streams/${streamUsername}/bitrate/history?minutes=5` },
      { name: 'Stats', url: `${API_BASE_URL}/streams/${streamUsername}/bitrate/stats` }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`📡 Testing ${endpoint.name} endpoint:`, endpoint.url);
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log(`📊 ${endpoint.name} Response Status:`, response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${endpoint.name} Data:`, data);
        } else {
          const errorText = await response.text();
          console.log(`❌ ${endpoint.name} Error:`, errorText);
        }
      } catch (error) {
        console.error(`🚫 ${endpoint.name} Network Error:`, error);
      }
    }
  }, [streamUsername]);

  // Fetch historical bitrate data for initial load
  const fetchHistoricalData = useCallback(async () => {
    if (!streamUsername || !isLive) return;
    
    console.log('📈 Fetching historical data for:', streamUsername, 'isLive:', isLive);
    setIsLoading(true);
    
    // First test all endpoints
    await testApiEndpoints();
    
    try {
      const API_BASE_URL = 'https://lb-01.distorted.live/api';
      const historyUrl = `${API_BASE_URL}/streams/${streamUsername}/bitrate/history?minutes=5`;
      console.log('📡 Fetching from:', historyUrl);
      
      const response = await fetch(historyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 History Response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Historical bitrate API error:', errorText);
        return;
      }

      const data = await response.json();
      console.log('📈 Historical bitrate data loaded:', data);
      console.log('📊 Data structure:', {
        hasHistory: !!data.history,
        historyLength: data.history?.length || 0,
        firstItem: data.history?.[0],
        lastItem: data.history?.[data.history?.length - 1]
      });
      
      if (data.history && data.history.length > 0) {
        console.log('✅ Setting bitrate data with', data.history.length, 'points');
        setBitrateData(data.history);
        
        // Analyze initial quality
        analyzeBitrateQuality(data.history);
      } else {
        console.log('📊 No historical data available, trying current endpoint...');
        // Try current endpoint as fallback
        const currentUrl = `${API_BASE_URL}/streams/${streamUsername}/bitrate/current`;
        const currentResponse = await fetch(currentUrl);
        if (currentResponse.ok) {
          const currentData = await currentResponse.json();
          console.log('📊 Current data:', currentData);
          if (currentData.bitrate !== undefined) {
            const currentPoint = {
              timestamp: Date.now(),
              bitrate: currentData.bitrate,
              streamId: currentData.streamId,
              username: currentData.username
            };
            setBitrateData([currentPoint]);
            console.log('✅ Set single current data point with bitrate:', currentData.bitrate);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch historical bitrate data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [streamUsername, isLive, testApiEndpoints]);

  // Add debug mode for tracking
  useEffect(() => {
    if (streamUsername && visible) {
      console.log('🚀 BitrateGraph initialized for:', streamUsername);
      console.log('📊 Props:', { isLive, visible, streamUsername });
      console.log('📈 Current data length:', bitrateData.length);
    }
  }, [streamUsername, isLive, visible, bitrateData.length]);

  // Effect for managing WebSocket connection and data loading
  useEffect(() => {
    if (!isLive || !streamUsername || !visible) {
      // Clean up when not live, no username, or not visible
      console.log('⏹️ Stopping BitGraph - isLive:', isLive, 'username:', streamUsername, 'visible:', visible);
      disconnectSocket();
      setBitrateData([]);
      setBitrateQuality('unknown');
      return;
    }

    console.log('🎯 Starting data fetching process for:', streamUsername);
    
    // Load historical data first
    fetchHistoricalData();
    
    // Initialize WebSocket connection
    initializeSocket();
    
    return () => {
      // Cleanup on unmount or dependency change
      console.log('🧹 Cleaning up BitrateGraph...');
      disconnectSocket();
    };
  }, [isLive, streamUsername, visible, fetchHistoricalData, initializeSocket, disconnectSocket]);

  // Add 10-second polling for real-time updates when Analytics tab is visible
  useEffect(() => {
    console.log('📋 Polling effect triggered - isLive:', isLive, 'username:', streamUsername, 'visible:', visible);
    
    if (!isLive || !streamUsername || !visible) {
      console.log('⏸️ Polling conditions not met, skipping');
      return;
    }

    console.log('⏰ Starting 10-second polling for Analytics tab:', streamUsername);
    
    let pollCount = 0;
    const pollInterval = setInterval(async () => {
      pollCount++;
      console.log(`🔄 Polling attempt #${pollCount} for updated bitrate data...`);
      
      try {
        const API_BASE_URL = 'https://lb-01.distorted.live/api';
        const url = `${API_BASE_URL}/streams/${streamUsername}/bitrate/history?minutes=5`;
        console.log('📡 Polling URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('📊 Polling response:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📈 Polled data structure:', {
            hasHistory: !!data.history,
            historyLength: data.history?.length || 0,
            firstPoint: data.history?.[0],
            lastPoint: data.history?.[data.history?.length - 1]
          });
          
          if (data.history) {
            setBitrateData(data.history);
            if (data.history.length > 0) {
              analyzeBitrateQuality(data.history);
              console.log('✅ Updated graph with', data.history.length, 'data points at', new Date().toLocaleTimeString());
            } else {
              console.log('📊 History endpoint returned empty array - no data points yet');
              setBitrateQuality('unknown');
            }
          } else {
            console.log('📊 No history field in response');
          }
        } else {
          const errorText = await response.text();
          console.log('⚠️ Polling failed:', response.status, response.statusText, errorText);
        }
      } catch (error) {
        console.warn('🚫 Polling error:', error);
      }
    }, 10000); // Poll every 10 seconds

    return () => {
      console.log('🛑 Stopping 10-second polling after', pollCount, 'attempts');
      clearInterval(pollInterval);
    };
  }, [isLive, streamUsername, visible, analyzeBitrateQuality]);

  // Format bitrate for display
  const formatBitrate = (bitrate: number): string => {
    if (bitrate >= 1000) {
      return `${Math.round(bitrate / 1000 * 10) / 10}M`;
    }
    return `${Math.round(bitrate)}k`;
  };

  // Prepare chart data
  const chartData = {
    labels: bitrateData.map(point => {
      const date = new Date(point.timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        minute: '2-digit', 
        second: '2-digit' 
      });
    }),
    datasets: [
      {
        label: 'Bitrate (kbps)',
        data: bitrateData.map(point => point.bitrate),
        borderColor: '#3b82f6',
        backgroundColor: isDarkMode 
          ? 'rgba(59, 130, 246, 0.1)' 
          : 'rgba(59, 130, 246, 0.05)',
        borderWidth: 2,
        fill: true,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#3b82f6',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      }
    ]
  };

  // Chart options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        titleColor: isDarkMode ? '#e5e7eb' : '#374151',
        bodyColor: isDarkMode ? '#e5e7eb' : '#374151',
        borderColor: isDarkMode ? '#374151' : '#d1d5db',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          title: (tooltipItems: TooltipItem<'line'>[]) => {
            if (tooltipItems.length > 0) {
              const index = tooltipItems[0].dataIndex;
              const timestamp = bitrateData[index]?.timestamp;
              if (timestamp) {
                return new Date(timestamp).toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
              }
            }
            return '';
          },
          label: (context: TooltipItem<'line'>) => {
            return `Bitrate: ${formatBitrate(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: !compact,
        grid: {
          color: isDarkMode ? '#374151' : '#e5e7eb',
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          font: {
            size: compact ? 10 : 12,
          },
          maxTicksLimit: compact ? 3 : 6,
        },
      },
      y: {
        display: !compact,
        beginAtZero: true,
        grid: {
          color: isDarkMode ? '#374151' : '#e5e7eb',
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          font: {
            size: compact ? 10 : 12,
          },
          callback: function(value) {
            return formatBitrate(Number(value));
          },
          maxTicksLimit: compact ? 3 : 5,
        },
      },
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
    elements: {
      line: {
        borderJoinStyle: 'round',
      },
    },
  };

  // Status indicator component
  const StatusIndicator = () => {
    if (!isLive) return null;
    
    const getStatusColor = () => {
      switch (connectionStatus) {
        case 'connected': return 'bg-green-500';
        case 'connecting': return 'bg-yellow-500';
        case 'disconnected': return 'bg-red-500';
        default: return 'bg-gray-500';
      }
    };
    
    const getStatusText = () => {
      switch (connectionStatus) {
        case 'connected': return 'Connected';
        case 'connecting': return 'Connecting...';
        case 'disconnected': return 'Disconnected';
        default: return 'Unknown';
      }
    };
    
    return (
      <div className={`flex items-center space-x-2 text-xs ${
        isDarkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          getStatusColor()
        } ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`} />
        <span>{getStatusText()}</span>
      </div>
    );
  };

  if (compact) {
    return (
      <div className={`${className}`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Bitrate Monitor
            </h4>
            <StatusIndicator />
          </div>

          {isLive && streamUsername ? (
            <>
              {/* Quality Indicator */}
              <div className="mb-2">
                <div className={`inline-flex items-center space-x-2 px-2 py-1 rounded-full text-xs ${
                  bitrateQuality === 'good' ? (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700') :
                  bitrateQuality === 'intermittent' ? (isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700') :
                  bitrateQuality === 'poor' ? (isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700') :
                  (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    bitrateQuality === 'good' ? 'bg-green-500' :
                    bitrateQuality === 'intermittent' ? 'bg-yellow-500' :
                    bitrateQuality === 'poor' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`} />
                  <span className="capitalize">{bitrateQuality === 'unknown' ? 'Monitoring' : bitrateQuality}</span>
                </div>
              </div>

              {/* Compact Chart */}
              <div className="relative h-24">
                {bitrateData.length > 0 ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto mb-1"></div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Loading...
                          </div>
                        </>
                      ) : (
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Waiting for data...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Available when live
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className={`rounded-lg shadow-sm ${
        isDarkMode 
          ? 'bg-black border border-gray-800' 
          : 'bg-white border border-gray-200'
      }`}>
        <div className={`p-4 border-b ${
          isDarkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Bitrate Monitor
            </h3>
            <div className="flex items-center space-x-3">
              <StatusIndicator />
              {isLive && (
                <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs ${
                  isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
                }`}>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span>LIVE</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          {isLive && streamUsername ? (
            <>
              {/* Quality Status and Data Points */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center space-x-3`}>
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Stream Quality:
                    </span>
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                      bitrateQuality === 'good' ? (isDarkMode ? 'bg-green-900 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-200') :
                      bitrateQuality === 'intermittent' ? (isDarkMode ? 'bg-yellow-900 text-yellow-300 border border-yellow-700' : 'bg-yellow-100 text-yellow-700 border border-yellow-200') :
                      bitrateQuality === 'poor' ? (isDarkMode ? 'bg-red-900 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-200') :
                      (isDarkMode ? 'bg-gray-800 text-gray-300 border border-gray-600' : 'bg-gray-100 text-gray-600 border border-gray-200')
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        bitrateQuality === 'good' ? 'bg-green-500' :
                        bitrateQuality === 'intermittent' ? 'bg-yellow-500' :
                        bitrateQuality === 'poor' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`} />
                      <span className="capitalize">{bitrateQuality === 'unknown' ? 'Analyzing' : bitrateQuality}</span>
                    </div>
                  </div>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {bitrateData.length} data points
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className={`relative h-80 rounded-lg border ${
                isDarkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'
              } p-4`}>
                {bitrateData.length > 0 ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                          <div className={`text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Loading bitrate data...
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={`text-4xl mb-2 ${
                            isDarkMode ? 'text-gray-600' : 'text-gray-400'
                          }`}>📊</div>
                          <div className={`text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Waiting for real-time data...
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={`mt-3 text-xs text-center ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>
                Real-time bitrate monitoring via WebSocket • Last 5 minutes
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className={`text-6xl mb-4 ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>📈</div>
              <h3 className={`text-xl font-medium mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Bitrate Analytics
              </h3>
              <p className={`${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Real-time bitrate monitoring will appear here when you're streaming
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}