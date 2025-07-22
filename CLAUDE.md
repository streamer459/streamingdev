# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based streaming frontend application built with:
- **React 19** with TypeScript
- **Vite** as the build tool and dev server
- **Tailwind CSS** for styling with custom primary/accent color themes
- **React Router** for client-side routing
- **Video.js** for video streaming functionality
- **React Hook Form** with Zod validation for forms

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Context Architecture
- **AuthContext** (`src/contexts/AuthContext.tsx`): Manages user authentication with stubbed API calls that need real implementation
- **DarkModeProvider** (`src/contexts/DarkModeContext.tsx`): Handles dark/light theme with localStorage persistence and system preference detection

### Component Structure
- **Protected routes** use `PrivateRoute` component for authentication checks
- **Layout**: Navbar conditionally renders based on route (hidden on auth pages)
- **Pages organized by feature**:
  - Auth pages: Login, Signup, ResetPassword, TwoFactor
  - Account pages: Profile, Security
  - Core pages: Home, StreamPage, ChannelPage

### Routing Structure
- `/` → redirects to `/login`
- `/home` → public home page
- Auth routes: `/login`, `/signup`, `/reset-password`, `/2fa`
- Protected account routes under `/account/*`
- Stream routes: `/stream/:id` and `/u/:username` (public)

### State Management
- Context-based state management (no Redux/Zustand)
- Authentication state persisted to localStorage
- Dark mode preference with system detection fallback

## Key Implementation Notes

### Authentication
- AuthContext uses stubbed API calls marked with TODO comments
- Token and user data stored in localStorage for "remember me" functionality
- Real API integration needed in `login()` and `signup()` methods

### Styling System
- Custom Tailwind theme with primary (teal) and accent (amber) colors
- Dark mode uses true black (`#000000`) instead of typical dark gray
- Safelist ensures core utility classes aren't purged

### Video Integration
- Video.js imported globally in main.tsx for streaming functionality
- StreamPage and ChannelPage components ready for video player implementation

## File Conventions
- TypeScript strict mode enabled
- ESLint with React hooks and refresh plugins
- Component files use PascalCase naming
- Context providers follow React patterns with custom hooks for consumption