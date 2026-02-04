/**
 * WebSocket server for real-time market simulation.
 */

import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

import { MarketDataService, SCENARIOS } from './market.data.service.js';
import { Session, Event, Intervention, Candle } from '../models/index.js';
import { analyzeMarket, resetSession } from './market.risk.engine.js';
import { generateExplanation } from './explanation.generator.js';
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

    this.#setupMarketServiceListeners();
    this.#setupWebSocketServer();
  }

  #setupMarketServiceListeners() {
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
          await this.#analyzeRisk(candle);
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
      this.#storeClosedCandle(candle);
      await this.#analyzeRisk();
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

  async #analyzeRisk(activeCandle = null) {
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

  #setupWebSocketServer() {
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
        this.#handleMessage(clientId, message);
      });

      ws.on('close', () => {
        this.clientManager.remove(clientId);
      });
    });
  }

  #handleMessage(clientId, rawMessage) {
    try {
      const { event, data } = JSON.parse(rawMessage);
      switch (event) {
        case WS_EVENTS.CLIENT.PING:
          this.clientManager.send(clientId, WS_EVENTS.SERVER.PONG, { serverTime: Date.now() });
          break;
        case WS_EVENTS.CLIENT.START_STREAM:
          this.#handleStartStream(clientId, data);
          break;
        case WS_EVENTS.CLIENT.STOP_STREAM:
          this.#handleStopStream(clientId);
          break;
        case WS_EVENTS.CLIENT.SET_SCENARIO:
          this.#handleSetScenario(clientId, data);
          break;
        case WS_EVENTS.CLIENT.SET_PAIR:
          this.#handleSetPair(clientId, data);
          break;
        case WS_EVENTS.CLIENT.SET_TIMEFRAME:
          this.#handleSetTimeframe(clientId, data);
          break;
        case WS_EVENTS.CLIENT.USER_ACTIVITY:
          this.#handleUserActivity(clientId, data);
          break;
        case WS_EVENTS.CLIENT.ALERT_RESPONSE:
          this.#handleAlertResponse(clientId, data);
          break;
        case WS_EVENTS.CLIENT.GET_ORDERBOOK:
          this.#handleGetOrderBook(clientId, data);
          break;
        case WS_EVENTS.CLIENT.GET_TRADES:
          this.#handleGetTrades(clientId, data);
          break;
        default:
          this.clientManager.send(clientId, WS_EVENTS.SERVER.ERROR, { message: `Unknown event: ${event}` });
      }
    } catch {
      this.clientManager.send(clientId, WS_EVENTS.SERVER.ERROR, { message: 'Invalid message format' });
    }
  }

  #handleStartStream(clientId, data = {}) {
    const { mode, speed, pair } = data;

    resetSession('global');
    this.candleHistory = [];
    this.baselineCandles = [];

    if (pair && TRADING_PAIRS[pair]) {
      this.marketService.setPair(pair);
    }

    if (speed) {
      const speedMap = { fast: 250, normal: 1000, slow: 2000 };
      this.marketService.setUpdateInterval(speedMap[speed] || 1000);
    }

    this.marketService.reset();

    if (mode === 'demo') {
      this.#queueDemoSequence();
    }

    this.marketService.start();
    this.#logClientEvent(clientId, 'STREAM_STARTED', { mode, speed, pair });
  }

  #handleStopStream(clientId) {
    this.marketService.stop();
    this.#logClientEvent(clientId, 'STREAM_STOPPED', {});
  }

  #handleSetScenario(clientId, data) {
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

  #handleSetPair(clientId, data) {
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
    this.marketService.setPair(pair);

    const client = this.clientManager.get(clientId);
    if (client) client.pair = pair;

    this.clientManager.broadcast(WS_EVENTS.SERVER.STATE_CHANGE, {
      type: 'pair_changed',
      pair,
      pairConfig: TRADING_PAIRS[pair],
    });
  }

  #handleSetTimeframe(clientId, data) {
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

  #handleUserActivity(clientId, data) {
    const { activity } = data || {};
    this.clientManager.updateActivity(clientId, activity);
    this.#logClientEvent(clientId, 'USER_ACTIVITY', { activity });
  }

  #handleAlertResponse(clientId, data) {
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

    this.#logClientEvent(clientId, 'ALERT_RESPONSE', {
      alertId: targetAlertId,
      response,
    });
  }

  #handleGetOrderBook(clientId, data = {}) {
    const depth = data.depth || STREAM_CONFIG.ORDERBOOK_DEPTH;
    const orderBook = this.marketService.getOrderBook(depth);
    this.clientManager.send(clientId, WS_EVENTS.SERVER.ORDERBOOK, orderBook);
    this.#logClientEvent(clientId, 'ORDERBOOK_REQUEST', { depth });
  }

  #handleGetTrades(clientId, data = {}) {
    const count = data.count || 50;
    const trades = this.marketService.getRecentTrades(count);
    this.clientManager.send(clientId, WS_EVENTS.SERVER.TRADE, { trades });
    this.#logClientEvent(clientId, 'TRADES_REQUEST', { count });
  }

  #logClientEvent(clientId, actionType, meta) {
    const client = this.clientManager.get(clientId);
    if (!client?.dbSessionId) return;
    Event.create({
      sessionId: client.dbSessionId,
      actionType,
      volatilityFlag: actionType === 'RISK_TRIGGERED',
      meta: meta || {},
    }).catch((err) => console.log('Failed to create event', err));
  }

  #queueDemoSequence() {
    setTimeout(() => this.marketService.setScenario(SCENARIOS.NORMAL, 10), 0);
    setTimeout(() => this.marketService.setScenario(SCENARIOS.DOWNTREND, 8), 12000);
    setTimeout(() => this.marketService.setScenario(SCENARIOS.VOLATILE_DUMP, 12), 22000);
    setTimeout(() => this.marketService.setScenario(SCENARIOS.UPTREND, 10), 36000);
    setTimeout(() => this.marketService.setScenario(SCENARIOS.FLASH_CRASH, 8), 48000);
    setTimeout(() => this.marketService.setScenario(SCENARIOS.NORMAL, 20), 58000);
  }

  #storeClosedCandle(candle) {
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
