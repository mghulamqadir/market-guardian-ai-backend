/**
 * Realistic candle generator using GBM + jump diffusion.
 */

import { TRADING_PAIRS, TIMEFRAMES, SCENARIOS } from '../utils/market.constants.js';

export class CandleGenerator {
  constructor(options = {}) {
    this.pair = TRADING_PAIRS[options.pair] || TRADING_PAIRS['BTC/USDT'];
    this.timeframe = options.timeframe || '1s';
    this.timeframeMs = TIMEFRAMES[this.timeframe]?.ms || 1000;

    this.currentPrice = options.initialPrice || this.#getDefaultPrice();
    this.previousClose = this.currentPrice;

    this.baseVolume = this.pair.avgDailyVolume / (86400000 / this.timeframeMs);
    this.volumeState = 1.0;

    this.trend = 0;
    this.volatility = 0.001;
    this.momentum = 0;

    this.currentScenario = SCENARIOS.NORMAL;
    this.scenarioTicksRemaining = 0;
    this.scenarioIntensity = 1.0;

    this.candleHistory = [];
    this.tradeHistory = [];

    this.stats24h = {
      high: this.currentPrice,
      low: this.currentPrice,
      open: this.currentPrice,
      volume: 0,
      quoteVolume: 0,
      trades: 0,
      priceChange: 0,
      priceChangePercent: 0,
    };
  }

