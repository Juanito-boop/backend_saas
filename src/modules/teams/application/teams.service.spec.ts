import {
  ConflictError,
  ForbiddenError,
  InternalError,
} from '../../../common/errors/application-error';
import type {
  TeamMembership,
  TeamRecord,
  TeamUser,
} from '../domain/team.schemas';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  const actorUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const memberUserId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const teamId = '11111111-1111-4111-8111-111111111111';
  const createdAt = new Date('2026-03-11T10:00:00.000Z');

  const ownerMembership: TeamMembership = {
    id: '22222222-2222-4222-8222-222222222222',
    teamId,
    userId: actorUserId,
    role: 'owner',
  };

  const memberMembership: TeamMembership = {
    id: '33333333-3333-4333-8333-333333333333',
    teamId,
    userId: memberUserId,
    role: 'member',
  };

  const teamRecord: TeamRecord = {
    id: teamId,
    name: 'Alpha Team',
    ownerId: actorUserId,
    plan: 'starter',
    urlLimit: 20,
    userLimit: 3,
    createdAt,
  };

  const teamUser: TeamUser = {
    id: memberUserId,
    email: 'member@example.com',
  };

  const createService = () => {
    const teamsRepository = {
      createTeam: jest.fn(),
      deleteTeam: jest.fn(),
      findTeamById: jest.fn(),
      createMembership: jest.fn(),
      findMembership: jest.fn(),
      countMembers: jest.fn(),
      findUserByEmail: jest.fn(),
      listTeamsForUser: jest.fn(),
      listMembers: jest.fn(),
      removeMembership: jest.fn(),
      updateMembershipRole: jest.fn(),
    };

    return {
      service: new TeamsService(teamsRepository),
      teamsRepository,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a team with a normalized name and owner membership', async () => {
    const { service, teamsRepository } = createService();

    teamsRepository.createTeam.mockResolvedValueOnce(teamRecord);
    teamsRepository.createMembership.mockResolvedValueOnce(ownerMembership);

    const result = await service.createTeam(actorUserId, {
      name: '  Alpha Team  ',
      plan: 'starter',
      urlLimit: 20,
      userLimit: 3,
    });

    expect(teamsRepository.createTeam).toHaveBeenCalledWith({
      ownerId: actorUserId,
      name: 'Alpha Team',
      plan: 'starter',
      urlLimit: 20,
      userLimit: 3,
    });
    expect(teamsRepository.createMembership).toHaveBeenCalledWith(
      teamId,
      actorUserId,
      'owner',
    );
    expect(result).toEqual(teamRecord);
  });

  it('rolls back team creation when owner membership creation fails', async () => {
    const { service, teamsRepository } = createService();

    teamsRepository.createTeam.mockResolvedValueOnce(teamRecord);
    teamsRepository.createMembership.mockRejectedValueOnce(
      new Error('membership insert failed'),
    );

    await expect(
      service.createTeam(actorUserId, {
        name: 'Alpha Team',
        plan: 'starter',
        urlLimit: 20,
        userLimit: 3,
      }),
    ).rejects.toThrow(InternalError);
    expect(teamsRepository.deleteTeam).toHaveBeenCalledWith(teamId);
  });

  it('invites a user after normalizing the email and validating limits', async () => {
    const { service, teamsRepository } = createService();

    teamsRepository.findMembership
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce(null);
    teamsRepository.findUserByEmail.mockResolvedValueOnce(teamUser);
    teamsRepository.findTeamById.mockResolvedValueOnce(teamRecord);
    teamsRepository.countMembers.mockResolvedValueOnce(2);
    teamsRepository.createMembership.mockResolvedValueOnce(memberMembership);

    const result = await service.inviteUser(actorUserId, {
      teamId,
      userEmail: '  MEMBER@EXAMPLE.COM  ',
    });

    expect(teamsRepository.findUserByEmail).toHaveBeenCalledWith(
      'member@example.com',
    );
    expect(teamsRepository.createMembership).toHaveBeenCalledWith(
      teamId,
      memberUserId,
      'member',
    );
    expect(result).toEqual({
      ...memberMembership,
      user: teamUser,
    });
  });

  it('rejects inviting a user that is already a team member', async () => {
    const { service, teamsRepository } = createService();

    teamsRepository.findMembership
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce(memberMembership);
    teamsRepository.findUserByEmail.mockResolvedValueOnce(teamUser);

    await expect(
      service.inviteUser(actorUserId, {
        teamId,
        userEmail: teamUser.email,
      }),
    ).rejects.toThrow(ConflictError);
    expect(teamsRepository.createMembership).not.toHaveBeenCalled();
  });

  it('rejects removing the owner membership', async () => {
    const { service, teamsRepository } = createService();

    teamsRepository.findMembership
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce({
        ...ownerMembership,
        userId: memberUserId,
      });

    await expect(
      service.removeMember(actorUserId, {
        teamId,
        memberUserId,
      }),
    ).rejects.toThrow(ForbiddenError);
    expect(teamsRepository.removeMembership).not.toHaveBeenCalled();
  });

  it('updates a member role when the actor can manage members', async () => {
    const { service, teamsRepository } = createService();

    teamsRepository.findMembership
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce(memberMembership);
    teamsRepository.updateMembershipRole.mockResolvedValueOnce({
      ...memberMembership,
      role: 'admin',
    });

    const result = await service.updateMemberRole(actorUserId, {
      teamId,
      memberUserId,
      role: 'admin',
    });

    expect(teamsRepository.updateMembershipRole).toHaveBeenCalledWith(
      teamId,
      memberUserId,
      'admin',
    );
    expect(result).toEqual({
      ...memberMembership,
      role: 'admin',
    });
  });
});
