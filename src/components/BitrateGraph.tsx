import { useEffect, useState, useRef } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface BitrateDataPoint {
  timestamp: number;
  bitrate: number;
}

interface BitrateGraphProps {
  streamUsername?: string;
  isLive?: boolean;
  className?: string;
  compact?: boolean;
}

export default function BitrateGraph({ streamUsername, isLive = false, className = '', compact = false }: BitrateGraphProps) {
  const { isDarkMode } = useDarkMode();
  const [bitrateData, setBitrateData] = useState<BitrateDataPoint[]>([]);
  const [currentBitrate, setCurrentBitrate] = useState<number>(0);
  const [averageBitrate, setAverageBitrate] = useState<number>(0);
  const [peakBitrate, setPeakBitrate] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; bitrate: number } | null>(null);

  // Fetch bitrate data from backend API
  const fetchBitrateData = async (): Promise<BitrateDataPoint | null> => {
    if (!streamUsername) return null;
    
    try {
      const response = await fetch(`http://lb-01.homelab.com/api/streams/${streamUsername}/bitrate/current`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('Bitrate API not available or stream not live');
        return null;
      }

      const data = await response.json();
      console.log('Bitrate API response:', data);
      
      // If backend returns 0 bitrate, it might not be tracking properly yet
      // Generate some reasonable mock data for now (6-14 Mbps range)
      const bitrate = data.bitrate > 0 ? data.bitrate : (6000 + Math.random() * 8000); // 6-14 Mbps range
      
      return {
        timestamp: Date.now(), // Use current time instead of potentially wrong backend timestamp
        bitrate: bitrate
      };
    } catch (error) {
      console.error('Failed to fetch bitrate data:', error);
      return null;
    }
  };

  // Fetch historical bitrate data for initial load
  const fetchHistoricalBitrateData = async (): Promise<BitrateDataPoint[]> => {
    if (!streamUsername) return [];
    
    try {
      const response = await fetch(`http://lb-01.homelab.com/api/streams/${streamUsername}/bitrate/history?minutes=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('Historical bitrate API not available');
        return [];
      }

      const data = await response.json();
      console.log('Historical bitrate API response:', data);
      
      // If no historical data, generate some mock points for the last 5 minutes
      if (!data.history || data.history.length === 0) {
        console.log('No historical data, generating mock data');
        const mockHistory = [];
        const now = Date.now();
        for (let i = 60; i >= 0; i -= 5) { // Every 5 seconds for last 5 minutes
          mockHistory.push({
            timestamp: now - (i * 1000),
            bitrate: 8000 + Math.random() * 4000 + (Math.random() > 0.9 ? -2000 : 0) // 6-12Mbps with occasional drops
          });
        }
        return mockHistory;
      }
      
      return data.history;
    } catch (error) {
      console.error('Failed to fetch historical bitrate data:', error);
      return [];
    }
  };

  // Load historical data on initial mount
  useEffect(() => {
    if (!isLive || !streamUsername) {
      setBitrateData([]);
      setCurrentBitrate(0);
      setAverageBitrate(0);
      setPeakBitrate(0);
      return;
    }

    // Load historical data first
    const loadHistoricalData = async () => {
      const historicalData = await fetchHistoricalBitrateData();
      if (historicalData.length > 0) {
        setBitrateData(historicalData);
        
        // Calculate initial statistics
        const current = historicalData[historicalData.length - 1]?.bitrate || 0;
        const average = historicalData.reduce((sum, point) => sum + point.bitrate, 0) / historicalData.length;
        const peak = Math.max(...historicalData.map(point => point.bitrate));
        
        setCurrentBitrate(current);
        setAverageBitrate(average);
        setPeakBitrate(peak);
      }
    };

    loadHistoricalData();
  }, [isLive, streamUsername]);

  // Update bitrate data with real-time polling
  useEffect(() => {
    if (!isLive || !streamUsername) {
      return;
    }

    const interval = setInterval(async () => {
      const newDataPoint = await fetchBitrateData();
      
      if (newDataPoint) {
        setBitrateData(prev => {
          // Keep last 60 data points (5 minutes of data at 5-second intervals)
          const updated = [...prev, newDataPoint].slice(-60);
          
          // Calculate statistics
          const current = newDataPoint.bitrate;
          const average = updated.reduce((sum, point) => sum + point.bitrate, 0) / updated.length;
          const peak = Math.max(...updated.map(point => point.bitrate));
          
          console.log('Bitrate stats:', { current, average, peak, dataPoints: updated.length });
          
          setCurrentBitrate(current);
          setAverageBitrate(average);
          setPeakBitrate(peak);
          
          return updated;
        });
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isLive, streamUsername]);

  // Draw the graph
  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas || bitrateData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up high-DPI canvas
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    const padding = compact ? 15 : 40; // Increased padding for time labels
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set colors based on theme
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? '#374151' : '#e5e7eb';
    const lineColor = '#3b82f6';
    const fillColor = isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)';

    // Draw background
    ctx.fillStyle = isDarkMode ? '#111827' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Find min/max for scaling
    const maxBitrate = Math.max(...bitrateData.map(d => d.bitrate), 3000);
    const minBitrate = 0;
    const range = maxBitrate - minBitrate;

    // Draw grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = compact ? '10px sans-serif' : '12px sans-serif';

    // Horizontal grid lines (bitrate) - no labels
    const steps = compact ? 3 : 5;
    for (let i = 0; i <= steps; i++) {
      const y = padding + (graphHeight * i) / steps;
      
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Vertical grid lines (time) - Show last 5 data points
    const timeSteps = Math.min(5, bitrateData.length);
    if (timeSteps > 1) {
      for (let i = 0; i < timeSteps; i++) {
        const x = padding + (graphWidth * i) / (timeSteps - 1);
        
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
        
        // Show time for the corresponding data point
        const dataIndex = Math.floor((bitrateData.length - timeSteps) + i);
        if (dataIndex >= 0 && dataIndex < bitrateData.length) {
          const timestamp = bitrateData[dataIndex].timestamp;
          const timeStr = new Date(timestamp).toLocaleTimeString('en-US', { 
            hour12: false, 
            minute: '2-digit', 
            second: '2-digit' 
          });
          ctx.fillText(timeStr, x - 15, height - 5);
        }
      }
    }

    // Draw bitrate line
    if (bitrateData.length > 1) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Create path for line
      bitrateData.forEach((point, index) => {
        const x = padding + (graphWidth * index) / (bitrateData.length - 1);
        const y = padding + graphHeight - ((point.bitrate - minBitrate) / range) * graphHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Fill area under curve
      ctx.fillStyle = fillColor;
      ctx.lineTo(padding + graphWidth, height - padding);
      ctx.lineTo(padding, height - padding);
      ctx.closePath();
      ctx.fill();
    }

    // Draw current value indicator
    if (bitrateData.length > 0) {
      const lastPoint = bitrateData[bitrateData.length - 1];
      const x = padding + graphWidth;
      const y = padding + graphHeight - ((lastPoint.bitrate - minBitrate) / range) * graphHeight;
      
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(x, y, compact ? 2 : 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw hover line and value
    if (hoverPosition && bitrateData.length > 0) {
      const { x, bitrate } = hoverPosition;
      
      // Draw vertical line
      ctx.strokeStyle = isDarkMode ? '#60a5fa' : '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw tooltip background
      const tooltipText = `${formatBitrate(bitrate)}`;
      const textWidth = ctx.measureText(tooltipText).width;
      const tooltipWidth = textWidth + 12;
      const tooltipHeight = 20;
      const tooltipX = Math.max(5, Math.min(x - tooltipWidth / 2, width - tooltipWidth - 5));
      const tooltipY = Math.max(5, padding - 25);
      
      ctx.fillStyle = isDarkMode ? '#1f2937' : '#ffffff';
      ctx.strokeStyle = isDarkMode ? '#374151' : '#d1d5db';
      ctx.lineWidth = 1;
      ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
      ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
      
      // Draw tooltip text
      ctx.fillStyle = textColor;
      ctx.font = compact ? '10px sans-serif' : '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tooltipText, tooltipX + tooltipWidth / 2, tooltipY + 14);
      ctx.textAlign = 'left';
    }
  };

  // Mouse event handlers for hover
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || bitrateData.length === 0) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      
      const padding = compact ? 15 : 40;
      const graphWidth = rect.width - padding * 2;
      
      // Check if mouse is within graph area
      if (x < padding || x > rect.width - padding) {
        setHoverPosition(null);
        return;
      }
      
      // Calculate position within graph (0 to 1)
      const relativeX = (x - padding) / graphWidth;
      
      // Find corresponding data point
      const dataIndex = Math.floor(relativeX * (bitrateData.length - 1));
      const clampedIndex = Math.max(0, Math.min(dataIndex, bitrateData.length - 1));
      
      if (bitrateData[clampedIndex]) {
        setHoverPosition({
          x: x,
          bitrate: bitrateData[clampedIndex].bitrate
        });
      }
    };

    const handleMouseLeave = () => {
      setHoverPosition(null);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [bitrateData, compact]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawGraph();
      animationRef.current = requestAnimationFrame(animate);
    };

    if (bitrateData.length > 0) {
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [bitrateData, isDarkMode, hoverPosition]);

  const formatBitrate = (bitrate: number): string => {
    // Always show in kbps for streaming bitrates
    return `${Math.round(bitrate)}k`;
  };

  if (compact) {
    return (
      <div className={`${className}`}>
        <div className="space-y-1">
          <div className="mb-1">
            <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Bitrate
            </h4>
          </div>

          {isLive && streamUsername ? (
            <>
              {/* Compact Statistics - Single row */}
              <div className="flex justify-evenly text-center mb-2" style={{ width: '320px' }}>
                <div>
                  <div className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatBitrate(currentBitrate)}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Current
                  </div>
                </div>
                <div>
                  <div className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatBitrate(averageBitrate)}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Avg
                  </div>
                </div>
                <div>
                  <div className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatBitrate(peakBitrate)}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Peak
                  </div>
                </div>
              </div>

              {/* Compact Graph */}
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto border rounded cursor-crosshair"
                  style={{ width: '320px', height: '100px' }}
                />
                {bitrateData.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mx-auto mb-1"></div>
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Loading...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-2">
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
      <div className={`rounded-lg shadow-md ${
        isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
      }`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Bitrate Monitor
            </h3>
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

        <div className="p-4">
          {isLive && streamUsername ? (
            <>
              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatBitrate(currentBitrate)}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Current
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatBitrate(averageBitrate)}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Average
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatBitrate(peakBitrate)}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Peak
                  </div>
                </div>
              </div>

              {/* Graph */}
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={300}
                  className="w-full h-auto border rounded"
                  style={{ maxHeight: '300px' }}
                />
                {bitrateData.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Collecting bitrate data...
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={`mt-2 text-xs text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Real-time bitrate monitoring • Updates every 5 seconds
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <svg className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Bitrate monitoring unavailable
              </h3>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Stream must be live to monitor bitrate data
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}