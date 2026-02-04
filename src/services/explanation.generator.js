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

const LLM_MODEL = 'gpt-4o-mini';
const LLM_MAX_TOKENS =100;
const LLM_TIMEOUT_MS =8000;
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
 * Generates a calm, neutral explanation for market risk events
 * Primary production function - attempts LLM first, falls back to safe response
 * 
 * @param {Object} payload - Analysis payload with market_state, signals, user_context
 * @param {Function} onChunk - Optional callback for streaming chunks: (partialText) => void
 * @returns {Promise<Object>} { message, tags, confidence, source, validated }
 */
export async function generateExplanation(payload = {}, onChunk = null) {
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

    console.log('[explanation.generator] Generating explanation via LLM...');
    const result = await generateExplanationWithLLM(payload, apiKey, onChunk);
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
 * Uses system prompt to enforce safety rules at generation time
 * Supports streaming for instant response feedback
 * 
 * @param {Object} payload - Market analysis data
 * @param {string} apiKey - OpenAI API key
 * @param {Function} onChunk - Optional callback for streaming chunks
 * @returns {Promise<Object>} Generated explanation with metadata
 */
async function generateExplanationWithLLM(payload, apiKey, onChunk = null) {
  try {
    const userPrompt = buildUserPromptFromPayload(payload);
    console.log('[explanation.generator] User prompt:', userPrompt);
    // Use shorter prompt by default for faster processing, unless explicitly disabled
    const systemPrompt = SYSTEM_PROMPT_SHORT;

    const controller = new AbortController();
    const timeoutEnabled = Number.isFinite(LLM_TIMEOUT_MS) && LLM_TIMEOUT_MS > 0;
    const timeout = timeoutEnabled
      ? setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)
      : null;

    const useStreaming = USE_STREAMING && typeof onChunk === 'function';
    console.log('[explanation.generator] Use streaming:', useStreaming);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: LLM_MAX_TOKENS,
        temperature: 0.3,
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
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`);
    }

    let llmMessage;

    if (useStreaming) {
      llmMessage = await processStreamingResponse(response, onChunk);
      console.log('[explanation.generator] LLM message in If:', llmMessage);
    } else {
      const data = await response.json();
      llmMessage = data.choices?.[0]?.message?.content?.trim();
      console.log('[explanation.generator] LLM message in Else:', llmMessage);
    }

    if (!llmMessage) {
      throw new Error('Invalid response format from OpenAI API - no message content');
    }

    // Generate metadata based on payload
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
 * Process streaming response from OpenAI API
 * Calls onChunk callback with partial text as it arrives
 * 
 * @param {Response} response - Fetch API response object
 * @param {Function} onChunk - Callback to receive partial text
 * @returns {Promise<string>} Complete message text
 */
async function processStreamingResponse(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullMessage = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // Remove 'data: ' prefix

          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              fullMessage += content;
              // Send partial message to callback immediately
              onChunk(fullMessage);
            }
          } catch (parseError) {
            // Skip malformed JSON chunks
            console.warn('[explanation.generator] Skipping malformed chunk:', parseError.message);
          }
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
function buildUserPromptFromPayload(payload) {
  const {
    market_state,
    what_happened,
    signals = [],
    user_context,
  } = payload;
  console.log('payload', user_context);
  const parts = [];
  parts.push('Data for neutral market status explanation:');

  if (market_state) {
    parts.push(`Current State: ${market_state.current || market_state}`);
    if (market_state.previous) {
      parts.push(`Previous State: ${market_state.previous}`);
    }
  }

  if (what_happened) {
    parts.push(`Event: ${what_happened}`);
  }

  if (signals.length > 0) {
    parts.push(`Signals: ${signals.join(', ')}`);
  }

  parts.push('Write 2-3 short neutral sentences about observed conditions only.');
  console.log('parts', parts);
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
