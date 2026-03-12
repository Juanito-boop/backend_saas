import 'dotenv/config';

import { Worker } from 'bullmq';

import {
  SCRAPE_JOB_NAME,
  SCRAPE_QUEUE_NAME,
  type ScrapeJobData,
} from '../lib/queues';
import {
  markScrapeJobCompleted,
  markScrapeJobFailed,
  markScrapeJobStarted,
} from '../modules/scraping/infrastructure/scrape-storage';
import { getBullMqConnection } from '../lib/redis';

const workerId = `scrape-worker-${process.pid}`;

const worker = new Worker<ScrapeJobData>(
  SCRAPE_QUEUE_NAME,
  async (job) => {
    const { scrapeJobId, productId, domainId } = job.data;

    if (scrapeJobId) {
      await markScrapeJobStarted(scrapeJobId, workerId);
    }

    console.log(
      `[scrape-worker] processing ${job.name} job ${job.id} for scrapeJobId=${scrapeJobId ?? 'n/a'} productId=${productId} domainId=${domainId}`,
    );

    if (scrapeJobId) {
      await markScrapeJobCompleted(scrapeJobId, workerId);
    }

    return {
      completedAt: new Date().toISOString(),
      scrapeJobId,
      productId,
      domainId,
    };
  },
  {
    connection: getBullMqConnection(),
    concurrency: 5,
  },
);

worker.on('ready', () => {
  console.log(`[scrape-worker] listening on queue ${SCRAPE_QUEUE_NAME}`);
});

worker.on('completed', (job) => {
  console.log(
    `[scrape-worker] completed ${job.name} job ${job.id} for scrapeJobId=${job.data.scrapeJobId ?? 'n/a'} productId=${job.data.productId} domainId=${job.data.domainId}`,
  );
});

worker.on('failed', (job, error) => {
  if (job?.data.scrapeJobId) {
    void markScrapeJobFailed(job.data.scrapeJobId, workerId);
  }

  console.error(
    `[scrape-worker] failed ${job?.name ?? SCRAPE_JOB_NAME} job ${job?.id ?? 'unknown'}: ${error.message}`,
  );
});

async function shutdown(signal: string) {
  console.log(`[scrape-worker] received ${signal}, shutting down`);
  await worker.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});