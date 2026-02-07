/**
 * WebSocket server for real-time market simulation.
 */

import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

import { MarketDataService, SCENARIOS } from './market.data.service.js';
import { Session, Event, Intervention, Candle } from '../models/index.js';
import { analyzeMarket, resetSession } from './market.risk.engine.js';
import { generateExplanation } from './explanation.generator.js';
import derivMarketAdapter from './deriv.market.adapter.js';
import {
  TRADING_PAIRS,
  TIMEFRAMES,
  WS_EVENTS,
  USER_CONTEXT,
  USER_RESPONSE,
  STREAM_CONFIG,
} from '../utils/market.constants.js';

class ClientManager {
  constructor() {
    this.clients = new Map();
  }

  async add(ws, req) {
    const clientId = uuidv4();
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    let dbSessionId = null;

    try {
      const session = await Session.create({
        metadata: {
          source: 'websocket',
          clientId,
          ipAddress,
          userAgent,
        },
      });
      dbSessionId = session.id;
      Event.create({
        sessionId: dbSessionId,
        actionType: 'SESSION_STARTED',
        meta: { source: 'websocket' },
      }).catch((err) => console.log('Failed to create event', err));
    } catch (err) {
      console.log('Failed to create session', err);
    }

    const client = {
      ws,
      clientId,
      dbSessionId,
      connectedAt: Date.now(),
      ipAddress,
      userAgent,
      userActivity: USER_CONTEXT.VIEWING_CHART,
      subscribed: true,
      pair: 'BTC/USDT',
      timeframe: '1s',
      lastAlertId: null,
      lastAlertTime: 0,
    };

    this.clients.set(clientId, client);
    return clientId;
  }

  async remove(clientId) {
    const client = this.clients.get(clientId);
    if (client?.dbSessionId) {
      try {
        await Session.update(
          { endedAt: new Date() },
          { where: { id: client.dbSessionId } }
        );
      } catch {
        // Ignore DB errors on disconnect
      }
    }
    this.clients.delete(clientId);
  }

  get(clientId) {
    return this.clients.get(clientId);
  }

  updateActivity(clientId, activity) {
    const client = this.clients.get(clientId);
    if (client && Object.values(USER_CONTEXT).includes(activity)) {
      client.userActivity = activity;
    }
  }

  setLastAlert(clientId, alertId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastAlertId = alertId;
      client.lastAlertTime = Date.now();
    }
  }

  broadcast(event, data, filter = null) {
    const message = JSON.stringify({ event, data, timestamp: Date.now() });

    this.clients.forEach((client) => {
      if (!client.subscribed || client.ws.readyState !== 1) return;
      if (filter && !filter(client)) return;

      try {
        client.ws.send(message);
      } catch {
        // Ignore send errors
      }
    });
  }

  send(clientId, event, data) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) {
      const message = JSON.stringify({ event, data, timestamp: Date.now() });
      client.ws.send(message);
    }
  }

  getCount() {
    return this.clients.size;
  }

  getPrimaryActivity() {
    for (const client of this.clients.values()) {
      if (client.userActivity === USER_CONTEXT.PLACING_ORDER || client.userActivity === USER_CONTEXT.CLOSING_POSITION) {
        return client.userActivity;
      }
    }
    return USER_CONTEXT.VIEWING_CHART;
  }
}

class SocketHandler {
  constructor(wss) {
    this.wss = wss;
    this.clientManager = new ClientManager();

    this.marketService = new MarketDataService({
      pair: 'BTC/USDT',
      timeframe: '1s',
      updateIntervalMs: STREAM_CONFIG.DEFAULT_UPDATE_INTERVAL_MS,
    });

    this.candleHistory = [];
    this.baselineCandles = [];
    this.isProcessingRisk = false;
    this.streamMode = 'simulated';
    this.currentPair = 'BTC/USDT';
    this.currentTimeframe = '1m';
    this.derivSubscription = null;

    this._setupMarketServiceListeners();
    this._setupWebSocketServer();
  }

