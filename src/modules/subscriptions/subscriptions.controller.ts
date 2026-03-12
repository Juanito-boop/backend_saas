import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../../lib/auth-session';
import {
  createSubscriptionBodySchema,
  type CreateSubscriptionBody,
  type SubscriptionLifecycleEventBody,
  subscriptionLifecycleEventBodySchema,
  type UpdateSubscriptionStatusBody,
  updateSubscriptionStatusBodySchema,
} from './domain/subscription.schemas';
import { SubscriptionsService } from './subscriptions.service';

@Controller('api/teams/:teamId/subscription')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  async createSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Body(new ZodValidationPipe(createSubscriptionBodySchema))
    body: CreateSubscriptionBody,
  ) {
    return this.subscriptionsService.createSubscription(user.id, {
      teamId,
      provider: body.provider,
      providerSubscriptionId: body.providerSubscriptionId,
      status: body.status,
      currentPeriodEnd: body.currentPeriodEnd,
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
    @Body(new ZodValidationPipe(updateSubscriptionStatusBodySchema))
    body: UpdateSubscriptionStatusBody,
  ) {
    return this.subscriptionsService.updateSubscriptionStatus(user.id, {
      teamId,
      status: body.status,
      currentPeriodEnd: body.currentPeriodEnd,
    });
  }

  @Post('events')
  async emitLifecycleEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Body(new ZodValidationPipe(subscriptionLifecycleEventBodySchema))
    body: SubscriptionLifecycleEventBody,
  ) {
    return this.subscriptionsService.emitLifecycleEvent(user.id, {
      teamId,
      eventType: body.eventType,
      provider: body.provider,
      providerSubscriptionId: body.providerSubscriptionId,
      status: body.status,
      currentPeriodEnd: body.currentPeriodEnd,
      invoiceId: body.invoiceId,
      invoiceUrl: body.invoiceUrl,
      paymentReference: body.paymentReference,
      amount: body.amount,
      currency: body.currency,
      metadata: body.metadata,
    });
  }
}
