# Briefcase - AI-Powered Investment Dashboard

## Overview

Briefcase is a cross-platform mobile investment dashboard built with React Native/Expo that unifies diverse portfolio assets (stocks, crypto, ETFs, bonds, real estate, commodities, cash) in one place. The app provides real-time price updates via market data APIs, interactive portfolio visualization, and AI-powered insights through a natural language chatbot interface.

The application follows an editorial/financial premium aesthetic inspired by Bloomberg Terminal meets Swiss design—prioritizing data density, typographic hierarchy, and restrained elegance with intentional color accents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54 (new architecture enabled)
- **Navigation**: React Navigation v7 with bottom tabs and native stack
  - Tab-based navigation (Dashboard, Holdings, Insights, Profile)
  - Modal screens for Add Holding and AI Chat
  - Stack navigation for Asset Detail
- **State Management**: TanStack React Query for server state, React Context for theme
- **Animations**: React Native Reanimated for smooth, performant animations
- **Styling**: Custom theming system with light/dark mode support, stored in AsyncStorage
- **Typography**: IBM Plex Sans (sans-serif) and IBM Plex Mono (monospace) via Expo Google Fonts

### Backend Architecture
- **Server**: Express.js (v5) running on Node.js
- **API Design**: RESTful endpoints prefixed with `/api`
- **Database**: PostgreSQL with Drizzle ORM (schema in `shared/schema.ts`)
- **Storage Pattern**: Currently uses in-memory storage (`MemStorage`) with interface for database migration

### Data Flow
- Client stores holdings locally in AsyncStorage for offline-first experience
- Real-time prices fetched from backend which aggregates multiple data sources
- AI features communicate through dedicated API endpoints to Gemini service

### Key Design Patterns
- Path aliases: `@/` maps to `./client`, `@shared/` maps to `./shared`
- Shared types between client and server via `shared/` directory
- Component-based architecture with reusable UI primitives
- Custom hooks for theming (`useTheme`), screen options (`useScreenOptions`)

## External Dependencies

### Market Data APIs
- **CoinGecko**: Free crypto price data (no API key required)
- **Alpha Vantage**: Stock/ETF price data (requires `ALPHA_VANTAGE_API_KEY` environment variable)

### AI Services
- **Google Gemini**: Powers the AI chatbot and portfolio insights (requires `GEMINI_API_KEY` environment variable)
- Service gracefully degrades when API key is not configured

### Database
- **PostgreSQL**: Required for production data persistence (requires `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries with Zod validation schemas
- Migrations stored in `./migrations` directory

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini API key for AI features
- `ALPHA_VANTAGE_API_KEY` - For stock price data (optional, graceful fallback)
- `EXPO_PUBLIC_DOMAIN` - Public domain for API requests from client

### Build & Development
- Expo handles mobile builds (iOS/Android)
- esbuild for server bundling
- Static web build support via custom build script