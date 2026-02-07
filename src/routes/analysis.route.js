/**
 * Analysis Routes
 * Endpoints for market analysis
 */

import { Router } from 'express';
import * as analysisController from '../controllers/analysis.controller.js';

const router = Router();

/**
 * @swagger
 * /api/analysis/full:
 *   post:
 *     summary: Get full market analysis
 *     tags: [Analysis]
 *     description: Generate comprehensive market analysis including risk metrics, trends, support/resistance, and AI-powered recommendations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candleHistory
 *             properties:
 *               candleHistory:
 *                 type: array
 *                 description: Array of historical candle data
 *                 items:
 *                   type: object
 *                   properties:
 *                     openTime:
 *                       type: integer
 *                     closeTime:
 *                       type: integer
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
 *               baselineCandles:
 *                 type: array
 *                 description: Baseline candles for comparison (optional)
 *               currentAlert:
 *                 type: object
 *                 description: Current alert context (optional)
 *               userContext:
 *                 type: string
 *                 enum: [viewing_chart, placing_order, monitoring_position]
 *                 default: viewing_chart
 *                 description: User activity context
 *     responses:
 *       200:
 *         description: Full analysis generated successfully
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
 *                         analysis:
 *                           type: object
 *                           properties:
 *                             timestamp:
 *                               type: integer
 *                             marketState:
 *                               type: string
 *                               enum: [NORMAL, VOLATILE, HIGH_RISK]
 *                             currentPrice:
 *                               type: number
 *                             priceChange:
 *                               type: number
 *                             priceChangePercent:
 *                               type: number
 *                             volatility:
 *                               type: number
 *                             volatilityLevel:
 *                               type: string
 *                               enum: [low, moderate, high]
 *                             support:
 *                               type: number
 *                             resistance:
 *                               type: number
 *                             trend:
 *                               type: string
 *                               enum: [bullish, bearish, neutral]
 *                             sma20:
 *                               type: number
 *                             sma50:
 *                               type: number
 *                             explanation:
 *                               type: object
 *                               properties:
 *                                 message:
 *                                   type: string
 *                                 confidence:
 *                                   type: number
 *                                 source:
 *                                   type: string
 *                             recommendations:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   type:
 *                                     type: string
 *                                   priority:
 *                                     type: string
 *                                   message:
 *                                     type: string
 *       400:
 *         description: Invalid or insufficient data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/full', analysisController.getFullAnalysis);

/**
 * @swagger
 * /api/analysis/historical:
 *   post:
 *     summary: Get historical analysis for a period
 *     tags: [Analysis]
 *     description: Get price movement analysis for a specific time period
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candleHistory
 *             properties:
 *               candleHistory:
 *                 type: array
 *                 description: Array of historical candle data
 *               period:
 *                 type: string
 *                 enum: [1h, 4h, 24h, 7d]
 *                 default: 24h
 *                 description: Analysis period
 *     responses:
 *       200:
 *         description: Historical analysis retrieved successfully
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
 *                         analysis:
 *                           type: object
 *                           properties:
 *                             period:
 *                               type: string
 *                             startPrice:
 *                               type: number
 *                             endPrice:
 *                               type: number
 *                             change:
 *                               type: number
 *                             changePercent:
 *                               type: number
 *                             high:
 *                               type: number
 *                             low:
 *                               type: number
 *                             range:
 *                               type: number
 *                             rangePercent:
 *                               type: number
 *       400:
 *         description: Invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/historical', analysisController.getHistoricalAnalysisEndpoint);

export default router;
