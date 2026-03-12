import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';

import { ApplicationErrorFilter } from './common/filters/application-error.filter';
import { AuthSessionGuard, VerifiedEmailGuard } from './lib/auth-session';
import { DatabaseModule } from './db/database.module';
import { QueueModule } from './lib/queues';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProductsModule } from './modules/products/products.module';
import { ScrapingModule } from './modules/scraping/scraping.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TeamsModule } from './modules/teams/teams.module';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [
    DatabaseModule,
    QueueModule,
    TeamsModule,
    SubscriptionsModule,
    ProductsModule,
    ScrapingModule,
    NotificationsModule,
  ],
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
    {
      provide: APP_FILTER,
      useClass: ApplicationErrorFilter,
    },
  ],
})
export class AppModule { }
