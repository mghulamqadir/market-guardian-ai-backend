/**
 * Deriv Market Adapter
 * Adapts Deriv API data to match the internal market data format
 */

import derivService from './deriv.service.js';
import { TRADING_PAIRS } from '../utils/market.constants.js';

class DerivMarketAdapter {
  constructor() {
    this.activeSubscriptions = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize Deriv connection
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await derivService.connect();
      this.isInitialized = true;
      console.log('[DerivAdapter] Initialized successfully');
    } catch (error) {
      console.error('[DerivAdapter] Failed to initialize:', error.message);
      throw error;
    }
  }

  /**
   * Check if a pair is from Deriv
   */
  isDerivPair(pair) {
    const pairConfig = TRADING_PAIRS[pair];
    return pairConfig?.source === 'deriv';
  }

  /**
   * Get Deriv symbol from trading pair
   */
  getDerivSymbol(pair) {
    const pairConfig = TRADING_PAIRS[pair];
    return pairConfig?.derivSymbol || null;
  }

  /**
   * Subscribe to real-time ticks for a trading pair
   * @param {string} pair - Trading pair (e.g., 'R100/USD')
   * @param {function} callback - Callback for tick updates
   */
  async subscribeTicks(pair, callback) {
    if (!this.isDerivPair(pair)) {
      throw new Error(`${pair} is not a Deriv trading pair`);
    }

    const derivSymbol = this.getDerivSymbol(pair);
    if (!derivSymbol) {
      throw new Error(`No Deriv symbol mapping for ${pair}`);
    }

    await this.initialize();

    try {
      await derivService.subscribeTicks(derivSymbol, (tick) => {
        // Transform Deriv tick to internal format
        const transformedTick = {
          symbol: pair,
          price: tick.price,
          bid: tick.bid,
          ask: tick.ask,
          timestamp: tick.timestamp,
          source: 'deriv',
        };
        callback(transformedTick);
      });

      this.activeSubscriptions.set(pair, { type: 'ticks', derivSymbol });
      console.log(`[DerivAdapter] Subscribed to ticks for ${pair}`);
    } catch (error) {
      console.error(`[DerivAdapter] Failed to subscribe to ${pair}:`, error.message);
      throw error;
    }
  }

  /**
   * Subscribe to candles for a trading pair
   * @param {string} pair - Trading pair
   * @param {string} timeframe - Timeframe (e.g., '1m', '5m')
   * @param {function} callback - Callback for candle updates
   */
  async subscribeCandles(pair, timeframe, callback) {
    if (!this.isDerivPair(pair)) {
      throw new Error(`${pair} is not a Deriv trading pair`);
    }

    const derivSymbol = this.getDerivSymbol(pair);
    if (!derivSymbol) {
      throw new Error(`No Deriv symbol mapping for ${pair}`);
    }

    await this.initialize();

    const granularity = derivService.getGranularity(timeframe);

    try {
      await derivService.subscribeCandles(derivSymbol, granularity, (candle) => {
        // Transform Deriv candle to internal format
        const transformedCandle = {
          symbol: pair,
          timeframe: timeframe,
          openTime: candle.openTime,
          closeTime: candle.closeTime,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: 0, // Deriv doesn't provide volume for all symbols
          trades: 0,
          source: 'deriv',
        };
        callback(transformedCandle);
      });

      const subKey = `${pair}_${timeframe}`;
      this.activeSubscriptions.set(subKey, { 
        type: 'candles', 
        derivSymbol, 
        granularity,
        pair,
        timeframe 
      });
      console.log(`[DerivAdapter] Subscribed to candles for ${pair} (${timeframe})`);
    } catch (error) {
      console.error(`[DerivAdapter] Failed to subscribe to candles for ${pair}:`, error.message);
      throw error;
    }
  }

  /**
   * Get historical candles
   * @param {string} pair - Trading pair
   * @param {string} timeframe - Timeframe
   * @param {number} count - Number of candles
   */
  async getHistoricalCandles(pair, timeframe, count = 100) {
    if (!this.isDerivPair(pair)) {
      throw new Error(`${pair} is not a Deriv trading pair`);
    }

    const derivSymbol = this.getDerivSymbol(pair);
    if (!derivSymbol) {
      throw new Error(`No Deriv symbol mapping for ${pair}`);
    }

    await this.initialize();

    const granularity = derivService.getGranularity(timeframe);

    try {
      const candles = await derivService.getHistoricalCandles(derivSymbol, granularity, count);
      
      return candles.map(candle => ({
        symbol: pair,
        timeframe: timeframe,
        openTime: candle.openTime,
        closeTime: candle.closeTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: 0,
        trades: 0,
        source: 'deriv',
      }));
    } catch (error) {
      console.error(`[DerivAdapter] Failed to get historical candles for ${pair}:`, error.message);
      return [];
    }
  }

  /**
   * Unsubscribe from a trading pair
   */
  async unsubscribe(pair) {
    const subscription = this.activeSubscriptions.get(pair);
    if (!subscription) return;

    try {
      await derivService.unsubscribe(subscription.derivSymbol);
      this.activeSubscriptions.delete(pair);
      console.log(`[DerivAdapter] Unsubscribed from ${pair}`);
    } catch (error) {
      console.error(`[DerivAdapter] Failed to unsubscribe from ${pair}:`, error.message);
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  async unsubscribeAll() {
    for (const [pair] of this.activeSubscriptions) {
      await this.unsubscribe(pair);
    }
  }

  /**
   * Get list of available Deriv pairs
   */
  getAvailableDerivPairs() {
    return Object.entries(TRADING_PAIRS)
      .filter(([, config]) => config.source === 'deriv')
      .map(([pair, config]) => ({
        pair,
        derivSymbol: config.derivSymbol,
        type: config.type,
        baseAsset: config.baseAsset,
        quoteAsset: config.quoteAsset,
      }));
  }

  /**
   * Disconnect from Deriv
   */
  async disconnect() {
    await this.unsubscribeAll();
    await derivService.disconnect();
    this.isInitialized = false;
    console.log('[DerivAdapter] Disconnected');
  }
}

// Singleton instance
const derivMarketAdapter = new DerivMarketAdapter();

export default derivMarketAdapter;
