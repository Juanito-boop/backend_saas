import 'dotenv/config';

import { Worker } from 'bullmq';

import {
  SCRAPE_JOB_NAME,
  SCRAPE_QUEUE_NAME,
  type ScrapeJobData,
} from '../lib/queues';
import { getBullMqConnection } from '../lib/redis';

const worker = new Worker<ScrapeJobData>(
  SCRAPE_QUEUE_NAME,
  async (job) => {
    const { productId, domainId } = job.data;

    console.log(
      `[scrape-worker] processing ${job.name} job ${job.id} for productId=${productId} domainId=${domainId}`,
    );

    return {
      completedAt: new Date().toISOString(),
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
    `[scrape-worker] completed ${job.name} job ${job.id} for productId=${job.data.productId} domainId=${job.data.domainId}`,
  );
});

worker.on('failed', (job, error) => {
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