import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../lib/auth-session';
import {
  createTeamBodySchema,
  inviteUserBodySchema,
  type CreateTeamBody,
  type InviteUserBody,
  type UpdateMemberRoleBody,
  updateMemberRoleBodySchema,
} from './domain/team.schemas';
import { TeamsService, type ManageableTeamRole } from './teams.service';

@Controller('api/teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) { }

  @Post()
  async createTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTeamBodySchema)) body: CreateTeamBody,
  ) {
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
    @Body(new ZodValidationPipe(inviteUserBodySchema)) body: InviteUserBody,
  ) {
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
    @Body(new ZodValidationPipe(updateMemberRoleBodySchema)) body: UpdateMemberRoleBody,
  ) {
    return this.teamsService.updateMemberRole(user.id, {
      teamId,
      memberUserId,
      role: body.role as ManageableTeamRole,
    });
  }
}