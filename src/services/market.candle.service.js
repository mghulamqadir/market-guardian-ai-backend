import { Op } from 'sequelize';

import { Candle } from '../models/index.js';
import { TRADING_PAIRS, TIMEFRAMES } from '../utils/market.constants.js';
import { ApiError } from '../utils/response.handler.js';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

function parseDateInput(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numericValue = Number(value);
  const parsedDate = Number.isFinite(numericValue)
    ? new Date(numericValue)
    : new Date(String(value));

  if (Number.isNaN(parsedDate.getTime())) {
    throw ApiError(
      400,
      `Invalid ${fieldName}. Use unix milliseconds or ISO date format.`,
      []
    );
  }

  return parsedDate;
}

export async function getDashboardCandles(query = {}) {
  const pair = query.pair ? String(query.pair).trim() : null;
  const timeframe = query.timeframe ? String(query.timeframe).trim() : null;
  const sessionId = query.sessionId ? String(query.sessionId).trim() : null;

  if (pair && !TRADING_PAIRS[pair]) {
    throw ApiError(400, `Invalid pair "${pair}"`, [`Use one of: ${Object.keys(TRADING_PAIRS).join(', ')}`]);
  }

  if (timeframe && !TIMEFRAMES[timeframe]) {
    throw ApiError(400, `Invalid timeframe "${timeframe}"`, [`Use one of: ${Object.keys(TIMEFRAMES).join(', ')}`]);
  }

  const fromDate = parseDateInput(query.from, 'from');
  const toDate = parseDateInput(query.to, 'to');

  if (fromDate && toDate && fromDate > toDate) {
    throw ApiError(400, '`from` must be less than or equal to `to`', []);
  }

  const requestedLimit = Number.parseInt(query.limit, 10);
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  const where = {};
  if (pair) where.symbol = pair;
  if (timeframe) where.timeframe = timeframe;
  if (sessionId) where.sessionId = sessionId;

  if (fromDate || toDate) {
    where.openTime = {};
    if (fromDate) where.openTime[Op.gte] = fromDate;
    if (toDate) where.openTime[Op.lte] = toDate;
  }

  const candles = await Candle.findAll({
    where,
    order: [['openTime', 'ASC']],
    limit,
  });

  return {
    candles: candles.map((candle) => candle.toJSON()),
    count: candles.length,
    filters: {
      pair,
      timeframe,
      sessionId,
      from: fromDate ? fromDate.toISOString() : null,
      to: toDate ? toDate.toISOString() : null,
      limit,
    },
  };
}

