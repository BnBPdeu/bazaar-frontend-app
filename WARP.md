# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Starting the Application
- `npm run dev` - Start the development server with nodemon (auto-restart on file changes)
- `node server.js` - Start the production server directly

### Package Management
- `npm install` - Install all dependencies
- `npm audit` - Check for security vulnerabilities
- `npm audit fix` - Automatically fix security issues

### Database Operations
Requires MongoDB connection string in `.env` as `MONGODB_URI`

## Architecture Overview

This is a **real-time trading simulation platform** backend built with Node.js, Express, Socket.IO, and MongoDB. The system simulates stock market trading with live price updates, portfolio management, and IPO functionality.

### Core Components

**Real-time Price Simulation System:**
- `src/controllers/share.controller.js` - Manages stock price simulation with drift and volatility
- `src/controllers/ipo.controllers.js` - Handles IPO price simulation and allocation
- `src/utils/simulateSectorTrend.js` - Implements sector-wide market trends
- `src/utils/marketState.js` - Global market state (bull/bear/neutral)
- `src/utils/trendState.js` - Manages temporary sector trend events

**WebSocket-based Live Updates:**
- Socket.IO integration in `server.js` handles real-time connections
- Price updates broadcast every 8 seconds via cron jobs
- IPO updates every 5 seconds
- User-specific portfolio P&L calculations streamed to clients
- Break/resume functionality for market simulation

**Trading Engine:**
- `src/controllers/trading.controllers.js` - Core trading logic (buy/sell/short)
- Portfolio management with average price calculation
- Short selling with margin requirements
- Square-off functionality for position closure
- Real-time P&L calculations (realized/unrealized)

**Data Models:**
- `User` - Embedded portfolio array, trades history, short positions, balance management
- `Shares` - Price history with OHLC candles and tick-level data storage
- `IPO` - Lottery-based allocation system with lot-based bidding
- `Portfolio` schema embedded in User for holdings tracking

### Key Architectural Patterns

**Embedded Document Strategy:** User portfolios and trade history are embedded documents rather than separate collections, optimizing for read performance in trading scenarios.

**Price History Storage:** Each share maintains both candle data (OHLC) and granular tick data within the same document for efficient querying.

**Real-time State Management:** 
- `subscriptions` Map tracks which sockets are subscribed to specific share updates
- `isBreak` global flag pauses all market simulation
- `trendState` object manages temporary sector-wide price movements

**Cron-based Market Simulation:**
- Price simulation runs independently of user requests
- Separate cron jobs for regular shares vs IPO pricing
- Socket emission tied to database updates for consistency

## Environment Configuration

Required `.env` variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET_KEY` - JWT signing secret
- `TOKEN_EXPIRED_TIME` - JWT expiration (e.g., "24h")
- `PORT` - Server port (defaults to 4000)

Email service configuration for password reset:
- Nodemailer setup in `src/utils/mailService.js`
- Google APIs integration via `googleapis` package

## Socket.IO Events

**Client to Server:**
- `toggle_break` - Pause/resume market simulation (admin)
- `registerUser` - Join user-specific room for P&L updates
- `market_prices` - Receive live price data for P&L calculation
- `subscribeShareHistory` - Get real-time updates for specific share
- `unsubscribeShareHistory` - Stop receiving share updates

**Server to Client:**
- `break_state` - Market pause/resume status
- `shareHistoryData` - Real-time price and history data
- User-room specific P&L updates

## API Routes Structure

- `/api/user/*` - Authentication, registration, profile management
- `/api/share/*` - Share data, price history, market information  
- `/api/trade/*` - Buy/sell operations, portfolio management
- `/ipo/*` - IPO listings, bidding, allocation
- `/trend/*` - Market trend control (admin functions)

## Development Notes

**Price Simulation Logic:** The system uses mathematical models with drift and volatility to simulate realistic price movements. Sector trends can override individual stock movements.

**Authentication Flow:** JWT tokens stored in cookies with fallback to Authorization header. Admin routes require `isAdmin: true` in user document.

**Database Indexing:** Consider adding indexes on frequently queried fields like `User.Email`, `Shares.shareName`, and `IPO.symbol` for production performance.

**Socket Memory Management:** The `subscriptions` Map is cleared on socket disconnect to prevent memory leaks in long-running instances.