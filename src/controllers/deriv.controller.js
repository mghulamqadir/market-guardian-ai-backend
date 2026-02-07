/**
 * Deriv Controller
 * Handles Deriv-specific API endpoints
 */

import derivMarketAdapter from '../services/deriv.market.adapter.js';
import { successResponse, errorResponse } from '../utils/response.handler.js';

/**
 * Get available Deriv trading pairs
 */
export async function getDerivPairs(req, res) {
  try {
    const pairs = derivMarketAdapter.getAvailableDerivPairs();
    return successResponse(res, 200, 'Deriv pairs retrieved successfully', { pairs });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get historical candles from Deriv
 */
export async function getDerivCandles(req, res) {
  try {
    const { pair, timeframe, count } = req.query;

    if (!pair) {
      return errorResponse(res, { statusCode: 400, message: 'Trading pair is required' });
    }

    const candleCount = parseInt(count) || 100;
    const candles = await derivMarketAdapter.getHistoricalCandles(
      pair,
      timeframe || '1m',
      candleCount
    );

    return successResponse(res, 200, 'Historical candles retrieved successfully', { 
      pair,
      timeframe: timeframe || '1m',
      count: candles.length,
      candles 
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Test Deriv connection
 */
export async function testDerivConnection(req, res) {
  try {
    await derivMarketAdapter.initialize();
    return successResponse(res, 200, 'Deriv connection successful', {
      isConnected: true,
      availablePairs: derivMarketAdapter.getAvailableDerivPairs().length,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}
