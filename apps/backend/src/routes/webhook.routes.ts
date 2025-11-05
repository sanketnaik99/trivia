import { Router } from 'express';
import { Webhook } from 'svix';
import prisma from '../config/prisma';

const router = Router();

router.post('/clerk', async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing Svix headers');
    return res.status(400).json({ error: 'Missing webhook headers' });
  }

  const body = JSON.stringify(req.body);
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const { type, data } = evt as { type: string; data: any };

  try {
    switch (type) {
      case 'user.created':
      case 'user.updated':
        await prisma.user.upsert({
          where: { id: data.id },
          update: {
            email: data.email_addresses?.[0]?.email_address || '',
            displayName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.username || 'User',
            avatarUrl: data.image_url || null,
          },
          create: {
            id: data.id,
            email: data.email_addresses?.[0]?.email_address || '',
            displayName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.username || 'User',
            avatarUrl: data.image_url || null,
          },
        });
        console.log(`User ${type}: ${data.id}`);
        break;

      case 'user.deleted':
        await prisma.user.delete({ where: { id: data.id } }).catch(() => {
          console.log(`User ${data.id} not found for deletion`);
        });
        console.log(`User deleted: ${data.id}`);
        break;

      default:
        console.log(`Unhandled webhook event: ${type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;