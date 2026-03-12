import { Module } from '@nestjs/common';

import { QueueModule } from '../../lib/queues';
import { TeamsModule } from '../teams/teams.module';
import { SCRAPE_JOB_DISPATCHER } from './application/scrape-job-dispatcher';
import { SCRAPING_REPOSITORY } from './application/scraping.repository';
import { ScrapingController } from './scraping.controller';
import { BullMqScrapeJobDispatcher } from './infrastructure/bullmq-scrape-job-dispatcher';
import { DrizzleScrapingRepository } from './infrastructure/drizzle-scraping.repository';
import { ScrapingService } from './scraping.service';

@Module({
  imports: [TeamsModule, QueueModule],
  controllers: [ScrapingController],
  providers: [
    ScrapingService,
    DrizzleScrapingRepository,
    BullMqScrapeJobDispatcher,
    {
      provide: SCRAPING_REPOSITORY,
      useExisting: DrizzleScrapingRepository,
    },
    {
      provide: SCRAPE_JOB_DISPATCHER,
      useExisting: BullMqScrapeJobDispatcher,
    },
  ],
})
export class ScrapingModule { }