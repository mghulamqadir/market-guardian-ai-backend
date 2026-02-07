/**
 * Market Analysis Service
 * Provides detailed market analysis and insights
 */

import { analyzeMarket } from './market.risk.engine.js';
import { generateExplanation } from './explanation.generator.js';

/**
 * Generate full market analysis with detailed insights
 * @param {Array} candleHistory - Historical candle data
 * @param {Array} baselineCandles - Baseline candles for comparison
 * @param {Object} currentAlert - Current alert data
 * @param {string} userContext - User activity context
 */
export async function generateFullAnalysis(candleHistory, baselineCandles, currentAlert, userContext = 'viewing_chart') {
  if (!candleHistory || candleHistory.length < 5) {
    throw new Error('Insufficient candle data for analysis');
  }

  // Perform comprehensive risk analysis
  const analysis = analyzeMarket(candleHistory, baselineCandles, 'global');

  // Get latest candle data
  const latestCandle = candleHistory[candleHistory.length - 1];
  const previousCandle = candleHistory[candleHistory.length - 2];

  // Calculate additional metrics
  const priceChange = latestCandle.close - previousCandle.close;
  const priceChangePercent = (priceChange / previousCandle.close) * 100;
  
  // Calculate volatility (standard deviation of price changes)
  const priceChanges = [];
  for (let i = 1; i < candleHistory.length; i++) {
    const change = (candleHistory[i].close - candleHistory[i - 1].close) / candleHistory[i - 1].close;
    priceChanges.push(change);
  }
  const avgChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
  const variance = priceChanges.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / priceChanges.length;
  const volatility = Math.sqrt(variance) * 100;

  // Calculate support and resistance levels
  const prices = candleHistory.map(c => c.close);
  const highPrices = candleHistory.map(c => c.high);
  const lowPrices = candleHistory.map(c => c.low);
  
  const resistance = Math.max(...highPrices);
  const support = Math.min(...lowPrices);
  const currentPrice = latestCandle.close;
  
  // Distance from support/resistance
  const distanceToResistance = ((resistance - currentPrice) / currentPrice) * 100;
  const distanceToSupport = ((currentPrice - support) / currentPrice) * 100;

  // Trend analysis (simple moving average)
  const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, prices.length);
  const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, prices.length);
  
  let trend = 'neutral';
  if (currentPrice > sma20 && sma20 > sma50) {
    trend = 'bullish';
  } else if (currentPrice < sma20 && sma20 < sma50) {
    trend = 'bearish';
  }

  // Generate AI explanation with streaming support
  const explanation = await generateExplanation(
    {
      market_state: analysis.state,
      what_happened: analysis.whatHappened,
      signals: analysis.signals,
      user_context: userContext,
    },
    null // No streaming for full analysis
  );

  // Compile comprehensive analysis
  const fullAnalysis = {
    timestamp: Date.now(),
    marketState: analysis.state,
    previousState: analysis.previousState,
    
    // Price metrics
    currentPrice: currentPrice,
    priceChange: priceChange,
    priceChangePercent: priceChangePercent,
    
    // Volatility metrics
    volatility: volatility,
    volatilityLevel: volatility > 2 ? 'high' : volatility > 1 ? 'moderate' : 'low',
    
    // Support/Resistance
    support: support,
    resistance: resistance,
    distanceToSupport: distanceToSupport,
    distanceToResistance: distanceToResistance,
    
    // Trend analysis
    trend: trend,
    sma20: sma20,
    sma50: sma50,
    
    // Risk metrics from engine
    metrics: analysis.metrics,
    signals: analysis.signals,
    
    // AI-generated explanation
    explanation: {
      message: explanation.message,
      confidence: explanation.confidence,
      source: explanation.source,
      tags: explanation.tags,
    },
    
    // Recommendations
    recommendations: generateRecommendations(analysis, trend, volatility, distanceToSupport, distanceToResistance),
    
    // Alert context
    alertContext: currentAlert || {},
  };

  return fullAnalysis;
}

/**
 * Generate trading recommendations based on analysis
 */
function generateRecommendations(analysis, trend, volatility, distanceToSupport, distanceToResistance) {
  const recommendations = [];

  // Risk-based recommendations
  if (analysis.state === 'HIGH_RISK') {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      message: 'High risk detected. Consider reducing position size or setting tight stop losses.',
    });
  } else if (analysis.state === 'VOLATILE') {
    recommendations.push({
      type: 'caution',
      priority: 'medium',
      message: 'Market volatility increased. Monitor positions closely.',
    });
  }

  // Trend-based recommendations
  if (trend === 'bullish') {
    recommendations.push({
      type: 'opportunity',
      priority: 'medium',
      message: 'Bullish trend detected. Consider long positions with proper risk management.',
    });
  } else if (trend === 'bearish') {
    recommendations.push({
      type: 'opportunity',
      priority: 'medium',
      message: 'Bearish trend detected. Consider short positions or exit long positions.',
    });
  }

  // Support/Resistance recommendations
  if (distanceToSupport < 2) {
    recommendations.push({
      type: 'technical',
      priority: 'high',
      message: 'Price near support level. Watch for potential bounce or breakdown.',
    });
  }
  
  if (distanceToResistance < 2) {
    recommendations.push({
      type: 'technical',
      priority: 'high',
      message: 'Price near resistance level. Watch for potential rejection or breakout.',
    });
  }

  // Volatility recommendations
  if (volatility > 3) {
    recommendations.push({
      type: 'risk',
      priority: 'high',
      message: 'Extreme volatility. Avoid entering new positions until market stabilizes.',
    });
  }

  return recommendations;
}

/**
 * Get historical analysis for a specific time period
 */
export function getHistoricalAnalysis(candleHistory, period = '24h') {
  const periodMap = {
    '1h': 60,
    '4h': 240,
    '24h': 1440,
    '7d': 10080,
  };

  const candleCount = periodMap[period] || 1440;
  const relevantCandles = candleHistory.slice(-candleCount);

  if (relevantCandles.length === 0) {
    return null;
  }

  const firstCandle = relevantCandles[0];
  const lastCandle = relevantCandles[relevantCandles.length - 1];

  const periodChange = lastCandle.close - firstCandle.close;
  const periodChangePercent = (periodChange / firstCandle.close) * 100;

  const high = Math.max(...relevantCandles.map(c => c.high));
  const low = Math.min(...relevantCandles.map(c => c.low));
  const range = high - low;
  const rangePercent = (range / firstCandle.close) * 100;

  return {
    period,
    startPrice: firstCandle.close,
    endPrice: lastCandle.close,
    change: periodChange,
    changePercent: periodChangePercent,
    high,
    low,
    range,
    rangePercent,
    candleCount: relevantCandles.length,
  };
}
