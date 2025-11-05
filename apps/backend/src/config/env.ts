export const config = {
  port: Number(process.env.PORT || 3001),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  maxRooms: Number(process.env.MAX_ROOMS || 100),
  roomCleanupTimeout: Number(process.env.ROOM_CLEANUP_TIMEOUT || 300000),
  reconnectTimeout: Number(process.env.RECONNECT_TIMEOUT || 30000),
  nodeEnv: process.env.NODE_ENV || 'development',
};

export type Config = typeof config;