  _setupMarketServiceListeners() {
    // Throttle immediate risk checks to max once every 5 seconds
    const RISK_CHECK_COOLDOWN_MS = 5000;
    let lastRiskCheckTime = 0;

    this.marketService.on('candle', async (candle) => {
      this.clientManager.broadcast(WS_EVENTS.SERVER.CANDLE, candle);

      // Immediate check for significant volatility (throttled)
      // This catches intraday drops/pumps without waiting for candle close
      const now = Date.now();
      if (now - lastRiskCheckTime >= RISK_CHECK_COOLDOWN_MS) {
        // Simple pre-check: only analyze if there's notable movement (>0.5%) to save resources
        const priceChange = Math.abs((candle.close - candle.open) / candle.open) * 100;
        if (priceChange > 0.5) {
          lastRiskCheckTime = now;
          await this._analyzeRisk(candle);
        }
      }
    });

    this.marketService.on('candle_closed', async (candle) => {
      this.candleHistory.push(candle);
      if (this.candleHistory.length > STREAM_CONFIG.MAX_CANDLE_HISTORY) {
        this.candleHistory.shift();
      }

      if (this.baselineCandles.length < 30) {
        this.baselineCandles.push(candle);
      }

      this.clientManager.broadcast(WS_EVENTS.SERVER.CANDLE_CLOSED, candle);
      this._storeClosedCandle(candle);
      await this._analyzeRisk();
    });

    this.marketService.on('trade', (trade) => {
      this.clientManager.broadcast(WS_EVENTS.SERVER.TRADE, trade);
    });

    this.marketService.on('ticker', (ticker) => {
      this.clientManager.broadcast(WS_EVENTS.SERVER.TICKER, ticker);
    });

    this.marketService.on('scenario_changed', (data) => {
      this.clientManager.broadcast(WS_EVENTS.SERVER.STATE_CHANGE, { type: 'scenario_changed', ...data });
    });

    this.marketService.on('started', (data) => {
      this.clientManager.broadcast(WS_EVENTS.SERVER.STREAM_STARTED, data);
    });

    this.marketService.on('stopped', (data) => {
      this.clientManager.broadcast(WS_EVENTS.SERVER.STREAM_STOPPED, data);
    });
  }

  async _analyzeRisk(activeCandle = null) {
    if (this.isProcessingRisk) return;
    if (this.candleHistory.length < 5 && !activeCandle) return;

    this.isProcessingRisk = true;

    try {
      // If we have an active candle (intraday check), append it to history for analysis
      const analysisHistory = activeCandle
        ? [...this.candleHistory, activeCandle]
        : this.candleHistory;

      const analysis = analyzeMarket(analysisHistory, this.baselineCandles, 'global');

      if (analysis.shouldTrigger) {
        const userContext = this.clientManager.getPrimaryActivity();
        const alertId = `alert-${Date.now()}`;
        const generationStart = Date.now();

        const alertMeta = {
          riskLevel: analysis.state,
          previousState: analysis.previousState,
          transition: analysis.transitionType,
          whatHappened: analysis.whatHappened,
          signals: analysis.signals,
          metrics: analysis.metrics,
          pair: this.marketService.pair,
        };
        this.clientManager.broadcast(WS_EVENTS.SERVER.RISK_ALERT, {
          alertId,
          ...alertMeta,
          message: 'Generating explanation...',
          timestamp: Date.now(),
          streaming: true,
          generationMeta: {
            source: 'streaming',
            timeMs: 0,
          },
        });

        const explanation = await generateExplanation(
          {
            market_state: analysis.state,
            what_happened: analysis.whatHappened,
            signals: analysis.signals,
            user_context: userContext,
          },
          (partialText) => {
            this.clientManager.broadcast('explanation_chunk', {
              alertId,
              partialText,
              timestamp: Date.now(),
            });
          }
        );

        const generationTime = Date.now() - generationStart;

        this.clientManager.broadcast('explanation_complete', {
          alertId,
          message: explanation.message,
          source: explanation.source,
          confidence: explanation.confidence,
          tags: explanation.tags,
          generationTimeMs: generationTime,
          timestamp: Date.now(),
        });

        alertMeta.message = explanation.message;

        this.clientManager.clients.forEach((client, clientId) => {
          this.clientManager.setLastAlert(clientId, alertId);
          if (!client?.dbSessionId) return;

          Event.create({
            sessionId: client.dbSessionId,
            actionType: 'RISK_TRIGGERED',
            volatilityFlag: analysis.state !== 'NORMAL',
            meta: { ...alertMeta, generationTimeMs: generationTime },
          }).catch((err) => console.error('[WebSocket] Failed to create RISK_TRIGGERED event:', err.message));

          Intervention.create({
            sessionId: client.dbSessionId,
            reason: analysis.whatHappened || 'risk_trigger',
            message: explanation.message,
            model: explanation.source === 'llm' ? 'gpt-4o-mini' : 'failsafe',
            meta: { ...alertMeta, generationTimeMs: generationTime },
          }).catch((err) => console.error('[WebSocket] Failed to create intervention:', err.message));
        });
      }

      if (analysis.previousState !== analysis.state) {
        this.clientManager.broadcast(WS_EVENTS.SERVER.STATE_CHANGE, {
          type: 'market_state',
          previousState: analysis.previousState,
          currentState: analysis.state,
          metrics: analysis.metrics,
        });
      }
    } finally {
      this.isProcessingRisk = false;
    }
  }

