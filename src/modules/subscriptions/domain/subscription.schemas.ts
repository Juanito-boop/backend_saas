import { z } from 'zod';

export const subscriptionRecordSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  provider: z.string(),
  providerSubscriptionId: z.string().nullable(),
  status: z.string(),
  currentPeriodEnd: z.date().nullable(),
  createdAt: z.date(),
});

export const createSubscriptionBodySchema = z.object({
  provider: z.string().trim().min(1, 'provider is required').max(30),
  providerSubscriptionId: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1, 'status is required').max(30),
  currentPeriodEnd: z.coerce.date().optional(),
});

export const updateSubscriptionStatusBodySchema = z.object({
  status: z.string().trim().min(1, 'status is required').max(30),
  currentPeriodEnd: z.coerce.date().optional(),
});

export const subscriptionLifecycleEventTypeSchema = z.enum(['expiring_soon', 'expired', 'renewed']);

export const subscriptionLifecycleEventBodySchema = z.object({
  eventType: subscriptionLifecycleEventTypeSchema,
  provider: z.string().trim().min(1).max(30).optional(),
  providerSubscriptionId: z.string().trim().min(1).max(255).optional(),
  status: z.string().trim().min(1).max(30).optional(),
  currentPeriodEnd: z.coerce.date().optional(),
  invoiceId: z.string().trim().min(1).max(120).optional(),
  invoiceUrl: z.url().max(2048).optional(),
  paymentReference: z.string().trim().min(1).max(120).optional(),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const subscriptionLifecycleEventResultSchema = z.object({
  subscription: subscriptionRecordSchema,
  notificationId: z.string().uuid(),
  title: z.string(),
  message: z.string(),
});

export const subscriptionRecordListSchema = z.array(subscriptionRecordSchema);

export type SubscriptionRecord = z.infer<typeof subscriptionRecordSchema>;
export type CreateSubscriptionBody = z.infer<typeof createSubscriptionBodySchema>;
export type UpdateSubscriptionStatusBody = z.infer<typeof updateSubscriptionStatusBodySchema>;
export type SubscriptionLifecycleEventType = z.infer<typeof subscriptionLifecycleEventTypeSchema>;
export type SubscriptionLifecycleEventBody = z.infer<typeof subscriptionLifecycleEventBodySchema>;
export type SubscriptionLifecycleEventResult = z.infer<typeof subscriptionLifecycleEventResultSchema>;