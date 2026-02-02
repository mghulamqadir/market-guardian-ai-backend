const DEFAULT_WINDOW_SIZE = 30;

const windowSize = Number.parseInt(process.env.MARKET_WINDOW_SIZE || DEFAULT_WINDOW_SIZE, 10);
const windows = new Map();

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeTick(tick) {
  const normalized = {
    ...tick,
    open: normalizeNumber(tick.open),
    high: normalizeNumber(tick.high),
    low: normalizeNumber(tick.low),
    close: normalizeNumber(tick.close),
    volume: normalizeNumber(tick.volume),
    timestamp: tick.timestamp ? normalizeNumber(tick.timestamp) : Date.now(),
  };

  if (tick.openTime !== undefined) normalized.openTime = normalizeNumber(tick.openTime);
  if (tick.closeTime !== undefined) normalized.closeTime = normalizeNumber(tick.closeTime);
  if (tick.trades !== undefined) normalized.trades = normalizeNumber(tick.trades);
  if (tick.quoteVolume !== undefined) normalized.quoteVolume = normalizeNumber(tick.quoteVolume);

  return normalized;
}

function getKey(sessionId) {
  return sessionId || 'global';
}

export function addTick(sessionId, tick) {
  const key = getKey(sessionId);
  const window = windows.get(key) || [];
  const normalized = normalizeTick(tick);

  window.push(normalized);
  if (window.length > windowSize) {
    window.splice(0, window.length - windowSize);
  }

  windows.set(key, window);
  return window;
}

export function getWindow(sessionId) {
  const key = getKey(sessionId);
  return windows.get(key) || [];
}

export function clearWindow(sessionId) {
  const key = getKey(sessionId);
  windows.delete(key);
}
