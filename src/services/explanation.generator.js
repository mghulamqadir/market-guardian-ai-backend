const SYSTEM_PROMPT_SHORT = `SYSTEM (Market Guardian AI)

Write 2-3 short sentences describing observed market conditions.

Rules:
- No advice, no instructions, no imperatives. Avoid: do, don't, should, recommend, consider, avoid, try, make sure, you might want to, prudent.
- No trading direction words: buy, sell, long, short, entry, exit, position, profit, loss, target, stop-loss, leverage, signal, strategy, hedge, protect, secure, liquidate, close, open. ("closing price" ok.)
- No prediction words: will, going to, likely, unlikely, probably, soon, guarantee, expect, may continue, could lead to, might result.
- No blame, no urgency, no alarm words: immediately, urgent, critical, emergency, warning, danger, beware, caution, alert. ("risk level" ok.)
- No comparisons: better, worse, safer, riskier, more dangerous, less favorable.
- No action-directing phrases: you may notice, be aware that, keep in mind, note that, this means, as a result.
- Past or present tense only. No rhetorical questions or exclamation marks.

Return plain text only.`;

const SYSTEM_PROMPT_FULL = `You are the Market Guardian explainer.

Write one fuller risk explanation for a single alert.

Rules:
- Use clear, plain language. Keep trading jargon light.
- Use 4-8 sentences.
- Explain what changed, why risk is elevated, and what the user should watch next.
- Keep a neutral risk-context tone.
- No buy/sell advice.
- Keep it concise and actionable.
- Return only the explanation text.`;

const LLM_MODEL = 'gpt-4o-mini';
const LLM_MAX_TOKENS_SHORT = 120;
const LLM_MAX_TOKENS_FULL = 320;
const LLM_TIMEOUT_MS = 8000;
const USE_STREAMING = '1';

/**
 * Failsafe response for when LLM fails or API is unavailable
 */
const FAILSAFE_RESPONSE = {
  message: 'Market conditions changed measurably over a recent period. Price movement variance increased compared to previous intervals. This update provides context on current market state.',
  tags: ['GENERAL'],
  confidence: 'LOW',
};

/**
 * Generates a calm, neutral explanation for market risk events.
 *
 * @param {Object} payload - Analysis payload with risk context
 * @param {Function|null} onChunk - Optional streaming callback receiving next text chunk
 * @param {Object} options - Generation options
 * @param {'short'|'full'} options.mode - Output style mode
 * @returns {Promise<Object>} { message, tags, confidence, source, validated }
 */
export async function generateExplanation(payload = {}, onChunk = null, options = {}) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('[explanation.generator] No OpenAI API key configured. Using failsafe response.');
      return {
        ...FAILSAFE_RESPONSE,
        source: 'failsafe',
        validated: true,
      };
    }

    if (!payload || typeof payload !== 'object') {
      console.warn('[explanation.generator] Invalid payload provided.');
      return {
        ...FAILSAFE_RESPONSE,
        source: 'failsafe',
        validated: true,
      };
    }

    const mode = options?.mode === 'full' ? 'full' : 'short';
    console.log('[explanation.generator] Generating explanation via LLM...', { mode });
    const result = await generateExplanationWithLLM(payload, apiKey, onChunk, mode);
    console.log('[explanation.generator] Explanation generated:', result);
    return result;
  } catch (error) {
    console.error('[explanation.generator] Fatal error during generation:', error.message);
    return {
      ...FAILSAFE_RESPONSE,
      source: 'failsafe',
      validated: true,
    };
  }
}

/**
 * LLM-based explanation generation with OpenAI API
 */
