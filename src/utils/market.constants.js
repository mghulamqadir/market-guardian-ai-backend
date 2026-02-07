/**
 * Market constants for real-time simulation and WebSocket events.
 */

export const TRADING_PAIRS = {
  // Simulated pairs
  'BTC/USDT': {
    symbol: 'BTC/USDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    pricePrecision: 2,
    quantityPrecision: 6,
    minPrice: 20000,
    maxPrice: 100000,
    typicalSpread: 0.01,
    avgDailyVolume: 50000,
    volatilityFactor: 1.0,
    source: 'simulated',
  },
  'ETH/USDT': {
    symbol: 'ETH/USDT',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    pricePrecision: 2,
    quantityPrecision: 5,
    minPrice: 1500,
    maxPrice: 5000,
    typicalSpread: 0.02,
    avgDailyVolume: 200000,
    volatilityFactor: 1.2,
    source: 'simulated',
  },
  'SOL/USDT': {
    symbol: 'SOL/USDT',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    pricePrecision: 3,
    quantityPrecision: 2,
    minPrice: 20,
    maxPrice: 300,
    typicalSpread: 0.05,
    avgDailyVolume: 5000000,
    volatilityFactor: 1.5,
    source: 'simulated',
  },
  'DEMO/USD': {
    symbol: 'DEMO/USD',
    baseAsset: 'DEMO',
    quoteAsset: 'USD',
    pricePrecision: 2,
    quantityPrecision: 4,
    minPrice: 50,
    maxPrice: 200,
    typicalSpread: 0.02,
    avgDailyVolume: 100000,
    volatilityFactor: 1.0,
    source: 'simulated',
  },
  // Deriv synthetic indices
  'R100/USD': {
    symbol: 'R100/USD',
    derivSymbol: 'R_100',
    baseAsset: 'R100',
    quoteAsset: 'USD',
    pricePrecision: 2,
    quantityPrecision: 4,
    typicalSpread: 0.01,
    volatilityFactor: 1.0,
    source: 'deriv',
    type: 'synthetic',
  },
  'R75/USD': {
    symbol: 'R75/USD',
    derivSymbol: 'R_75',
    baseAsset: 'R75',
    quoteAsset: 'USD',
    pricePrecision: 2,
    quantityPrecision: 4,
    typicalSpread: 0.01,
    volatilityFactor: 0.75,
    source: 'deriv',
    type: 'synthetic',
  },
  'R50/USD': {
    symbol: 'R50/USD',
    derivSymbol: 'R_50',
    baseAsset: 'R50',
    quoteAsset: 'USD',
    pricePrecision: 2,
    quantityPrecision: 4,
    typicalSpread: 0.01,
    volatilityFactor: 0.5,
    source: 'deriv',
    type: 'synthetic',
  },
  // Deriv forex
  'EUR/USD': {
    symbol: 'EUR/USD',
    derivSymbol: 'frxEURUSD',
    baseAsset: 'EUR',
    quoteAsset: 'USD',
    pricePrecision: 5,
    quantityPrecision: 4,
    typicalSpread: 0.0001,
    volatilityFactor: 0.8,
    source: 'deriv',
    type: 'forex',
  },
  'GBP/USD': {
    symbol: 'GBP/USD',
    derivSymbol: 'frxGBPUSD',
    baseAsset: 'GBP',
    quoteAsset: 'USD',
    pricePrecision: 5,
    quantityPrecision: 4,
    typicalSpread: 0.0001,
    volatilityFactor: 0.9,
    source: 'deriv',
    type: 'forex',
  },
  // Deriv crypto
  'BTC/USD': {
    symbol: 'BTC/USD',
    derivSymbol: 'cryBTCUSD',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    pricePrecision: 2,
    quantityPrecision: 6,
    typicalSpread: 0.01,
    volatilityFactor: 1.5,
    source: 'deriv',
    type: 'crypto',
  },
  'ETH/USD': {
    symbol: 'ETH/USD',
    derivSymbol: 'cryETHUSD',
    baseAsset: 'ETH',
    quoteAsset: 'USD',
    pricePrecision: 2,
    quantityPrecision: 5,
    typicalSpread: 0.01,
    volatilityFactor: 1.3,
    source: 'deriv',
    type: 'crypto',
  },
};

