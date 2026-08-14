import React, { useEffect, useState, useRef, useCallback } from 'react';
import { TerminalStateSnapshot, TickRecord } from './types';
import { Header } from './components/Header';
import { UnderlyingBar } from './components/UnderlyingBar';
import { MarketCard } from './components/MarketCard';
import { StrikesMatrix } from './components/StrikesMatrix';
import { TickStream } from './components/TickStream';

export const App: React.FC = () => {
  const [snapshot, setSnapshot] = useState<TerminalStateSnapshot | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [ticks, setTicks] = useState<TickRecord[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch REST snapshot fallback / initial
  const fetchSnapshot = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/snapshot');
      if (res.ok) {
        const data: TerminalStateSnapshot = await res.json();
        setSnapshot(data);
      }
    } catch (e) {
      console.warn('[Terminal] Failed to fetch REST snapshot:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Handle incoming snapshot update
  const handleSnapshotUpdate = useCallback((newSnapshot: TerminalStateSnapshot) => {
    setSnapshot(newSnapshot);

    // Record tick if price is available
    if (newSnapshot.market5m?.activeContract) {
      const c = newSnapshot.market5m.activeContract;
      setTicks((prev) => [
        {
          id: `${Date.now()}-5m`,
          timestamp: Date.now(),
          asset: newSnapshot.asset,
          market: '5m',
          yesPrice: c.yesPrice,
          noPrice: c.noPrice,
          spread: c.spread,
          probability: c.probability,
          direction: c.priceDirection,
        },
        ...prev.slice(0, 49), // Keep latest 50 ticks
      ]);
    }
  }, []);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Terminal WS] Connected to live backend feed');
      setIsWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'SNAPSHOT' && msg.data) {
          handleSnapshotUpdate(msg.data);
        }
      } catch (err) {
        console.warn('[Terminal WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.warn('[Terminal WS] Disconnected. Reconnecting in 3s...');
      setIsWsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.warn('[Terminal WS] Socket error:', err);
      ws.close();
    };
  }, [handleSnapshotUpdate]);

  useEffect(() => {
    // Initial fetch and WS connection
    fetchSnapshot();
    connectWebSocket();

    // Fallback polling interval in case WS gets disconnected
    const fallbackPollTimer = setInterval(() => {
      if (!isWsConnected) {
        fetchSnapshot();
      }
    }, 4000);

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearInterval(fallbackPollTimer);
    };
  }, [connectWebSocket, fetchSnapshot, isWsConnected]);

  // Asset switch handler
  const handleSelectAsset = async (asset: string) => {
    setSelectedAsset(asset);
    // Send to WS if open
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'SELECT_ASSET', asset }));
    }
    // Also call REST endpoint to ensure sync
    try {
      await fetch('/api/asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset }),
      });
      fetchSnapshot();
    } catch (e) {
      console.warn('[Terminal] Error setting asset:', e);
    }
  };

  return (
    <div className="terminal-container">
      {/* Header */}
      <Header
        snapshot={snapshot}
        selectedAsset={selectedAsset}
        onSelectAsset={handleSelectAsset}
        isWsConnected={isWsConnected}
        onManualRefresh={fetchSnapshot}
        isRefreshing={isRefreshing}
      />

      {/* Spot Underlying Price Banner */}
      <UnderlyingBar underlying={snapshot?.underlying || null} asset={selectedAsset} />

      {/* 5-Min & 20-Min Split Terminal Cards */}
      <main className="market-grid">
        <MarketCard market={snapshot?.market5m || null} category="5m" title="5 MIN MARKET" />
        <MarketCard market={snapshot?.market20m || null} category="20m" title="20 MIN MARKET" />
      </main>

      {/* Strikes Matrix & Tick Stream */}
      <section className="bottom-grid">
        <StrikesMatrix
          market5m={snapshot?.market5m || null}
          market20m={snapshot?.market20m || null}
        />
        <TickStream ticks={ticks} />
      </section>
    </div>
  );
};

export default App;
