import { Inject, Module, OnApplicationShutdown, Provider } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { JobsOptions } from 'bullmq';

import { getBullMqConnection } from './redis';

export const SCRAPE_QUEUE_NAME = 'scrape-jobs';
export const SCRAPE_JOB_NAME = 'scrape-product';
export const SCRAPE_QUEUE = Symbol('SCRAPE_QUEUE');

export type ScrapeJobData = {
  scrapeJobId?: string;
  productId: string;
  domainId: string;
};

export function createScrapeQueue() {
  return new Queue<ScrapeJobData>(SCRAPE_QUEUE_NAME, {
    connection: getBullMqConnection(),
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1_000,
      },
    },
  });
}

export type ScrapeQueue = ReturnType<typeof createScrapeQueue>;

export const scrapeQueueProvider: Provider = {
  provide: SCRAPE_QUEUE,
  useFactory: () => createScrapeQueue(),
};

@Module({
  providers: [scrapeQueueProvider],
  exports: [scrapeQueueProvider],
})
export class QueueModule implements OnApplicationShutdown {
  constructor(@Inject(SCRAPE_QUEUE) private readonly scrapeQueue: ScrapeQueue) { }

  async onApplicationShutdown() {
    await this.scrapeQueue.close();
  }
}

export async function enqueueScrapeJob(
  queue: ScrapeQueue,
  data: ScrapeJobData,
  options?: JobsOptions,
) {
  return queue.add(SCRAPE_JOB_NAME, data, options);
}