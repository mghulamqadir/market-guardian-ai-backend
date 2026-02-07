/**
 * Deriv API Routes
 */

import { Router } from 'express';
import * as derivController from '../controllers/deriv.controller.js';

const router = Router();

/**
 * @swagger
 * /api/deriv/pairs:
 *   get:
 *     summary: Get available Deriv trading pairs
 *     tags: [Deriv]
 *     description: Retrieve list of all available Deriv trading pairs including synthetic indices, forex, and crypto
 *     responses:
 *       200:
 *         description: Deriv pairs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         pairs:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               pair:
 *                                 type: string
 *                                 example: "R100/USD"
 *                               derivSymbol:
 *                                 type: string
 *                                 example: "R_100"
 *                               type:
 *                                 type: string
 *                                 enum: [synthetic, forex, crypto]
 *                               baseAsset:
 *                                 type: string
 *                               quoteAsset:
 *                                 type: string
 */
router.get('/pairs', derivController.getDerivPairs);

/**
 * @swagger
 * /api/deriv/candles:
 *   get:
 *     summary: Get historical candles from Deriv
 *     tags: [Deriv]
 *     description: Fetch historical OHLC candle data for a Deriv trading pair
 *     parameters:
 *       - in: query
 *         name: pair
 *         required: true
 *         schema:
 *           type: string
 *           example: "R100/USD"
 *         description: Trading pair
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1m, 2m, 3m, 5m, 10m, 15m, 30m, 1h, 2h, 4h, 8h, 1d]
 *           default: "1m"
 *         description: Candle timeframe
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           default: 100
 *           minimum: 1
 *           maximum: 1000
 *         description: Number of candles to fetch
 *     responses:
 *       200:
 *         description: Historical candles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         pair:
 *                           type: string
 *                         timeframe:
 *                           type: string
 *                         count:
 *                           type: integer
 *                         candles:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               symbol:
 *                                 type: string
 *                               openTime:
 *                                 type: integer
 *                               closeTime:
 *                                 type: integer
 *                               open:
 *                                 type: number
 *                               high:
 *                                 type: number
 *                               low:
 *                                 type: number
 *                               close:
 *                                 type: number
 *                               source:
 *                                 type: string
 *                                 example: "deriv"
 *       400:
 *         description: Trading pair is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/candles', derivController.getDerivCandles);

/**
 * @swagger
 * /api/deriv/test-connection:
 *   get:
 *     summary: Test Deriv API connection
 *     tags: [Deriv]
 *     description: Test connection to Deriv WebSocket API
 *     responses:
 *       200:
 *         description: Connection successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         isConnected:
 *                           type: boolean
 *                         availablePairs:
 *                           type: integer
 *       500:
 *         description: Connection failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/test-connection', derivController.testDerivConnection);

export default router;
