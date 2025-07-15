import React, { useContext, useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsDropdownOpen(false);
  };

  // Generate initials from username
  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className={`shadow px-6 py-4 flex items-center justify-between transition-colors ${
      isDarkMode 
        ? 'bg-black border-b border-gray-800' 
        : 'bg-white'
    }`}>
      <div className="flex items-center space-x-4">
        <NavLink
          to="/home"
          className={({ isActive }) =>
            isActive
              ? `font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`
              : `${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`
          }
        >
          Home
        </NavLink>
        
        {/* Removed Profile and Security links from here - they're now only in the dropdown */}
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode
              ? 'bg-gray-900 text-yellow-400 hover:bg-gray-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? (
            // Sun icon for light mode
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            // Moon icon for dark mode
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>

        {user ? (
          // Logged in - show profile dropdown
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-gray-800 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {/* Profile Picture/Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                isDarkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
              }`}>
                {getInitials(user.username)}
              </div>
              <span className="hidden sm:block font-medium">
                {user.username}
              </span>
              {/* Dropdown arrow */}
              <svg 
                className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-50 ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/account/profile');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2 ${
                      isDarkMode
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/account/security');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2 ${
                      isDarkMode
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Security</span>
                  </button>

                  <div className={`border-t my-1 ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}></div>

                  <button
                    onClick={handleLogout}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2 ${
                      isDarkMode
                        ? 'text-red-400 hover:bg-gray-800 hover:text-red-300'
                        : 'text-red-600 hover:bg-gray-100 hover:text-red-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Not logged in - show login/signup buttons
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/login')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}