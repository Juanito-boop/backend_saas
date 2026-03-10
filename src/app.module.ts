import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { QueueModule } from './lib/queues';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TeamsModule } from './modules/teams/teams.module';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [DatabaseModule, QueueModule, TeamsModule, SubscriptionsModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class AppModule { }
