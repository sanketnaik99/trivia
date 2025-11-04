import express from 'express';
import { registerRoomRoutes } from './room.routes';
import { registerHealthRoutes } from './health.routes';
// TODO: Import new route handlers when created
import webhookRoutes from './webhook.routes';
import groupRoutes from './group.routes';
import inviteRoutes from './invite.routes';
import membershipRoutes from './membership.routes';
// import leaderboardRoutes from './leaderboard.routes';
import { registerInternalRoutes } from './internal.routes';

export function registerRoutes(app: express.Express) {
  registerHealthRoutes(app);
  registerRoomRoutes(app);

  // Register new route groups for authentication, groups, and leaderboards
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/invites', inviteRoutes);
  app.use('/api/groups', membershipRoutes); // Membership routes under groups
  // TODO: Uncomment when route handlers are implemented
  // app.use('/api/groups', leaderboardRoutes); // Leaderboard routes under groups
  registerInternalRoutes(app);
}

export default { registerRoutes };
