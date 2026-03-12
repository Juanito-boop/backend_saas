import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { parseOptionalSchema, parseSchema } from '../../../common/zod/parse';
import { DatabaseService } from '../../../db/database.service';
import {
  notificationWebhookDeliveries,
  notificationWebhooks,
} from '../../../db/schema';
import type {
  CreateNotificationWebhookDeliveryRecordInput,
  CreateNotificationWebhookRecordInput,
  NotificationWebhooksRepository,
  UpdateNotificationWebhookRecordInput,
} from '../application/notification-webhooks.repository';
import {
  notificationWebhookDeliveryRecordSchema,
  notificationWebhookRecordListSchema,
  notificationWebhookRecordSchema,
  type NotificationWebhookDeliveryRecord,
  type NotificationWebhookRecord,
} from '../domain/notification-webhook.schemas';

@Injectable()
export class DrizzleNotificationWebhooksRepository implements NotificationWebhooksRepository {
  constructor(private readonly databaseService: DatabaseService) { }

  async listForTeam(teamId: string): Promise<NotificationWebhookRecord[]> {
    const webhooks = await this.databaseService.db
      .select()
      .from(notificationWebhooks)
      .where(eq(notificationWebhooks.teamId, teamId))
      .orderBy(desc(notificationWebhooks.createdAt));

    return parseSchema(
      notificationWebhookRecordListSchema,
      webhooks.map((webhook) => this.normalizeWebhookRecord(webhook)),
      'DrizzleNotificationWebhooksRepository.listForTeam',
    );
  }

  async listActiveForTeam(
    teamId: string,
  ): Promise<NotificationWebhookRecord[]> {
    const webhooks = await this.databaseService.db
      .select()
      .from(notificationWebhooks)
      .where(
        and(
          eq(notificationWebhooks.teamId, teamId),
          eq(notificationWebhooks.enabled, true),
        ),
      )
      .orderBy(desc(notificationWebhooks.createdAt));

    return parseSchema(
      notificationWebhookRecordListSchema,
      webhooks.map((webhook) => this.normalizeWebhookRecord(webhook)),
      'DrizzleNotificationWebhooksRepository.listActiveForTeam',
    );
  }

  async findById(
    teamId: string,
    webhookId: string,
  ): Promise<NotificationWebhookRecord | null> {
    const [webhook] = await this.databaseService.db
      .select()
      .from(notificationWebhooks)
      .where(
        and(
          eq(notificationWebhooks.id, webhookId),
          eq(notificationWebhooks.teamId, teamId),
        ),
      )
      .limit(1);

    return parseOptionalSchema(
      notificationWebhookRecordSchema,
      webhook ? this.normalizeWebhookRecord(webhook) : null,
      'DrizzleNotificationWebhooksRepository.findById',
    );
  }

  async create(
    input: CreateNotificationWebhookRecordInput,
  ): Promise<NotificationWebhookRecord> {
    const [webhook] = await this.databaseService.db
      .insert(notificationWebhooks)
      .values({
        teamId: input.teamId,
        name: input.name,
        provider: input.provider,
        url: input.url,
        eventTypes: input.eventTypes ?? null,
        enabled: input.enabled ?? true,
        createdBy: input.createdBy,
      })
      .returning();

    return parseSchema(
      notificationWebhookRecordSchema,
      this.normalizeWebhookRecord(webhook),
      'DrizzleNotificationWebhooksRepository.create',
    );
  }

  async update(
    teamId: string,
    webhookId: string,
    input: UpdateNotificationWebhookRecordInput,
  ): Promise<NotificationWebhookRecord | null> {
    const [webhook] = await this.databaseService.db
      .update(notificationWebhooks)
      .set({
        name: input.name,
        url: input.url,
        eventTypes: input.eventTypes ?? undefined,
        enabled: input.enabled,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notificationWebhooks.id, webhookId),
          eq(notificationWebhooks.teamId, teamId),
        ),
      )
      .returning();

    return parseOptionalSchema(
      notificationWebhookRecordSchema,
      webhook ? this.normalizeWebhookRecord(webhook) : null,
      'DrizzleNotificationWebhooksRepository.update',
    );
  }

  async delete(teamId: string, webhookId: string) {
    await this.databaseService.db
      .delete(notificationWebhooks)
      .where(
        and(
          eq(notificationWebhooks.id, webhookId),
          eq(notificationWebhooks.teamId, teamId),
        ),
      );
  }

  async recordDelivery(
    input: CreateNotificationWebhookDeliveryRecordInput,
  ): Promise<NotificationWebhookDeliveryRecord> {
    const [delivery] = await this.databaseService.db
      .insert(notificationWebhookDeliveries)
      .values({
        webhookId: input.webhookId,
        teamId: input.teamId,
        notificationId: input.notificationId,
        eventType: input.eventType,
        success: input.success,
        statusCode: input.statusCode,
        requestBody: input.requestBody,
        responseBody: input.responseBody,
        error: input.error,
      })
      .returning();

    return parseSchema(
      notificationWebhookDeliveryRecordSchema,
      delivery,
      'DrizzleNotificationWebhooksRepository.recordDelivery',
    );
  }

  async markSuccess(webhookId: string, deliveredAt: Date) {
    await this.databaseService.db
      .update(notificationWebhooks)
      .set({
        lastDeliveredAt: deliveredAt,
        lastError: null,
        updatedAt: deliveredAt,
      })
      .where(eq(notificationWebhooks.id, webhookId));
  }

  async markFailure(webhookId: string, error: string) {
    await this.databaseService.db
      .update(notificationWebhooks)
      .set({
        lastError: error,
        updatedAt: new Date(),
      })
      .where(eq(notificationWebhooks.id, webhookId));
  }

  private normalizeWebhookRecord(
    record: typeof notificationWebhooks.$inferSelect,
  ) {
    return {
      ...record,
      eventTypes: Array.isArray(record.eventTypes) ? record.eventTypes : null,
    };
  }
}
