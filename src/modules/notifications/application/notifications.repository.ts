import type { NotificationRecord } from '../domain/notification.types';

export const NOTIFICATIONS_REPOSITORY = Symbol('NOTIFICATIONS_REPOSITORY');

export type CreateNotificationRecordInput = {
  userId: string;
  title: string;
  message: string;
  metadata?: unknown;
};

export interface NotificationsRepository {
  createNotification(input: CreateNotificationRecordInput): Promise<NotificationRecord>;
  listNotificationsForUser(userId: string): Promise<NotificationRecord[]>;
  markAsRead(userId: string, notificationId: string): Promise<NotificationRecord | null>;
}