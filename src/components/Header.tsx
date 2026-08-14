import React from 'react';
import { TerminalStateSnapshot } from '../types';
import { Activity, Radio, RefreshCw, Zap } from 'lucide-react';

interface HeaderProps {
  snapshot: TerminalStateSnapshot | null;
  selectedAsset: string;
  onSelectAsset: (asset: string) => void;
  isWsConnected: boolean;
  onManualRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  snapshot,
  selectedAsset,
  onSelectAsset,
  isWsConnected,
  onManualRefresh,
  isRefreshing,
}) => {
  const connState = snapshot?.connectionState || (isWsConnected ? 'LIVE' : 'OFFLINE');
  const availableAssets = snapshot?.availableAssets || ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'BCH'];
  const latency = snapshot?.apiCallLatencyMs ?? 0;

  return (
    <header className="terminal-header">
      <div className="terminal-title-area">
        <div className="terminal-logo">
          <Zap size={20} />
        </div>
        <div className="terminal-title">
          <h1>Crypto.com Prediction Markets Terminal</h1>
          <p>Real-Time 5-Min & 20-Min Data Feed • Official API • Market Data Only</p>
        </div>
      </div>

      <div className="header-controls">
        {/* Asset Selector */}
        <div className="asset-selector">
          {availableAssets.map((asset) => (
            <button
              key={asset}
              className={`asset-btn ${selectedAsset === asset ? 'active' : ''}`}
              onClick={() => onSelectAsset(asset)}
              title={`Switch terminal to ${asset}`}
            >
              {asset}
            </button>
          ))}
        </div>

        {/* Manual Refresh Button */}
        <button
          className="asset-btn"
          onClick={onManualRefresh}
          disabled={isRefreshing}
          title="Force refresh API feed"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-subtle)' }}
        >
          <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
          <span>Refresh</span>
        </button>

        {/* Latency */}
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Activity size={12} />
          <span className="mono">{latency}ms</span>
        </div>

        {/* Connection State Badge */}
        <div className={`status-badge ${connState.toLowerCase()}`}>
          <span className={`pulsing-dot ${connState.toLowerCase()}`}></span>
          <span>{connState}</span>
        </div>
      </div>
    </header>
  );
};
