/**
 * Deriv API Service
 * Connects to Deriv WebSocket API for real-time market data
 */

import DerivAPI from '@deriv/deriv-api';
import WebSocket from 'ws';

class DerivService {
  constructor() {
    this.api = null;
    this.connection = null;
    this.subscriptions = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  /**
   * Initialize connection to Deriv API
   */
  async connect() {
    try {
      const appId = process.env.DERIV_APP_ID || '1089';
      const token = process.env.DERIV_TOKEN;

      this.connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
      
      return new Promise((resolve, reject) => {
        this.connection.onopen = async () => {
          console.log('[Deriv] Connected to Deriv WebSocket API');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Initialize API after connection is open
          this.api = new DerivAPI({ connection: this.connection });

          if (token) {
            try {
              await this.authorize(token);
            } catch (error) {
              console.error('[Deriv] Authorization failed:', error.message);
            }
          }

          resolve(this.api);
        };

        this.connection.onerror = (error) => {
          console.error('[Deriv] WebSocket error:', error.message);
          reject(error);
        };

        this.connection.onclose = () => {
          console.log('[Deriv] Connection closed');
          this.isConnected = false;
          this._handleReconnect();
        };
      });
    } catch (error) {
      console.error('[Deriv] Failed to connect:', error.message);
      throw error;
    }
  }

  /**
   * Authorize with API token
   */
  async authorize(token) {
    try {
      // Send authorize request via WebSocket
      const authorizeRequest = {
        authorize: token
      };
      
      this.connection.send(JSON.stringify(authorizeRequest));
      
      // Wait for authorize response
      return new Promise((resolve, reject) => {
        const messageHandler = (event) => {
          const response = JSON.parse(event.data);
          if (response.msg_type === 'authorize') {
            this.connection.removeEventListener('message', messageHandler);
            console.log('[Deriv] Authorized successfully');
            resolve(response);
          } else if (response.error) {
            this.connection.removeEventListener('message', messageHandler);
            reject(new Error(response.error.message));
          }
        };
        
        this.connection.addEventListener('message', messageHandler);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          this.connection.removeEventListener('message', messageHandler);
          reject(new Error('Authorization timeout'));
        }, 10000);
      });
    } catch (error) {
      console.error('[Deriv] Authorization failed:', error.message);
      throw error;
    }
  }

  /**
   * Get available trading symbols
   */
  async getActiveSymbols() {
    try {
      const response = await this.api.activeSymbols({
        active_symbols: 'brief',
        product_type: 'basic',
      });
      return response.active_symbols || [];
    } catch (error) {
      console.error('[Deriv] Failed to get active symbols:', error.message);
      return [];
    }
  }

  /**
   * Subscribe to tick stream for a symbol
   * @param {string} symbol - Trading symbol (e.g., 'R_100', 'frxEURUSD')
   * @param {function} callback - Callback function for tick updates
   */
  async subscribeTicks(symbol, callback) {
    try {
      const ticksRequest = {
        ticks: symbol,
        subscribe: 1
      };

      this.connection.send(JSON.stringify(ticksRequest));

      const messageHandler = (event) => {
        const response = JSON.parse(event.data);
        if (response.msg_type === 'tick' && response.tick?.symbol === symbol) {
          callback({
            symbol: response.tick.symbol,
            price: response.tick.quote,
            timestamp: response.tick.epoch * 1000,
            bid: response.tick.bid,
            ask: response.tick.ask,
          });
        }
      };

      this.connection.addEventListener('message', messageHandler);
      this.subscriptions.set(symbol, { handler: messageHandler, type: 'ticks' });
      console.log(`[Deriv] Subscribed to ticks for ${symbol}`);
      
      return { symbol, unsubscribe: () => this.unsubscribe(symbol) };
    } catch (error) {
      console.error(`[Deriv] Failed to subscribe to ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Subscribe to candles/OHLC stream
   * @param {string} symbol - Trading symbol
   * @param {number} granularity - Candle interval in seconds (60, 120, 180, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 86400)
   * @param {function} callback - Callback function for candle updates
   */
  async subscribeCandles(symbol, granularity, callback) {
    try {
      const candlesRequest = {
        ticks_history: symbol,
        adjust_start_time: 1,
        count: 1,
        end: 'latest',
        start: 1,
        style: 'candles',
        granularity: granularity,
        subscribe: 1,
      };

      this.connection.send(JSON.stringify(candlesRequest));

      const messageHandler = (event) => {
        const response = JSON.parse(event.data);
        if (response.msg_type === 'ohlc' && response.ohlc) {
          const candle = response.ohlc;
          callback({
            symbol: candle.symbol,
            openTime: candle.open_time * 1000,
            closeTime: (candle.open_time + granularity) * 1000,
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            epoch: candle.epoch,
          });
        }
      };

      this.connection.addEventListener('message', messageHandler);
      const subKey = `${symbol}_${granularity}`;
      this.subscriptions.set(subKey, { handler: messageHandler, type: 'candles' });
      console.log(`[Deriv] Subscribed to candles for ${symbol} (${granularity}s)`);
      
      return { symbol, granularity, unsubscribe: () => this.unsubscribe(subKey) };
    } catch (error) {
      console.error(`[Deriv] Failed to subscribe to candles for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get historical candles
   * @param {string} symbol - Trading symbol
   * @param {number} granularity - Candle interval in seconds
   * @param {number} count - Number of candles to fetch
   */
  async getHistoricalCandles(symbol, granularity, count = 100) {
    try {
      const historyRequest = {
        ticks_history: symbol,
        adjust_start_time: 1,
        count: count,
        end: 'latest',
        start: 1,
        style: 'candles',
        granularity: granularity,
      };

      this.connection.send(JSON.stringify(historyRequest));

      return new Promise((resolve, reject) => {
        const messageHandler = (event) => {
          const response = JSON.parse(event.data);
          
          if (response.msg_type === 'candles' && response.candles) {
            this.connection.removeEventListener('message', messageHandler);
            
            const candles = response.candles.map((candle) => ({
              symbol: symbol,
              openTime: candle.epoch * 1000,
              closeTime: (candle.epoch + granularity) * 1000,
              open: parseFloat(candle.open),
              high: parseFloat(candle.high),
              low: parseFloat(candle.low),
              close: parseFloat(candle.close),
              epoch: candle.epoch,
            }));
            
            resolve(candles);
          } else if (response.error) {
            this.connection.removeEventListener('message', messageHandler);
            reject(new Error(response.error.message));
          }
        };

        this.connection.addEventListener('message', messageHandler);

        // Timeout after 15 seconds
        setTimeout(() => {
          this.connection.removeEventListener('message', messageHandler);
          reject(new Error('Request timeout'));
        }, 15000);
      });
    } catch (error) {
      console.error(`[Deriv] Failed to get historical candles for ${symbol}:`, error.message);
      return [];
    }
  }

  /**
   * Unsubscribe from a symbol
   */
  async unsubscribe(key) {
    const subscription = this.subscriptions.get(key);
    if (subscription && subscription.handler) {
      this.connection.removeEventListener('message', subscription.handler);
      
      // Send forget request to Deriv API
      const forgetRequest = { forget_all: subscription.type };
      this.connection.send(JSON.stringify(forgetRequest));
      
      this.subscriptions.delete(key);
      console.log(`[Deriv] Unsubscribed from ${key}`);
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  async unsubscribeAll() {
    for (const [key, subscription] of this.subscriptions) {
      try {
        if (subscription.handler) {
          this.connection.removeEventListener('message', subscription.handler);
        }
        console.log(`[Deriv] Unsubscribed from ${key}`);
      } catch (error) {
        console.error(`[Deriv] Failed to unsubscribe from ${key}:`, error.message);
      }
    }
    
    // Send forget_all to clear all subscriptions
    if (this.isConnected) {
      this.connection.send(JSON.stringify({ forget_all: 'ticks' }));
      this.connection.send(JSON.stringify({ forget_all: 'candles' }));
    }
    
    this.subscriptions.clear();
  }

  /**
   * Handle reconnection logic
   */
  _handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Deriv] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[Deriv] Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[Deriv] Reconnection failed:', error.message);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Disconnect from Deriv API
   */
  async disconnect() {
    await this.unsubscribeAll();
    if (this.connection) {
      this.connection.close();
      this.isConnected = false;
      console.log('[Deriv] Disconnected');
    }
  }

  /**
   * Map Deriv symbols to trading pairs
   */
  getSymbolMapping() {
    return {
      'R_100': { pair: 'R100/USD', name: 'Volatility 100 Index', type: 'synthetic' },
      'R_75': { pair: 'R75/USD', name: 'Volatility 75 Index', type: 'synthetic' },
      'R_50': { pair: 'R50/USD', name: 'Volatility 50 Index', type: 'synthetic' },
      'R_25': { pair: 'R25/USD', name: 'Volatility 25 Index', type: 'synthetic' },
      'R_10': { pair: 'R10/USD', name: 'Volatility 10 Index', type: 'synthetic' },
      'BOOM1000': { pair: 'BOOM1000/USD', name: 'Boom 1000 Index', type: 'synthetic' },
      'BOOM500': { pair: 'BOOM500/USD', name: 'Boom 500 Index', type: 'synthetic' },
      'CRASH1000': { pair: 'CRASH1000/USD', name: 'Crash 1000 Index', type: 'synthetic' },
      'CRASH500': { pair: 'CRASH500/USD', name: 'Crash 500 Index', type: 'synthetic' },
      'frxEURUSD': { pair: 'EUR/USD', name: 'Euro vs US Dollar', type: 'forex' },
      'frxGBPUSD': { pair: 'GBP/USD', name: 'British Pound vs US Dollar', type: 'forex' },
      'frxUSDJPY': { pair: 'USD/JPY', name: 'US Dollar vs Japanese Yen', type: 'forex' },
      'frxAUDUSD': { pair: 'AUD/USD', name: 'Australian Dollar vs US Dollar', type: 'forex' },
      'frxUSDCAD': { pair: 'USD/CAD', name: 'US Dollar vs Canadian Dollar', type: 'forex' },
      'cryBTCUSD': { pair: 'BTC/USD', name: 'Bitcoin vs US Dollar', type: 'crypto' },
      'cryETHUSD': { pair: 'ETH/USD', name: 'Ethereum vs US Dollar', type: 'crypto' },
    };
  }

  /**
   * Map timeframe to Deriv granularity
   */
  getGranularity(timeframe) {
    const mapping = {
      '1m': 60,
      '2m': 120,
      '3m': 180,
      '5m': 300,
      '10m': 600,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '2h': 7200,
      '4h': 14400,
      '8h': 28800,
      '1d': 86400,
    };
    return mapping[timeframe] || 60;
  }
}

// Singleton instance
const derivService = new DerivService();

export default derivService;
