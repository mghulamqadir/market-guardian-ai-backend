import { successResponse, errorResponse } from '../utils/response.handler.js';
import { getDashboardCandles } from '../services/market.candle.service.js';

export async function getCandles(req, res) {
  try {
    const data = await getDashboardCandles(req.query);
    return successResponse(res, 200, 'Candles retrieved successfully', data);
  } catch (error) {
    return errorResponse(res, error);
  }
}

