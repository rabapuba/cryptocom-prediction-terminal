import http from 'http';
import path from 'path';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { CryptoComApiClient } from './cryptoApi';
import { MarketDataService } from './marketDataService';
import { TerminalStateSnapshot, WebSocketMessage } from './types';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Crypto.com API Client & Centralized Market Service
const apiClient = new CryptoComApiClient();
const marketService = new MarketDataService(apiClient);

// Start centralized live data engine
marketService.start();

// REST API Endpoints
app.get('/api/health', (req, res) => {
  const snapshot = marketService.getSnapshot();
  res.json({
    status: 'OK',
    service: 'Crypto.com Prediction Market Terminal Data Service',
    connectionState: snapshot.connectionState,
    uptimeSeconds: snapshot.serverUptimeSeconds,
    apiLatencyMs: snapshot.apiCallLatencyMs,
    currentAsset: snapshot.asset,
    lastUpdated: new Date(snapshot.lastUpdated).toISOString(),
  });
});

app.get('/api/snapshot', (req, res) => {
  res.json(marketService.getSnapshot());
});

app.post('/api/asset', (req, res) => {
  const { asset } = req.body;
  if (!asset || typeof asset !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid asset parameter' });
  }
  marketService.setAsset(asset);
  res.json({ success: true, asset: marketService.getAsset() });
});

// Serve static frontend files in production
const staticPath = path.join(__dirname, '../dist');
app.use(express.static(staticPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return next();
  }
  res.sendFile(path.join(staticPath, 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend not built yet. Run npm run build.');
  });
});

// WebSocket Server for Multi-tab Live Streaming
wss.on('connection', (ws: WebSocket) => {
  console.log('[WebSocket] Client connected to live terminal feed');

  // Immediately send initial full snapshot
  const initialSnapshot = marketService.getSnapshot();
  const initialMsg: WebSocketMessage = {
    type: 'SNAPSHOT',
    data: initialSnapshot,
  };
  ws.send(JSON.stringify(initialMsg));

  // Handle client messages (e.g. asset switching)
  ws.on('message', (message: string) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.action === 'SELECT_ASSET' && parsed.asset) {
        marketService.setAsset(parsed.asset);
      }
    } catch (err) {
      console.warn('[WebSocket] Invalid client message:', err);
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
  });
});

// Broadcast market updates to all connected clients
marketService.onUpdate((snapshot: TerminalStateSnapshot) => {
  const msg: WebSocketMessage = {
    type: 'SNAPSHOT',
    data: snapshot,
  };
  const payload = JSON.stringify(msg);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down terminal backend...');
  marketService.stop();
  server.close(() => {
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Crypto.com Prediction Market Terminal Backend Online`);
  console.log(`Port: ${PORT}`);
  console.log(`REST API: http://localhost:${PORT}/api/snapshot`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`=======================================================`);
});
