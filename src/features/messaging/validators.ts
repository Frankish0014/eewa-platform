import { z } from 'zod';

export const openConversationSchema = z.object({
  body: z.object({
    peerUserId: z.string().min(1, 'peerUserId required'),
  }),
});

export const sendMessageSchema = z.object({
  body: z.object({
    body: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
  }),
});

export const listMessagesQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    before: z.string().optional(),
  }),
});
