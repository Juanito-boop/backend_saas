import { BadRequestException, Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';

import { Public } from './lib/public';
import { SystemService } from './system.service';

type ScheduleScrapeBody = {
  productId?: string;
  domainId?: string;
};

@Controller('api')
export class SystemController {
  constructor(private readonly systemService: SystemService) { }

  @Public()
  @Get('health/live')
  getLiveness() {
    return this.systemService.getLiveness();
  }

  @Public()
  @Get('health/ready')
  async getReadiness(@Res({ passthrough: true }) response: Response) {
    const report = await this.systemService.getReadiness();

    response.status(report.status === 'ok' ? 200 : 503);

    return report;
  }

  @Public()
  @Get('health')
  async getHealth(@Res({ passthrough: true }) response: Response) {
    const report = await this.systemService.getReadiness();

    response.status(report.status === 'ok' ? 200 : 503);

    return report;
  }

  @Post('scrape-jobs')
  async scheduleScrape(@Body() body: ScheduleScrapeBody) {
    if (!body.productId || !body.domainId) {
      throw new BadRequestException('productId and domainId are required');
    }

    const job = await this.systemService.scheduleScrape(body.productId, body.domainId);

    return {
      jobId: job.id,
      queue: job.queueName,
      name: job.name,
      status: 'queued',
      data: job.data,
    };
  }
}