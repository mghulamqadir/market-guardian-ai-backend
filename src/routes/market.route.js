import express from 'express';

import { marketEvent } from '../controllers/session.demo.controller.js';
import { TRADING_PAIRS, TIMEFRAMES, SCENARIOS } from '../utils/market.constants.js';

const router = express.Router();

/**
 * @swagger
 * /api/market/event:
 *   post:
 *     summary: Process market event and analyze risk
 *     tags: [Market]
 *     description: Accept market tick data, run risk analysis engine, and return AI-powered risk assessment
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
 *                 description: Optional session ID. If not provided, a new session will be created
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               userContext:
 *                 type: string
 *                 enum: [viewing_chart, placing_order, modifying_order, closing_position, idle]
 *                 default: viewing_chart
 *                 description: Current user activity context
 *               open:
 *                 type: number
 *                 description: Opening price of the candle
 *                 example: 45000.50
 *               high:
 *                 type: number
 *                 description: Highest price in the candle period
 *                 example: 45500.00
 *               low:
 *                 type: number
 *                 description: Lowest price in the candle period
 *                 example: 44800.00
 *               close:
 *                 type: number
 *                 description: Closing price of the candle
 *                 example: 45200.00
 *               volume:
 *                 type: number
 *                 description: Trading volume
 *                 example: 1250.5
 *               trades:
 *                 type: number
 *                 description: Number of trades (optional)
 *                 example: 150
 *               timestamp:
 *                 type: number
 *                 description: Unix timestamp in milliseconds
 *                 example: 1706745600000
 *               openTime:
 *                 type: number
 *                 description: Candle open time (optional)
 *               closeTime:
 *                 type: number
 *                 description: Candle close time (optional)
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
 *                   description: Whether risk was detected
 *                 state:
 *                   type: string
 *                   enum: [NORMAL, VOLATILE, HIGH_RISK]
 *                   description: Current market state
 *                 transitionType:
 *                   type: string
 *                   description: Type of state transition
 *                 message:
 *                   type: string
 *                   nullable: true
 *                   description: AI-generated risk alert message
 *                 signals:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Detected risk signals
 *                 whatHappened:
 *                   type: string
 *                   description: Description of market event
 *                 metrics:
 *                   type: object
 *                   description: Market metrics and analysis data
 *                 sessionId:
 *                   type: string
 *                   nullable: true
 *                   description: Session ID used for analysis
 *       400:
 *         description: Invalid candle data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing candle fields: open, high"
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
router.post('/event', marketEvent);

/**
 * @swagger
 * /api/market/config:
 *   get:
 *     summary: Get market configuration
 *     tags: [Market]
 *     description: Retrieve available trading pairs, timeframes, and market scenarios
 *     responses:
 *       200:
 *         description: Market configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tradingPairs:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "DEMO/USD"]
 *                   description: Available trading pairs
 *                 timeframes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["1s", "1m", "5m", "15m", "1h", "4h", "1d"]
 *                   description: Available timeframe intervals
 *                 scenarios:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["normal", "uptrend", "downtrend", "volatile_pump", "flash_crash"]
 *                   description: Available market simulation scenarios
 */
router.get('/config', (req, res) => {
  res.json({
    tradingPairs: Object.keys(TRADING_PAIRS),
    timeframes: Object.keys(TIMEFRAMES),
    scenarios: Object.values(SCENARIOS),
  });
});

export default router;
