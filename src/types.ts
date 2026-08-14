export interface ContractData {
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
}

export interface ActiveContractData extends ContractData {
  priceDirection: 'up' | 'down' | 'neutral';
  previousYesPrice?: number | null;
}

export interface ParsedPredictionMarket {
  eventId: string;
  eventTitle: string;
  asset: string;
  category: '5m' | '20m' | 'other';
  durationLabel: string;
  status: string;
  eventDate: string;
  expiryTimeMs: number;
  secondsRemaining: number;
  isExpired: boolean;
  selectedContractSymbol: string;
  selectedContractTitle: string;
  contracts: ContractData[];
  activeContract: ActiveContractData;
  lastApiUpdate: number;
  dataState: 'LIVE' | 'STALE' | 'OFFLINE';
}

export interface UnderlyingSpotPrice {
  instrument: string;
  asset: string;
  price: number | null;
  bid: number | null;
  ask: number | null;
  high24h: number | null;
  low24h: number | null;
  change24h: number | null;
  timestamp: number;
  rawPrice: string;
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

export interface TickRecord {
  id: string;
  timestamp: number;
  asset: string;
  market: '5m' | '20m';
  yesPrice: number | null;
  noPrice: number | null;
  spread: number | null;
  probability: number | null;
  direction: 'up' | 'down' | 'neutral';
}
