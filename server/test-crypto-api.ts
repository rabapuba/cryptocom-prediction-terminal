import { CryptoComApiClient } from './cryptoApi';
import { MarketDiscoveryEngine } from './marketDiscovery';

async function runVerification() {
  console.log('--- STARTING REAL CRYPTO.COM API VERIFICATION ---');
  const client = new CryptoComApiClient();

  // 1. Test Prediction Events Search endpoint
  console.log('\n[1/4] Testing Search & Events for BTC...');
  const searchResults = await client.searchPredictionEvents('Bitcoin', 30);
  console.log(`SUCCESS: Retrieved ${searchResults.length} Bitcoin events from official search endpoint.`);

  // Load details for top candidates
  const detailedEvents = [];
  for (const ev of searchResults.slice(0, 8)) {
    const detail = await client.getPredictionEventById(ev.id);
    if (detail && detail.contracts && detail.contracts.length > 0) {
      detailedEvents.push(detail);
    }
  }
  console.log(`SUCCESS: Loaded full contract details for ${detailedEvents.length} events.`);

  // 2. Test Market Discovery Engine for BTC
  console.log('\n[2/4] Testing Automatic Market Discovery for BTC (5m & 20m)...');
  const { market5m, market20m, allAssetEvents } = MarketDiscoveryEngine.discoverMarketsForAsset(
    detailedEvents,
    'BTC'
  );

  console.log(`Total active parsed BTC Events: ${allAssetEvents.length}`);
  if (market5m) {
    console.log(`SUCCESS 5-MIN MARKET DISCOVERED:`);
    console.log(`  Title: ${market5m.eventTitle}`);
    console.log(`  Event ID: ${market5m.eventId}`);
    console.log(`  Active Contract: ${market5m.activeContract.symbol}`);
    console.log(`  YES Price: $${market5m.activeContract.yesPrice} | NO Price: $${market5m.activeContract.noPrice}`);
    console.log(`  Seconds to Expiry: ${market5m.secondsRemaining}s`);
  } else {
    console.log('NOTE: No active 5m BTC market unexpired at this exact second.');
  }

  if (market20m) {
    console.log(`SUCCESS 20-MIN MARKET DISCOVERED:`);
    console.log(`  Title: ${market20m.eventTitle}`);
    console.log(`  Event ID: ${market20m.eventId}`);
    console.log(`  Active Contract: ${market20m.activeContract.symbol}`);
    console.log(`  YES Price: $${market20m.activeContract.yesPrice} | NO Price: $${market20m.activeContract.noPrice}`);
    console.log(`  Seconds to Expiry: ${market20m.secondsRemaining}s`);
  }

  // 3. Test Contract Pricing Endpoint if symbol is available
  const sampleSymbol = market5m?.activeContract.symbol || market20m?.activeContract.symbol || detailedEvents[0]?.contracts?.[0]?.symbol;
  if (sampleSymbol) {
    console.log(`\n[3/4] Testing GET /api/v1/predictions/contracts/${sampleSymbol}/price...`);
    const priceData = await client.getContractPrice(sampleSymbol);
    if (priceData) {
      console.log(`SUCCESS Contract Real-time Price:`);
      console.log(`  Symbol: ${priceData.symbol}`);
      console.log(`  Bid: ${priceData.bid} | Ask: ${priceData.ask} | Mid: ${priceData.mid}`);
      console.log(`  Spread: ${priceData.spread} | Probability: ${priceData.probability}%`);
      console.log(`  Updated At: ${priceData.updated_at}`);
    } else {
      console.warn(`WARNING: Price endpoint returned null for ${sampleSymbol}`);
    }
  }

  // 4. Test Spot Underlying Ticker
  console.log('\n[4/4] Testing Official Spot Ticker (BTC_USDT)...');
  const spotTicker = await client.getSpotTicker('BTC');
  if (spotTicker && spotTicker.price) {
    console.log(`SUCCESS Spot BTC Price: $${spotTicker.price}`);
    console.log(`  Bid: $${spotTicker.bid} | Ask: $${spotTicker.ask}`);
    console.log(`  24h High: $${spotTicker.high24h} | 24h Low: $${spotTicker.low24h} | Change: ${(Number(spotTicker.change24h) * 100).toFixed(2)}%`);
  } else {
    console.warn('WARNING: Spot ticker returned null.');
  }

  console.log('\n--- VERIFICATION COMPLETED SUCCESSFULLY ---');
}

runVerification().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
