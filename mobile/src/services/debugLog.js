const MAX_LOGS = 40;
const logs = [];
const listeners = new Set();

function notify() {
  const snapshot = [...logs];
  listeners.forEach((listener) => listener(snapshot));
}

export function addDebugLog(message, details) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    message,
    details: details || null,
  };

  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.pop();

  if (__DEV__) {
    // Keep logs visible in Metro/console while also surfacing them in-app.
    // eslint-disable-next-line no-console
    console.log('[mobile-debug]', message, details || '');
  }

  notify();
  return entry;
}

export function subscribeDebugLogs(listener) {
  listeners.add(listener);
  listener([...logs]);
  return () => {
    listeners.delete(listener);
  };
}

export function getDebugLogs() {
  return [...logs];
}

