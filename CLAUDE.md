# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle (TypeScript compilation + Vite build)
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview production build locally

### Type Checking
- `tsc -b` - Run TypeScript compiler for type checking (included in build)

## Architecture Overview

This is a React + TypeScript streaming platform frontend built with Vite and styled with Tailwind CSS.

### Tech Stack
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite with HMR
- **Styling**: Tailwind CSS v4 with PostCSS
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form with Zod validation
- **Video**: Video.js for streaming playback
- **State**: React Context for global state

### Application Structure

**Context Providers** (src/contexts/):
- `AuthContext` - Authentication state with localStorage persistence and stubbed API calls
- `DarkModeContext` - Theme management with system preference detection and true black theme

**Routing** (src/routes.tsx):
- Public routes: login, signup, password reset, 2FA, home, streaming pages
- Protected routes: account management (profile, security) wrapped in `PrivateRoute`
- Conditional navbar rendering (hidden on auth pages)

**Page Organization**:
- `Auth/` - Authentication flow (Login, Signup, ResetPassword, TwoFactor)
- `Account/` - User account management (Profile, Security)
- `StreamPage` - Individual stream viewing with Video.js
- `ChannelPage` - User channel pages

**Provider Hierarchy** (src/main.tsx):
```
DarkModeProvider
  → BrowserRouter
    → AuthProvider
      → AppRoutes
```

### Key Implementation Notes

- Authentication uses stubbed API calls in development (see AuthContext comments)
- Dark mode implements true black theme (`#000000`) instead of gray variants
- Video.js CSS is imported globally in main.tsx
- Routes use React Router v6 patterns with `<Outlet/>` for nested layouts
- Form validation handled via React Hook Form + Zod schemas
- All authentication state persists to localStorage with "remember me" functionality