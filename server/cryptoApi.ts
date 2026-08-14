import {
  CryptoComPredictionEvent,
  CryptoComContractPriceResponse,
  CryptoComSpotTickerResponse,
  UnderlyingSpotPrice,
} from './types';

export class CryptoComApiClient {
  private dataApiBaseUrl = process.env.CRYPTOCOM_DATA_API || 'https://data-api.crypto.com';
  private exchangeApiBaseUrl = process.env.CRYPTOCOM_EXCHANGE_API || 'https://api.crypto.com';
  private userAgent = 'CryptoComPredictionTerminal/1.0';
  private lastLatencyMs = 0;

  public getLastLatencyMs(): number {
    return this.lastLatencyMs;
  }

  private async fetchJson<T>(url: string, timeoutMs = 8000): Promise<T | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      this.lastLatencyMs = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`[Crypto.com API] Rate limit (429) on ${url}`);
        } else if (response.status === 404) {
          // Normal for expired contracts/events
          return null;
        } else {
          console.warn(`[Crypto.com API] HTTP ${response.status} on ${url}`);
        }
        return null;
      }

      const data = await response.json();
      return data as T;
    } catch (error: any) {
      this.lastLatencyMs = Date.now() - startTime;
      if (error.name === 'AbortError') {
        console.warn(`[Crypto.com API] Timeout (${timeoutMs}ms) requesting ${url}`);
      } else {
        console.warn(`[Crypto.com API] Fetch error on ${url}:`, error.message);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetches prediction market events from official endpoint
   * GET /api/v1/predictions/events
   */
  public async getPredictionEvents(limit = 50, cursor?: string): Promise<{ data: CryptoComPredictionEvent[]; nextCursor?: string } | null> {
    let url = `${this.dataApiBaseUrl}/api/v1/predictions/events?limit=${limit}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }

    const res = await this.fetchJson<{ data: CryptoComPredictionEvent[]; pagination?: { next_cursor?: string } }>(url);
    if (!res || !res.data) {
      return null;
    }

    return {
      data: res.data,
      nextCursor: res.pagination?.next_cursor,
    };
  }

  /**
   * Searches prediction market events by query
   * GET /api/v1/predictions/events/search?q={query}&limit={limit}
   */
  public async searchPredictionEvents(query: string, limit = 50): Promise<CryptoComPredictionEvent[]> {
    const url = `${this.dataApiBaseUrl}/api/v1/predictions/events/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await this.fetchJson<{ data: any[] }>(url);
    if (!res || !res.data) {
      return [];
    }
    return res.data as CryptoComPredictionEvent[];
  }

  /**
   * Fetches specific prediction event by ID with full contracts
   * GET /api/v1/predictions/events/{id}
   */
  public async getPredictionEventById(id: string): Promise<CryptoComPredictionEvent | null> {
    const url = `${this.dataApiBaseUrl}/api/v1/predictions/events/${id}`;
    const res = await this.fetchJson<{ data: CryptoComPredictionEvent }>(url);
    return res?.data || null;
  }

  /**
   * Fetches real-time contract price
   * GET /api/v1/predictions/contracts/{symbol}/price
   */
  public async getContractPrice(symbol: string): Promise<CryptoComContractPriceResponse['data'] | null> {
    const url = `${this.dataApiBaseUrl}/api/v1/predictions/contracts/${encodeURIComponent(symbol)}/price`;
    const res = await this.fetchJson<CryptoComContractPriceResponse>(url);
    return res?.data || null;
  }

  /**
   * Fetches spot underlying ticker from official Crypto.com Exchange API
   * GET /v2/public/get-ticker?instrument_name=BTC_USDT
   */
  public async getSpotTicker(asset: string): Promise<UnderlyingSpotPrice | null> {
    const instrument = `${asset.toUpperCase()}_USDT`;
    const url = `${this.exchangeApiBaseUrl}/v2/public/get-ticker?instrument_name=${instrument}`;
    const res = await this.fetchJson<CryptoComSpotTickerResponse>(url);

    const ticker = res?.result?.data?.[0];
    if (!ticker) {
      return null;
    }

    const price = parseFloat(ticker.a);
    const bid = parseFloat(ticker.b);
    const ask = parseFloat(ticker.k);
    const high24h = parseFloat(ticker.h);
    const low24h = parseFloat(ticker.l);
    const change24h = parseFloat(ticker.c);

    return {
      instrument: ticker.i,
      asset: asset.toUpperCase(),
      price: isNaN(price) ? null : price,
      bid: isNaN(bid) ? null : bid,
      ask: isNaN(ask) ? null : ask,
      high24h: isNaN(high24h) ? null : high24h,
      low24h: isNaN(low24h) ? null : low24h,
      change24h: isNaN(change24h) ? null : change24h,
      timestamp: ticker.t || Date.now(),
      rawPrice: ticker.a,
    };
  }
}
