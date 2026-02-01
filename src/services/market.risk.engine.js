import { MARKET_STATE, THRESHOLDS, RISK_ENGINE_CONFIG, WHAT_HAPPENED } from '../utils/market.constants.js';

const sessionStates = new Map();

function getSessionState(sessionId) {
  if (!sessionStates.has(sessionId)) {
    sessionStates.set(sessionId, {
      currentState: MARKET_STATE.NORMAL,
      previousState: MARKET_STATE.NORMAL,
      lastTriggerTime: 0,
      triggerCount: 0,
      baselineMetrics: null,
    });
  }
  return sessionStates.get(sessionId);
}

export function calculateMetrics(candles, baselineCandles = []) {
  if (!candles || candles.length < RISK_ENGINE_CONFIG.MIN_CANDLES_FOR_ANALYSIS) {
    return null;
  }

  const windowSize = Math.min(candles.length, RISK_ENGINE_CONFIG.ROLLING_WINDOW_SIZE);
  const recentCandles = candles.slice(-windowSize);
  const firstCandle = recentCandles[0];
  const lastCandle = recentCandles[recentCandles.length - 1];

  const priceChange = lastCandle.close - firstCandle.open;
  const percentChange = (priceChange / firstCandle.open) * 100;

  const highestHigh = Math.max(...recentCandles.map((c) => c.high));
  const lowestLow = Math.min(...recentCandles.map((c) => c.low));
  const avgPrice = (highestHigh + lowestLow) / 2;
  const rangePercent = ((highestHigh - lowestLow) / avgPrice) * 100;

  const recentAvgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;

  let baselineAvgVolume = recentAvgVolume;
  if (baselineCandles && baselineCandles.length >= RISK_ENGINE_CONFIG.MIN_CANDLES_FOR_ANALYSIS) {
    baselineAvgVolume = baselineCandles.reduce((sum, c) => sum + c.volume, 0) / baselineCandles.length;
  }

  const volumeRatio = baselineAvgVolume > 0 ? recentAvgVolume / baselineAvgVolume : 1;

  const recentAvgTrades = recentCandles.reduce((sum, c) => sum + (c.trades || 0), 0) / recentCandles.length;
  let tradeCountRatio = 1;
  if (baselineCandles && baselineCandles.length > 0) {
    const baselineAvgTrades = baselineCandles.reduce((sum, c) => sum + (c.trades || 0), 0) / baselineCandles.length;
    tradeCountRatio = baselineAvgTrades > 0 ? recentAvgTrades / baselineAvgTrades : 1;
  }

  let consecutiveUp = 0;
  let consecutiveDown = 0;
  for (let i = recentCandles.length - 1; i >= 0; i -= 1) {
    const candle = recentCandles[i];
    if (candle.close > candle.open) {
      if (consecutiveDown > 0) break;
      consecutiveUp += 1;
    } else if (candle.close < candle.open) {
      if (consecutiveUp > 0) break;
      consecutiveDown += 1;
    }
  }

  const avgBodyPercent =
    recentCandles.reduce((sum, c) => {
      const bodyPercent = (Math.abs(c.close - c.open) / c.open) * 100;
      return sum + bodyPercent;
    }, 0) / recentCandles.length;

  return {
    percentChange: Number(percentChange.toFixed(3)),
    rangePercent: Number(rangePercent.toFixed(3)),
    volumeRatio: Number(volumeRatio.toFixed(2)),
    tradeCountRatio: Number(tradeCountRatio.toFixed(2)),
    avgBodyPercent: Number(avgBodyPercent.toFixed(3)),
    consecutiveUp,
    consecutiveDown,
    currentPrice: lastCandle.close,
    priceHigh: highestHigh,
    priceLow: lowestLow,
    avgVolume: Math.round(recentAvgVolume),
    candlesAnalyzed: recentCandles.length,
  };
}

function classifyWhatHappened(metrics) {
  const { percentChange, rangePercent, volumeRatio, consecutiveUp, consecutiveDown } = metrics;
  const absChange = Math.abs(percentChange);

  if (absChange > THRESHOLDS.HIGH_RISK.PERCENT_CHANGE) {
    if (percentChange < 0) return WHAT_HAPPENED.FLASH_CRASH;
    return WHAT_HAPPENED.FLASH_PUMP;
  }

  if (absChange > THRESHOLDS.VOLATILE.PERCENT_CHANGE) {
    if (consecutiveDown >= 3 || percentChange < 0) return WHAT_HAPPENED.FAST_DROP;
    if (consecutiveUp >= 3 || percentChange > 0) return WHAT_HAPPENED.FAST_RISE;
  }

  if (rangePercent > THRESHOLDS.HIGH_RISK.RANGE_PERCENT) {
    return WHAT_HAPPENED.WIDE_SWINGS;
  }

  if (volumeRatio > THRESHOLDS.HIGH_RISK.VOLUME_RATIO && absChange < 1) {
    return WHAT_HAPPENED.VOLUME_SURGE;
  }

  return WHAT_HAPPENED.MIXED_VOLATILITY;
}

