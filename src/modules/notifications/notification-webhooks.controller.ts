import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../../lib/auth-session';
import {
  createNotificationWebhookBodySchema,
  type CreateNotificationWebhookBody,
  type UpdateNotificationWebhookBody,
  updateNotificationWebhookBodySchema,
} from './domain/notification-webhook.schemas';
import { NotificationWebhooksService } from './notification-webhooks.service';

@Controller('api/teams/:teamId/notification-webhooks')
export class NotificationWebhooksController {
  constructor(
    private readonly notificationWebhooksService: NotificationWebhooksService,
  ) {}

  @Get()
  async listWebhooks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
  ) {
    return this.notificationWebhooksService.listWebhooks(user.id, teamId);
  }

  @Post()
  async createWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Body(new ZodValidationPipe(createNotificationWebhookBodySchema))
    body: CreateNotificationWebhookBody,
  ) {
    return this.notificationWebhooksService.createWebhook(
      user.id,
      teamId,
      body,
    );
  }

  @Patch(':webhookId')
  async updateWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Param('webhookId', new ParseUUIDPipe()) webhookId: string,
    @Body(new ZodValidationPipe(updateNotificationWebhookBodySchema))
    body: UpdateNotificationWebhookBody,
  ) {
    return this.notificationWebhooksService.updateWebhook(
      user.id,
      teamId,
      webhookId,
      body,
    );
  }

  @Delete(':webhookId')
  async deleteWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Param('webhookId', new ParseUUIDPipe()) webhookId: string,
  ) {
    return this.notificationWebhooksService.deleteWebhook(
      user.id,
      teamId,
      webhookId,
    );
  }

  @Post(':webhookId/test')
  async sendTest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Param('webhookId', new ParseUUIDPipe()) webhookId: string,
  ) {
    return this.notificationWebhooksService.sendTest(
      user.id,
      teamId,
      webhookId,
    );
  }
}
