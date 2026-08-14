import { CryptoComPredictionEvent, ParsedPredictionMarket } from './types';

export class MarketDiscoveryEngine {
  /**
   * Filter and classify prediction events for a given asset (e.g. BTC, ETH, SOL)
   */
  public static discoverMarketsForAsset(
    events: CryptoComPredictionEvent[],
    targetAsset: string,
    nowMs: number = Date.now()
  ): { market5m: ParsedPredictionMarket | null; market20m: ParsedPredictionMarket | null; allAssetEvents: ParsedPredictionMarket[] } {
    const normAsset = targetAsset.toUpperCase();

    // Filter events matching target asset strictly
    const matchingEvents = events.filter((ev) => {
      const kind = (ev.kind || '').toUpperCase();
      const title = (ev.title || '').toUpperCase();
      
      let isAssetMatch = false;
      if (normAsset === 'BTC') {
        isAssetMatch = (kind === 'BTC' || (title.includes('BITCOIN') && !title.includes('BITCOIN CASH')));
      } else if (normAsset === 'BCH') {
        isAssetMatch = (kind === 'BCH' || title.includes('BITCOIN CASH'));
      } else if (normAsset === 'ETH') {
        isAssetMatch = (kind === 'ETH' || title.includes('ETHEREUM'));
      } else if (normAsset === 'SOL') {
        isAssetMatch = (kind === 'SOL' || title.includes('SOLANA'));
      } else if (normAsset === 'DOGE') {
        isAssetMatch = (kind === 'DOGE' || title.includes('DOGECOIN'));
      } else if (normAsset === 'XRP') {
        isAssetMatch = (kind === 'XRP' || title.includes('XRP') || title.includes('RIPPLE'));
      } else if (normAsset === 'ADA') {
        isAssetMatch = (kind === 'ADA' || title.includes('CARDANO'));
      } else {
        isAssetMatch = kind === normAsset || title.includes(normAsset);
      }

      return isAssetMatch && ev.status === 'active' && ev.contracts && ev.contracts.length > 0;
    });

    // Parse all matching events into standardized structure
    const parsedMarkets: ParsedPredictionMarket[] = matchingEvents
      .map((ev) => this.parseEvent(ev, normAsset, nowMs))
      .filter((m): m is ParsedPredictionMarket => m !== null);

    // Sort by expiry: future/nearest expiries first, then recent active
    parsedMarkets.sort((a, b) => {
      if (a.secondsRemaining >= 0 && b.secondsRemaining < 0) return -1;
      if (a.secondsRemaining < 0 && b.secondsRemaining >= 0) return 1;
      return a.expiryTimeMs - b.expiryTimeMs;
    });

    let market5m: ParsedPredictionMarket | null = null;
    let market20m: ParsedPredictionMarket | null = null;

    if (parsedMarkets.length > 0) {
      market5m = { ...parsedMarkets[0], category: '5m', durationLabel: '5 MIN' };
    }

    if (parsedMarkets.length > 1) {
      market20m = { ...parsedMarkets[1], category: '20m', durationLabel: '20 MIN' };
    } else if (parsedMarkets.length === 1) {
      market20m = { ...parsedMarkets[0], category: '20m', durationLabel: '20 MIN' };
    }

    return {
      market5m,
      market20m,
      allAssetEvents: parsedMarkets,
    };
  }

  /**
   * Parse a raw Crypto.com Prediction Event into a rich ParsedPredictionMarket
   */
  public static parseEvent(
    ev: CryptoComPredictionEvent,
    asset: string,
    nowMs: number = Date.now()
  ): ParsedPredictionMarket | null {
    if (!ev.contracts || ev.contracts.length === 0) {
      return null;
    }

    // Determine expiration timestamp
    let expiryMs = 0;
    if (ev.event_date) {
      expiryMs = new Date(ev.event_date).getTime();
    }

    // Fallback: parse date/time from contract symbol
    if (isNaN(expiryMs) || expiryMs === 0) {
      const sym = ev.contracts[0]?.symbol || '';
      const match = sym.match(/_(\d{2})(\d{2})(\d{2})-(\d{2})(\d{2})_/);
      if (match) {
        const [_, yy, mm, dd, hh, min] = match;
        const year = 2000 + parseInt(yy, 10);
        const month = parseInt(mm, 10) - 1;
        const day = parseInt(dd, 10);
        const hour = parseInt(hh, 10);
        const minute = parseInt(min, 10);
        expiryMs = Date.UTC(year, month, day, hour, minute, 0);
      }
    }

    if (isNaN(expiryMs) || expiryMs === 0) {
      expiryMs = nowMs + 300000;
    }

    const secondsRemaining = Math.floor((expiryMs - nowMs) / 1000);
    const isExpired = secondsRemaining <= 0;

    // Parse all contracts in the event
    const parsedContracts = ev.contracts.map((c) => {
      const yesPrice = c.yes ? parseFloat(c.yes) : null;
      const noPrice = c.no ? parseFloat(c.no) : null;
      const probability = c.chance ? parseFloat(c.chance) : (yesPrice !== null ? Math.round(yesPrice * 100) : null);

      return {
        id: c.id,
        symbol: c.symbol,
        title: c.title,
        status: c.status,
        yesPrice: isNaN(yesPrice as number) ? null : yesPrice,
        noPrice: isNaN(noPrice as number) ? null : noPrice,
        bid: null as number | null,
        ask: null as number | null,
        mid: null as number | null,
        probability: isNaN(probability as number) ? null : probability,
        spread: null as number | null,
        payoutPer100: c.payout_per_100 || null,
        updatedAt: new Date().toISOString(),
        dataAgeMs: 0,
        raw: {
          yes: c.yes,
          no: c.no,
          payout_per_100: c.payout_per_100,
        },
      };
    });

    // Select the most active/representative contract (e.g. middle strike or first active)
    const activeContractCandidate = parsedContracts[Math.floor(parsedContracts.length / 2)] || parsedContracts[0];

    const activeContract = {
      symbol: activeContractCandidate.symbol,
      title: activeContractCandidate.title,
      status: activeContractCandidate.status,
      yesPrice: activeContractCandidate.yesPrice,
      noPrice: activeContractCandidate.noPrice,
      bid: null as number | null,
      ask: null as number | null,
      mid: null as number | null,
      probability: activeContractCandidate.probability,
      spread: null as number | null,
      payoutPer100: activeContractCandidate.payoutPer100,
      updatedAt: activeContractCandidate.updatedAt,
      dataAgeMs: 0,
      priceDirection: 'neutral' as 'up' | 'down' | 'neutral',
      previousYesPrice: null as number | null,
    };

    return {
      eventId: ev.id,
      eventTitle: ev.title,
      asset,
      category: '5m',
      durationLabel: '5 MIN',
      status: ev.status,
      eventDate: ev.event_date || new Date(expiryMs).toISOString(),
      expiryTimeMs: expiryMs,
      secondsRemaining,
      isExpired,
      selectedContractSymbol: activeContractCandidate.symbol,
      selectedContractTitle: activeContractCandidate.title,
      contracts: parsedContracts,
      activeContract,
      lastApiUpdate: nowMs,
      dataState: 'LIVE',
    };
  }
}
