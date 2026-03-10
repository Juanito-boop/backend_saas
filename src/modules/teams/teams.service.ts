import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../../db/database.service';
import { teamMembers, teams, users } from '../../db/schema';

export type TeamRole = 'owner' | 'admin' | 'member';
export type ManageableTeamRole = Exclude<TeamRole, 'owner'>;

export type CreateTeamInput = {
  name: string;
  plan?: string;
  urlLimit?: number;
  userLimit?: number;
};

export type InviteUserInput = {
  teamId: string;
  userEmail: string;
};

export type UpdateMemberRoleInput = {
  teamId: string;
  memberUserId: string;
  role: ManageableTeamRole;
};

export type RemoveMemberInput = {
  teamId: string;
  memberUserId: string;
};

type TeamMembershipRecord = {
  id: string;
  teamId: string;
  userId: string;
  role: string;
};

@Injectable()
export class TeamsService {
  constructor(private readonly databaseService: DatabaseService) { }

  async createTeam(ownerId: string, input: CreateTeamInput) {
    const name = input.name.trim();

    if (!name) {
      throw new BadRequestException('name is required');
    }

    if (input.userLimit !== undefined && input.userLimit < 1) {
      throw new BadRequestException('userLimit must be at least 1');
    }

    if (input.urlLimit !== undefined && input.urlLimit < 1) {
      throw new BadRequestException('urlLimit must be at least 1');
    }

    const [createdTeam] = await this.databaseService.db
      .insert(teams)
      .values({
        name,
        ownerId,
        plan: input.plan,
        urlLimit: input.urlLimit,
        userLimit: input.userLimit,
      })
      .returning();

    try {
      await this.databaseService.db.insert(teamMembers).values({
        teamId: createdTeam.id,
        userId: ownerId,
        role: 'owner',
      });
    } catch (error) {
      await this.databaseService.db.delete(teams).where(eq(teams.id, createdTeam.id));

      throw new InternalServerErrorException(
        error instanceof Error
          ? `Failed to create owner membership: ${error.message}`
          : 'Failed to create owner membership',
      );
    }

    return createdTeam;
  }

  async inviteUser(actorUserId: string, input: InviteUserInput) {
    const membership = await this.getMembershipOrThrow(input.teamId, actorUserId);
    this.assertCanManageMembers(membership.role);

    const [targetUser] = await this.databaseService.db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.email, input.userEmail.trim().toLowerCase()))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const [existingMembership] = await this.databaseService.db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, input.teamId), eq(teamMembers.userId, targetUser.id)))
      .limit(1);

    if (existingMembership) {
      throw new BadRequestException('User is already a member of this team');
    }

    const team = await this.getTeamOrThrow(input.teamId);
    const currentMembers = await this.databaseService.db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, input.teamId));

    if (currentMembers.length >= team.userLimit) {
      throw new BadRequestException('This team has reached its user limit');
    }

    const [newMembership] = await this.databaseService.db
      .insert(teamMembers)
      .values({
        teamId: input.teamId,
        userId: targetUser.id,
        role: 'member',
      })
      .returning();

    return {
      ...newMembership,
      user: targetUser,
    };
  }

  async listTeamsForUser(userId: string) {
    return this.databaseService.db
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
  }

  async listMembers(actorUserId: string, teamId: string) {
    await this.getMembershipOrThrow(teamId, actorUserId);

    return this.databaseService.db
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
  }

  async removeMember(actorUserId: string, input: RemoveMemberInput) {
    const actorMembership = await this.getMembershipOrThrow(input.teamId, actorUserId);
    this.assertCanManageMembers(actorMembership.role);

    const targetMembership = await this.getMembershipOrThrow(input.teamId, input.memberUserId);

    if (targetMembership.role === 'owner') {
      throw new ForbiddenException('Owner cannot be removed');
    }

    await this.databaseService.db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, input.teamId), eq(teamMembers.userId, input.memberUserId)));

    return { success: true };
  }

  async updateMemberRole(actorUserId: string, input: UpdateMemberRoleInput) {
    const actorMembership = await this.getMembershipOrThrow(input.teamId, actorUserId);
    this.assertCanManageMembers(actorMembership.role);

    const targetMembership = await this.getMembershipOrThrow(input.teamId, input.memberUserId);

    if (targetMembership.role === 'owner') {
      throw new ForbiddenException('Owner role cannot be changed');
    }

    const [updatedMembership] = await this.databaseService.db
      .update(teamMembers)
      .set({ role: input.role })
      .where(and(eq(teamMembers.teamId, input.teamId), eq(teamMembers.userId, input.memberUserId)))
      .returning();

    return updatedMembership;
  }

  async getMembershipOrThrow(teamId: string, userId: string) {
    const [membership] = await this.databaseService.db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .limit(1);

    if (!membership) {
      throw new ForbiddenException('You are not a member of this team');
    }

    return membership satisfies TeamMembershipRecord;
  }

  async getTeamOrThrow(teamId: string) {
    const [team] = await this.databaseService.db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  private assertCanManageMembers(role: string) {
    if (role !== 'owner' && role !== 'admin') {
      throw new ForbiddenException('Only team owner or admin can manage members');
    }
  }
}