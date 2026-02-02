import express from 'express';
import {
  startSession,
  simulateMarket,
  marketEvent,
  demoStream,
  getSessionStatus,
} from '../controllers/session.demo.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/demo/start:
 *   post:
 *     summary: Start a new demo session
 *     tags: [Demo Session]
 *     description: Create a new anonymous session for demo users to track market events and interventions
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   format: uuid
 *                   description: Unique session identifier
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 message:
 *                   type: string
 *                   example: "Session started"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/start', startSession);

/**
 * @swagger
 * /api/demo/simulate:
 *   post:
 *     summary: Simulate market conditions (Deprecated)
 *     tags: [Demo Session]
 *     deprecated: true
 *     description: This endpoint is deprecated. Use real-time candle generation via WebSocket or POST /api/market/event instead
 *     responses:
 *       400:
 *         description: Endpoint deprecated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Deprecated"
 *                 message:
 *                   type: string
 *                   example: "Use real-time candle generation via WebSocket or POST /api/market-event."
 */
router.post('/simulate', simulateMarket);

/**
 * @swagger
 * /api/demo/market-event:
 *   post:
 *     summary: Process market event in demo session
 *     tags: [Demo Session]
 *     description: Same as /api/market/event - accepts market tick data and runs risk analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - open
 *               - high
 *               - low
 *               - close
 *               - volume
 *             properties:
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *                 description: Session ID from /api/demo/start
 *               userContext:
 *                 type: string
 *                 enum: [viewing_chart, placing_order, modifying_order, closing_position, idle]
 *                 default: viewing_chart
 *               open:
 *                 type: number
 *                 example: 45000.50
 *               high:
 *                 type: number
 *                 example: 45500.00
 *               low:
 *                 type: number
 *                 example: 44800.00
 *               close:
 *                 type: number
 *                 example: 45200.00
 *               volume:
 *                 type: number
 *                 example: 1250.5
 *               trades:
 *                 type: number
 *                 example: 150
 *               timestamp:
 *                 type: number
 *                 example: 1706745600000
 *     responses:
 *       200:
 *         description: Market analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 riskDetected:
 *                   type: boolean
 *                 state:
 *                   type: string
 *                   enum: [NORMAL, VOLATILE, HIGH_RISK]
 *                 message:
 *                   type: string
 *                   nullable: true
 *                 signals:
 *                   type: array
 *                   items:
 *                     type: string
 *                 metrics:
 *                   type: object
 *                 sessionId:
 *                   type: string
 *       400:
 *         description: Invalid candle data
 *       500:
 *         description: Server error
 */
router.post('/market-event', marketEvent);

/**
 * @swagger
 * /api/demo/stream:
 *   get:
 *     summary: Stream simulated market data
 *     tags: [Demo Session]
 *     description: Generate and stream mock market ticks from predefined scenarios for demo purposes
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID to associate the stream with
 *       - in: query
 *         name: scenario
 *         schema:
 *           type: string
 *           enum: [normal, uptrend, downtrend, volatile_pump, volatile_dump, flash_crash, flash_pump, consolidation, breakout_up, breakout_down, high_volume_spike, whale_dump, whale_pump]
 *           default: normal
 *         description: Market scenario to simulate
 *       - in: query
 *         name: pair
 *         schema:
 *           type: string
 *           default: BTC/USDT
 *         description: Trading pair (e.g., BTC/USDT, ETH/USDT)
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1s, 1m, 5m, 15m, 1h, 4h, 1d]
 *           default: 1s
 *         description: Candle timeframe
 *       - in: query
 *         name: userContext
 *         schema:
 *           type: string
 *           enum: [viewing_chart, placing_order, modifying_order, closing_position, idle]
 *           default: viewing_chart
 *         description: User activity context
 *     responses:
 *       200:
 *         description: Simulated market data with analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scenario:
 *                   type: string
 *                   description: Active scenario
 *                 candle:
 *                   type: object
 *                   properties:
 *                     open:
 *                       type: number
 *                     high:
 *                       type: number
 *                     low:
 *                       type: number
 *                     close:
 *                       type: number
 *                     volume:
 *                       type: number
 *                     timestamp:
 *                       type: number
 *                 riskDetected:
 *                   type: boolean
 *                 state:
 *                   type: string
 *                   enum: [NORMAL, VOLATILE, HIGH_RISK]
 *                 message:
 *                   type: string
 *                   nullable: true
 *                 signals:
 *                   type: array
 *                   items:
 *                     type: string
 *                 metrics:
 *                   type: object
 *                 sessionId:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.get('/stream', demoStream);

/**
 * @swagger
 * /api/demo/status/{sessionId}:
 *   get:
 *     summary: Get session status
 *     tags: [Demo Session]
 *     description: Retrieve current market state and metrics for a demo session
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID to check status for
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Session status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 state:
 *                   type: string
 *                   enum: [NORMAL, VOLATILE, HIGH_RISK]
 *                   description: Current market state
 *                 metrics:
 *                   type: object
 *                   description: Market analysis metrics
 *                 lastTransition:
 *                   type: string
 *                   description: Last state transition type
 *                 triggerCount:
 *                   type: number
 *                   description: Number of risk triggers
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/status/:sessionId', getSessionStatus);

export default router;
