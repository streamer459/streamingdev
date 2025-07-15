import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ 
  label, 
  error,
  className = '',
  ...props 
}, ref) => {
  const { isDarkMode } = useDarkMode();

  // Base input classes
  const baseClasses = 'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
  
  // Theme-specific classes
  const themeClasses = isDarkMode
    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';

  // Focus ring offset for dark mode
  const focusRingOffset = isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white';

  // Label classes
  const labelClasses = isDarkMode
    ? 'text-gray-300'
    : 'text-gray-700';

  // Error state classes
  const errorClasses = error
    ? (isDarkMode 
        ? 'border-red-500 focus:ring-red-500' 
        : 'border-red-300 focus:ring-red-500')
    : '';

  return (
    <div className="mb-4">
      {label && (
        <label className={`block text-sm font-medium mb-1 ${labelClasses}`}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        {...props}
        className={`${baseClasses} ${themeClasses} ${focusRingOffset} ${errorClasses} ${className}`.trim()}
      />
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;