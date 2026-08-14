import React from 'react';
import { ParsedPredictionMarket } from '../types';
import { Layers } from 'lucide-react';

interface StrikesMatrixProps {
  market5m: ParsedPredictionMarket | null;
  market20m: ParsedPredictionMarket | null;
}

export const StrikesMatrix: React.FC<StrikesMatrixProps> = ({ market5m, market20m }) => {
  const currentMarket = market5m || market20m;
  const contracts = currentMarket?.contracts || [];

  return (
    <div className="matrix-panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={15} color="#00d2ff" />
          <h3>All Available Strikes & Contracts</h3>
        </div>
        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {currentMarket ? `${currentMarket.durationLabel} Market (${contracts.length} strikes)` : '0 strikes'}
        </span>
      </div>

      <div className="table-wrapper">
        {contracts.length === 0 ? (
          <div className="empty-state">No strikes available for current market.</div>
        ) : (
          <table className="matrix-table mono">
            <thead>
              <tr>
                <th>STRIKE / OUTCOME</th>
                <th>YES PRICE</th>
                <th>NO PRICE</th>
                <th>PROBABILITY</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const isSelected = c.symbol === currentMarket?.selectedContractSymbol;
                const prob = c.probability !== null ? `${c.probability.toFixed(0)}%` : 'N/A';
                return (
                  <tr
                    key={c.symbol}
                    style={{
                      background: isSelected ? 'rgba(0, 210, 255, 0.08)' : undefined,
                      fontWeight: isSelected ? 700 : 400,
                    }}
                  >
                    <td style={{ color: isSelected ? '#00d2ff' : 'var(--text-primary)' }}>
                      {c.title} {isSelected ? '(Active)' : ''}
                    </td>
                    <td style={{ color: '#00e676', fontWeight: 600 }}>
                      {c.yesPrice !== null ? `$${c.yesPrice.toFixed(2)}` : 'N/A'}
                    </td>
                    <td style={{ color: '#ff5252', fontWeight: 600 }}>
                      {c.noPrice !== null ? `$${c.noPrice.toFixed(2)}` : 'N/A'}
                    </td>
                    <td>{prob}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: c.status === 'active' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color: c.status === 'active' ? '#00e676' : 'var(--text-muted)',
                        }}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
