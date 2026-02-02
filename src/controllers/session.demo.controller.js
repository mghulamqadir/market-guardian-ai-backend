import { Session, Event, Intervention } from '../models/index.js';
import { addTick, getWindow } from '../services/market.window.store.js';
import { analyzeMarket, resetSession } from '../services/market.risk.engine.js';
import { generateExplanation } from '../services/explanation.generator.js';
import { CandleGenerator } from '../services/candle.generator.js';
import { SCENARIOS } from '../utils/market.constants.js';

const baselineBySession = new Map();
const generatorCache = new Map();

function buildCandleFromBody(body) {
  if (body.ohlc) return body.ohlc;
  if (body.tick) return body.tick;
  return {
    open: body.open,
    high: body.high,
    low: body.low,
    close: body.close,
    volume: body.volume,
    trades: body.trades,
    timestamp: body.timestamp,
    openTime: body.openTime,
    closeTime: body.closeTime,
  };
}

function validateCandle(candle) {
  const required = ['open', 'high', 'low', 'close', 'volume'];
  const missing = required.filter((key) => candle[key] === undefined || candle[key] === null);
  if (missing.length) {
    return `Missing candle fields: ${missing.join(', ')}`;
  }
  return null;
}

async function ensureSession(sessionId, metadata = {}) {
  if (sessionId) return sessionId;
  try {
    const session = await Session.create({
      metadata: { source: 'api', ...metadata },
    });
    resetSession(session.id);
    baselineBySession.set(session.id, []);
    return session.id;
  } catch {
    return null;
  }
}

async function buildMarketResponse({ sessionId, candle, userContext }) {
  const activeSessionId = await ensureSession(sessionId);
  const targetSessionId = activeSessionId || sessionId || 'global';
  const window = addTick(targetSessionId, candle);
  const baseline = baselineBySession.get(targetSessionId) || [];
  if (baseline.length < 30) {
    baseline.push(candle);
    baselineBySession.set(targetSessionId, baseline);
  }

  const analysis = analyzeMarket(window, baseline, targetSessionId);

  let explanation = null;
  if (analysis.shouldTrigger) {
    explanation = await generateExplanation({
      market_state: analysis.state,
      what_happened: analysis.whatHappened,
      signals: analysis.signals,
      user_context: userContext || 'viewing_chart',
    });
  }

  if (activeSessionId) {
    Event.create({
      sessionId: activeSessionId,
      actionType: 'MARKET_EVENT',
      volatilityFlag: analysis.state !== 'NORMAL',
      meta: {
        candle,
        analysis: {
          state: analysis.state,
          whatHappened: analysis.whatHappened,
          signals: analysis.signals,
          metrics: analysis.metrics,
        },
      },
    }).catch(() => {});

    if (analysis.shouldTrigger && explanation?.message) {
      Event.create({
        sessionId: activeSessionId,
        actionType: 'RISK_TRIGGERED',
        volatilityFlag: true,
        meta: {
          state: analysis.state,
          whatHappened: analysis.whatHappened,
          signals: analysis.signals,
          metrics: analysis.metrics,
        },
      }).catch(() => {});

      Intervention.create({
        sessionId: activeSessionId,
        reason: analysis.whatHappened || 'risk_trigger',
        message: explanation.message,
        model: 'template',
        meta: {
          state: analysis.state,
          signals: analysis.signals,
          metrics: analysis.metrics,
        },
      }).catch(() => {});
    }
  }

  return {
    riskDetected: analysis.shouldTrigger,
    state: analysis.state,
    transitionType: analysis.transitionType,
    message: explanation ? explanation.message : null,
    signals: analysis.signals,
    whatHappened: analysis.whatHappened,
    metrics: analysis.metrics,
    sessionId: activeSessionId || sessionId || null,
  };
}

/**
 * START SESSION
 * Create a new anonymous session for the demo user
 */
export const startSession = async (req, res) => {
  try {
    const session = await Session.create({
      metadata: { userAgent: req.headers['user-agent'] },
    });
    resetSession(session.id);
    baselineBySession.set(session.id, []);
    Event.create({
      sessionId: session.id,
      actionType: 'SESSION_STARTED',
      meta: { source: 'api' },
    }).catch(() => {});
    res.status(201).json({ sessionId: session.id, message: 'Session started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * SIMULATE MARKET (Admin/Demo Tool)
 * Force market conditions to trigger the AI
 */
export const simulateMarket = async (req, res) => {
  try {
    return res.status(400).json({
      error: 'Deprecated',
      message: 'Use real-time candle generation via WebSocket or POST /api/market-event.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /demo/market-event
 * Accept market tick + user context, run risk engine, return response.
 */
export const marketEvent = async (req, res) => {
  try {
    const { sessionId, userContext } = req.body;
    const candle = buildCandleFromBody(req.body);

    const error = validateCandle(candle);
    if (error) {
      return res.status(400).json({ error });
    }

    const response = await buildMarketResponse({ sessionId, candle, userContext });
    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * GET /demo/stream
 * Stream mock ticks from predefined scenarios.
 */
export const demoStream = async (req, res) => {
  try {
    const { sessionId, scenario, userContext, pair, timeframe } = req.query;
    const selectedScenario = Object.values(SCENARIOS).includes(String(scenario))
      ? String(scenario)
      : SCENARIOS.NORMAL;
    const key = `${pair || 'BTC/USDT'}:${timeframe || '1s'}:${selectedScenario}`;

    const generator =
      generatorCache.get(key) ||
      new CandleGenerator({
        pair: pair || 'BTC/USDT',
        timeframe: timeframe || '1s',
      });

    generatorCache.set(key, generator);
    if (selectedScenario !== SCENARIOS.NORMAL) {
      generator.setScenario(selectedScenario, 15);
    }

    const candle = generator.generateCandle();
    const response = await buildMarketResponse({
      sessionId: sessionId || null,
      candle,
      userContext: userContext || 'viewing_chart',
    });

    return res.json({
      scenario: selectedScenario,
      candle,
      ...response,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * GET STATUS (Polling Endpoint)
 * Legacy demo flow for simulated market state.
 */
export const getSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const window = getWindow(sessionId);
    const baseline = baselineBySession.get(sessionId || 'global') || [];
    const analysis = analyzeMarket(window, baseline, sessionId || 'global');

    return res.json({
      state: analysis.state,
      metrics: analysis.metrics,
      lastTransition: analysis.transitionType,
      triggerCount: analysis.triggerCount,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
