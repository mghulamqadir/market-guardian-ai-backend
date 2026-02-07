/**
 * Analysis Controller
 * Handles market analysis requests
 */

import { generateFullAnalysis, getHistoricalAnalysis } from '../services/market.analysis.service.js';
import { successResponse, errorResponse } from '../utils/response.handler.js';

/**
 * Get full market analysis
 * Provides comprehensive analysis including risk metrics, trends, and recommendations
 */
export async function getFullAnalysis(req, res) {
  try {
    const { candleHistory, baselineCandles, currentAlert, userContext } = req.body;

    if (!candleHistory || !Array.isArray(candleHistory) || candleHistory.length < 5) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Invalid or insufficient candle history data',
      });
    }

    const analysis = await generateFullAnalysis(
      candleHistory,
      baselineCandles || [],
      currentAlert || {},
      userContext || 'viewing_chart'
    );

    return successResponse(res, 200, 'Full analysis generated successfully', { analysis });
  } catch (error) {
    console.error('[Analysis] Failed to generate full analysis:', error.message);
    return errorResponse(res, error);
  }
}

/**
 * Get historical analysis for a specific period
 */
export async function getHistoricalAnalysisEndpoint(req, res) {
  try {
    const { candleHistory, period } = req.body;

    if (!candleHistory || !Array.isArray(candleHistory)) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Invalid candle history data',
      });
    }

    const analysis = getHistoricalAnalysis(candleHistory, period || '24h');

    if (!analysis) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'No data available for the specified period',
      });
    }

    return successResponse(res, 200, 'Historical analysis retrieved successfully', { analysis });
  } catch (error) {
    console.error('[Analysis] Failed to get historical analysis:', error.message);
    return errorResponse(res, error);
  }
}
