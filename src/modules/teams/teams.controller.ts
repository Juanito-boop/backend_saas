import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { TeamsService, type ManageableTeamRole } from './teams.service';

type CreateTeamBody = {
  name?: string;
  plan?: string;
  urlLimit?: number;
  userLimit?: number;
};

type InviteUserBody = {
  userEmail?: string;
};

type UpdateMemberRoleBody = {
  role?: string;
};

@Controller('api/teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) { }

  @Post()
  async createTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateTeamBody,
  ) {
    if (!body.name) {
      throw new BadRequestException('name is required');
    }

    return this.teamsService.createTeam(user.id, {
      name: body.name,
      plan: body.plan,
      urlLimit: body.urlLimit,
      userLimit: body.userLimit,
    });
  }

  @Post(':teamId/members')
  async inviteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Body() body: InviteUserBody,
  ) {
    if (!body.userEmail) {
      throw new BadRequestException('userEmail is required');
    }

    return this.teamsService.inviteUser(user.id, {
      teamId,
      userEmail: body.userEmail,
    });
  }

  @Get()
  async listTeams(@CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.listTeamsForUser(user.id);
  }

  @Get(':teamId/members')
  async listMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
  ) {
    return this.teamsService.listMembers(user.id, teamId);
  }

  @Delete(':teamId/members/:memberUserId')
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Param('memberUserId', new ParseUUIDPipe()) memberUserId: string,
  ) {
    return this.teamsService.removeMember(user.id, {
      teamId,
      memberUserId,
    });
  }

  @Patch(':teamId/members/:memberUserId/role')
  async updateMemberRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Param('memberUserId', new ParseUUIDPipe()) memberUserId: string,
    @Body() body: UpdateMemberRoleBody,
  ) {
    if (body.role !== 'admin' && body.role !== 'member') {
      throw new BadRequestException('role must be either admin or member');
    }

    return this.teamsService.updateMemberRole(user.id, {
      teamId,
      memberUserId,
      role: body.role as ManageableTeamRole,
    });
  }
}