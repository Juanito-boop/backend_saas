import type { TeamMembership } from '../domain/team.types';

export const TEAM_MEMBERSHIP_READER = Symbol('TEAM_MEMBERSHIP_READER');

export interface TeamMembershipReader {
  getMembershipOrThrow(teamId: string, userId: string): Promise<TeamMembership>;
}
