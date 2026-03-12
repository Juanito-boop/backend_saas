import type {
  ProductHistoryPoint,
  ProductHistoryQuery,
  ProductScrapeContext,
  ScrapeJobRecord,
} from '../domain/scraping.schemas';

export const SCRAPING_REPOSITORY = Symbol('SCRAPING_REPOSITORY');

export interface ScrapingRepository {
  findProductContext(productId: string): Promise<ProductScrapeContext | null>;
  createScrapeJob(input: {
    productId: string;
    domainId: string;
    scheduledAt: Date;
  }): Promise<ScrapeJobRecord>;
  listJobsForProduct(productId: string): Promise<ScrapeJobRecord[]>;
  listProductHistory(
    productId: string,
    query: ProductHistoryQuery,
  ): Promise<ProductHistoryPoint[]>;
}
