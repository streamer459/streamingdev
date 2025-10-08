import { useEffect, useState, useRef, useContext } from 'react';
import { io, Socket } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import AuthContext from '../contexts/AuthContext';

type ChatMessage = {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  isStreamer?: boolean;
  isModerator?: boolean;
  isSystem?: boolean;
};

type ChatComponentProps = {
  streamId: string;
  streamName?: string;
  className?: string;
};

export default function ChatComponent({ streamId, streamName, className = '' }: ChatComponentProps) {
  const { isDarkMode } = useDarkMode();
  const { user, token } = useContext(AuthContext);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasJoinedStream, setHasJoinedStream] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error' | 'session_expired'>('disconnected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  


  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Use scrollIntoView with block: 'nearest' to prevent page scrolling
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'nearest'
      });
    }
  };

  useEffect(() => {
    console.log('Messages state updated, length:', messages.length, messages);
    messagesRef.current = messages; // Keep ref in sync with state
    scrollToBottom();
  }, [messages]);




  // Initialize Socket.IO connection
  useEffect(() => {
    // Allow connection for non-authenticated users to view chat, but skip auth
    const isAuthenticated = user && token;

    console.log('Initializing Socket.IO connection to lb-01.distorted.live/chat');
    const newSocket = io('https://lb-01.distorted.live/chat', {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 3, // Reduced attempts to fail faster
      reconnectionDelay: 2000, // Increased delay between attempts
      forceNew: true,
      auth: isAuthenticated ? {
        token: token,
        username: user.username
      } : {
        token: null,
        username: `Anonymous${Math.floor(Math.random() * 1000)}`
      }
    });

    console.log('Socket.IO instance created, auth:', {
      token: token ? 'present' : 'null',
      username: user?.username || `Anonymous${Math.floor(Math.random() * 1000)}`
    });

    setSocket(newSocket);

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('✅ Connected to chat server');
      setIsConnected(true);
      setIsLoading(false);
      setConnectionStatus('connected');
      
      // Join the stream room using the correct event name
      console.log('📡 Emitting join_stream event with streamId:', streamId);
      console.log('Join stream payload:', { streamId });
      newSocket.emit('join_stream', { streamId });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Chat connection error:', error);
      setIsLoading(false);
      setIsConnected(false);
      setConnectionStatus('error');
      
      // Check if it's an authentication error (expired token)
      if (error.message?.includes('Authentication failed') || error.message?.includes('Unauthorized')) {
        console.error('❌ Chat authentication failed - session expired');
        setConnectionStatus('session_expired');
      }
    });

    // Message handlers - listen for the correct backend event names
    newSocket.on('new_message', (data: any) => {
      console.log('Received new_message event:', data);
      const newMessage: ChatMessage = {
        id: data.id || Date.now().toString(),
        username: data.username || 'Unknown',
        message: data.message || '',
        timestamp: new Date(data.timestamp || Date.now()),
        isStreamer: data.isStreamer || false,
        isModerator: data.isModerator || false,
        isSystem: data.isSystem || false
      };
      
      console.log('Adding message to state:', newMessage);
      setMessages(prev => {
        const updated = [...prev, newMessage];
        console.log('Updated messages array:', updated);
        return updated;
      });
    });

    // Listen for successful room join and chat history
    newSocket.on('joined_stream', (data: any) => {
      console.log('🎉 JOINED STREAM SUCCESS:', data);
      console.log('Data type:', typeof data);
      console.log('Data keys:', Object.keys(data || {}));
      
      // Mark that we successfully joined the stream
      setHasJoinedStream(true);
      
      // If there's chat history in the response, load it
      if (data && data.history && Array.isArray(data.history)) {
        console.log('Loading chat history:', data.history);
        const historyMessages: ChatMessage[] = data.history.map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          username: msg.username || 'Unknown',
          message: msg.message || '',
          timestamp: new Date(msg.timestamp || Date.now()),
          isStreamer: msg.isStreamer || false,
          isModerator: msg.isModerator || false,
          isSystem: msg.isSystem || false
        }));
        
        setMessages(historyMessages);
      } else if (data && Array.isArray(data)) {
        // Handle case where data is directly an array of messages
        console.log('Loading chat history (direct array):', data);
        const historyMessages: ChatMessage[] = data.map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          username: msg.username || 'Unknown',
          message: msg.message || '',
          timestamp: new Date(msg.timestamp || Date.now()),
          isStreamer: msg.isStreamer || false,
          isModerator: msg.isModerator || false,
          isSystem: msg.isSystem || false
        }));
        
        setMessages(historyMessages);
      } else {
        // Add welcome message if no history
        const welcomeMessage = streamName 
          ? `Welcome to ${streamName}'s chat!`
          : `Welcome to the chat!`;
        const systemMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          username: 'System',
          message: welcomeMessage,
          timestamp: new Date(),
          isSystem: true
        };
        setMessages([systemMessage]);
      }
    });

    // Listen for join stream errors
    newSocket.on('join_stream_error', (error: any) => {
      console.error('❌ JOIN STREAM ERROR:', error);
    });

    // Error handling with detailed logging
    newSocket.on('error', (error: any) => {
      console.error('Chat error details:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      
      // Handle specific error types
      if (error?.message === 'Stream not found') {
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          username: 'System',
          message: `Stream "${streamId}" not found. The stream may not be active or registered in the chat system.`,
          timestamp: new Date(),
          isSystem: true
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    });

    // Additional Socket.IO event listeners for debugging
    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from chat server, reason:', reason);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to chat server, attempt:', attemptNumber);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    // Load previous messages if available
    newSocket.on('previous-messages', (previousMessages: any[]) => {
      const formattedMessages: ChatMessage[] = previousMessages.map(msg => ({
        id: msg.id || Date.now().toString(),
        username: msg.username,
        message: msg.message,
        timestamp: new Date(msg.timestamp),
        isStreamer: msg.isStreamer || false,
        isModerator: msg.isModerator || false,
        isSystem: msg.isSystem || false
      }));
      setMessages(formattedMessages);
    });

    return () => {
      newSocket.close();
      setHasJoinedStream(false);
    };
  }, [streamId, token, user?.username]);

  const sendMessage = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!socket || !inputMessage.trim() || !isConnected || !user) {
      return;
    }

    // Temporarily prevent any scrolling
    const currentScrollY = window.scrollY;
    const preventScroll = (e: Event) => {
      e.preventDefault();
      window.scrollTo(0, currentScrollY);
    };
    
    window.addEventListener('scroll', preventScroll, { passive: false });
    document.addEventListener('scroll', preventScroll, { passive: false });

    const messageData = {
      streamId: streamId,
      message: inputMessage.trim()
    };

    console.log('📤 Sending message:', messageData);
    socket.emit('send_message', messageData);
    setInputMessage('');
    
    // Keep focus on input and restore scroll position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
      window.scrollTo(0, currentScrollY);
      window.removeEventListener('scroll', preventScroll);
      document.removeEventListener('scroll', preventScroll);
    }, 0);
  };

  const retryJoinStream = () => {
    if (socket && isConnected) {
      console.log('🔄 Manually retrying join_stream...');
      socket.emit('join_stream', { streamId });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUsernameColor = (message: ChatMessage) => {
    if (message.isSystem) {
      return isDarkMode ? 'text-gray-400' : 'text-gray-500';
    }
    if (message.isStreamer) {
      return isDarkMode ? 'text-green-400' : 'text-green-600';
    }
    if (message.isModerator) {
      return isDarkMode ? 'text-blue-400' : 'text-blue-600';
    }
    return isDarkMode ? 'text-gray-300' : 'text-gray-700';
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-gray-900' : 'bg-white'} ${className}`}>
      {/* Chat Header */}
      <div className={`px-4 py-3 border-b ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Stream Chat</h2>
          {connectionStatus === 'session_expired' && (
            <span className="text-xs text-red-500 flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
              Session expired - please log in again
            </span>
          )}
          {connectionStatus === 'error' && (
            <span className="text-xs text-yellow-500 flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
              Connection Error
            </span>
          )}
          {connectionStatus === 'disconnected' && !isLoading && (
            <span className="text-xs text-gray-500 flex items-center">
              <div className="w-2 h-2 bg-gray-500 rounded-full mr-1"></div>
              Disconnected
            </span>
          )}
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-sm mt-2">Connecting to chat...</p>
          </div>
        ) : !isConnected ? (
          <div className={`text-center ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
            <p className="text-sm font-medium">Chat connection failed</p>
            <p className="text-xs mt-2">
              CORS error: The chat server needs to allow connections from localhost:5173
            </p>
            <p className="text-xs mt-1">
              Backend configuration required to enable development chat.
            </p>
          </div>
        ) : isConnected && !hasJoinedStream ? (
          <div className={`text-center ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
            <p className="text-sm font-medium">Connected but not joined to stream</p>
            <button
              onClick={retryJoinStream}
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              Retry Join Stream
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p className="text-sm">No messages yet. Be the first to say something!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              {msg.isSystem ? (
                // System messages without timestamps
                <p className={`${
                  isDarkMode ? 'text-gray-400 italic' : 'text-gray-500 italic'
                }`}>
                  {msg.message}
                </p>
              ) : (
                // Regular messages with timestamps and usernames
                <>
                  <div className="flex items-baseline space-x-2 mb-1">
                    <span className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatTime(msg.timestamp)}
                    </span>
                    <span className={`font-medium ${getUsernameColor(msg)}`}>
                      {msg.username}
                      {msg.isStreamer && ' 👑'}
                      {msg.isModerator && ' 🛡️'}
                    </span>
                  </div>
                  <p className={`ml-2 ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    {msg.message}
                  </p>
                </>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat Input */}
      <div className={`p-4 border-t ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <form onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          sendMessage();
        }} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                sendMessage();
              }
            }}
            placeholder={
              !isConnected 
                ? "Connecting to chat..." 
                : user 
                ? "Type a message..." 
                : "Login to chat..."
            }
            disabled={!isConnected || !user}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
          />
          <button
            type="submit"
            disabled={!isConnected || !inputMessage.trim() || !user}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
        {!user && (
          <p className={`text-xs mt-2 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <Link to="/login" className="text-blue-500 cursor-pointer hover:underline">Log in</Link> to chat with your username.
          </p>
        )}
      </div>
    </div>
  );
}