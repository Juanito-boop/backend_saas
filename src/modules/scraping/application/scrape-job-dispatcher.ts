import type { QueueDispatchResult } from '../domain/scraping.schemas';

export const SCRAPE_JOB_DISPATCHER = Symbol('SCRAPE_JOB_DISPATCHER');

export type ScheduleScrapeJobInput = {
  scrapeJobId: string;
  productId: string;
  domainId: string;
};

export interface ScrapeJobDispatcher {
  dispatch(input: ScheduleScrapeJobInput): Promise<QueueDispatchResult>;
}
