/**
 * RiskEngine
 *
 * Responsibilities:
 * 1. Pure Logic: Analyze Market State -> Risk Level.
 * 2. Deterministic: Same Input -> Same Output.
 * 3. Threshold Management.
 */

const THRESHOLDS = {
    VOLATILITY_HIGH: 80,
    PRICE_DROP_CRITICAL: -5.0, // -5% in 1 hour is a crash
};

export const RiskEngine = {
    /**
     * Analyze market data to determine risk.
     * @param {Object} marketState
     * @returns {Object} { riskLevel: 'LOW'|'MEDIUM'|'HIGH', shouldIntervene: boolean, reason: string }
     */
    analyze: (marketState) => {
        const { volatilityIndex, trend, priceChange1h } = marketState;

        // RULE 1: Extreme Volatility
        if (volatilityIndex >= THRESHOLDS.VOLATILITY_HIGH) {
            return {
                riskLevel: 'HIGH',
                shouldIntervene: true,
                reason: 'Extreme Volatility Detected',
                meta: { trigger: 'VIX_THRESHOLD', value: volatilityIndex },
            };
        }

        // RULE 2: Flash Crash
        if (trend === 'CRASH' || priceChange1h <= THRESHOLDS.PRICE_DROP_CRITICAL) {
            return {
                riskLevel: 'HIGH',
                shouldIntervene: true,
                reason: 'Rapid Price Drop Detected',
                meta: { trigger: 'PRICE_DROP', value: priceChange1h },
            };
        }

        // Default: Safe
        return {
            riskLevel: 'LOW',
            shouldIntervene: false,
            reason: 'Market is Stable',
            meta: {},
        };
    },
};
