import React, { useEffect, useState } from 'react';
import { ParsedPredictionMarket } from '../types';
import { Clock, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

interface MarketCardProps {
  market: ParsedPredictionMarket | null;
  category: '5m' | '20m';
  title: string;
}

export const MarketCard: React.FC<MarketCardProps> = ({ market, category, title }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [flashClass, setFlashClass] = useState<string>('');

  // Live countdown tick locally between API refreshes
  useEffect(() => {
    if (!market) return;
    setSecondsLeft(market.secondsRemaining);

    const timer = setInterval(() => {
      const remaining = Math.floor((market.expiryTimeMs - Date.now()) / 1000);
      setSecondsLeft(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [market?.expiryTimeMs, market?.secondsRemaining]);

  // Handle price flash animation
  useEffect(() => {
    if (!market?.activeContract) return;
    if (market.activeContract.priceDirection === 'up') {
      setFlashClass('flash-up');
    } else if (market.activeContract.priceDirection === 'down') {
      setFlashClass('flash-down');
    }
    const timeout = setTimeout(() => setFlashClass(''), 800);
    return () => clearTimeout(timeout);
  }, [market?.activeContract?.yesPrice, market?.activeContract?.priceDirection]);

  // Format countdown string MM:SS
  const formatCountdown = (secs: number) => {
    if (secs <= 0) return 'EXPIRED (ROTATING...)';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!market) {
    return (
      <div className="market-card">
        <div className="market-card-header">
          <div className="market-tag">{title}</div>
          <div className="market-title-text">Awaiting Active Market Discovery...</div>
        </div>
        <div className="empty-state">
          <Layers size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
          <p>No active {title} prediction event currently open in Crypto.com catalog.</p>
          <p style={{ fontSize: '11px', marginTop: '4px' }}>Automatic scanner is continuously searching for new markets.</p>
        </div>
      </div>
    );
  }

  const activeContract = market.activeContract;
  const yesPriceFormatted = activeContract.yesPrice !== null ? `$${activeContract.yesPrice.toFixed(2)}` : 'N/A';
  const noPriceFormatted = activeContract.noPrice !== null ? `$${activeContract.noPrice.toFixed(2)}` : 'N/A';

  const yesProbability = activeContract.probability !== null
    ? activeContract.probability
    : (activeContract.yesPrice !== null ? Math.round(activeContract.yesPrice * 100) : 50);

  const noProbability = 100 - yesProbability;
  const isUrgent = secondsLeft > 0 && secondsLeft < 60;

  return (
    <div className="market-card">
      {/* Header */}
      <div className="market-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <div className={`market-tag ${category === '20m' ? 'twenty-min' : ''}`}>{title}</div>
          <div className="market-title-text" title={market.eventTitle}>
            {market.eventTitle}
          </div>
        </div>

        <div className={`countdown-box mono ${isUrgent ? 'urgent' : ''}`}>
          <Clock size={13} />
          <span>{formatCountdown(secondsLeft)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="market-card-body">
        <div className="strike-title">
          <span>Target Contract:</span>
          <span style={{ color: '#00d2ff', fontWeight: 700 }}>{activeContract.title}</span>
        </div>

        {/* Big YES / NO Price Tiles */}
        <div className="prices-container">
          {/* YES Tile */}
          <div className={`price-tile yes ${flashClass === 'flash-up' ? 'flash-up' : ''}`}>
            <div className="price-tile-header">
              <span className="price-tile-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={16} /> YES
              </span>
              <span className="probability-pill mono">{yesProbability.toFixed(0)}%</span>
            </div>
            <div className="price-tile-value mono" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{yesPriceFormatted}</span>
              {activeContract.priceDirection === 'up' && (
                <ArrowUpRight size={22} color="#00e676" style={{ marginTop: '2px' }} />
              )}
            </div>
            <div className="price-tile-sub mono">
              Payout: {activeContract.payoutPer100 ? `$${activeContract.payoutPer100}` : '$100.00'} / 100
            </div>
          </div>

          {/* NO Tile */}
          <div className={`price-tile no ${flashClass === 'flash-down' ? 'flash-down' : ''}`}>
            <div className="price-tile-header">
              <span className="price-tile-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={16} /> NO
              </span>
              <span className="probability-pill mono">{noProbability.toFixed(0)}%</span>
            </div>
            <div className="price-tile-value mono" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{noPriceFormatted}</span>
              {activeContract.priceDirection === 'down' && (
                <ArrowDownRight size={22} color="#ff5252" style={{ marginTop: '2px' }} />
              )}
            </div>
            <div className="price-tile-sub mono">
              Implied Prob: {noProbability.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Probability Visualization Bar */}
        <div className="probability-bar-container mono">
          <div className="probability-bar-labels">
            <span style={{ color: '#00e676' }}>YES {yesProbability.toFixed(0)}%</span>
            <span style={{ color: '#ff5252' }}>NO {noProbability.toFixed(0)}%</span>
          </div>
          <div className="probability-bar">
            <div className="probability-fill" style={{ width: `${yesProbability}%` }}></div>
          </div>
        </div>

        {/* Detailed Financial Metrics */}
        <div className="metrics-grid mono">
          <div className="metric-item">
            <span className="metric-label">BID</span>
            <span className="metric-value">{activeContract.bid !== null ? `$${activeContract.bid.toFixed(2)}` : 'N/A'}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">ASK</span>
            <span className="metric-value">{activeContract.ask !== null ? `$${activeContract.ask.toFixed(2)}` : 'N/A'}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">MID</span>
            <span className="metric-value">{activeContract.mid !== null ? `$${activeContract.mid.toFixed(3)}` : 'N/A'}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">SPREAD</span>
            <span className="metric-value">{activeContract.spread !== null ? `$${activeContract.spread.toFixed(2)}` : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="market-card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <span>Symbol:</span>
          <span className="symbol-badge mono" title={activeContract.symbol}>
            {activeContract.symbol}
          </span>
        </div>
        <div className="mono">
          Updated: {new Date(market.lastApiUpdate).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
