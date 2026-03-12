import { z } from 'zod';

export const notificationRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  metadata: z.unknown(),
  createdAt: z.date(),
});

export const notificationRecordListSchema = z.array(notificationRecordSchema);

export const createNotificationInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1),
  metadata: z.unknown().optional(),
});

export type NotificationRecord = z.infer<typeof notificationRecordSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;