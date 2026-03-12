import type {
  ManageableTeamRole,
  TeamMemberSummary,
  TeamMembership,
  TeamRecord,
  TeamSummary,
  TeamUser,
} from '../domain/team.types';

export const TEAMS_REPOSITORY = Symbol('TEAMS_REPOSITORY');

export type CreateTeamRecordInput = {
  ownerId: string;
  name: string;
  plan?: string;
  urlLimit?: number;
  userLimit?: number;
};

export interface TeamsRepository {
  createTeam(input: CreateTeamRecordInput): Promise<TeamRecord>;
  deleteTeam(teamId: string): Promise<void>;
  findTeamById(teamId: string): Promise<TeamRecord | null>;
  createMembership(
    teamId: string,
    userId: string,
    role: TeamMembership['role'],
  ): Promise<TeamMembership>;
  findMembership(
    teamId: string,
    userId: string,
  ): Promise<TeamMembership | null>;
  countMembers(teamId: string): Promise<number>;
  findUserByEmail(email: string): Promise<TeamUser | null>;
  listTeamsForUser(userId: string): Promise<TeamSummary[]>;
  listMembers(teamId: string): Promise<TeamMemberSummary[]>;
  removeMembership(teamId: string, userId: string): Promise<void>;
  updateMembershipRole(
    teamId: string,
    userId: string,
    role: ManageableTeamRole,
  ): Promise<TeamMembership>;
}