  _setupWebSocketServer() {
    this.wss.on('connection', async (ws, req) => {
      const clientId = await this.clientManager.add(ws, req);

      this.clientManager.send(clientId, WS_EVENTS.SERVER.CONNECTED, {
        clientId,
        message: 'Connected to Market Guardian AI',
        availablePairs: Object.keys(TRADING_PAIRS),
        availableTimeframes: Object.keys(TIMEFRAMES),
        availableScenarios: Object.values(SCENARIOS),
        streamStatus: this.marketService.getState(),
        candleHistory: this.candleHistory.slice(-100),
      });

      ws.on('message', (message) => {
        this._handleMessage(clientId, message);
      });

      ws.on('close', () => {
        this.clientManager.remove(clientId);
      });
    });
  }

  _handleMessage(clientId, rawMessage) {
    try {
      const { event, data } = JSON.parse(rawMessage);
      switch (event) {
        case WS_EVENTS.CLIENT.PING:
          this.clientManager.send(clientId, WS_EVENTS.SERVER.PONG, { serverTime: Date.now() });
          break;
        case WS_EVENTS.CLIENT.START_STREAM:
          this._handleStartStream(clientId, data);
          break;
        case WS_EVENTS.CLIENT.STOP_STREAM:
          this._handleStopStream(clientId);
          break;
        case WS_EVENTS.CLIENT.SET_SCENARIO:
          this._handleSetScenario(clientId, data);
          break;
        case WS_EVENTS.CLIENT.SET_PAIR:
          this._handleSetPair(clientId, data);
          break;
        case WS_EVENTS.CLIENT.SET_TIMEFRAME:
          this._handleSetTimeframe(clientId, data);
          break;
        case WS_EVENTS.CLIENT.USER_ACTIVITY:
          this._handleUserActivity(clientId, data);
          break;
        case WS_EVENTS.CLIENT.ALERT_RESPONSE:
          this._handleAlertResponse(clientId, data);
          break;
        case WS_EVENTS.CLIENT.GET_ORDERBOOK:
          this._handleGetOrderBook(clientId, data);
          break;
        case WS_EVENTS.CLIENT.GET_TRADES:
          this._handleGetTrades(clientId, data);
          break;
        default:
          this.clientManager.send(clientId, WS_EVENTS.SERVER.ERROR, { message: `Unknown event: ${event}` });
      }
    } catch {
      this.clientManager.send(clientId, WS_EVENTS.SERVER.ERROR, { message: 'Invalid message format' });
    }
  }

  async _handleStartStream(clientId, data = {}) {
    const { mode, speed, pair } = data;

    resetSession('global');
    this.candleHistory = [];
    this.baselineCandles = [];

    const targetPair = pair || this.currentPair;
    this.currentPair = targetPair;
    this.streamMode = mode || 'simulated';

    // Stop any existing streams
    await this._stopAllStreams();

    if (this.streamMode === 'deriv') {
      await this._startDerivStream(clientId, targetPair, speed);
    } else {
      this._startSimulatedStream(clientId, targetPair, speed, mode);
    }

    this._logClientEvent(clientId, 'STREAM_STARTED', { mode: this.streamMode, speed, pair: targetPair });
  }

  _startSimulatedStream(clientId, pair, speed, mode) {
    if (pair && TRADING_PAIRS[pair]) {
      this.marketService.setPair(pair);
    }

    if (speed) {
      const speedMap = { fast: 250, normal: 1000, slow: 2000 };
      this.marketService.setUpdateInterval(speedMap[speed] || 1000);
    }

    this.marketService.reset();

    if (mode === 'demo') {
      this._queueDemoSequence();
    }

    this.marketService.start();
  }

