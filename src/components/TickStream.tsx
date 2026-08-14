import React from 'react';
import { TickRecord } from '../types';
import { Radio, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TickStreamProps {
  ticks: TickRecord[];
}

export const TickStream: React.FC<TickStreamProps> = ({ ticks }) => {
  return (
    <div className="stream-panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={15} color="#00e676" />
          <h3>Live Price Ticks & Market Stream</h3>
        </div>
        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {ticks.length} recent updates
        </span>
      </div>

      <div className="tick-list mono">
        {ticks.length === 0 ? (
          <div className="empty-state">Waiting for real-time price updates...</div>
        ) : (
          ticks.map((t) => {
            const timeStr = new Date(t.timestamp).toLocaleTimeString();
            return (
              <div key={t.id} className="tick-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{timeStr}</span>
                  <span style={{ color: '#00d2ff', fontWeight: 700 }}>{t.asset}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      background: t.market === '5m' ? '#002b4d' : '#311b4d',
                      color: t.market === '5m' ? '#00d2ff' : '#d946ef',
                    }}
                  >
                    {t.market.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#00e676', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    YES: {t.yesPrice !== null ? `$${t.yesPrice.toFixed(2)}` : 'N/A'}
                    {t.direction === 'up' && <ArrowUpRight size={14} color="#00e676" />}
                  </span>
                  <span style={{ color: '#ff5252', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    NO: {t.noPrice !== null ? `$${t.noPrice.toFixed(2)}` : 'N/A'}
                    {t.direction === 'down' && <ArrowDownRight size={14} color="#ff5252" />}
                  </span>
                  {t.probability !== null && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      ({t.probability.toFixed(0)}%)
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
