/**
 * Real-time market data streaming service.
 */

import EventEmitter from 'node:events';
import { CandleGenerator, SCENARIOS } from './candle.generator.js';
import { TRADING_PAIRS, TIMEFRAMES, STREAM_CONFIG } from '../utils/market.constants.js';

export class MarketDataService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.pair = options.pair || 'BTC/USDT';
    this.timeframe = options.timeframe || '1s';
    this.updateIntervalMs = options.updateIntervalMs || STREAM_CONFIG.DEFAULT_UPDATE_INTERVAL_MS;

    this.generator = new CandleGenerator({
      pair: this.pair,
      timeframe: this.timeframe,
      initialPrice: options.initialPrice,
    });

    this.isStreaming = false;
    this.streamInterval = null;
    this.tickCount = 0;

    this.liveCandle = null;
    this.liveTradeBuffer = [];
  }

  start() {
    if (this.isStreaming) return false;

    this.isStreaming = true;
    this.tickCount = 0;
    this.#initLiveCandle();

    this.streamInterval = setInterval(() => {
      this.#tick();
    }, this.updateIntervalMs);

    this.emit('started', {
      pair: this.pair,
      timeframe: this.timeframe,
      updateIntervalMs: this.updateIntervalMs,
    });

    return true;
  }

  stop() {
    if (!this.isStreaming) return false;

    this.isStreaming = false;
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }

    this.emit('stopped', {
      tickCount: this.tickCount,
      lastPrice: this.generator.currentPrice,
    });

    return true;
  }

  #tick() {
    this.tickCount += 1;

    const now = Date.now();
    const timeframeMs = TIMEFRAMES[this.timeframe]?.ms || 1000;
    const candleOpenTime = Math.floor(now / timeframeMs) * timeframeMs;

    if (this.liveCandle && candleOpenTime > this.liveCandle.openTime) {
      this.#closeLiveCandle();
    }

    const candle = this.generator.generateCandle();
    this.#updateLiveCandle(candle);

    const trades = this.#generateTickTrades(candle);

    this.emit('candle', { ...this.liveCandle, isClosed: false });

    for (const trade of trades) {
      this.emit('trade', trade);
    }

    if (this.tickCount % 5 === 0) {
      this.emit('ticker', this.generator.getTicker());
    }
  }

  #initLiveCandle() {
    const now = Date.now();
    const timeframeMs = TIMEFRAMES[this.timeframe]?.ms || 1000;
    const openTime = Math.floor(now / timeframeMs) * timeframeMs;
    const price = this.generator.currentPrice;

    this.liveCandle = {
      symbol: this.pair,
      timeframe: this.timeframe,
      openTime,
      closeTime: openTime + timeframeMs - 1,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 0,
      quoteVolume: 0,
      trades: 0,
      takerBuyVolume: 0,
      takerBuyQuoteVolume: 0,
      isClosed: false,
    };

    this.liveTradeBuffer = [];
  }

  #updateLiveCandle(newCandle) {
    if (!this.liveCandle) this.#initLiveCandle();

    this.liveCandle.high = Math.max(this.liveCandle.high, newCandle.high);
    this.liveCandle.low = Math.min(this.liveCandle.low, newCandle.low);
    this.liveCandle.close = newCandle.close;
    this.liveCandle.volume += newCandle.volume;
    this.liveCandle.quoteVolume += newCandle.quoteVolume;
    this.liveCandle.trades += newCandle.trades;
    this.liveCandle.takerBuyVolume += newCandle.takerBuyVolume;
    this.liveCandle.takerBuyQuoteVolume += newCandle.takerBuyQuoteVolume;
  }

  #closeLiveCandle() {
    if (!this.liveCandle) return;

    const closedCandle = { ...this.liveCandle, isClosed: true };
    this.emit('candle_closed', closedCandle);
    this.#initLiveCandle();
  }

  #generateTickTrades(candle) {
    const tradeCount = 1 + Math.floor(Math.random() * 4);
    const trades = [];

    for (let i = 0; i < tradeCount; i += 1) {
      const isBuy = Math.random() > 0.5;
      const price = candle.low + Math.random() * (candle.high - candle.low);
      const quantity = (candle.volume / tradeCount) * (0.5 + Math.random());

      trades.push({
        id: `${Date.now()}-${i}`,
        symbol: this.pair,
        price: Number(price.toFixed(TRADING_PAIRS[this.pair]?.pricePrecision || 2)),
        quantity: Number(quantity.toFixed(TRADING_PAIRS[this.pair]?.quantityPrecision || 4)),
        quoteQuantity: Number((price * quantity).toFixed(2)),
        time: Date.now(),
        isBuyerMaker: !isBuy,
      });
    }

    this.liveTradeBuffer.push(...trades);
    if (this.liveTradeBuffer.length > STREAM_CONFIG.MAX_RECENT_TRADES) {
      this.liveTradeBuffer = this.liveTradeBuffer.slice(-STREAM_CONFIG.MAX_RECENT_TRADES);
    }

    return trades;
  }

  setScenario(scenario, duration = 10, intensity = 1.0) {
    const success = this.generator.setScenario(scenario, duration, intensity);
    if (success) {
      this.emit('scenario_changed', { scenario, duration, intensity });
    }
    return success;
  }

  getOrderBook(depth = 20) {
    return this.generator.generateOrderBook(depth);
  }

  getRecentTrades(count = 50) {
    return this.liveTradeBuffer.slice(-count);
  }

  getCandleHistory(count = 100) {
    return this.generator.getCandleHistory(count);
  }

  getTicker() {
    return this.generator.getTicker();
  }

  getLiveCandle() {
    return this.liveCandle;
  }

  getState() {
    return {
      isStreaming: this.isStreaming,
      tickCount: this.tickCount,
      ...this.generator.getState(),
      liveCandle: this.liveCandle,
    };
  }

  setPair(pair) {
    if (!TRADING_PAIRS[pair]) return false;

    const wasStreaming = this.isStreaming;
    if (wasStreaming) this.stop();

    this.pair = pair;
    this.generator = new CandleGenerator({ pair: this.pair, timeframe: this.timeframe });

    if (wasStreaming) this.start();
    this.emit('pair_changed', { pair });
    return true;
  }

  setTimeframe(timeframe) {
    if (!TIMEFRAMES[timeframe]) return false;

    const wasStreaming = this.isStreaming;
    if (wasStreaming) this.stop();

    this.timeframe = timeframe;
    this.generator = new CandleGenerator({ pair: this.pair, timeframe: this.timeframe });

    if (wasStreaming) this.start();
    this.emit('timeframe_changed', { timeframe });
    return true;
  }

  setUpdateInterval(intervalMs) {
    this.updateIntervalMs = intervalMs;
    if (this.isStreaming) {
      this.stop();
      this.start();
    }
  }

  reset() {
    this.stop();
    this.generator.reset();
    this.liveCandle = null;
    this.liveTradeBuffer = [];
    this.tickCount = 0;
    this.emit('reset');
  }
}

export { SCENARIOS };