  async _startDerivStream(clientId, pair, speed) {
    try {
      const pairConfig = TRADING_PAIRS[pair];
      
      if (!pairConfig || pairConfig.source !== 'deriv') {
        this.clientManager.send(clientId, WS_EVENTS.SERVER.ERROR, {
          message: `${pair} is not a Deriv trading pair`,
          availableDerivPairs: Object.keys(TRADING_PAIRS).filter(p => TRADING_PAIRS[p].source === 'deriv'),
        });
        return;
      }

      await derivMarketAdapter.initialize();

      // Get historical candles first
      const historicalCandles = await derivMarketAdapter.getHistoricalCandles(
        pair,
        this.currentTimeframe,
        50
      );

      if (historicalCandles.length > 0) {
        this.candleHistory = historicalCandles;
        this.baselineCandles = historicalCandles.slice(0, 30);
        
        this.clientManager.broadcast(WS_EVENTS.SERVER.CANDLE, {
          candles: historicalCandles.slice(-10),
          source: 'deriv',
          pair,
        });
      }

      // Subscribe to real-time candles
      await derivMarketAdapter.subscribeCandles(
        pair,
        this.currentTimeframe,
        (candle) => this._handleDerivCandle(candle)
      );

      this.derivSubscription = { pair, timeframe: this.currentTimeframe };

      this.clientManager.send(clientId, WS_EVENTS.SERVER.STATE_CHANGE, {
        type: 'deriv_stream_started',
        pair,
        timeframe: this.currentTimeframe,
        source: 'deriv',
      });

      console.log(`[WebSocket] Started Deriv stream for ${pair}`);
    } catch (error) {
      console.error('[WebSocket] Failed to start Deriv stream:', error.message);
      this.clientManager.send(clientId, WS_EVENTS.SERVER.ERROR, {
        message: `Failed to start Deriv stream: ${error.message}`,
      });
    }
  }

  _handleDerivCandle(candle) {
    this.candleHistory.push(candle);
    if (this.candleHistory.length > 200) {
      this.candleHistory.shift();
    }

    this.clientManager.broadcast(WS_EVENTS.SERVER.CANDLE, {
      ...candle,
      source: 'deriv',
    });

    this.clientManager.broadcast(WS_EVENTS.SERVER.METRICS, {
      price: candle.close,
      change: candle.close - candle.open,
      changePercent: ((candle.close - candle.open) / candle.open) * 100,
      high: candle.high,
      low: candle.low,
      volume: candle.volume || 0,
      source: 'deriv',
    });

    // Risk analysis for Deriv data
    if (this.candleHistory.length >= 10) {
      this._performRiskAnalysis();
    }
  }

  async _stopAllStreams() {
    // Stop simulated stream
    this.marketService.stop();

    // Stop Deriv stream
    if (this.derivSubscription) {
      try {
        await derivMarketAdapter.unsubscribeAll();
        this.derivSubscription = null;
      } catch (error) {
        console.error('[WebSocket] Failed to stop Deriv stream:', error.message);
      }
    }
  }

  async _handleStopStream(clientId) {
    await this._stopAllStreams();
    this._logClientEvent(clientId, 'STREAM_STOPPED', {});
  }

  _handleSetScenario(clientId, data) {
    const { scenario, duration, intensity } = data || {};

    if (!scenario) {
      this.clientManager.send(clientId, WS_EVENTS.SERVER.ERROR, { message: 'Scenario name is required' });
      return;
    }

    resetSession('global');

    const success = this.marketService.setScenario(scenario, duration || 15, intensity || 1.0);
    if (!success) {
      this.clientManager.send(clientId, WS_EVENTS.SERVER.ERROR, {
        message: `Invalid scenario: ${scenario}`,
        validScenarios: Object.values(SCENARIOS),
      });
      return;
    }

    if (!this.marketService.isStreaming) {
      this.marketService.start();
    }
  }

  async _handleSetPair(clientId, data) {
    const { pair } = data || {};
    if (!TRADING_PAIRS[pair]) {
      this.clientManager.send(clientId, WS_EVENTS.SERVER.ERROR, {
        message: `Invalid trading pair: ${pair}`,
        validPairs: Object.keys(TRADING_PAIRS),
      });
      return;
    }

    resetSession('global');
    this.candleHistory = [];
    this.baselineCandles = [];
    this.currentPair = pair;

    // Restart stream with new pair
    if (this.streamMode === 'deriv') {
      await this._stopAllStreams();
      await this._startDerivStream(clientId, pair, 'normal');
    } else {
      this.marketService.setPair(pair);
    }

    const client = this.clientManager.get(clientId);
    if (client) client.pair = pair;

    this.clientManager.broadcast(WS_EVENTS.SERVER.STATE_CHANGE, {
      type: 'pair_changed',
      pair,
      pairConfig: TRADING_PAIRS[pair],
      mode: this.streamMode,
    });
  }

