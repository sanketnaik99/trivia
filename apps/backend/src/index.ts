import { startServer } from './server';

startServer().catch((err) => {
  // startServer handles logging; still print to stderr if it bubbles up
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
