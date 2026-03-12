import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../../lib/auth-session';
import {
  productHistoryQuerySchema,
  scheduleScrapeBodySchema,
  type ProductHistoryQuery,
  type ScheduleScrapeBody,
} from './domain/scraping.schemas';
import { ScrapingService } from './scraping.service';

@Controller('api')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) { }

  @Post('scrape-jobs')
  async scheduleScrape(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(scheduleScrapeBodySchema)) body: ScheduleScrapeBody,
  ) {
    return this.scrapingService.scheduleScrape(user.id, body);
  }

  @Get('products/:productId/scrape-jobs')
  async listProductJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ) {
    return this.scrapingService.listProductJobs(user.id, productId);
  }

  @Get('products/:productId/history')
  async listProductHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Query(new ZodValidationPipe(productHistoryQuerySchema)) query: ProductHistoryQuery,
  ) {
    return this.scrapingService.listProductHistory(user.id, productId, query);
  }
}