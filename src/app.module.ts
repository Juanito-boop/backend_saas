import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthSessionGuard, VerifiedEmailGuard } from './lib/auth-session';
import { DatabaseModule } from './db/database.module';
import { QueueModule } from './lib/queues';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TeamsModule } from './modules/teams/teams.module';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [DatabaseModule, QueueModule, TeamsModule, SubscriptionsModule],
  controllers: [SystemController],
  providers: [
    SystemService,
    {
      provide: APP_GUARD,
      useClass: AuthSessionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: VerifiedEmailGuard,
    },
  ],
})
export class AppModule { }
