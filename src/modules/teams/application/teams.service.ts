import { Inject, Injectable } from '@nestjs/common';

import { parseSchema } from '../../../common/zod/parse';
import { InternalError } from '../../../common/errors/application-error';
import {
  assertCanManageMembers,
  assertMemberCanBeRemovedOrChanged,
  assertMembershipDoesNotExist,
  assertMembershipExists,
  assertTeamExists,
  assertUserExists,
  assertWithinTeamUserLimit,
  normalizeTeamName,
  normalizeUserEmail,
  validateTeamLimits,
} from '../domain/team-policies';
import type {
  CreateTeamBody,
  InviteUserBody,
  InvitedTeamMember,
  RemoveMemberResult,
  TeamMemberSummary,
  TeamMembership,
  TeamRecord,
  TeamSummary,
  UpdateMemberRoleBody,
} from '../domain/team.schemas';
import {
  invitedTeamMemberSchema,
  removeMemberResultSchema,
  teamMemberSummaryListSchema,
  teamMembershipSchema,
  teamRecordSchema,
  teamSummaryListSchema,
} from '../domain/team.schemas';
import { type TeamMembershipReader } from './team-membership-reader';
import {
  TEAMS_REPOSITORY,
  type TeamsRepository,
} from './teams.repository';

export type CreateTeamInput = CreateTeamBody;

export type InviteUserInput = {
  teamId: string;
} & InviteUserBody;

export type UpdateMemberRoleInput = {
  teamId: string;
  memberUserId: string;
} & UpdateMemberRoleBody;

export type RemoveMemberInput = {
  teamId: string;
  memberUserId: string;
};

@Injectable()
export class TeamsService implements TeamMembershipReader {
  constructor(
    @Inject(TEAMS_REPOSITORY)
    private readonly teamsRepository: TeamsRepository,
  ) { }

  async createTeam(ownerId: string, input: CreateTeamInput): Promise<TeamRecord> {
    const name = normalizeTeamName(input.name);
    validateTeamLimits(input);

    const createdTeam = await this.teamsRepository.createTeam({
      ownerId,
      name,
      plan: input.plan,
      urlLimit: input.urlLimit,
      userLimit: input.userLimit,
    });

    try {
      await this.teamsRepository.createMembership(createdTeam.id, ownerId, 'owner');
    } catch (error) {
      await this.teamsRepository.deleteTeam(createdTeam.id);

      throw new InternalError('Failed to create owner membership', {
        cause: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return parseSchema(teamRecordSchema, createdTeam, 'TeamsService.createTeam');
  }

  async inviteUser(actorUserId: string, input: InviteUserInput): Promise<InvitedTeamMember> {
    const membership = await this.getMembershipOrThrow(input.teamId, actorUserId);
    assertCanManageMembers(membership.role);

    const normalizedEmail = normalizeUserEmail(input.userEmail);
    const targetUser = assertUserExists(
      await this.teamsRepository.findUserByEmail(normalizedEmail),
    );

    assertMembershipDoesNotExist(
      await this.teamsRepository.findMembership(input.teamId, targetUser.id),
    );

    const team = await this.getTeamOrThrow(input.teamId);
    const currentMembers = await this.teamsRepository.countMembers(input.teamId);
    assertWithinTeamUserLimit(currentMembers, team.userLimit);

    const newMembership = await this.teamsRepository.createMembership(
      input.teamId,
      targetUser.id,
      'member',
    );

    return parseSchema(invitedTeamMemberSchema, {
      ...newMembership,
      user: targetUser,
    }, 'TeamsService.inviteUser');
  }

  async listTeamsForUser(userId: string): Promise<TeamSummary[]> {
    const teams = await this.teamsRepository.listTeamsForUser(userId);
    return parseSchema(teamSummaryListSchema, teams, 'TeamsService.listTeamsForUser');
  }

  async listMembers(actorUserId: string, teamId: string): Promise<TeamMemberSummary[]> {
    await this.getMembershipOrThrow(teamId, actorUserId);
    const members = await this.teamsRepository.listMembers(teamId);
    return parseSchema(teamMemberSummaryListSchema, members, 'TeamsService.listMembers');
  }

  async removeMember(actorUserId: string, input: RemoveMemberInput): Promise<RemoveMemberResult> {
    const actorMembership = await this.getMembershipOrThrow(input.teamId, actorUserId);
    assertCanManageMembers(actorMembership.role);

    const targetMembership = await this.getMembershipOrThrow(input.teamId, input.memberUserId);
    assertMemberCanBeRemovedOrChanged(targetMembership);

    await this.teamsRepository.removeMembership(input.teamId, input.memberUserId);

    return parseSchema(removeMemberResultSchema, { success: true }, 'TeamsService.removeMember');
  }

  async updateMemberRole(actorUserId: string, input: UpdateMemberRoleInput): Promise<TeamMembership> {
    const actorMembership = await this.getMembershipOrThrow(input.teamId, actorUserId);
    assertCanManageMembers(actorMembership.role);

    const targetMembership = await this.getMembershipOrThrow(input.teamId, input.memberUserId);
    assertMemberCanBeRemovedOrChanged(targetMembership);

    const updatedMembership = await this.teamsRepository.updateMembershipRole(
      input.teamId,
      input.memberUserId,
      input.role,
    );

    return parseSchema(teamMembershipSchema, updatedMembership, 'TeamsService.updateMemberRole');
  }

  async getMembershipOrThrow(teamId: string, userId: string): Promise<TeamMembership> {
    const membership = assertMembershipExists(
      await this.teamsRepository.findMembership(teamId, userId),
    );

    return parseSchema(teamMembershipSchema, membership, 'TeamsService.getMembershipOrThrow');
  }

  async getTeamOrThrow(teamId: string): Promise<TeamRecord> {
    const team = assertTeamExists(await this.teamsRepository.findTeamById(teamId));
    return parseSchema(teamRecordSchema, team, 'TeamsService.getTeamOrThrow');
  }
}