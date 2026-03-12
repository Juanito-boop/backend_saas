import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { parseOptionalSchema, parseSchema } from '../../../common/zod/parse';
import { DatabaseService } from '../../../db/database.service';
import { teamMembers, teams, users } from '../../../db/schema';
import type { TeamsRepository } from '../application/teams.repository';
import type {
  ManageableTeamRole,
  TeamMemberSummary,
  TeamMembership,
  TeamRecord,
  TeamSummary,
  TeamUser,
} from '../domain/team.types';
import {
  teamMemberSummaryListSchema,
  teamMembershipSchema,
  teamRecordSchema,
  teamSummaryListSchema,
  teamUserSchema,
} from '../domain/team.schemas';

@Injectable()
export class DrizzleTeamsRepository implements TeamsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async createTeam(input: {
    ownerId: string;
    name: string;
    plan?: string;
    urlLimit?: number;
    userLimit?: number;
  }): Promise<TeamRecord> {
    const [createdTeam] = await this.databaseService.db
      .insert(teams)
      .values({
        name: input.name,
        ownerId: input.ownerId,
        plan: input.plan,
        urlLimit: input.urlLimit,
        userLimit: input.userLimit,
      })
      .returning();

    return parseSchema(
      teamRecordSchema,
      createdTeam,
      'DrizzleTeamsRepository.createTeam',
    );
  }

  async deleteTeam(teamId: string) {
    await this.databaseService.db.delete(teams).where(eq(teams.id, teamId));
  }

  async findTeamById(teamId: string): Promise<TeamRecord | null> {
    const [team] = await this.databaseService.db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    return parseOptionalSchema(
      teamRecordSchema,
      team,
      'DrizzleTeamsRepository.findTeamById',
    );
  }

  async createMembership(
    teamId: string,
    userId: string,
    role: TeamMembership['role'],
  ): Promise<TeamMembership> {
    const [membership] = await this.databaseService.db
      .insert(teamMembers)
      .values({
        teamId,
        userId,
        role,
      })
      .returning({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
      });

    return parseSchema(
      teamMembershipSchema,
      membership,
      'DrizzleTeamsRepository.createMembership',
    );
  }

  async findMembership(
    teamId: string,
    userId: string,
  ): Promise<TeamMembership | null> {
    const [membership] = await this.databaseService.db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
      )
      .limit(1);

    return parseOptionalSchema(
      teamMembershipSchema,
      membership,
      'DrizzleTeamsRepository.findMembership',
    );
  }

  async countMembers(teamId: string) {
    const memberships = await this.databaseService.db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    return memberships.length;
  }

  async findUserByEmail(email: string): Promise<TeamUser | null> {
    const [user] = await this.databaseService.db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return parseOptionalSchema(
      teamUserSchema,
      user,
      'DrizzleTeamsRepository.findUserByEmail',
    );
  }

  async listTeamsForUser(userId: string): Promise<TeamSummary[]> {
    const teamSummaries = await this.databaseService.db
      .select({
        teamId: teams.id,
        name: teams.name,
        ownerId: teams.ownerId,
        plan: teams.plan,
        urlLimit: teams.urlLimit,
        userLimit: teams.userLimit,
        createdAt: teams.createdAt,
        membershipRole: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));

    return parseSchema(
      teamSummaryListSchema,
      teamSummaries,
      'DrizzleTeamsRepository.listTeamsForUser',
    );
  }

  async listMembers(teamId: string): Promise<TeamMemberSummary[]> {
    const members = await this.databaseService.db
      .select({
        userId: users.id,
        email: users.email,
        globalRole: users.role,
        teamRole: teamMembers.role,
        joinedAt: teamMembers.createdAt,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    return parseSchema(
      teamMemberSummaryListSchema,
      members,
      'DrizzleTeamsRepository.listMembers',
    );
  }

  async removeMembership(teamId: string, userId: string) {
    await this.databaseService.db
      .delete(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
      );
  }

  async updateMembershipRole(
    teamId: string,
    userId: string,
    role: ManageableTeamRole,
  ): Promise<TeamMembership> {
    const [membership] = await this.databaseService.db
      .update(teamMembers)
      .set({ role })
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
      )
      .returning({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
      });

    return parseSchema(
      teamMembershipSchema,
      membership,
      'DrizzleTeamsRepository.updateMembershipRole',
    );
  }
}
