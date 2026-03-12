import { Inject, Injectable } from '@nestjs/common';

import { parseSchema } from '../../../common/zod/parse';
import {
  notificationWebhookPayloadSchema,
  dispatchWebhookResultSchema,
  type DispatchWebhookResult,
  type NotificationWebhookPayload,
} from '../domain/notification-webhook.schemas';
import { NOTIFICATION_WEBHOOKS_REPOSITORY, type NotificationWebhooksRepository } from '../application/notification-webhooks.repository';
import type { NotificationWebhookDeliveryService } from '../application/notification-webhooks-delivery.service';
import type { NotificationRecord } from '../domain/notification.schemas';

@Injectable()
export class HttpNotificationWebhookDeliveryService implements NotificationWebhookDeliveryService {
  constructor(
    @Inject(NOTIFICATION_WEBHOOKS_REPOSITORY)
    private readonly notificationWebhooksRepository: NotificationWebhooksRepository,
  ) { }

  async dispatchToWebhook(input: {
    webhook: DispatchWebhookResult['webhook'];
    teamId: string;
    eventType: 'notification.created' | 'notification.test';
    title: string;
    message: string;
    metadata?: unknown;
    notification?: NotificationRecord;
  }): Promise<DispatchWebhookResult> {
    const sentAt = new Date();
    const canonicalPayload = parseSchema(notificationWebhookPayloadSchema, {
      eventType: input.eventType,
      sentAt: sentAt.toISOString(),
      teamId: input.teamId,
      notification: input.notification ?? null,
      webhook: {
        id: input.webhook.id,
        provider: input.webhook.provider,
        name: input.webhook.name,
      },
      title: input.title,
      message: input.message,
      metadata: input.metadata,
    }, 'HttpNotificationWebhookDeliveryService.payload');

    const providerPayload = this.toProviderPayload(input.webhook.provider, canonicalPayload);
    let success = false;
    let statusCode: number | undefined;
    let responseBody: string | undefined;
    let errorMessage: string | undefined;

    try {
      const response = await fetch(input.webhook.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(providerPayload),
        signal: AbortSignal.timeout(5000),
      });

      statusCode = response.status;
      responseBody = await response.text();
      success = response.ok;
      errorMessage = response.ok ? undefined : `Webhook request failed with status ${response.status}`;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown webhook delivery error';
    }

    const delivery = await this.notificationWebhooksRepository.recordDelivery({
      webhookId: input.webhook.id,
      teamId: input.teamId,
      notificationId: input.notification?.id,
      eventType: input.eventType,
      success,
      statusCode,
      requestBody: providerPayload,
      responseBody,
      error: errorMessage,
    });

    if (success) {
      await this.notificationWebhooksRepository.markSuccess(input.webhook.id, sentAt);
    } else {
      await this.notificationWebhooksRepository.markFailure(input.webhook.id, errorMessage ?? 'Unknown delivery error');
    }

    return parseSchema(dispatchWebhookResultSchema, {
      webhook: input.webhook,
      delivery,
    }, 'HttpNotificationWebhookDeliveryService.dispatchToWebhook');
  }

  private toProviderPayload(provider: DispatchWebhookResult['webhook']['provider'], payload: NotificationWebhookPayload) {
    if (provider === 'slack') {
      return {
        text: `*${payload.title}*\n${payload.message}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${payload.title}*\n${payload.message}`,
            },
          },
        ],
      };
    }

    if (provider === 'discord') {
      return {
        content: `**${payload.title}**\n${payload.message}`,
      };
    }

    if (provider === 'teams') {
      return {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        summary: payload.title,
        themeColor: '0078D4',
        title: payload.title,
        text: payload.message,
      };
    }

    return payload;
  }
}