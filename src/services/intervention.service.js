/**
 * InterventionService
 *
 * Responsibilities:
 * 1. Provide the "Voice of Calm".
 * 2. Select the correct pre-approved message based on the Risk Reason.
 * 3. NO LLM latency here. Instant response.
 */

const INTERVENTION_TEMPLATES = {
  high_volatility: {
    title: 'Market Velocity Alert',
    message:
      'The market is moving unusually fast right now. This often means higher uncertainty. You can wait for things to slow down, or continue if you feel confident.',
    action: 'WAIT',
  },
  crash: {
    title: 'Rapid Drop Detected',
    message:
      'We are seeing a sharp downward move across the market. This is a high-risk moment because the market is unstable. You can wait for stability, or continue if you feel confident.',
    action: 'HOLD_STEADY',
  },
  default: {
    title: 'Market Alert',
    message:
      'Unusual activity detected. This can be a risky moment. You can wait for stability, or continue if you feel confident.',
    action: 'OBSERVE',
  },
};

export const InterventionService = {
  /**
   * Get the instant "Stay Calm" message.
   * @param {string} riskReason The reason code from RiskEngine
   * @returns {Object} { title, message, action }
   */
  getIntervention: (riskReason) => {
    if (riskReason && riskReason.includes('Volatility')) {
      return INTERVENTION_TEMPLATES.high_volatility;
    }
    if (riskReason && riskReason.includes('Drop')) {
      return INTERVENTION_TEMPLATES.crash;
    }

    return INTERVENTION_TEMPLATES.default;
  },
};
