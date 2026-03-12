import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte } from 'drizzle-orm';

import { parseOptionalSchema, parseSchema } from '../../../common/zod/parse';
import { DatabaseService } from '../../../db/database.service';
import { priceHistory, priceHistoryDaily, priceHistoryHourly, products, scrapeJobs } from '../../../db/schema';
import type { ScrapingRepository } from '../application/scraping.repository';
import type {
  ProductHistoryPoint,
  ProductHistoryQuery,
  ProductScrapeContext,
  ScrapeJobRecord,
} from '../domain/scraping.schemas';
import {
  productHistoryPointListSchema,
  productScrapeContextSchema,
  scrapeJobRecordListSchema,
  scrapeJobRecordSchema,
} from '../domain/scraping.schemas';

@Injectable()
export class DrizzleScrapingRepository implements ScrapingRepository {
  constructor(private readonly databaseService: DatabaseService) { }

  async findProductContext(productId: string): Promise<ProductScrapeContext | null> {
    const [product] = await this.databaseService.db
      .select({
        productId: products.id,
        teamId: products.teamId,
        domainId: products.domainId,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    return parseOptionalSchema(productScrapeContextSchema, product, 'DrizzleScrapingRepository.findProductContext');
  }

  async createScrapeJob(input: {
    productId: string;
    domainId: string;
    scheduledAt: Date;
  }): Promise<ScrapeJobRecord> {
    const [scrapeJob] = await this.databaseService.db
      .insert(scrapeJobs)
      .values({
        productId: input.productId,
        domainId: input.domainId,
        scheduledAt: input.scheduledAt,
        status: 'pending',
      })
      .returning();

    return parseSchema(scrapeJobRecordSchema, scrapeJob, 'DrizzleScrapingRepository.createScrapeJob');
  }

  async listJobsForProduct(productId: string): Promise<ScrapeJobRecord[]> {
    const productJobs = await this.databaseService.db
      .select()
      .from(scrapeJobs)
      .where(eq(scrapeJobs.productId, productId))
      .orderBy(desc(scrapeJobs.createdAt));

    return parseSchema(scrapeJobRecordListSchema, productJobs, 'DrizzleScrapingRepository.listJobsForProduct');
  }

  async listProductHistory(productId: string, query: ProductHistoryQuery): Promise<ProductHistoryPoint[]> {
    const filters = [eq(priceHistory.productId, productId)];

    if (query.resolution === 'change') {
      if (query.from) {
        filters.push(gte(priceHistory.checkedAt, query.from));
      }

      if (query.to) {
        filters.push(lte(priceHistory.checkedAt, query.to));
      }

      const points = await this.databaseService.db
        .select({
          checkedAt: priceHistory.checkedAt,
          price: priceHistory.price,
          currency: priceHistory.currency,
        })
        .from(priceHistory)
        .where(and(...filters))
        .orderBy(desc(priceHistory.checkedAt))
        .limit(query.limit);

      return parseSchema(productHistoryPointListSchema, points.map((point) => ({
        resolution: 'change' as const,
        bucketStart: point.checkedAt,
        bucketEnd: null,
        sampleCount: 1,
        successCount: 1,
        failureCount: 0,
        price: point.price,
        firstPrice: point.price,
        minPrice: point.price,
        maxPrice: point.price,
        lastPrice: point.price,
        currency: point.currency,
      })), 'DrizzleScrapingRepository.listProductHistory.change');
    }

    const table = query.resolution === 'hour' ? priceHistoryHourly : priceHistoryDaily;
    const aggregateFilters = [eq(table.productId, productId)];

    if (query.from) {
      aggregateFilters.push(gte(table.bucketStart, query.from));
    }

    if (query.to) {
      aggregateFilters.push(lte(table.bucketStart, query.to));
    }

    const points = await this.databaseService.db
      .select()
      .from(table)
      .where(and(...aggregateFilters))
      .orderBy(desc(table.bucketStart))
      .limit(query.limit);

    return parseSchema(productHistoryPointListSchema, points.map((point) => ({
      resolution: query.resolution,
      bucketStart: point.bucketStart,
      bucketEnd: null,
      sampleCount: point.sampleCount,
      successCount: point.successCount,
      failureCount: point.failureCount,
      price: point.lastPrice,
      firstPrice: point.firstPrice,
      minPrice: point.minPrice,
      maxPrice: point.maxPrice,
      lastPrice: point.lastPrice,
      currency: point.currency,
    })), `DrizzleScrapingRepository.listProductHistory.${query.resolution}`);
  }
}