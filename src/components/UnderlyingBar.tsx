import React from 'react';
import { UnderlyingSpotPrice } from '../types';
import { TrendingDown, TrendingUp, ShieldCheck } from 'lucide-react';

interface UnderlyingBarProps {
  underlying: UnderlyingSpotPrice | null;
  asset: string;
}

export const UnderlyingBar: React.FC<UnderlyingBarProps> = ({ underlying, asset }) => {
  const priceFormatted = underlying?.price !== null && underlying?.price !== undefined
    ? `$${underlying.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'N/A';

  const change = underlying?.change24h;
  const isPositive = change !== null && change !== undefined && change >= 0;
  const changeFormatted = change !== null && change !== undefined
    ? `${isPositive ? '+' : ''}${(change * 100).toFixed(2)}%`
    : 'N/A';

  return (
    <div className="underlying-bar">
      <div className="underlying-main">
        <div className="underlying-label">
          <span>{asset} UNDERLYING (SPOT)</span>
        </div>
        <div className="underlying-price mono">{priceFormatted}</div>
        {change !== null && change !== undefined && (
          <div className={`underlying-change mono ${isPositive ? 'positive' : 'negative'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{changeFormatted}</span>
          </div>
        )}
      </div>

      <div className="underlying-stats mono">
        <div className="underlying-stat-item">
          <span>24H HIGH</span>
          <span>{underlying?.high24h ? `$${underlying.high24h.toLocaleString('en-US')}` : 'N/A'}</span>
        </div>
        <div className="underlying-stat-item">
          <span>24H LOW</span>
          <span>{underlying?.low24h ? `$${underlying.low24h.toLocaleString('en-US')}` : 'N/A'}</span>
        </div>
        <div className="underlying-stat-item">
          <span>BID / ASK</span>
          <span>
            {underlying?.bid ? `$${underlying.bid.toFixed(2)}` : 'N/A'} / {underlying?.ask ? `$${underlying.ask.toFixed(2)}` : 'N/A'}
          </span>
        </div>
        <div className="underlying-stat-item">
          <span>SOURCE</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#00d2ff' }}>
            <ShieldCheck size={12} /> Crypto.com API
          </span>
        </div>
      </div>
    </div>
  );
};
