import type { NotificationRecord } from '../domain/notification.schemas';
import type { DispatchWebhookResult, NotificationEventType, NotificationWebhookRecord } from '../domain/notification-webhook.schemas';

export const NOTIFICATION_WEBHOOK_DELIVERY_SERVICE = Symbol('NOTIFICATION_WEBHOOK_DELIVERY_SERVICE');

export interface NotificationWebhookDeliveryService {
  dispatchToWebhook(input: {
    webhook: NotificationWebhookRecord;
    teamId: string;
    eventType: NotificationEventType;
    title: string;
    message: string;
    metadata?: unknown;
    notification?: NotificationRecord;
  }): Promise<DispatchWebhookResult>;
}