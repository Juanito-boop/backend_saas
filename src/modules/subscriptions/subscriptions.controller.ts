import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../lib/auth-session';
import { SubscriptionsService } from './subscriptions.service';

type CreateSubscriptionBody = {
  provider?: string;
  providerSubscriptionId?: string;
  status?: string;
  currentPeriodEnd?: string;
};

type UpdateSubscriptionStatusBody = {
  status?: string;
  currentPeriodEnd?: string;
};

@Controller('api/teams/:teamId/subscription')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) { }

  @Post()
  async createSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Body() body: CreateSubscriptionBody,
  ) {
    if (!body.provider || !body.status) {
      throw new BadRequestException('provider and status are required');
    }

    return this.subscriptionsService.createSubscription(user.id, {
      teamId,
      provider: body.provider,
      providerSubscriptionId: body.providerSubscriptionId,
      status: body.status,
      currentPeriodEnd: this.parseOptionalDate(body.currentPeriodEnd, 'currentPeriodEnd'),
    });
  }

  @Get()
  async getSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
  ) {
    return this.subscriptionsService.getSubscription(user.id, teamId);
  }

  @Patch()
  async updateSubscriptionStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Body() body: UpdateSubscriptionStatusBody,
  ) {
    if (!body.status) {
      throw new BadRequestException('status is required');
    }

    return this.subscriptionsService.updateSubscriptionStatus(user.id, {
      teamId,
      status: body.status,
      currentPeriodEnd: this.parseOptionalDate(body.currentPeriodEnd, 'currentPeriodEnd'),
    });
  }

  private parseOptionalDate(value: string | undefined, fieldName: string) {
    if (!value) {
      return undefined;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid ISO date string`);
    }

    return parsedDate;
  }
}