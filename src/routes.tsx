import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ResetPassword from './pages/Auth/ResetPassword';
import TwoFactor from './pages/Auth/TwoFactor';

import Navbar from './components/Navbar';

import Home from './pages/Home';
import Profile from './pages/Account/Profile';
import Security from './pages/Account/Security';
import StreamPage from './pages/StreamPage';
import ChannelPage from './pages/ChannelPage';  // optional

import PrivateRoute from './components/PrivateRoute';

export default function AppRoutes() {
  return (
    <>
      {/* Show Navbar on any route except login/signup/reset/2fa */}
      <Routes>
        <Route path="/*" element={<Navbar />} />
      </Routes>

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/2fa" element={<TwoFactor />} />

        {/* Protected routes under PrivateRoute */}
        <Route element={<PrivateRoute />}>
          <Route path="/account/profile" element={<Profile />} />
          <Route path="/account/security" element={<Security />} />
        </Route>

        {/* Stream and Channel pages (streaming is public) */}
        <Route path="/stream/:id" element={<StreamPage />} />
        <Route path="/u/:username" element={<ChannelPage />} />  

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