function determineState(metrics) {
  const { percentChange, rangePercent, volumeRatio, tradeCountRatio, avgBodyPercent } = metrics;
  const absChange = Math.abs(percentChange);

  const highRiskConditions = [
    absChange >= THRESHOLDS.HIGH_RISK.PERCENT_CHANGE,
    rangePercent >= THRESHOLDS.HIGH_RISK.RANGE_PERCENT,
    volumeRatio >= THRESHOLDS.HIGH_RISK.VOLUME_RATIO && absChange >= 2,
    tradeCountRatio >= THRESHOLDS.HIGH_RISK.TRADE_COUNT_RATIO && absChange >= 1.5,
  ];

  if (highRiskConditions.filter(Boolean).length >= 1) {
    return MARKET_STATE.HIGH_RISK;
  }

  const volatileConditions = [
    absChange >= THRESHOLDS.VOLATILE.PERCENT_CHANGE,
    rangePercent >= THRESHOLDS.VOLATILE.RANGE_PERCENT,
    volumeRatio >= THRESHOLDS.VOLATILE.VOLUME_RATIO,
    avgBodyPercent >= 0.5,
  ];

  if (volatileConditions.filter(Boolean).length >= 2) {
    return MARKET_STATE.VOLATILE;
  }

  return MARKET_STATE.NORMAL;
}

function generateSignals(metrics, state) {
  const signals = [];
  const { percentChange, volumeRatio, rangePercent, tradeCountRatio, consecutiveUp, consecutiveDown } = metrics;
  const absChange = Math.abs(percentChange);
  const direction = percentChange >= 0 ? 'up' : 'down';

  if (absChange >= THRESHOLDS.HIGH_RISK.PERCENT_CHANGE) {
    signals.push(`Price moved ${direction} ${absChange.toFixed(1)}% very quickly`);
  } else if (absChange >= THRESHOLDS.VOLATILE.PERCENT_CHANGE) {
    signals.push(`Price moved ${direction} ${absChange.toFixed(1)}% recently`);
  }

  if (volumeRatio >= THRESHOLDS.HIGH_RISK.VOLUME_RATIO) {
    signals.push(`Trading volume is ${volumeRatio.toFixed(1)}x higher than normal`);
  } else if (volumeRatio >= THRESHOLDS.VOLATILE.VOLUME_RATIO) {
    signals.push(`Trading volume is elevated at ${volumeRatio.toFixed(1)}x normal`);
  }

  if (rangePercent >= THRESHOLDS.HIGH_RISK.RANGE_PERCENT) {
    signals.push(`Price is swinging across a wide ${rangePercent.toFixed(1)}% range`);
  } else if (rangePercent >= THRESHOLDS.VOLATILE.RANGE_PERCENT) {
    signals.push(`Price range is ${rangePercent.toFixed(1)}% wider than usual`);
  }

  if (consecutiveDown >= 4) {
    signals.push(`${consecutiveDown} consecutive down candles showing selling pressure`);
  } else if (consecutiveUp >= 4) {
    signals.push(`${consecutiveUp} consecutive up candles showing buying momentum`);
  }

  if (tradeCountRatio >= THRESHOLDS.HIGH_RISK.TRADE_COUNT_RATIO) {
    signals.push(`Number of trades is ${tradeCountRatio.toFixed(1)}x higher than average`);
  }

  if (state === MARKET_STATE.HIGH_RISK) {
    signals.push('Multiple risk factors are active simultaneously');
  }

  return signals;
}

export function analyzeMarket(candles, baselineCandles = [], sessionId = 'default') {
  const state = getSessionState(sessionId);
  const now = Date.now();

  const metrics = calculateMetrics(candles, baselineCandles);
  if (!metrics) {
    return {
      state: state.currentState,
      previousState: state.previousState,
      shouldTrigger: false,
      transitionType: 'insufficient_data',
      whatHappened: null,
      signals: [],
      metrics: null,
      triggerCount: state.triggerCount,
    };
  }

  if (!state.baselineMetrics && baselineCandles.length >= RISK_ENGINE_CONFIG.BASELINE_CANDLE_COUNT) {
    state.baselineMetrics = calculateMetrics(baselineCandles);
  }

  const newState = determineState(metrics);
  const whatHappened = classifyWhatHappened(metrics);
  const signals = generateSignals(metrics, newState);

  const stateEscalated =
    (newState === MARKET_STATE.VOLATILE && state.currentState === MARKET_STATE.NORMAL) ||
    (newState === MARKET_STATE.HIGH_RISK && state.currentState !== MARKET_STATE.HIGH_RISK);

  const cooldownPassed = now - state.lastTriggerTime >= RISK_ENGINE_CONFIG.COOLDOWN_MS;
  const shouldTrigger = stateEscalated && cooldownPassed;

  let transitionType = 'none';
  if (stateEscalated) {
    if (newState === MARKET_STATE.HIGH_RISK) {
      transitionType = state.currentState === MARKET_STATE.NORMAL ? 'normal_to_high_risk' : 'volatile_to_high_risk';
    } else {
      transitionType = 'normal_to_volatile';
    }
  } else if (newState === MARKET_STATE.NORMAL && state.currentState !== MARKET_STATE.NORMAL) {
    transitionType = 'recovery';
  }

  const previousState = state.currentState;
  state.previousState = previousState;
  state.currentState = newState;

  if (shouldTrigger) {
    state.lastTriggerTime = now;
    state.triggerCount += 1;
  }

  return {
    state: newState,
    previousState,
    shouldTrigger,
    transitionType,
    whatHappened,
    signals,
    metrics,
    triggerCount: state.triggerCount,
  };
}

export function resetSession(sessionId = 'default') {
  sessionStates.delete(sessionId);
}

export function getState(sessionId = 'default') {
  return getSessionState(sessionId);
}

export function clearAllSessions() {
  sessionStates.clear();
}