  _handleSetTimeframe(clientId, data) {
    const { timeframe } = data || {};
    if (!TIMEFRAMES[timeframe]) {
      this.clientManager.send(clientId, WS_EVENTS.SERVER.ERROR, {
        message: `Invalid timeframe: ${timeframe}`,
        validTimeframes: Object.keys(TIMEFRAMES),
      });
      return;
    }

    this.marketService.setTimeframe(timeframe);

    const client = this.clientManager.get(clientId);
    if (client) client.timeframe = timeframe;
  }

  _handleUserActivity(clientId, data) {
    const { activity } = data || {};
    this.clientManager.updateActivity(clientId, activity);
    this._logClientEvent(clientId, 'USER_ACTIVITY', { activity });
  }

  _handleAlertResponse(clientId, data) {
    const { alertId, response } = data || {};
    const client = this.clientManager.get(clientId);
    if (!client) return;

    const targetAlertId = alertId || client.lastAlertId;
    if (!targetAlertId) return;

    if (!Object.values(USER_RESPONSE).includes(response)) {
      this.clientManager.send(clientId, WS_EVENTS.SERVER.ERROR, {
        message: `Invalid response type: ${response}`,
        validResponses: Object.values(USER_RESPONSE),
      });
      return;
    }

    this._logClientEvent(clientId, 'ALERT_RESPONSE', {
      alertId: targetAlertId,
      response,
    });
  }

  _handleGetOrderBook(clientId, data = {}) {
    const depth = data.depth || STREAM_CONFIG.ORDERBOOK_DEPTH;
    const orderBook = this.marketService.getOrderBook(depth);
    this.clientManager.send(clientId, WS_EVENTS.SERVER.ORDERBOOK, orderBook);
    this._logClientEvent(clientId, 'ORDERBOOK_REQUEST', { depth });
  }

  _handleGetTrades(clientId, data = {}) {
    const count = data.count || 50;
    const trades = this.marketService.getRecentTrades(count);
    this.clientManager.send(clientId, WS_EVENTS.SERVER.TRADE, { trades });
    this._logClientEvent(clientId, 'TRADES_REQUEST', { count });
  }

  _logClientEvent(clientId, actionType, meta) {
    const client = this.clientManager.get(clientId);
    if (!client?.dbSessionId) return;
    Event.create({
      sessionId: client.dbSessionId,
      actionType,
      volatilityFlag: actionType === 'RISK_TRIGGERED',
      meta: meta || {},
    }).catch((err) => console.log('Failed to create event', err));
  }

  _queueDemoSequence() {
    setTimeout(() => this.marketService.setScenario(SCENARIOS.NORMAL, 10), 0);
    setTimeout(() => this.marketService.setScenario(SCENARIOS.DOWNTREND, 8), 12000);
    setTimeout(() => this.marketService.setScenario(SCENARIOS.VOLATILE_DUMP, 12), 22000);
    setTimeout(() => this.marketService.setScenario(SCENARIOS.UPTREND, 10), 36000);
    setTimeout(() => this.marketService.setScenario(SCENARIOS.FLASH_CRASH, 8), 48000);
    setTimeout(() => this.marketService.setScenario(SCENARIOS.NORMAL, 20), 58000);
  }

  _storeClosedCandle(candle) {
    this.clientManager.clients.forEach((client) => {
      if (!client?.dbSessionId) return;
      Candle.create({
        sessionId: client.dbSessionId,
        symbol: candle.symbol,
        timeframe: candle.timeframe,
        openTime: new Date(candle.openTime),
        closeTime: new Date(candle.closeTime),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        quoteVolume: candle.quoteVolume,
        trades: candle.trades,
        takerBuyVolume: candle.takerBuyVolume,
        takerBuyQuoteVolume: candle.takerBuyQuoteVolume,
        scenario: candle.scenario || null,
        meta: {},
      }).catch((err) => console.log('Failed to create candle', err));
    });
  }

  getStats() {
    return {
      connectedClients: this.clientManager.getCount(),
      streamState: this.marketService.getState(),
      candleHistoryLength: this.candleHistory.length,
      baselineCandlesLength: this.baselineCandles.length,
    };
  }

  async shutdown() {
    this.marketService.stop();
    for (const [clientId, client] of this.clientManager.clients) {
      try {
        client.ws.close(1000, 'Server shutting down');
        this.clientManager.remove(clientId);
      } catch {
        // Ignore close errors
      }
    }
  }
}

export function setupMarketSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws', clientTracking: true });
  const handler = new SocketHandler(wss);
  return { wss, handler };
}
