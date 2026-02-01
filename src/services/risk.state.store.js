const states = new Map();

function getKey(sessionId) {
  return sessionId || 'global';
}

export function getLastState(sessionId) {
  const key = getKey(sessionId);
  return states.get(key) || 'NORMAL';
}

export function setLastState(sessionId, state) {
  const key = getKey(sessionId);
  states.set(key, state);
}

export function resetState(sessionId) {
  const key = getKey(sessionId);
  states.delete(key);
}
