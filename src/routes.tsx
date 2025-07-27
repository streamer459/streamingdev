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
import ChannelPage from './pages/ChannelPage';
import Subscriptions from './pages/Subscriptions';

import PrivateRoute from './components/PrivateRoute';

export default function AppRoutes() {
  return (
    <>
      {/* Show Navbar on any route except auth pages */}
      <Routes>
        <Route path="/login" element={null} />
        <Route path="/signup" element={null} />
        <Route path="/reset-password" element={null} />
        <Route path="/2fa" element={null} />
        <Route path="/*" element={<Navbar />} />
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

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  );
}
