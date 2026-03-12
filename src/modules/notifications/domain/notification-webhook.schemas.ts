import { z } from 'zod';

import { notificationRecordSchema } from './notification.schemas';

export const notificationWebhookProviderSchema = z.enum([
  'generic',
  'slack',
  'discord',
  'teams',
]);

export const notificationEventTypeSchema = z.enum([
  'notification.created',
  'notification.test',
]);

export const notificationWebhookRecordSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  name: z.string(),
  provider: notificationWebhookProviderSchema,
  url: z.string().url(),
  eventTypes: z.array(notificationEventTypeSchema).nullable(),
  enabled: z.boolean(),
  createdBy: z.string().uuid(),
  lastDeliveredAt: z.date().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const notificationWebhookRecordListSchema = z.array(
  notificationWebhookRecordSchema,
);

export const notificationWebhookDeliveryRecordSchema = z.object({
  id: z.string().uuid(),
  webhookId: z.string().uuid(),
  teamId: z.string().uuid(),
  notificationId: z.string().uuid().nullable(),
  eventType: notificationEventTypeSchema,
  success: z.boolean(),
  statusCode: z.number().int().nullable(),
  requestBody: z.unknown().nullable(),
  responseBody: z.string().nullable(),
  error: z.string().nullable(),
  attemptedAt: z.date(),
});

export const createNotificationWebhookBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  provider: notificationWebhookProviderSchema,
  url: z.string().url(),
  eventTypes: z.array(notificationEventTypeSchema).min(1).optional(),
  enabled: z.boolean().optional(),
});

export const updateNotificationWebhookBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    url: z.string().url().optional(),
    eventTypes: z.array(notificationEventTypeSchema).min(1).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const notificationWebhookPayloadSchema = z.object({
  eventType: notificationEventTypeSchema,
  sentAt: z.string(),
  teamId: z.string().uuid(),
  notification: notificationRecordSchema.nullable(),
  webhook: z.object({
    id: z.string().uuid(),
    provider: notificationWebhookProviderSchema,
    name: z.string(),
  }),
  title: z.string(),
  message: z.string(),
  metadata: z.unknown().optional(),
});

export const dispatchWebhookResultSchema = z.object({
  webhook: notificationWebhookRecordSchema,
  delivery: notificationWebhookDeliveryRecordSchema,
});

export const dispatchWebhookResultListSchema = z.array(
  dispatchWebhookResultSchema,
);

export type NotificationWebhookProvider = z.infer<
  typeof notificationWebhookProviderSchema
>;
export type NotificationEventType = z.infer<typeof notificationEventTypeSchema>;
export type NotificationWebhookRecord = z.infer<
  typeof notificationWebhookRecordSchema
>;
export type NotificationWebhookDeliveryRecord = z.infer<
  typeof notificationWebhookDeliveryRecordSchema
>;
export type CreateNotificationWebhookBody = z.infer<
  typeof createNotificationWebhookBodySchema
>;
export type UpdateNotificationWebhookBody = z.infer<
  typeof updateNotificationWebhookBodySchema
>;
export type NotificationWebhookPayload = z.infer<
  typeof notificationWebhookPayloadSchema
>;
export type DispatchWebhookResult = z.infer<typeof dispatchWebhookResultSchema>;
