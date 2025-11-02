import express from 'express';
import { registerRoomRoutes } from './room.routes';
import { registerHealthRoutes } from './health.routes';

export function registerRoutes(app: express.Express) {
  registerHealthRoutes(app);
  registerRoomRoutes(app);
}

export default { registerRoutes };