export const TIMEFRAMES = {
  '1s': { ms: 1000, label: '1 Second', shortLabel: '1s' },
  '1m': { ms: 60000, label: '1 Minute', shortLabel: '1m' },
  '5m': { ms: 300000, label: '5 Minutes', shortLabel: '5m' },
  '15m': { ms: 900000, label: '15 Minutes', shortLabel: '15m' },
  '1h': { ms: 3600000, label: '1 Hour', shortLabel: '1h' },
  '4h': { ms: 14400000, label: '4 Hours', shortLabel: '4h' },
  '1d': { ms: 86400000, label: '1 Day', shortLabel: '1d' },
};

export const MARKET_STATE = {
  NORMAL: 'NORMAL',
  VOLATILE: 'VOLATILE',
  HIGH_RISK: 'HIGH_RISK',
};

export const THRESHOLDS = {
  VOLATILE: {
    PERCENT_CHANGE: 1.5,
    RANGE_PERCENT: 2.5,
    VOLUME_RATIO: 1.8,
    TRADE_COUNT_RATIO: 2.0,
  },
  HIGH_RISK: {
    PERCENT_CHANGE: 3.0,
    VOLUME_RATIO: 2.5,
    RANGE_PERCENT: 4.0,
    TRADE_COUNT_RATIO: 3.0,
  },
};

export const RISK_ENGINE_CONFIG = {
  ROLLING_WINDOW_SIZE: 10,
  BASELINE_CANDLE_COUNT: 30,
  COOLDOWN_MS: 30000,
  MIN_CANDLES_FOR_ANALYSIS: 5,
};

export const WS_EVENTS = {
  CLIENT: {
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe',
    START_STREAM: 'start_stream',
    STOP_STREAM: 'stop_stream',
    SET_SCENARIO: 'set_scenario',
    SET_PAIR: 'set_pair',
    SET_TIMEFRAME: 'set_timeframe',
    USER_ACTIVITY: 'user_activity',
    ALERT_RESPONSE: 'alert_response',
    GET_ORDERBOOK: 'get_orderbook',
    GET_TRADES: 'get_trades',
    PING: 'ping',
  },
  SERVER: {
    CONNECTED: 'connected',
    CANDLE: 'candle',
    CANDLE_CLOSED: 'candle_closed',
    TICKER: 'ticker',
    ORDERBOOK: 'orderbook',
    TRADE: 'trade',
    RISK_ALERT: 'risk_alert',
    STATE_CHANGE: 'state_change',
    STREAM_STARTED: 'stream_started',
    STREAM_STOPPED: 'stream_stopped',
    ERROR: 'error',
    PONG: 'pong',
  },
};

export const STREAM_CONFIG = {
  DEFAULT_UPDATE_INTERVAL_MS: 1000,
  FAST_UPDATE_INTERVAL_MS: 250,
  ORDERBOOK_DEPTH: 20,
  MAX_RECENT_TRADES: 100,
  MAX_CANDLE_HISTORY: 500,
  TICKER_UPDATE_INTERVAL_MS: 1000,
};

export const SCENARIOS = {
  NORMAL: 'normal',
  UPTREND: 'uptrend',
  DOWNTREND: 'downtrend',
  VOLATILE_PUMP: 'volatile_pump',
  VOLATILE_DUMP: 'volatile_dump',
  FLASH_CRASH: 'flash_crash',
  FLASH_PUMP: 'flash_pump',
  CONSOLIDATION: 'consolidation',
  BREAKOUT_UP: 'breakout_up',
  BREAKOUT_DOWN: 'breakout_down',
  HIGH_VOLUME_SPIKE: 'high_volume_spike',
  WHALE_DUMP: 'whale_dump',
  WHALE_PUMP: 'whale_pump',
};

export const WHAT_HAPPENED = {
  FAST_DROP: 'fast_drop',
  FAST_RISE: 'fast_rise',
  WIDE_SWINGS: 'wide_swings',
  VOLUME_SURGE: 'volume_surge',
  FLASH_CRASH: 'flash_crash',
  FLASH_PUMP: 'flash_pump',
  MIXED_VOLATILITY: 'mixed_volatility',
};

export const USER_CONTEXT = {
  VIEWING_CHART: 'viewing_chart',
  PLACING_ORDER: 'placing_order',
  MODIFYING_ORDER: 'modifying_order',
  CLOSING_POSITION: 'closing_position',
  IDLE: 'idle',
};

export const USER_RESPONSE = {
  WAITED: 'waited',
  CONTINUED: 'continued',
  DISMISSED: 'dismissed',
  TIMEOUT: 'timeout',
};
