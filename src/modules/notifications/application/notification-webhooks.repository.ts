import type {
  NotificationEventType,
  NotificationWebhookDeliveryRecord,
  NotificationWebhookRecord,
} from '../domain/notification-webhook.schemas';

export const NOTIFICATION_WEBHOOKS_REPOSITORY = Symbol('NOTIFICATION_WEBHOOKS_REPOSITORY');

export type CreateNotificationWebhookRecordInput = {
  teamId: string;
  name: string;
  provider: NotificationWebhookRecord['provider'];
  url: string;
  eventTypes?: NotificationEventType[];
  enabled?: boolean;
  createdBy: string;
};

export type UpdateNotificationWebhookRecordInput = {
  name?: string;
  url?: string;
  eventTypes?: NotificationEventType[];
  enabled?: boolean;
};

export type CreateNotificationWebhookDeliveryRecordInput = {
  webhookId: string;
  teamId: string;
  notificationId?: string;
  eventType: NotificationEventType;
  success: boolean;
  statusCode?: number;
  requestBody?: unknown;
  responseBody?: string;
  error?: string;
};

export interface NotificationWebhooksRepository {
  listForTeam(teamId: string): Promise<NotificationWebhookRecord[]>;
  listActiveForTeam(teamId: string): Promise<NotificationWebhookRecord[]>;
  findById(teamId: string, webhookId: string): Promise<NotificationWebhookRecord | null>;
  create(input: CreateNotificationWebhookRecordInput): Promise<NotificationWebhookRecord>;
  update(teamId: string, webhookId: string, input: UpdateNotificationWebhookRecordInput): Promise<NotificationWebhookRecord | null>;
  delete(teamId: string, webhookId: string): Promise<void>;
  recordDelivery(input: CreateNotificationWebhookDeliveryRecordInput): Promise<NotificationWebhookDeliveryRecord>;
  markSuccess(webhookId: string, deliveredAt: Date): Promise<void>;
  markFailure(webhookId: string, error: string): Promise<void>;
}