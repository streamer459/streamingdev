import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ResetPassword from './pages/Auth/ResetPassword';
import TwoFactor from './pages/Auth/TwoFactor';

import Navbar from './components/Navbar';

import Home from './pages/Home';
import Profile from './pages/Account/Profile';
import Security from './pages/Account/Security';
import StreamPage from './pages/StreamPage';
import ChannelPage from './pages/ChannelPage';
import Schedule from './pages/Schedule';
import Videos from './pages/Videos';
import Subscriptions from './pages/Subscriptions';

import PrivateRoute from './components/PrivateRoute';
import TokenDebugger from './components/TokenDebugger';

export default function AppRoutes() {
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Listen for theater mode changes via DOM attribute
  useEffect(() => {
    const checkTheaterMode = () => {
      const theaterMode = document.documentElement.hasAttribute('data-theater-mode');
      setIsTheaterMode(theaterMode);
    };

    // Initial check
    checkTheaterMode();

    // Set up a MutationObserver to watch for attribute changes
    const observer = new MutationObserver(checkTheaterMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theater-mode']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Show Navbar on any route except some auth pages and theater mode */}
      <Routes>
        <Route path="/signup" element={null} />
        <Route path="/reset-password" element={null} />
        <Route path="/2fa" element={null} />
        <Route path="/*" element={!isTheaterMode ? <Navbar /> : null} />
      </Routes>

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/2fa" element={<TwoFactor />} />

        {/* Protected routes under PrivateRoute */}
        <Route element={<PrivateRoute />}>
          <Route path="/account/profile" element={<Profile />} />
          <Route path="/account/security" element={<Security />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/u/:username" element={<ChannelPage />} />
        </Route>

        {/* Stream pages (streaming is public) */}
        <Route path="/:username" element={<StreamPage />} />
        
        {/* Schedule pages (public) */}
        <Route path="/schedule/:username" element={<Schedule />} />
        
        {/* Video pages (public) */}
        <Route path="/:username/vods" element={<Videos />} />
        <Route path="/:username/clips" element={<Videos />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      
      {/* Token debugger - only in development */}
      {import.meta.env.DEV && <TokenDebugger />}
    </>
  );
}