async function generateExplanationWithLLM(payload, apiKey, onChunk = null, mode = 'short') {
  try {
    const userPrompt = buildUserPromptFromPayload(payload, mode);
    const systemPrompt = mode === 'full' ? SYSTEM_PROMPT_FULL : SYSTEM_PROMPT_SHORT;

    const controller = new AbortController();
    const timeoutEnabled = Number.isFinite(LLM_TIMEOUT_MS) && LLM_TIMEOUT_MS > 0;
    const timeout = timeoutEnabled
      ? setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)
      : null;

    const useStreaming = USE_STREAMING && typeof onChunk === 'function';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: mode === 'full' ? LLM_MAX_TOKENS_FULL : LLM_MAX_TOKENS_SHORT,
        temperature: mode === 'full' ? 0.4 : 0.3,
        stream: useStreaming,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    }).finally(() => {
      if (timeout) clearTimeout(timeout);
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = await response.json();
        errorMessage = errorData?.error?.message || errorMessage;
      } catch {
        // ignore parse error for non-json responses
      }
      throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`);
    }

    let llmMessage;

    if (useStreaming) {
      llmMessage = await processStreamingResponse(response, onChunk);
    } else {
      const data = await response.json();
      llmMessage = data.choices?.[0]?.message?.content?.trim();
      console.log('[explanation.generator] LLM message in Else:', llmMessage);
    }

    if (!llmMessage) {
      throw new Error('Invalid response format from OpenAI API - no message content');
    }

    const tags = generateTagsFromPayload(payload);
    const confidence = determineConfidenceLevel(payload);
    console.log('[explanation.generator] Tags:', tags);
    console.log('[explanation.generator] Confidence:', confidence);
    console.log('[explanation.generator] LLM generation successful');

    return {
      message: llmMessage,
      tags,
      confidence,
      source: 'llm',
      validated: true,
    };
  } catch (error) {
    console.error('[explanation.generator] LLM generation failed:', error.message);
    console.warn('[explanation.generator] Returning failsafe response');
    return {
      ...FAILSAFE_RESPONSE,
      source: 'failsafe',
      validated: true,
    };
  }
}

/**
 * Process streaming response from OpenAI API.
 * Calls onChunk with incremental text chunks as they arrive.
 */
async function processStreamingResponse(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullMessage = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (!data || data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;

          if (content) {
            fullMessage += content;
            onChunk(content);
          }
        } catch (parseError) {
          console.warn('[explanation.generator] Skipping malformed chunk:', parseError.message);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullMessage.trim();
}

/**
 * Builds user prompt from payload data for LLM context
 */
function buildUserPromptFromPayload(payload, mode = 'short') {
  const {
    market_state,
    riskLevel,
    previousState,
    shortAlertMessage,
    what_happened,
    whatHappened,
    signals = [],
    metrics = {},
    pair,
    timeframe,
    recentCandleBehavior,
    user_context,
  } = payload;

  const normalizedRiskLevel = riskLevel || market_state?.current || market_state;
  const normalizedPreviousState = previousState || market_state?.previous;
  const normalizedWhatHappened = what_happened || whatHappened;

  const parts = [];
  parts.push('Risk context:');

  if (normalizedRiskLevel) {
    parts.push(`- riskLevel: ${normalizedRiskLevel}`);
  }
  if (normalizedPreviousState) {
    parts.push(`- previousState: ${normalizedPreviousState}`);
  }
  if (shortAlertMessage) {
    parts.push(`- shortAlertMessage: ${shortAlertMessage}`);
  }
  if (normalizedWhatHappened) {
    parts.push(`- shortAlertType: ${normalizedWhatHappened}`);
  }

  if (Array.isArray(signals) && signals.length > 0) {
    parts.push(`- signals: ${signals.join('; ')}`);
  }

  const derivedMetrics = {
    volumeRatio: metrics?.volumeRatio,
    rangePercent: metrics?.rangePercent,
    priceChangePercent: metrics?.priceChangePercent ?? metrics?.percentChange,
    trades: metrics?.trades,
    tradeCountRatio: metrics?.tradeCountRatio,
  };

  parts.push(`- metrics: ${JSON.stringify(derivedMetrics)}`);

  if (pair) parts.push(`- pair: ${pair}`);
  if (timeframe) parts.push(`- timeframe: ${timeframe}`);
  if (recentCandleBehavior) parts.push(`- recentCandleBehavior: ${recentCandleBehavior}`);
  if (user_context) parts.push(`- userContext: ${user_context}`);

  if (mode === 'full') {
    parts.push('Write a fuller explanation in 4-8 sentences.');
  } else {
    parts.push('Write 2-3 short neutral sentences about observed conditions only.');
  }

  parts.push('Return only the explanation text.');

  return parts.join('\n');
}

/**
 * Generates tags based on signal types
 */
function generateTagsFromPayload(payload) {
  const tags = new Set();
  const { signals = [] } = payload;

  if (!Array.isArray(signals)) {
    tags.add('GENERAL');
    return Array.from(tags);
  }

  for (const signal of signals) {
    const signalStr = String(signal).toLowerCase();

    if (signalStr.includes('volatility') || signalStr.includes('percent') || signalStr.includes('change')) {
      tags.add('VOLATILITY');
    }
    if (signalStr.includes('volume')) {
      tags.add('VOLUME');
    }
    if (signalStr.includes('range') || signalStr.includes('swing')) {
      tags.add('RANGE');
    }
    if (signalStr.includes('liquidity')) {
      tags.add('LIQUIDITY');
    }
  }

  if (tags.size === 0) {
    tags.add('GENERAL');
  }
  console.log('[explanation.generator] Tags generated:', tags);

  return Array.from(tags);
}

/**
 * Determines confidence level based on signal quality
 */
function determineConfidenceLevel(payload) {
  const { signals = [] } = payload;

  if (!Array.isArray(signals)) {
    return 'LOW';
  }

  // Count numeric signals
  const numericSignals = signals.filter((signal) => {
    if (typeof signal === 'object' && signal?.value !== undefined && signal?.threshold !== undefined) {
      return true;
    }
    return false;
  });

  if (numericSignals.length >= 3) {
    return 'HIGH';
  } else if (numericSignals.length >= 2) {
    return 'MEDIUM';
  }
  console.log('[explanation.generator] Confidence level:', numericSignals);
  return 'LOW';
}

export default {
  generateExplanation,
};
