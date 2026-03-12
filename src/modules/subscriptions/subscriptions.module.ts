import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { TeamsModule } from '../teams/teams.module';
import { SUBSCRIPTIONS_REPOSITORY } from './application/subscriptions.repository';
import { SubscriptionsController } from './subscriptions.controller';
import { DrizzleSubscriptionsRepository } from './infrastructure/drizzle-subscriptions.repository';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [TeamsModule, NotificationsModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    DrizzleSubscriptionsRepository,
    {
      provide: SUBSCRIPTIONS_REPOSITORY,
      useExisting: DrizzleSubscriptionsRepository,
    },
  ],
})
export class SubscriptionsModule {}
