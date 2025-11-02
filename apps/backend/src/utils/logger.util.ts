export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    const out = { level: 'info', message, ...(meta || {}), timestamp: new Date().toISOString() };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(out));
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    const out = { level: 'warn', message, ...(meta || {}), timestamp: new Date().toISOString() };
    // eslint-disable-next-line no-console
    console.warn(JSON.stringify(out));
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    const out = { level: 'error', message, ...(meta || {}), timestamp: new Date().toISOString() };
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(out));
  },
};
