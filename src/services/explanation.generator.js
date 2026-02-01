export const SYSTEM_PROMPT = `You are Stay Calm AI. You explain market risk in calm, simple, human language.
Rules:
- Be calm, supportive, non-judgmental.
- Use short sentences.
- No technical language or jargon.
- Never say "buy", "sell", "long", or "short".
- Never predict outcomes.
- Never give financial advice.
- Explain context, not decisions.
- Always include user options: wait or continue.`;

export const USER_PROMPT_TEMPLATE = `You are given structured JSON. Write a short explanation.
JSON:
{{payload}}

Output must include:
1) What happened
2) Why it is risky (uncertainty/instability)
3) Options: wait or continue (no advice)`;

const FORBIDDEN_WORDS = ['buy', 'sell', 'long', 'short'];
const JARGON_REPLACEMENTS = new Map([
  ['volatility', 'fast changes'],
  ['liquidity', 'ease of trading'],
  ['momentum', 'speed'],
  ['panic', 'fear'],
  ['capitulation', 'sharp selling'],
]);

function sanitizeText(text) {
  let output = text;

  for (const [word, replacement] of JARGON_REPLACEMENTS.entries()) {
    const pattern = new RegExp(`\\b${word}\\b`, 'gi');
    output = output.replace(pattern, replacement);
  }

  for (const word of FORBIDDEN_WORDS) {
    const pattern = new RegExp(`\\b${word}\\b`, 'gi');
    output = output.replace(pattern, '');
  }

  output = output.replace(/\s{2,}/g, ' ').trim();
  return output;
}

function buildMessage(payload) {
  const { what_happened: whatHappened, user_context: userContext } = payload;
  const normalizedWhat = String(whatHappened || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();

  const contextMap = new Map([
    ['viewing_chart', 'viewing the chart'],
    ['placing_order', 'about to place an order'],
    ['modifying_order', 'modifying an order'],
    ['closing_position', 'about to close a position'],
    ['idle', 'taking a moment'],
  ]);

  const normalizedContext = String(userContext || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
  const contextLine = contextMap.get(normalizedContext) || userContext;

  const lines = [];
  lines.push('The market is moving very fast right now.');

  if (normalizedWhat === 'fast drop' || normalizedWhat === 'fast downward move') {
    lines.push('Prices are falling quickly.');
  } else if (normalizedWhat === 'fast rise' || normalizedWhat === 'fast upward move') {
    lines.push('Prices are rising quickly.');
  } else if (normalizedWhat === 'wide swings') {
    lines.push('Prices are swinging up and down.');
  } else if (normalizedWhat === 'unusual volume' || normalizedWhat === 'volume surge') {
    lines.push('There is unusual activity right now.');
  } else {
    lines.push('Prices are changing faster than usual.');
  }

  lines.push('This usually means higher uncertainty.');
  lines.push('Many people react quickly in moments like this because the market is unstable.');

  if (contextLine) {
    lines.push(`You are ${contextLine}.`);
  }

  lines.push('You can pause to observe, or continue if you feel comfortable.');

  return lines.join(' ');
}

export async function generateExplanation(payload) {
  const message = sanitizeText(buildMessage(payload));

  return {
    message,
    raw: message,
  };
}
