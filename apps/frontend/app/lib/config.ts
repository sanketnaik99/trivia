export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
};

export type ApiConfig = typeof API_CONFIG;
