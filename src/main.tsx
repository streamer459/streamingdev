import './App.css'; // Tailwind CSS and custom styles
import 'video.js/dist/video-js.css'; // 📺 Video.js default styles
import './video-player.css'; // 🎮 Custom Video.js controls styling

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { initializeWebSocket, disconnectWebSocket } from './services/websocket';

// Initialize WebSocket connection for profile picture updates
initializeWebSocket();

// Cleanup WebSocket on page unload
window.addEventListener('beforeunload', () => {
  disconnectWebSocket();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DarkModeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </DarkModeProvider>
  </React.StrictMode>,
);