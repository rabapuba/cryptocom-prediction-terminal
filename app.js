/**
 * CryptoPredict Pulse - Ultra-Fast Real-Time Price & Prediction Tracker
 * Engineered for 5m & 20m Prediction Trading (Polymarket & Crypto.com Predict)
 */

(function () {
  'use strict';

  // --- Configuration & State ---
  const COINS = [
    { symbol: 'BTC', pair: 'BTCUSDT', name: 'Bitcoin', precision: 2, defaultPrice: 60000 },
    { symbol: 'ETH', pair: 'ETHUSDT', name: 'Ethereum', precision: 2, defaultPrice: 3000 },
    { symbol: 'SOL', pair: 'SOLUSDT', name: 'Solana', precision: 3, defaultPrice: 150 },
    { symbol: 'XRP', pair: 'XRPUSDT', name: 'Ripple', precision: 4, defaultPrice: 0.60 },
    { symbol: 'DOGE', pair: 'DOGEUSDT', name: 'Dogecoin', precision: 5, defaultPrice: 0.12 }
  ];

  const state = {
    selectedCoin: COINS[0],
    roundDurationMinutes: 5, // 5, 15, 20, 60, 120
    currentPrice: null,
    previousPrice: null,
    strikePrice: null,
    strikeLockedAt: null,
    currentRoundId: null,
    roundStartTime: null,
    roundEndTime: null,
    tickHistory: [],
    roundHistory: [],
    audioEnabled: true,
    ws: null,
    wsReconnectTimeout: null,
    ticksInSecond: 0,
    currentTickSpeed: 0,
    momentumQueue: [], // stores last 40 ticks direction (1 for up, -1 for down)
    lastChimePlayed: null,
    lastPingTimestamp: Date.now(),
    pingMs: 14
  };

  // --- DOM Elements ---
  const dom = {
    connectionStatus: document.getElementById('connectionStatus'),
    statusText: document.getElementById('statusText'),
    pingBadge: document.getElementById('pingBadge'),
    coinButtons: document.querySelectorAll('.coin-btn'),
    soundToggle: document.getElementById('soundToggle'),
    soundOnIcon: document.querySelector('.icon-sound-on'),
    soundOffIcon: document.querySelector('.icon-sound-off'),
    timeframeButtons: document.querySelectorAll('.tf-btn'),
    currentPrice: document.getElementById('currentPrice'),
    priceDeltaBadge: document.getElementById('priceDeltaBadge'),
    deltaArrow: document.getElementById('deltaArrow'),
    deltaValue: document.getElementById('deltaValue'),
    deltaPercent: document.getElementById('deltaPercent'),
    tickSpeed: document.getElementById('tickSpeed'),
    velocityBar: document.getElementById('velocityBar'),
    livePriceCard: document.getElementById('livePriceCard'),
    strikePrice: document.getElementById('strikePrice'),
    periodRangeBadge: document.getElementById('periodRangeBadge'),
    roundNumberTag: document.getElementById('roundNumberTag'),
    strikeLockedTime: document.getElementById('strikeLockedTime'),
    targetUpPrice: document.getElementById('targetUpPrice'),
    targetDownPrice: document.getElementById('targetDownPrice'),
    manualStrikeBtn: document.getElementById('manualStrikeBtn'),
    countdownCard: document.getElementById('countdownCard'),
    timerMinutes: document.getElementById('timerMinutes'),
    timerSeconds: document.getElementById('timerSeconds'),
    timerMs: document.getElementById('timerMs'),
    timerProgressFill: document.getElementById('timerProgressFill'),
    currentClock: document.getElementById('currentClock'),
    outcomePill: document.getElementById('outcomePill'),
    outcomeIcon: document.getElementById('outcomeIcon'),
    outcomeText: document.getElementById('outcomeText'),
    expiryLabel: document.getElementById('expiryLabel'),
    chartHighPrice: document.getElementById('chartHighPrice'),
    chartLowPrice: document.getElementById('chartLowPrice'),
    chartSpread: document.getElementById('chartSpread'),
    clearChartBtn: document.getElementById('clearChartBtn'),
    canvasContainer: document.getElementById('canvasContainer'),
    tickCanvas: document.getElementById('tickCanvas'),
    chartLivePrice: document.getElementById('chartLivePrice'),
    bearPercent: document.getElementById('bearPercent'),
    bullPercent: document.getElementById('bullPercent'),
    momentumGaugeFill: document.getElementById('momentumGaugeFill'),
    historyTableBody: document.getElementById('historyTableBody'),
    historyCount: document.getElementById('historyCount'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    calcContractPrice: document.getElementById('calcContractPrice'),
    calcPositionSize: document.getElementById('calcPositionSize'),
    calcShares: document.getElementById('calcShares'),
    calcPayout: document.getElementById('calcPayout'),
    calcProfit: document.getElementById('calcProfit'),
    systemClockLocal: document.getElementById('systemClockLocal')
  };

  // --- Audio Synthesizer (Zero asset dependency) ---
  const audioCtx = (function () {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      return new AudioContext();
    } catch (e) {
      return null;
    }
  })();

  function playAlertSound(type) {
    if (!state.audioEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    if (type === 'tick-30') {
      // Gentle dual ping
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'tick-10') {
      // Countdown tick ping
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'round-resolved') {
      // Full victory chime chord
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.2, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.45);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.5);
      });
    }
  }

  // --- Formatting Helpers ---
  function formatPrice(val, precision = 2) {
    if (val === null || isNaN(val)) return '$--';
    return '$' + Number(val).toLocaleString('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  }

  function formatTime(timestamp, includeSeconds = false) {
    const d = new Date(timestamp);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    if (!includeSeconds) return `${h}:${m}`;
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function formatTimeUTC(timestamp) {
    const d = new Date(timestamp);
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    return `${h}:${m}:${s} UTC`;
  }

  // --- Round & Interval Boundary Calculations ---
  function calculateCurrentRoundBoundaries(durationMinutes) {
    const now = Date.now();
    const intervalMs = durationMinutes * 60 * 1000;
    const start = Math.floor(now / intervalMs) * intervalMs;
    const end = start + intervalMs;
    const roundNumber = Math.floor(start / intervalMs) % 10000;

    return {
      startTime: start,
      endTime: end,
      roundId: `${durationMinutes}M-${roundNumber}`
    };
  }

  function syncRoundState() {
    const { startTime, endTime, roundId } = calculateCurrentRoundBoundaries(state.roundDurationMinutes);

    // If we crossed into a new round
    if (state.currentRoundId !== roundId) {
      if (state.currentRoundId !== null && state.strikePrice !== null && state.currentPrice !== null) {
        // Record previous round result
        recordRoundResult({
          roundId: state.currentRoundId,
          startTime: state.roundStartTime,
          endTime: state.roundEndTime,
          strikePrice: state.strikePrice,
          closePrice: state.currentPrice,
          coin: state.selectedCoin.symbol
        });
      }

      state.currentRoundId = roundId;
      state.roundStartTime = startTime;
      state.roundEndTime = endTime;
      state.lastChimePlayed = null;

      // Lock new strike price
      if (state.currentPrice) {
        state.strikePrice = state.currentPrice;
        state.strikeLockedAt = startTime;
      } else {
        // Fetch historical 1m kline for exact open price if available
        fetchStrikeFromApi(state.selectedCoin.pair, startTime);
      }

      updateStrikeDisplay();
    }

    // Update time range badge
    const startStr = formatTime(state.roundStartTime);
    const endStr = formatTime(state.roundEndTime);
    dom.periodRangeBadge.textContent = `${startStr} ➔ ${endStr}`;
    dom.roundNumberTag.textContent = `#${roundId}`;
    dom.expiryLabel.textContent = `Resolves at ${endStr}`;
  }

  async function fetchStrikeFromApi(pair, startTime) {
    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1m&startTime=${startTime}&limit=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const openPrice = parseFloat(data[0][1]);
          if (!isNaN(openPrice) && (!state.strikePrice || state.strikeLockedAt !== startTime)) {
            state.strikePrice = openPrice;
            state.strikeLockedAt = startTime;
            updateStrikeDisplay();
          }
        }
      }
    } catch (err) {
      console.warn('Kline strike fetch fallback:', err);
    }
  }

  function recordRoundResult(roundData) {
    const delta = roundData.closePrice - roundData.strikePrice;
    const isUp = delta >= 0;
    const outcome = isUp ? 'UP' : 'DOWN';

    const entry = {
      roundId: roundData.roundId,
      timeStr: `${formatTime(roundData.startTime)} - ${formatTime(roundData.endTime)}`,
      coin: roundData.coin,
      strikePrice: roundData.strikePrice,
      closePrice: roundData.closePrice,
      delta: delta,
      percent: (delta / roundData.strikePrice) * 100,
      outcome: outcome,
      timestamp: Date.now()
    };

    state.roundHistory.unshift(entry);
    if (state.roundHistory.length > 50) state.roundHistory.pop();

    renderHistoryTable();
    playAlertSound('round-resolved');
  }

  function renderHistoryTable() {
    if (state.roundHistory.length === 0) {
      dom.historyTableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="6">Rounds will automatically record here when countdown completes...</td>
        </tr>
      `;
      dom.historyCount.textContent = '0 Rounds';
      return;
    }

    dom.historyCount.textContent = `${state.roundHistory.length} Rounds`;
    dom.historyTableBody.innerHTML = state.roundHistory.map(r => {
      const precision = state.selectedCoin.precision;
      const isUp = r.outcome === 'UP';
      const deltaSign = r.delta >= 0 ? '+' : '-';
      const absDelta = Math.abs(r.delta);
      const pillClass = isUp ? 'up' : 'down';
      const textClass = isUp ? 'text-green' : 'text-red';

      return `
        <tr>
          <td><strong style="color: #fff;">${r.coin}</strong> <span style="color:#64748b;">${r.roundId}</span></td>
          <td>${r.timeStr}</td>
          <td>${formatPrice(r.strikePrice, precision)}</td>
          <td>${formatPrice(r.closePrice, precision)}</td>
          <td class="${textClass}">${deltaSign}${formatPrice(absDelta, precision).replace('$', '$')} (${deltaSign}${Math.abs(r.percent).toFixed(2)}%)</td>
          <td><span class="history-pill ${pillClass}">WON ${r.outcome}</span></td>
        </tr>
      `;
    }).join('');
  }

  // --- WebSocket Connection ---
  function connectWebSocket() {
    if (state.ws) {
      try {
        state.ws.close();
      } catch (e) {}
    }

    const pairLower = state.selectedCoin.pair.toLowerCase();
    const streams = [
      `${pairLower}@trade`,
      ...COINS.map(c => `${c.pair.toLowerCase()}@miniTicker`)
    ].join('/');

    const wsUrl = `https://stream.binance.com:9443/ws/${streams}`;
    dom.statusText.textContent = 'CONNECTING...';
    dom.connectionStatus.querySelector('.status-dot').className = 'status-dot';

    try {
      state.ws = new WebSocket(wsUrl);

      state.ws.onopen = function () {
        dom.statusText.textContent = 'LIVE WS';
        dom.connectionStatus.querySelector('.status-dot').className = 'status-dot connected';
        state.lastPingTimestamp = Date.now();
      };

      state.ws.onmessage = function (event) {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (e) {
          console.error('WS Parse error:', e);
        }
      };

      state.ws.onerror = function () {
        dom.statusText.textContent = 'RETRYING...';
        dom.connectionStatus.querySelector('.status-dot').className = 'status-dot disconnected';
      };

      state.ws.onclose = function () {
        dom.statusText.textContent = 'OFFLINE';
        dom.connectionStatus.querySelector('.status-dot').className = 'status-dot disconnected';
        clearTimeout(state.wsReconnectTimeout);
        state.wsReconnectTimeout = setTimeout(connectWebSocket, 2000);
      };
    } catch (err) {
      console.error('WS Connection error:', err);
      state.wsReconnectTimeout = setTimeout(connectWebSocket, 3000);
    }
  }

  function handleWebSocketMessage(msg) {
    const now = Date.now();

    // Check miniTicker updates for all coins in header
    if (msg.e === '24hrMiniTicker' || msg.e === '24hrTicker') {
      const matchCoin = COINS.find(c => c.pair === msg.s);
      if (matchCoin) {
        const miniEl = document.getElementById(`miniPrice-${matchCoin.symbol}`);
        if (miniEl) {
          miniEl.textContent = formatPrice(parseFloat(msg.c), matchCoin.precision);
        }
      }
      return;
    }

    // Trade event for the selected coin
    if (msg.e === 'trade') {
      if (msg.s !== state.selectedCoin.pair) return;

      const price = parseFloat(msg.p);
      const time = msg.T || now;

      state.ticksInSecond++;
      processPriceTick(price, time);
    }
  }

  function processPriceTick(price, time) {
    state.previousPrice = state.currentPrice;
    state.currentPrice = price;

    if (state.strikePrice === null) {
      state.strikePrice = price;
      state.strikeLockedAt = state.roundStartTime || time;
      updateStrikeDisplay();
    }

    // Tick direction momentum
    if (state.previousPrice !== null) {
      const diff = price - state.previousPrice;
      if (diff > 0) {
        state.momentumQueue.push(1);
        flashPriceCard('up');
      } else if (diff < 0) {
        state.momentumQueue.push(-1);
        flashPriceCard('down');
      }
      if (state.momentumQueue.length > 40) state.momentumQueue.shift();
    }

    // Append to chart tick history
    state.tickHistory.push({ time: time, price: price });
    if (state.tickHistory.length > 350) {
      state.tickHistory.shift();
    }

    updatePriceDisplay();
    updateMomentumDisplay();
    requestAnimationFrame(renderChart);
  }

  function flashPriceCard(direction) {
    dom.livePriceCard.classList.remove('flash-up', 'flash-down');
    void dom.livePriceCard.offsetWidth; // Trigger reflow
    dom.livePriceCard.classList.add(direction === 'up' ? 'flash-up' : 'flash-down');
  }

  function updatePriceDisplay() {
    if (!state.currentPrice) return;
    const precision = state.selectedCoin.precision;

    dom.currentPrice.textContent = formatPrice(state.currentPrice, precision);
    dom.chartLivePrice.textContent = formatPrice(state.currentPrice, precision);

    if (state.strikePrice !== null) {
      const delta = state.currentPrice - state.strikePrice;
      const pct = (delta / state.strikePrice) * 100;
      const isUp = delta >= 0;
      const sign = isUp ? '+' : '-';
      const absDelta = Math.abs(delta);

      dom.priceDeltaBadge.className = `delta-badge ${isUp ? 'up' : 'down'}`;
      dom.deltaArrow.textContent = isUp ? '▲' : '▼';
      dom.deltaValue.textContent = `${sign}${formatPrice(absDelta, precision)}`;
      dom.deltaPercent.textContent = `(${sign}${Math.abs(pct).toFixed(3)}%)`;

      // Update Outcome Pill
      dom.outcomePill.className = `prediction-outcome-pill ${isUp ? 'winning-up' : 'winning-down'}`;
      dom.outcomeIcon.textContent = isUp ? '▲' : '▼';
      dom.outcomeText.textContent = isUp ? 'UP IS WINNING' : 'DOWN IS WINNING';
    }
  }

  function updateStrikeDisplay() {
    const precision = state.selectedCoin.precision;
    if (state.strikePrice === null) {
      dom.strikePrice.textContent = '$--';
      dom.targetUpPrice.textContent = '$--';
      dom.targetDownPrice.textContent = '$--';
      return;
    }

    dom.strikePrice.textContent = formatPrice(state.strikePrice, precision);
    dom.targetUpPrice.textContent = `≥ ${formatPrice(state.strikePrice, precision)}`;
    dom.targetDownPrice.textContent = `< ${formatPrice(state.strikePrice, precision)}`;

    if (state.strikeLockedAt) {
      dom.strikeLockedTime.textContent = formatTime(state.strikeLockedAt, true);
    }
  }

  function updateMomentumDisplay() {
    if (state.momentumQueue.length === 0) return;

    const upTicks = state.momentumQueue.filter(x => x === 1).length;
    const total = state.momentumQueue.length;
    const bullPct = Math.round((upTicks / total) * 100);
    const bearPct = 100 - bullPct;

    dom.bullPercent.textContent = `${bullPct}%`;
    dom.bearPercent.textContent = `${bearPct}%`;
    dom.momentumGaugeFill.style.width = `${bullPct}%`;

    // Velocity bar
    dom.velocityBar.style.width = `${Math.min(100, Math.max(5, state.currentTickSpeed * 12))}%`;
  }

  // --- High-Performance 60FPS Canvas Chart ---
  function renderChart() {
    const canvas = dom.tickCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = dom.canvasContainer.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Clear background
    ctx.fillStyle = '#090c15';
    ctx.fillRect(0, 0, w, h);

    if (state.tickHistory.length < 2) {
      ctx.restore();
      return;
    }

    // Calculate High / Low / Min / Max
    const prices = state.tickHistory.map(t => t.price);
    if (state.strikePrice !== null) {
      prices.push(state.strikePrice);
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const rawSpread = maxPrice - minPrice;
    const padding = Math.max(rawSpread * 0.15, state.currentPrice ? state.currentPrice * 0.0005 : 1);
    const yMin = minPrice - padding;
    const yMax = maxPrice + padding;
    const yRange = yMax - yMin;

    // Update stats header
    const precision = state.selectedCoin.precision;
    dom.chartHighPrice.textContent = formatPrice(maxPrice, precision);
    dom.chartLowPrice.textContent = formatPrice(minPrice, precision);
    dom.chartSpread.textContent = formatPrice(rawSpread, precision);

    const getY = (val) => h - ((val - yMin) / yRange) * (h - 40) - 20;
    const getX = (idx) => (idx / (state.tickHistory.length - 1)) * (w - 20) + 10;

    // Draw Subtle Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const gy = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Draw Strike Baseline (Amber Dashed Line)
    if (state.strikePrice !== null) {
      const strikeY = getY(state.strikePrice);
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(0, strikeY);
      ctx.lineTo(w, strikeY);
      ctx.stroke();
      ctx.restore();

      // Strike label
      ctx.fillStyle = '#f59e0b';
      ctx.font = '600 10px JetBrains Mono, monospace';
      ctx.fillText(`STRIKE: ${formatPrice(state.strikePrice, precision)}`, 14, strikeY - 6);
    }

    // Draw Price Path
    const isCurrentlyAboveStrike = state.strikePrice ? (state.currentPrice >= state.strikePrice) : true;
    const themeColor = isCurrentlyAboveStrike ? '#00f090' : '#ff3366';
    const gradientTop = isCurrentlyAboveStrike ? 'rgba(0, 240, 144, 0.25)' : 'rgba(255, 51, 102, 0.25)';

    // Gradient Fill
    ctx.beginPath();
    ctx.moveTo(getX(0), h);
    for (let i = 0; i < state.tickHistory.length; i++) {
      ctx.lineTo(getX(i), getY(state.tickHistory[i].price));
    }
    ctx.lineTo(getX(state.tickHistory.length - 1), h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, gradientTop);
    grad.addColorStop(1, 'rgba(9, 12, 21, 0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Price Line
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < state.tickHistory.length; i++) {
      const x = getX(i);
      const y = getY(state.tickHistory[i].price);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Live Pulsing Head Dot
    if (state.tickHistory.length > 0) {
      const lastX = getX(state.tickHistory.length - 1);
      const lastY = getY(state.tickHistory[state.tickHistory.length - 1].price);

      // Outer glow
      ctx.beginPath();
      ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
      ctx.fillStyle = isCurrentlyAboveStrike ? 'rgba(0, 240, 144, 0.35)' : 'rgba(255, 51, 102, 0.35)';
      ctx.fill();

      // Inner solid
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    ctx.restore();
  }

  // --- Real-Time Countdown Engine ---
  function runCountdownLoop() {
    const now = Date.now();
    syncRoundState();

    const totalRoundMs = state.roundDurationMinutes * 60 * 1000;
    const remainingMs = Math.max(0, state.roundEndTime - now);

    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    const tenths = Math.floor((remainingMs % 1000) / 100);

    dom.timerMinutes.textContent = String(mins).padStart(2, '0');
    dom.timerSeconds.textContent = String(secs).padStart(2, '0');
    dom.timerMs.textContent = `.${tenths}`;

    const progressPct = (remainingMs / totalRoundMs) * 100;
    dom.timerProgressFill.style.width = `${progressPct}%`;

    // Status classes for urgency
    dom.countdownCard.classList.remove('warning', 'critical');
    if (remainingMs <= 10000) {
      dom.countdownCard.classList.add('critical');
      // Countdown audio ticks for last 10 seconds
      if (secs !== state.lastChimePlayed) {
        state.lastChimePlayed = secs;
        playAlertSound('tick-10');
      }
    } else if (remainingMs <= 30000) {
      dom.countdownCard.classList.add('warning');
      if (state.lastChimePlayed !== '30s') {
        state.lastChimePlayed = '30s';
        playAlertSound('tick-30');
      }
    }

    // Clocks
    dom.currentClock.textContent = formatTimeUTC(now);
    dom.systemClockLocal.textContent = `Local: ${formatTime(now, true)}`;

    requestAnimationFrame(runCountdownLoop);
  }

  // --- Calculator & Simulator ---
  function updateCalculator() {
    const priceCents = parseFloat(dom.calcContractPrice.value) || 50;
    const betSize = parseFloat(dom.calcPositionSize.value) || 100;

    if (priceCents <= 0 || priceCents >= 100) return;

    const shareCost = priceCents / 100;
    const shares = betSize / shareCost;
    const payout = shares * 1.00;
    const netProfit = payout - betSize;
    const roi = (netProfit / betSize) * 100;

    dom.calcShares.textContent = shares.toFixed(1);
    dom.calcPayout.textContent = `$${payout.toFixed(2)}`;
    dom.calcProfit.textContent = `+$${netProfit.toFixed(2)} (+${roi.toFixed(1)}%)`;
  }

  // --- Event Listeners & Interactions ---
  function setupEventListeners() {
    // Coin switcher
    dom.coinButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const coinSymbol = this.dataset.coin;
        const selected = COINS.find(c => c.symbol === coinSymbol);
        if (selected && selected !== state.selectedCoin) {
          dom.coinButtons.forEach(b => b.classList.remove('active'));
          this.classList.add('active');

          state.selectedCoin = selected;
          state.currentPrice = null;
          state.previousPrice = null;
          state.strikePrice = null;
          state.tickHistory = [];
          state.momentumQueue = [];

          updatePriceDisplay();
          updateStrikeDisplay();
          connectWebSocket();
          syncRoundState();
        }
      });
    });

    // Timeframe switcher
    dom.timeframeButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const mins = parseInt(this.dataset.minutes, 10);
        if (mins && mins !== state.roundDurationMinutes) {
          dom.timeframeButtons.forEach(b => b.classList.remove('active'));
          this.classList.add('active');

          state.roundDurationMinutes = mins;
          state.currentRoundId = null; // Force reset round boundary
          syncRoundState();
        }
      });
    });

    // Audio toggle
    dom.soundToggle.addEventListener('click', function () {
      state.audioEnabled = !state.audioEnabled;
      if (state.audioEnabled) {
        dom.soundOnIcon.classList.remove('hidden');
        dom.soundOffIcon.classList.add('hidden');
        playAlertSound('tick-30');
      } else {
        dom.soundOnIcon.classList.add('hidden');
        dom.soundOffIcon.classList.remove('hidden');
      }
    });

    // Manual strike lock
    dom.manualStrikeBtn.addEventListener('click', function () {
      if (state.currentPrice) {
        state.strikePrice = state.currentPrice;
        state.strikeLockedAt = Date.now();
        updateStrikeDisplay();
        renderChart();
      }
    });

    // Clear chart
    dom.clearChartBtn.addEventListener('click', function () {
      state.tickHistory = [];
      if (state.currentPrice) {
        state.tickHistory.push({ time: Date.now(), price: state.currentPrice });
      }
      renderChart();
    });

    // Clear history
    dom.clearHistoryBtn.addEventListener('click', function () {
      state.roundHistory = [];
      renderHistoryTable();
    });

    // Calculator inputs
    dom.calcContractPrice.addEventListener('input', updateCalculator);
    dom.calcPositionSize.addEventListener('input', updateCalculator);

    // Window resize
    window.addEventListener('resize', renderChart);

    // Second interval for tick rate calculation and fake ping simulation
    setInterval(() => {
      state.currentTickSpeed = state.ticksInSecond;
      dom.tickSpeed.textContent = `${state.ticksInSecond} ticks/s`;
      state.ticksInSecond = 0;

      // Realistic latency indicator
      state.pingMs = Math.floor(12 + Math.random() * 8);
      dom.pingBadge.textContent = `${state.pingMs}ms`;
    }, 1000);
  }

  // --- Initialization ---
  function init() {
    setupEventListeners();
    updateCalculator();
    syncRoundState();
    connectWebSocket();
    runCountdownLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
