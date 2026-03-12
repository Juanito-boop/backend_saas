import { Inject, Injectable } from '@nestjs/common';

import { parseSchema } from '../../../common/zod/parse';
import { NotFoundError } from '../../../common/errors/application-error';
import { NotificationWebhooksService } from '../notification-webhooks.service';
import {
  NOTIFICATIONS_REPOSITORY,
  type NotificationsRepository,
} from './notifications.repository';
import type { CreateNotificationInput, NotificationRecord } from '../domain/notification.schemas';
import { createNotificationInputSchema, notificationRecordListSchema, notificationRecordSchema } from '../domain/notification.schemas';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationWebhooksService: NotificationWebhooksService,
  ) { }

  async createNotification(userId: string, input: CreateNotificationInput): Promise<NotificationRecord> {
    const notificationInput = parseSchema(createNotificationInputSchema, input, 'NotificationsService.createNotification.input');
    const notification = await this.notificationsRepository.createNotification({
      userId,
      title: notificationInput.title,
      message: notificationInput.message,
      metadata: notificationInput.metadata,
    });

    return parseSchema(notificationRecordSchema, notification, 'NotificationsService.createNotification');
  }

  async createTeamNotification(input: {
    teamId: string;
    userId: string;
    title: string;
    message: string;
    metadata?: unknown;
  }): Promise<NotificationRecord> {
    const notification = await this.createNotification(input.userId, {
      title: input.title,
      message: input.message,
      metadata: input.metadata,
    });

    await this.notificationWebhooksService.dispatchTeamEvent({
      teamId: input.teamId,
      eventType: 'notification.created',
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
      notification,
    });

    return notification;
  }

  async listNotifications(userId: string): Promise<NotificationRecord[]> {
    const notifications = await this.notificationsRepository.listNotificationsForUser(userId);
    return parseSchema(notificationRecordListSchema, notifications, 'NotificationsService.listNotifications');
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationRecord> {
    const notification = await this.notificationsRepository.markAsRead(userId, notificationId);

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return parseSchema(notificationRecordSchema, notification, 'NotificationsService.markAsRead');
  }
}