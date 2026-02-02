const DEFAULT_LENGTH = 30;
const streams = new Map();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeTick(basePrice, changePct, volumeMultiplier) {
  const open = basePrice;
  const close = basePrice * (1 + changePct / 100);
  const high = Math.max(open, close) * (1 + Math.random() * 0.01);
  const low = Math.min(open, close) * (1 - Math.random() * 0.01);
  const volume = 100 * volumeMultiplier;

  return {
    open: Number(open.toFixed(6)),
    high: Number(high.toFixed(6)),
    low: Number(low.toFixed(6)),
    close: Number(close.toFixed(6)),
    volume: Number(volume.toFixed(2)),
    timestamp: Date.now(),
  };
}

function generateScenario(scenario, length = DEFAULT_LENGTH) {
  let price = 1.0;
  const ticks = [];

  for (let i = 0; i < length; i += 1) {
    let changePct = (Math.random() - 0.5) * 0.4; // normal drift
    let volumeMultiplier = 1;

    if (scenario === 'spike' && i > length * 0.6) {
      changePct = (Math.random() - 0.5) * 2.5;
      volumeMultiplier = 2.2;
    }

    if (scenario === 'drop' && i > length * 0.4) {
      changePct = -clamp(2 + Math.random() * 2, 2, 4);
      volumeMultiplier = 2.5;
    }

    if (scenario === 'pump' && i > length * 0.4) {
      changePct = clamp(2 + Math.random() * 2, 2, 4);
      volumeMultiplier = 2.5;
    }

    const tick = makeTick(price, changePct, volumeMultiplier);
    price = tick.close;
    ticks.push(tick);
  }

  return ticks;
}

function getStream(scenario) {
  if (!streams.has(scenario)) {
    const data = generateScenario(scenario);
    streams.set(scenario, { data, index: 0 });
  }
  return streams.get(scenario);
}

export function getNextTick(scenario = 'normal') {
  const selected = ['normal', 'spike', 'drop', 'pump'].includes(scenario)
    ? scenario
    : 'normal';

  const stream = getStream(selected);
  const tick = stream.data[stream.index];
  stream.index = (stream.index + 1) % stream.data.length;
  return { scenario: selected, tick };
}
