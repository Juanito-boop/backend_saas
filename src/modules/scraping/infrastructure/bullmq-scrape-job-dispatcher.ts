import { Inject, Injectable } from '@nestjs/common';

import {
  SCRAPE_QUEUE,
  SCRAPE_QUEUE_NAME,
  SCRAPE_JOB_NAME,
  type ScrapeQueue,
} from '../../../lib/queues';
import { parseSchema } from '../../../common/zod/parse';
import type {
  ScheduleScrapeJobInput,
  ScrapeJobDispatcher,
} from '../application/scrape-job-dispatcher';
import { queueDispatchResultSchema } from '../domain/scraping.schemas';

@Injectable()
export class BullMqScrapeJobDispatcher implements ScrapeJobDispatcher {
  constructor(@Inject(SCRAPE_QUEUE) private readonly scrapeQueue: ScrapeQueue) { }

  async dispatch(input: ScheduleScrapeJobInput) {
    const job = await this.scrapeQueue.add(SCRAPE_JOB_NAME, {
      scrapeJobId: input.scrapeJobId,
      productId: input.productId,
      domainId: input.domainId,
    });

    return parseSchema(queueDispatchResultSchema, {
      queueJobId: job.id,
      queueName: SCRAPE_QUEUE_NAME,
      queueJobName: job.name,
    }, 'BullMqScrapeJobDispatcher.dispatch');
  }
}