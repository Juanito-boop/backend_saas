import { Inject, Injectable } from '@nestjs/common';

import { parseSchema } from '../../../common/zod/parse';
import { NotFoundError } from '../../../common/errors/application-error';
import {
  TEAM_MEMBERSHIP_READER,
  type TeamMembershipReader,
} from '../../teams/application/team-membership-reader';
import { assertCanManageMembers } from '../../teams/domain/team-policies';
import type { NotificationRecord } from '../domain/notification.schemas';
import {
  createNotificationWebhookBodySchema,
  dispatchWebhookResultListSchema,
  notificationWebhookRecordListSchema,
  notificationWebhookRecordSchema,
  type CreateNotificationWebhookBody,
  type DispatchWebhookResult,
  type NotificationEventType,
  type NotificationWebhookRecord,
  type UpdateNotificationWebhookBody,
  updateNotificationWebhookBodySchema,
} from '../domain/notification-webhook.schemas';
import {
  NOTIFICATION_WEBHOOK_DELIVERY_SERVICE,
  type NotificationWebhookDeliveryService,
} from './notification-webhooks-delivery.service';
import {
  NOTIFICATION_WEBHOOKS_REPOSITORY,
  type NotificationWebhooksRepository,
} from './notification-webhooks.repository';

@Injectable()
export class NotificationWebhooksService {
  constructor(
    @Inject(NOTIFICATION_WEBHOOKS_REPOSITORY)
    private readonly notificationWebhooksRepository: NotificationWebhooksRepository,
    @Inject(NOTIFICATION_WEBHOOK_DELIVERY_SERVICE)
    private readonly notificationWebhookDeliveryService: NotificationWebhookDeliveryService,
    @Inject(TEAM_MEMBERSHIP_READER)
    private readonly teamMembershipReader: TeamMembershipReader,
  ) { }

  async listWebhooks(
    actorUserId: string,
    teamId: string,
  ): Promise<NotificationWebhookRecord[]> {
    await this.assertCanManageWebhooks(actorUserId, teamId);
    const webhooks =
      await this.notificationWebhooksRepository.listForTeam(teamId);
    return parseSchema(
      notificationWebhookRecordListSchema,
      webhooks,
      'NotificationWebhooksService.listWebhooks',
    );
  }

  async createWebhook(
    actorUserId: string,
    teamId: string,
    body: CreateNotificationWebhookBody,
  ): Promise<NotificationWebhookRecord> {
    await this.assertCanManageWebhooks(actorUserId, teamId);
    const input = parseSchema(
      createNotificationWebhookBodySchema,
      body,
      'NotificationWebhooksService.createWebhook.input',
    );
    const webhook = await this.notificationWebhooksRepository.create({
      teamId,
      name: input.name,
      provider: input.provider,
      url: input.url,
      eventTypes: input.eventTypes,
      enabled: input.enabled,
      createdBy: actorUserId,
    });

    return parseSchema(
      notificationWebhookRecordSchema,
      webhook,
      'NotificationWebhooksService.createWebhook',
    );
  }

  async updateWebhook(
    actorUserId: string,
    teamId: string,
    webhookId: string,
    body: UpdateNotificationWebhookBody,
  ): Promise<NotificationWebhookRecord> {
    await this.assertCanManageWebhooks(actorUserId, teamId);
    const input = parseSchema(
      updateNotificationWebhookBodySchema,
      body,
      'NotificationWebhooksService.updateWebhook.input',
    );
    const webhook = await this.notificationWebhooksRepository.update(
      teamId,
      webhookId,
      input,
    );

    if (!webhook) {
      throw new NotFoundError('Notification webhook not found');
    }

    return parseSchema(
      notificationWebhookRecordSchema,
      webhook,
      'NotificationWebhooksService.updateWebhook',
    );
  }

  async deleteWebhook(actorUserId: string, teamId: string, webhookId: string) {
    await this.assertCanManageWebhooks(actorUserId, teamId);
    const webhook = await this.notificationWebhooksRepository.findById(
      teamId,
      webhookId,
    );

    if (!webhook) {
      throw new NotFoundError('Notification webhook not found');
    }

    await this.notificationWebhooksRepository.delete(teamId, webhookId);

    return { success: true as const };
  }

  async sendTest(
    actorUserId: string,
    teamId: string,
    webhookId: string,
  ): Promise<DispatchWebhookResult> {
    await this.assertCanManageWebhooks(actorUserId, teamId);
    const webhook = await this.notificationWebhooksRepository.findById(
      teamId,
      webhookId,
    );

    if (!webhook) {
      throw new NotFoundError('Notification webhook not found');
    }

    return this.notificationWebhookDeliveryService.dispatchToWebhook({
      webhook,
      teamId,
      eventType: 'notification.test',
      title: 'Webhook test',
      message:
        'This is a test notification sent from the backend integration module.',
      metadata: {
        triggeredBy: actorUserId,
        source: 'manual-test',
      },
    });
  }

  async dispatchTeamEvent(input: {
    teamId: string;
    eventType: NotificationEventType;
    title: string;
    message: string;
    metadata?: unknown;
    notification?: NotificationRecord;
  }) {
    const webhooks =
      await this.notificationWebhooksRepository.listActiveForTeam(input.teamId);

    if (webhooks.length === 0) {
      return [] satisfies DispatchWebhookResult[];
    }

    const results = await Promise.all(
      webhooks
        .filter(
          (webhook) =>
            !webhook.eventTypes || webhook.eventTypes.includes(input.eventType),
        )
        .map((webhook) =>
          this.notificationWebhookDeliveryService.dispatchToWebhook({
            webhook,
            teamId: input.teamId,
            eventType: input.eventType,
            title: input.title,
            message: input.message,
            metadata: input.metadata,
            notification: input.notification,
          }),
        ),
    );

    return parseSchema(
      dispatchWebhookResultListSchema,
      results,
      'NotificationWebhooksService.dispatchTeamEvent',
    );
  }

  private async assertCanManageWebhooks(actorUserId: string, teamId: string) {
    const membership = await this.teamMembershipReader.getMembershipOrThrow(
      teamId,
      actorUserId,
    );
    assertCanManageMembers(membership.role);
  }
}
