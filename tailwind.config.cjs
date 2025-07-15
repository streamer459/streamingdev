/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  safelist: [
    'bg-primary',
    'bg-primary-light',
    'bg-primary-dark',
    'text-white',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#5EEAD4',
          DEFAULT: '#14B8A6',
          dark: '#0D9488',
        },
        accent: {
          light: '#FBBF24',
          DEFAULT: '#F59E0B',
          dark: '#B45309',
        },
      },
    },
  },
  plugins: [],
};