  #getDefaultPrice() {
    const { minPrice, maxPrice } = this.pair;
    return (minPrice + maxPrice) / 2;
  }

  #gaussianRandom(mean = 0, stdDev = 1) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  #getScenarioParams() {
    const intensity = this.scenarioIntensity;

    switch (this.currentScenario) {
      case SCENARIOS.NORMAL:
        return { trendBias: 0, volatilityMultiplier: 1, volumeMultiplier: 1, jumpProbability: 0.01, jumpMagnitude: 0.005 };
      case SCENARIOS.UPTREND:
        return { trendBias: 0.3 * intensity, volatilityMultiplier: 1.2, volumeMultiplier: 1.3, jumpProbability: 0.02, jumpMagnitude: 0.008 };
      case SCENARIOS.DOWNTREND:
        return { trendBias: -0.3 * intensity, volatilityMultiplier: 1.2, volumeMultiplier: 1.3, jumpProbability: 0.02, jumpMagnitude: 0.008 };
      case SCENARIOS.VOLATILE_PUMP:
        return { trendBias: 0.5 * intensity, volatilityMultiplier: 2.5, volumeMultiplier: 2.0, jumpProbability: 0.1, jumpMagnitude: 0.02 };
      case SCENARIOS.VOLATILE_DUMP:
        return { trendBias: -0.5 * intensity, volatilityMultiplier: 2.5, volumeMultiplier: 2.0, jumpProbability: 0.1, jumpMagnitude: 0.02 };
      case SCENARIOS.FLASH_CRASH:
        return { trendBias: -0.8 * intensity, volatilityMultiplier: 4.0, volumeMultiplier: 5.0, jumpProbability: 0.3, jumpMagnitude: 0.05 };
      case SCENARIOS.FLASH_PUMP:
        return { trendBias: 0.8 * intensity, volatilityMultiplier: 4.0, volumeMultiplier: 5.0, jumpProbability: 0.3, jumpMagnitude: 0.05 };
      case SCENARIOS.CONSOLIDATION:
        return { trendBias: 0, volatilityMultiplier: 0.5, volumeMultiplier: 0.6, jumpProbability: 0.005, jumpMagnitude: 0.003 };
      case SCENARIOS.BREAKOUT_UP:
        return { trendBias: 0.6 * intensity, volatilityMultiplier: 3.0, volumeMultiplier: 3.5, jumpProbability: 0.2, jumpMagnitude: 0.03 };
      case SCENARIOS.BREAKOUT_DOWN:
        return { trendBias: -0.6 * intensity, volatilityMultiplier: 3.0, volumeMultiplier: 3.5, jumpProbability: 0.2, jumpMagnitude: 0.03 };
      case SCENARIOS.HIGH_VOLUME_SPIKE:
        return { trendBias: (Math.random() - 0.5) * 0.2, volatilityMultiplier: 1.5, volumeMultiplier: 5.0, jumpProbability: 0.05, jumpMagnitude: 0.01 };
      case SCENARIOS.WHALE_DUMP:
        return { trendBias: -0.7 * intensity, volatilityMultiplier: 3.5, volumeMultiplier: 8.0, jumpProbability: 0.4, jumpMagnitude: 0.04 };
      case SCENARIOS.WHALE_PUMP:
        return { trendBias: 0.7 * intensity, volatilityMultiplier: 3.5, volumeMultiplier: 8.0, jumpProbability: 0.4, jumpMagnitude: 0.04 };
      default:
        return { trendBias: 0, volatilityMultiplier: 1, volumeMultiplier: 1, jumpProbability: 0.01, jumpMagnitude: 0.005 };
    }
  }

  generateCandle() {
    const now = Date.now();
    const openTime = Math.floor(now / this.timeframeMs) * this.timeframeMs;
    const closeTime = openTime + this.timeframeMs - 1;

    const params = this.#getScenarioParams();
    const baseVolatility = this.volatility * this.pair.volatilityFactor;
    const adjustedVolatility = baseVolatility * params.volatilityMultiplier;

    const drift = params.trendBias * adjustedVolatility;
    const diffusion = this.#gaussianRandom(0, adjustedVolatility);

    let jump = 0;
    if (Math.random() < params.jumpProbability) {
      const jumpDirection = params.trendBias >= 0 ? 1 : -1;
      jump = jumpDirection * params.jumpMagnitude * (0.5 + Math.random());
    }

    const priceChange = drift + diffusion + jump;

    const open = this.previousClose;
    let close = open * (1 + priceChange);
    close = Math.max(this.pair.minPrice * 0.5, Math.min(this.pair.maxPrice * 1.5, close));

    const intraVolatility = adjustedVolatility * (0.5 + Math.random());
    const highOffset = Math.abs(this.#gaussianRandom(0, intraVolatility)) * open;
    const lowOffset = Math.abs(this.#gaussianRandom(0, intraVolatility)) * open;

    const high = Math.max(open, close) + highOffset;
    const low = Math.min(open, close) - lowOffset;

    const volumeNoise = 0.5 + Math.random();
    const volume = this.baseVolume * params.volumeMultiplier * volumeNoise * this.volumeState;
    const quoteVolume = volume * ((open + close) / 2);

    const trades = Math.floor(30 + Math.random() * 40 * params.volumeMultiplier);
    const takerBuyRatio = 0.5 + params.trendBias * 0.15 + (Math.random() - 0.5) * 0.1;
    const takerBuyVolume = volume * takerBuyRatio;
    const takerBuyQuoteVolume = quoteVolume * takerBuyRatio;

    const candle = {
      symbol: this.pair.symbol,
      timeframe: this.timeframe,
      openTime,
      closeTime,
      open: this.#roundPrice(open),
      high: this.#roundPrice(high),
      low: this.#roundPrice(low),
      close: this.#roundPrice(close),
      volume: this.#roundVolume(volume),
      quoteVolume: this.#roundPrice(quoteVolume),
      trades,
      takerBuyVolume: this.#roundVolume(takerBuyVolume),
      takerBuyQuoteVolume: this.#roundPrice(takerBuyQuoteVolume),
      isClosed: true,
      scenario: this.currentScenario,
    };

    this.previousClose = candle.close;
    this.currentPrice = candle.close;
    this.#updateMomentum(priceChange);
    this.#update24hStats(candle);

    this.candleHistory.push(candle);
    if (this.candleHistory.length > 500) {
      this.candleHistory.shift();
    }

    if (this.scenarioTicksRemaining > 0) {
      this.scenarioTicksRemaining -= 1;
      if (this.scenarioTicksRemaining === 0) {
        this.#transitionToNormal();
      }
    }

    return candle;
  }

  generateLiveCandle() {
    const candle = this.generateCandle();
    candle.isClosed = false;
    return candle;
  }

  generateTradesForCandle(candle, count = 10) {
    const trades = [];
    const priceRange = candle.high - candle.low;
    const volumePerTrade = candle.volume / count;
    const timeInterval = (candle.closeTime - candle.openTime) / count;

    for (let i = 0; i < count; i += 1) {
      const time = candle.openTime + Math.floor(timeInterval * i + Math.random() * timeInterval);
      const price = candle.low + Math.random() * priceRange;
      const quantity = volumePerTrade * (0.5 + Math.random());
      const isBuyerMaker = Math.random() > 0.5;

      trades.push({
        id: Date.now() * 1000 + i,
        symbol: this.pair.symbol,
        price: this.#roundPrice(price),
        quantity: this.#roundVolume(quantity),
        quoteQuantity: this.#roundPrice(price * quantity),
        time,
        isBuyerMaker,
        isBestMatch: true,
      });
    }

    trades.sort((a, b) => a.time - b.time);
    return trades;
  }

  generateOrderBook(depth = 20) {
    const midPrice = this.currentPrice;
    const spread = midPrice * this.pair.typicalSpread;

    const bids = [];
    const asks = [];

    let bidPrice = midPrice - spread / 2;
    for (let i = 0; i < depth; i += 1) {
      const priceStep = spread * (0.1 + Math.random() * 0.2);
      bidPrice -= priceStep;
      const quantity = this.baseVolume * (0.5 + Math.random() * 2);
      bids.push([this.#roundPrice(bidPrice), this.#roundVolume(quantity)]);
    }

    let askPrice = midPrice + spread / 2;
    for (let i = 0; i < depth; i += 1) {
      const priceStep = spread * (0.1 + Math.random() * 0.2);
      askPrice += priceStep;
      const quantity = this.baseVolume * (0.5 + Math.random() * 2);
      asks.push([this.#roundPrice(askPrice), this.#roundVolume(quantity)]);
    }

    return {
      symbol: this.pair.symbol,
      timestamp: Date.now(),
      bids,
      asks,
      lastUpdateId: Date.now(),
    };
  }

  getTicker() {
    const priceChange = this.currentPrice - this.stats24h.open;
    const priceChangePercent = (priceChange / this.stats24h.open) * 100;

    return {
      symbol: this.pair.symbol,
      priceChange: this.#roundPrice(priceChange),
      priceChangePercent: Number(priceChangePercent.toFixed(2)),
      weightedAvgPrice: this.#roundPrice((this.stats24h.high + this.stats24h.low) / 2),
      prevClosePrice: this.#roundPrice(this.stats24h.open),
      lastPrice: this.#roundPrice(this.currentPrice),
      bidPrice: this.#roundPrice(this.currentPrice * 0.9999),
      askPrice: this.#roundPrice(this.currentPrice * 1.0001),
      openPrice: this.#roundPrice(this.stats24h.open),
      highPrice: this.#roundPrice(this.stats24h.high),
      lowPrice: this.#roundPrice(this.stats24h.low),
      volume: this.#roundVolume(this.stats24h.volume),
      quoteVolume: this.#roundPrice(this.stats24h.quoteVolume),
      openTime: Date.now() - 86400000,
      closeTime: Date.now(),
      trades: this.stats24h.trades,
    };
  }

  setScenario(scenario, duration = 10, intensity = 1.0) {
    if (!Object.values(SCENARIOS).includes(scenario)) {
      return false;
    }

    this.currentScenario = scenario;
    this.scenarioTicksRemaining = duration;
    this.scenarioIntensity = Math.max(0.1, Math.min(2.0, intensity));
    return true;
  }

  #transitionToNormal() {
    this.currentScenario = SCENARIOS.NORMAL;
    this.scenarioIntensity = 1.0;
  }

  #updateMomentum(priceChange) {
    this.momentum = this.momentum * 0.9 + priceChange * 0.1;
  }

  #update24hStats(candle) {
    this.stats24h.high = Math.max(this.stats24h.high, candle.high);
    this.stats24h.low = Math.min(this.stats24h.low, candle.low);
    this.stats24h.volume += candle.volume;
    this.stats24h.quoteVolume += candle.quoteVolume;
    this.stats24h.trades += candle.trades;
  }

  #roundPrice(price) {
    const factor = Math.pow(10, this.pair.pricePrecision);
    return Math.round(price * factor) / factor;
  }

  #roundVolume(volume) {
    const factor = Math.pow(10, this.pair.quantityPrecision);
    return Math.round(volume * factor) / factor;
  }

  getCandleHistory(count = 100) {
    return this.candleHistory.slice(-count);
  }

  getState() {
    return {
      pair: this.pair.symbol,
      timeframe: this.timeframe,
      currentPrice: this.currentPrice,
      scenario: this.currentScenario,
      scenarioTicksRemaining: this.scenarioTicksRemaining,
      momentum: this.momentum,
      candleCount: this.candleHistory.length,
    };
  }

  reset() {
    this.currentPrice = this.#getDefaultPrice();
    this.previousClose = this.currentPrice;
    this.trend = 0;
    this.momentum = 0;
    this.currentScenario = SCENARIOS.NORMAL;
    this.scenarioTicksRemaining = 0;
    this.candleHistory = [];
    this.stats24h = {
      high: this.currentPrice,
      low: this.currentPrice,
      open: this.currentPrice,
      volume: 0,
      quoteVolume: 0,
      trades: 0,
    };
  }
}

export { SCENARIOS };
