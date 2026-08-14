// Official Crypto.com API response and internal data models

export interface CryptoComPredictionContract {
  id?: string;
  symbol: string;
  title: string;
  status: string;
  yes?: string;
  no?: string;
  chance?: string;
  payout_per_100?: string;
  market_type?: {
    name: string;
    title: string;
    period: string;
  };
}

export interface CryptoComPredictionEvent {
  id: string;
  title: string;
  kind: string; // e.g. "BTC", "ETH", "SOL"
  type: string; // e.g. "league", "match", "future"
  event_date: string; // ISO 8601
  status: string; // "active", "suspended", "resolved", "cancelled"
  contracts_count?: number;
  contracts?: CryptoComPredictionContract[];
  metadata?: {
    venue?: string;
    time_confirmed?: boolean;
    [key: string]: any;
  };
}

export interface CryptoComContractPriceResponse {
  data: {
    symbol: string;
    title: string;
    status: string;
    bid: string;
    ask: string;
    mid: string;
    probability: string;
    spread: string;
    updated_at: string;
  };
}

export interface CryptoComSpotTickerResponse {
  id: number;
  method: string;
  code: number;
  result?: {
    data?: Array<{
      i: string; // instrument_name e.g. "BTC_USDT"
      h: string; // 24h high
      l: string; // 24h low
      a: string; // latest price
      v: string; // volume
      vv: string; // volume value
      c: string; // 24h change
      b: string; // best bid
      k: string; // best ask
      oi: string; // open interest
      t: number; // timestamp ms
    }>;
  };
}

export interface UnderlyingSpotPrice {
  instrument: string; // e.g. "BTC_USDT"
  asset: string; // "BTC"
  price: number | null;
  bid: number | null;
  ask: number | null;
  high24h: number | null;
  low24h: number | null;
  change24h: number | null;
  timestamp: number;
  rawPrice: string;
}

export interface ParsedPredictionMarket {
  eventId: string;
  eventTitle: string;
  asset: string; // "BTC", "ETH", etc.
  category: '5m' | '20m' | 'other';
  durationLabel: string;
  status: string;
  eventDate: string; // Expiry timestamp ISO
  expiryTimeMs: number;
  secondsRemaining: number;
  isExpired: boolean;
  selectedContractSymbol: string;
  selectedContractTitle: string;
  contracts: Array<{
    id?: string;
    symbol: string;
    title: string;
    status: string;
    yesPrice: number | null;
    noPrice: number | null;
    bid: number | null;
    ask: number | null;
    mid: number | null;
    probability: number | null;
    spread: number | null;
    payoutPer100: string | null;
    updatedAt: string | null;
    dataAgeMs: number;
    raw: {
      yes?: string;
      no?: string;
      bid?: string;
      ask?: string;
      mid?: string;
      probability?: string;
      spread?: string;
      payout_per_100?: string;
    };
  }>;
  activeContract: {
    symbol: string;
    title: string;
    status: string;
    yesPrice: number | null;
    noPrice: number | null;
    bid: number | null;
    ask: number | null;
    mid: number | null;
    probability: number | null;
    spread: number | null;
    payoutPer100: string | null;
    updatedAt: string | null;
    dataAgeMs: number;
    priceDirection: 'up' | 'down' | 'neutral';
    previousYesPrice?: number | null;
  };
  lastApiUpdate: number;
  dataState: 'LIVE' | 'STALE' | 'OFFLINE';
}

export interface TerminalStateSnapshot {
  asset: string;
  availableAssets: string[];
  underlying: UnderlyingSpotPrice | null;
  market5m: ParsedPredictionMarket | null;
  market20m: ParsedPredictionMarket | null;
  allCryptoEventsCount: number;
  lastUpdated: number;
  connectionState: 'LIVE' | 'STALE' | 'OFFLINE';
  serverUptimeSeconds: number;
  apiCallLatencyMs: number;
}

export type WebSocketMessage = 
  | { type: 'SNAPSHOT'; data: TerminalStateSnapshot }
  | { type: 'TICK_UPDATE'; data: { asset: string; marketCategory: '5m' | '20m'; market: ParsedPredictionMarket; underlying: UnderlyingSpotPrice | null } }
  | { type: 'UNDERLYING_UPDATE'; data: UnderlyingSpotPrice }
  | { type: 'ERROR'; message: string };
