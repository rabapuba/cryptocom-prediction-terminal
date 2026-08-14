# Crypto.com Prediction Markets Live Terminal

A high-performance, real-time desktop trading terminal for monitoring **Crypto.com 5-minute and 20-minute Prediction Markets**.

Built with React, TypeScript, Vite, Node.js, and WebSocket streaming.

---

## Features

- **5-Minute Market View**: Ultra-fast live monitoring of the nearest expiring 5-minute prediction contracts.
- **20-Minute Market View**: Continuous monitoring of 20-minute prediction cycles.
- **Automatic Market Discovery & Rotation**: Automatically identifies active short-term markets for BTC, ETH, SOL, XRP, DOGE, ADA, and BCH, seamlessly rotating to the next market upon contract expiry.
- **Real-Time YES / NO Pricing**: Displays live YES/NO prices, Bids, Asks, Mid prices, Spreads, and Implied Probabilities with directional price flash indicators.
- **Underlying Spot Price Integration**: Real-time spot price ticker streamed directly from the official Crypto.com Exchange API.
- **Centralized Data Engine**: Backend data service aggregates and caches live market feeds, broadcasting WebSocket updates to all connected browser tabs without multiplying API calls.
- **Live Status & Latency Monitor**: Real-time health badges (`LIVE`, `STALE`, `OFFLINE`) and API round-trip latency tracking.

---

## Official API Sources

This application uses the official Crypto.com APIs without browser scraping or simulated prices:
1. **Prediction Markets API**:
   - `GET /api/v1/predictions/events` - Active event catalog & contract listings
   - `GET /api/v1/predictions/contracts/{symbol}/price` - Real-time contract pricing & orderbook stats
2. **Crypto.com Exchange API**:
   - `GET /v2/public/get-ticker?instrument_name=BTC_USDT` - Spot underlying asset prices

---

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Clone & Install
```bash
git clone https://github.com/rabapuba/cryptocom-prediction-terminal.git
cd cryptocom-prediction-terminal
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Verify Real API Connection
Run the built-in automated verification script:
```bash
npm run test:api
```

---

## Running the Application

### Development Mode (Concurrent Server + Vite Client)
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API & WebSocket: `http://localhost:3001`

### Production Build
```bash
npm run build
npm start
```
The server serves both the REST API, WebSocket feed, and production frontend bundle on port `3001` (`http://localhost:3001`).

---

## Architecture

```
Crypto.com Prediction & Exchange APIs
                ↓ (REST Polling ~1-1.5s)
   Backend Market Data Service (Node.js)
                ↓ (WebSocket broadcast)
   Frontend Trading Terminal (React + Vite)
```

---

## Disclaimer
This project is a market data monitor only. It does not execute trades, place orders, or connect crypto wallets.
