import http from 'http';
import { createApp } from './app';
import { config } from './config/env';
import { Server } from 'socket.io';
import { logger } from './utils/logger.util';
import { registerSocketHandlers } from './socket';

export async function startServer() {
  const app = createApp();
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: config.allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  registerSocketHandlers(io);

  await new Promise<void>((resolve) => {
    httpServer.listen(config.port, () => {
      logger.info('Server started', { port: config.port });
      resolve();
    });
  });

  return { httpServer, io };
}

if (require.main === module) {
  startServer().catch((err) => {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  });
}
