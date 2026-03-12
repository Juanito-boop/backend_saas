import { Inject, Injectable } from '@nestjs/common';

import { parseSchema } from '../../../common/zod/parse';
import {
  NotFoundError,
  ValidationError,
} from '../../../common/errors/application-error';
import { TEAM_MEMBERSHIP_READER, type TeamMembershipReader } from '../../teams/application/team-membership-reader';
import {
  SCRAPE_JOB_DISPATCHER,
  type ScrapeJobDispatcher,
} from './scrape-job-dispatcher';
import {
  SCRAPING_REPOSITORY,
  type ScrapingRepository,
} from './scraping.repository';
import type {
  ProductHistoryPoint,
  ProductHistoryQuery,
  ScheduleScrapeBody,
  ScheduleScrapeResult,
  ScrapeJobRecord,
} from '../domain/scraping.schemas';
import {
  productScrapeContextSchema,
  scheduleScrapeResultSchema,
  scrapeJobRecordListSchema,
} from '../domain/scraping.schemas';

export type ScheduleScrapeInput = ScheduleScrapeBody;

@Injectable()
export class ScrapingService {
  constructor(
    @Inject(SCRAPING_REPOSITORY)
    private readonly scrapingRepository: ScrapingRepository,
    @Inject(SCRAPE_JOB_DISPATCHER)
    private readonly scrapeJobDispatcher: ScrapeJobDispatcher,
    @Inject(TEAM_MEMBERSHIP_READER)
    private readonly teamMembershipReader: TeamMembershipReader,
  ) { }

  async scheduleScrape(actorUserId: string, input: ScheduleScrapeInput): Promise<ScheduleScrapeResult> {
    const product = await this.scrapingRepository.findProductContext(input.productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const productContext = parseSchema(productScrapeContextSchema, product, 'ScrapingService.scheduleScrape.productContext');

    await this.teamMembershipReader.getMembershipOrThrow(productContext.teamId, actorUserId);

    if (productContext.domainId !== input.domainId) {
      throw new ValidationError('domainId does not match the product domain');
    }

    const scrapeJob = await this.scrapingRepository.createScrapeJob({
      productId: input.productId,
      domainId: input.domainId,
      scheduledAt: new Date(),
    });

    const queueJob = await this.scrapeJobDispatcher.dispatch({
      scrapeJobId: scrapeJob.id,
      productId: scrapeJob.productId,
      domainId: scrapeJob.domainId,
    });

    return parseSchema(scheduleScrapeResultSchema, {
      jobId: queueJob.queueJobId,
      queue: queueJob.queueName,
      name: queueJob.queueJobName,
      status: 'queued',
      data: {
        scrapeJobId: scrapeJob.id,
        productId: scrapeJob.productId,
        domainId: scrapeJob.domainId,
      },
    }, 'ScrapingService.scheduleScrape');
  }

  async listProductJobs(actorUserId: string, productId: string): Promise<ScrapeJobRecord[]> {
    const product = await this.scrapingRepository.findProductContext(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const productContext = parseSchema(productScrapeContextSchema, product, 'ScrapingService.listProductJobs.productContext');

    await this.teamMembershipReader.getMembershipOrThrow(productContext.teamId, actorUserId);

    const jobs = await this.scrapingRepository.listJobsForProduct(productId);
    return parseSchema(scrapeJobRecordListSchema, jobs, 'ScrapingService.listProductJobs');
  }

  async listProductHistory(
    actorUserId: string,
    productId: string,
    query: ProductHistoryQuery,
  ): Promise<ProductHistoryPoint[]> {
    const product = await this.scrapingRepository.findProductContext(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const productContext = parseSchema(productScrapeContextSchema, product, 'ScrapingService.listProductHistory.productContext');

    await this.teamMembershipReader.getMembershipOrThrow(productContext.teamId, actorUserId);

    return this.scrapingRepository.listProductHistory(productId, query);
  }
}