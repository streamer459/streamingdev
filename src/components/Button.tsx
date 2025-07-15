import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}: ButtonProps) {
  const { isDarkMode } = useDarkMode();

  // Size classes
  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg'
  };

  // Variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white font-semibold focus:ring-blue-500';
      
      case 'secondary':
        return isDarkMode
          ? 'bg-gray-700 hover:bg-gray-600 text-white font-semibold focus:ring-gray-500'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold focus:ring-gray-500';
      
      case 'outline':
        return isDarkMode
          ? 'border-2 border-blue-500 text-blue-400 hover:bg-blue-600 hover:text-white font-semibold focus:ring-blue-500'
          : 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold focus:ring-blue-500';
      
      case 'ghost':
        return isDarkMode
          ? 'text-gray-300 hover:bg-gray-800 hover:text-white font-medium focus:ring-gray-500'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium focus:ring-gray-500';
      
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white font-semibold focus:ring-blue-500';
    }
  };

  const baseClasses = 'w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
  const variantClasses = getVariantClasses();
  const sizeClass = sizeClasses[size];

  // Handle dark mode focus ring offset
  const focusRingOffset = isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white';

  return (
    <button
      {...props}
      className={`${baseClasses} ${variantClasses} ${sizeClass} ${focusRingOffset} ${className}`.trim()}
    >
      {children}
    </button>
  );
}