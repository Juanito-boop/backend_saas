import { Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../lib/auth-session';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get()
  async listNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listNotifications(user.id);
  }

  @Patch(':notificationId/read')
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notificationId', new ParseUUIDPipe()) notificationId: string,
  ) {
    return this.notificationsService.markAsRead(user.id, notificationId);
  }
}