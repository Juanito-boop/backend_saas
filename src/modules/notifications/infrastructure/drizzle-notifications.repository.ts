import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { parseOptionalSchema, parseSchema } from '../../../common/zod/parse';
import { DatabaseService } from '../../../db/database.service';
import { notifications } from '../../../db/schema';
import type {
  CreateNotificationRecordInput,
  NotificationsRepository,
} from '../application/notifications.repository';
import type { NotificationRecord } from '../domain/notification.types';
import {
  notificationRecordListSchema,
  notificationRecordSchema,
} from '../domain/notification.schemas';

@Injectable()
export class DrizzleNotificationsRepository implements NotificationsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async createNotification(
    input: CreateNotificationRecordInput,
  ): Promise<NotificationRecord> {
    const [notification] = await this.databaseService.db
      .insert(notifications)
      .values({
        userId: input.userId,
        title: input.title,
        message: input.message,
        metadata: input.metadata,
      })
      .returning();

    return parseSchema(
      notificationRecordSchema,
      notification,
      'DrizzleNotificationsRepository.createNotification',
    );
  }

  async listNotificationsForUser(
    userId: string,
  ): Promise<NotificationRecord[]> {
    const userNotifications = await this.databaseService.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    return parseSchema(
      notificationRecordListSchema,
      userNotifications,
      'DrizzleNotificationsRepository.listNotificationsForUser',
    );
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationRecord | null> {
    const [notification] = await this.databaseService.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      )
      .returning();

    return parseOptionalSchema(
      notificationRecordSchema,
      notification,
      'DrizzleNotificationsRepository.markAsRead',
    );
  }
}
