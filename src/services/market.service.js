/**
 * MarketService
 *
 * Responsibilities:
 * 1. Maintain the "Source of Truth" for the current market state.
 * 2. Allow "God Mode" updates (simulation).
 * 3. Provide state to the Risk Engine.
 *
 * Note: In a production app, this would poll an external API (CoinGecko/Binance).
 * For this Mock Demo, it holds an in-memory state.
 */

// Singleton State (In-Memory)
let currentState = {
  volatilityIndex: 12, // LOW (0-100)
  trend: 'STABLE',     // 'STABLE', 'UP', 'DOWN', 'CRASH'
  priceChange1h: 0.5,  // Percentage
  timestamp: Date.now(),
};

export const MarketService = {
  /**
   * Get the current market health.
   * @returns {Object} { volatilityIndex, trend, priceChange1h, timestamp }
   */
  getCurrentState: () => {
    return { ...currentState };
  },

  /**
   * Force the market into a specific state (Simulation Mode).
   * @param {Object} newState Partial state to update
   */
  setMarketCondition: (newState) => {
    currentState = {
      ...currentState,
      ...newState,
      timestamp: Date.now(),
    };
    return currentState;
  },

  /**
   * Reset to "Normal" market conditions.
   */
  resetMarket: () => {
    currentState = {
      volatilityIndex: 12,
      trend: 'STABLE',
      priceChange1h: 0.5,
      timestamp: Date.now(),
    };
    return currentState;
  },
};
