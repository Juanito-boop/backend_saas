import { Module } from '@nestjs/common';

import { TeamsModule } from '../teams/teams.module';
import { NOTIFICATION_WEBHOOK_DELIVERY_SERVICE } from './application/notification-webhooks-delivery.service';
import { NOTIFICATION_WEBHOOKS_REPOSITORY } from './application/notification-webhooks.repository';
import { NOTIFICATIONS_REPOSITORY } from './application/notifications.repository';
import { NotificationWebhooksController } from './notification-webhooks.controller';
import { NotificationWebhooksService } from './notification-webhooks.service';
import { DrizzleNotificationWebhooksRepository } from './infrastructure/drizzle-notification-webhooks.repository';
import { NotificationsController } from './notifications.controller';
import { HttpNotificationWebhookDeliveryService } from './infrastructure/http-notification-webhook-delivery.service';
import { DrizzleNotificationsRepository } from './infrastructure/drizzle-notifications.repository';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TeamsModule],
  controllers: [NotificationsController, NotificationWebhooksController],
  providers: [
    NotificationsService,
    NotificationWebhooksService,
    DrizzleNotificationsRepository,
    DrizzleNotificationWebhooksRepository,
    HttpNotificationWebhookDeliveryService,
    {
      provide: NOTIFICATIONS_REPOSITORY,
      useExisting: DrizzleNotificationsRepository,
    },
    {
      provide: NOTIFICATION_WEBHOOKS_REPOSITORY,
      useExisting: DrizzleNotificationWebhooksRepository,
    },
    {
      provide: NOTIFICATION_WEBHOOK_DELIVERY_SERVICE,
      useExisting: HttpNotificationWebhookDeliveryService,
    },
  ],
  exports: [NotificationsService, NotificationWebhooksService],
})
export class NotificationsModule {}
