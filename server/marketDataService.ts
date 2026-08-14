import { CryptoComApiClient } from './cryptoApi';
import { MarketDiscoveryEngine } from './marketDiscovery';
import {
  CryptoComPredictionEvent,
  ParsedPredictionMarket,
  TerminalStateSnapshot,
  UnderlyingSpotPrice,
} from './types';

export class MarketDataService {
  private apiClient: CryptoComApiClient;
  private currentAsset = 'BTC';
  private availableAssets = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'BCH'];

  private cachedEvents: CryptoComPredictionEvent[] = [];
  private eventDetailsCache: Map<string, CryptoComPredictionEvent> = new Map();
  private underlyingPrice: UnderlyingSpotPrice | null = null;
  private market5m: ParsedPredictionMarket | null = null;
  private market20m: ParsedPredictionMarket | null = null;

  private lastSuccessfulUpdate = 0;
  private isRunning = false;
  private startTime = Date.now();

  // Intervals
  private catalogPollIntervalMs = 10000; // 10 seconds for event catalog search
  private contractPricePollIntervalMs = 1500; // 1.5 seconds for active market prices
  private spotTickerPollIntervalMs = 1000; // 1 second for underlying spot ticker

  private catalogTimer: NodeJS.Timeout | null = null;
  private priceTimer: NodeJS.Timeout | null = null;
  private spotTimer: NodeJS.Timeout | null = null;

  // Broadcast listeners
  private listeners: Array<(snapshot: TerminalStateSnapshot) => void> = [];

  constructor(apiClient: CryptoComApiClient) {
    this.apiClient = apiClient;
  }

  public setAsset(asset: string) {
    const norm = asset.toUpperCase();
    if (this.availableAssets.includes(norm)) {
      this.currentAsset = norm;
      this.pollCatalog().then(() => {
        this.fetchContractPrices();
        this.fetchSpotTicker();
      });
    }
  }

  public getAsset(): string {
    return this.currentAsset;
  }

  public getAvailableAssets(): string[] {
    return this.availableAssets;
  }

  public onUpdate(callback: (snapshot: TerminalStateSnapshot) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[MarketDataService] Starting centralized real-time market data service...');

    // Initial fetch
    this.pollCatalog();
    this.fetchSpotTicker();

    // Schedule loops
    this.catalogTimer = setInterval(() => this.pollCatalog(), this.catalogPollIntervalMs);
    this.priceTimer = setInterval(() => this.fetchContractPrices(), this.contractPricePollIntervalMs);
    this.spotTimer = setInterval(() => this.fetchSpotTicker(), this.spotTickerPollIntervalMs);
  }

  public stop() {
    this.isRunning = false;
    if (this.catalogTimer) clearInterval(this.catalogTimer);
    if (this.priceTimer) clearInterval(this.priceTimer);
    if (this.spotTimer) clearInterval(this.spotTimer);
    console.log('[MarketDataService] Stopped.');
  }

  /**
   * Fetches active events from Crypto.com Prediction API
   */
  private async pollCatalog() {
    try {
      // 1. Search for asset-specific active events (BTC, ETH, etc.)
      const searchTerms = [this.currentAsset];
      if (this.currentAsset === 'BTC') searchTerms.push('Bitcoin');
      if (this.currentAsset === 'ETH') searchTerms.push('Ethereum');
      if (this.currentAsset === 'SOL') searchTerms.push('Solana');

      const allFoundEvents: CryptoComPredictionEvent[] = [];

      for (const term of searchTerms) {
        const searchResults = await this.apiClient.searchPredictionEvents(term, 30);
        for (const ev of searchResults) {
          if (!allFoundEvents.some((e) => e.id === ev.id)) {
            allFoundEvents.push(ev);
          }
        }
      }

      // Also get regular /events catalog
      const catalogRes = await this.apiClient.getPredictionEvents(30);
      if (catalogRes && catalogRes.data) {
        for (const ev of catalogRes.data) {
          if (!allFoundEvents.some((e) => e.id === ev.id)) {
            allFoundEvents.push(ev);
          }
        }
      }

      // For matching candidate events, ensure full contracts are loaded
      const detailedEvents: CryptoComPredictionEvent[] = [];
      for (const ev of allFoundEvents) {
        if (ev.contracts && ev.contracts.length > 0) {
          detailedEvents.push(ev);
          this.eventDetailsCache.set(ev.id, ev);
        } else {
          // Check cache or fetch by ID
          if (this.eventDetailsCache.has(ev.id)) {
            detailedEvents.push(this.eventDetailsCache.get(ev.id)!);
          } else {
            const detail = await this.apiClient.getPredictionEventById(ev.id);
            if (detail && detail.contracts && detail.contracts.length > 0) {
              detailedEvents.push(detail);
              this.eventDetailsCache.set(ev.id, detail);
            }
          }
        }
      }

      this.cachedEvents = detailedEvents;
      this.lastSuccessfulUpdate = Date.now();
      this.recalculateActiveMarkets();
      this.broadcast();
    } catch (e: any) {
      console.warn('[MarketDataService] Error polling catalog:', e.message);
    }
  }

  /**
   * Recalculates 5m and 20m markets for the active asset and handles auto-rotation
   */
  private recalculateActiveMarkets() {
    const now = Date.now();
    const { market5m, market20m } = MarketDiscoveryEngine.discoverMarketsForAsset(
      this.cachedEvents,
      this.currentAsset,
      now
    );

    // Preserve previous price history for flash direction
    if (market5m && this.market5m && market5m.eventId === this.market5m.eventId) {
      market5m.activeContract.previousYesPrice = this.market5m.activeContract.yesPrice;
      market5m.activeContract.bid = this.market5m.activeContract.bid;
      market5m.activeContract.ask = this.market5m.activeContract.ask;
      market5m.activeContract.mid = this.market5m.activeContract.mid;
      market5m.activeContract.spread = this.market5m.activeContract.spread;
    }

    if (market20m && this.market20m && market20m.eventId === this.market20m.eventId) {
      market20m.activeContract.previousYesPrice = this.market20m.activeContract.yesPrice;
      market20m.activeContract.bid = this.market20m.activeContract.bid;
      market20m.activeContract.ask = this.market20m.activeContract.ask;
      market20m.activeContract.mid = this.market20m.activeContract.mid;
      market20m.activeContract.spread = this.market20m.activeContract.spread;
    }

    this.market5m = market5m;
    this.market20m = market20m;
  }

  /**
   * Fetches real-time prices for active 5m and 20m contracts
   */
  private async fetchContractPrices() {
    const now = Date.now();

    // Check if markets need countdown update or rotation
    if (this.market5m) {
      this.market5m.secondsRemaining = Math.floor((this.market5m.expiryTimeMs - now) / 1000);
      if (this.market5m.secondsRemaining < -5) {
        // Market expired -> trigger rotation
        this.recalculateActiveMarkets();
      }
    }

    if (this.market20m) {
      this.market20m.secondsRemaining = Math.floor((this.market20m.expiryTimeMs - now) / 1000);
      if (this.market20m.secondsRemaining < -5) {
        this.recalculateActiveMarkets();
      }
    }

    // Fetch individual contract prices for active contracts
    const promises: Promise<void>[] = [];

    if (this.market5m && this.market5m.activeContract?.symbol) {
      const sym = this.market5m.activeContract.symbol;
      promises.push(
        this.apiClient.getContractPrice(sym).then((priceData) => {
          if (priceData && this.market5m) {
            this.updateMarketWithPriceData(this.market5m, priceData);
            this.lastSuccessfulUpdate = Date.now();
          }
        })
      );
    }

    if (this.market20m && this.market20m.activeContract?.symbol) {
      const sym = this.market20m.activeContract.symbol;
      promises.push(
        this.apiClient.getContractPrice(sym).then((priceData) => {
          if (priceData && this.market20m) {
            this.updateMarketWithPriceData(this.market20m, priceData);
            this.lastSuccessfulUpdate = Date.now();
          }
        })
      );
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
      this.broadcast();
    }
  }

  private updateMarketWithPriceData(market: ParsedPredictionMarket, priceData: any) {
    const bid = parseFloat(priceData.bid);
    const ask = parseFloat(priceData.ask);
    const mid = parseFloat(priceData.mid);
    const prob = parseFloat(priceData.probability);
    const spread = parseFloat(priceData.spread);

    const prevPrice = market.activeContract.yesPrice;
    const newPrice = !isNaN(ask) ? ask : market.activeContract.yesPrice;

    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    if (prevPrice !== null && newPrice !== null) {
      if (newPrice > prevPrice) direction = 'up';
      else if (newPrice < prevPrice) direction = 'down';
    }

    market.activeContract.bid = isNaN(bid) ? null : bid;
    market.activeContract.ask = isNaN(ask) ? null : ask;
    market.activeContract.mid = isNaN(mid) ? null : mid;
    market.activeContract.probability = isNaN(prob) ? market.activeContract.probability : prob;
    market.activeContract.spread = isNaN(spread) ? null : spread;
    market.activeContract.yesPrice = newPrice;
    market.activeContract.noPrice = !isNaN(bid) ? parseFloat((1 - bid).toFixed(2)) : market.activeContract.noPrice;
    market.activeContract.updatedAt = priceData.updated_at || new Date().toISOString();
    market.activeContract.priceDirection = direction;
    market.activeContract.dataAgeMs = Date.now() - (priceData.updated_at ? new Date(priceData.updated_at).getTime() : Date.now());
    market.lastApiUpdate = Date.now();
    market.dataState = this.getDataState(market.lastApiUpdate);
  }

  /**
   * Fetches spot underlying ticker from Crypto.com Exchange API
   */
  private async fetchSpotTicker() {
    try {
      const ticker = await this.apiClient.getSpotTicker(this.currentAsset);
      if (ticker) {
        this.underlyingPrice = ticker;
        this.broadcast();
      }
    } catch (e: any) {
      console.warn('[MarketDataService] Spot ticker error:', e.message);
    }
  }

  private getDataState(lastUpdate: number): 'LIVE' | 'STALE' | 'OFFLINE' {
    const age = Date.now() - lastUpdate;
    if (age < 5000) return 'LIVE';
    if (age < 15000) return 'STALE';
    return 'OFFLINE';
  }

  public getSnapshot(): TerminalStateSnapshot {
    const connState = this.getDataState(this.lastSuccessfulUpdate);
    return {
      asset: this.currentAsset,
      availableAssets: this.availableAssets,
      underlying: this.underlyingPrice,
      market5m: this.market5m,
      market20m: this.market20m,
      allCryptoEventsCount: this.cachedEvents.length,
      lastUpdated: this.lastSuccessfulUpdate || Date.now(),
      connectionState: connState,
      serverUptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      apiCallLatencyMs: this.apiClient.getLastLatencyMs(),
    };
  }

  private broadcast() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (e) {
        // ignore listener errors
      }
    }
  }
}
