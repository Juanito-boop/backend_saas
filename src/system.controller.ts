import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

import { Public } from './lib/public';
import { SystemService } from './system.service';

@Controller('api')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

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
}
