import {
  ConflictError,
  NotFoundError,
} from '../../../common/errors/application-error';
import type {
  TeamMembership,
  TeamRecord,
} from '../../teams/domain/team.schemas';
import type { SubscriptionRecord } from '../domain/subscription.schemas';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  const actorUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const teamId = '11111111-1111-4111-8111-111111111111';
  const subscriptionId = '22222222-2222-4222-8222-222222222222';
  const ownerMembership: TeamMembership = {
    id: '33333333-3333-4333-8333-333333333333',
    teamId,
    userId: actorUserId,
    role: 'owner',
  };
  const teamRecord: TeamRecord = {
    id: teamId,
    name: 'Alpha Team',
    ownerId: actorUserId,
    plan: 'starter',
    urlLimit: 20,
    userLimit: 3,
    createdAt: new Date('2026-03-11T10:00:00.000Z'),
  };
  const subscriptionRecord: SubscriptionRecord = {
    id: subscriptionId,
    teamId,
    provider: 'stripe',
    providerSubscriptionId: 'sub_123',
    status: 'active',
    currentPeriodEnd: new Date('2026-04-11T10:00:00.000Z'),
    createdAt: new Date('2026-03-11T10:00:00.000Z'),
  };

  const createService = () => {
    const subscriptionsRepository = {
      createSubscription: jest.fn(),
      findLatestByTeamId: jest.fn(),
      updateSubscription: jest.fn(),
    };
    const teamMembershipReader = {
      getMembershipOrThrow: jest.fn(),
    };
    const teamsService = {
      getTeamOrThrow: jest.fn(),
    };
    const notificationsService = {
      createTeamNotification: jest.fn(),
    };

    return {
      service: new SubscriptionsService(
        subscriptionsRepository,
        teamMembershipReader,
        teamsService as never,
        notificationsService as never,
      ),
      subscriptionsRepository,
      teamMembershipReader,
      teamsService,
      notificationsService,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a subscription when the team has none', async () => {
    const { service, subscriptionsRepository, teamMembershipReader } =
      createService();

    teamMembershipReader.getMembershipOrThrow.mockResolvedValueOnce(
      ownerMembership,
    );
    subscriptionsRepository.findLatestByTeamId.mockResolvedValueOnce(null);
    subscriptionsRepository.createSubscription.mockResolvedValueOnce(
      subscriptionRecord,
    );

    const result = await service.createSubscription(actorUserId, {
      teamId,
      provider: 'stripe',
      providerSubscriptionId: 'sub_123',
      status: 'active',
      currentPeriodEnd: subscriptionRecord.currentPeriodEnd ?? undefined,
    });

    expect(teamMembershipReader.getMembershipOrThrow).toHaveBeenCalledWith(
      teamId,
      actorUserId,
    );
    expect(subscriptionsRepository.createSubscription).toHaveBeenCalledWith({
      teamId,
      provider: 'stripe',
      providerSubscriptionId: 'sub_123',
      status: 'active',
      currentPeriodEnd: subscriptionRecord.currentPeriodEnd,
    });
    expect(result).toEqual(subscriptionRecord);
  });

  it('rejects creating a second subscription for the same team', async () => {
    const { service, subscriptionsRepository, teamMembershipReader } =
      createService();

    teamMembershipReader.getMembershipOrThrow.mockResolvedValueOnce(
      ownerMembership,
    );
    subscriptionsRepository.findLatestByTeamId.mockResolvedValueOnce(
      subscriptionRecord,
    );

    await expect(
      service.createSubscription(actorUserId, {
        teamId,
        provider: 'stripe',
        providerSubscriptionId: 'sub_123',
        status: 'active',
      }),
    ).rejects.toThrow(ConflictError);
    expect(subscriptionsRepository.createSubscription).not.toHaveBeenCalled();
  });

  it('fails when requesting a missing subscription', async () => {
    const { service, subscriptionsRepository, teamMembershipReader } =
      createService();

    teamMembershipReader.getMembershipOrThrow.mockResolvedValueOnce(
      ownerMembership,
    );
    subscriptionsRepository.findLatestByTeamId.mockResolvedValueOnce(null);

    await expect(service.getSubscription(actorUserId, teamId)).rejects.toThrow(
      NotFoundError,
    );
  });

  it('updates subscription status for the team owner', async () => {
    const { service, subscriptionsRepository, teamMembershipReader } =
      createService();
    const updatedRecord: SubscriptionRecord = {
      ...subscriptionRecord,
      status: 'past_due',
    };

    teamMembershipReader.getMembershipOrThrow.mockResolvedValueOnce(
      ownerMembership,
    );
    subscriptionsRepository.findLatestByTeamId.mockResolvedValueOnce(
      subscriptionRecord,
    );
    subscriptionsRepository.updateSubscription.mockResolvedValueOnce(
      updatedRecord,
    );

    const result = await service.updateSubscriptionStatus(actorUserId, {
      teamId,
      status: 'past_due',
    });

    expect(subscriptionsRepository.updateSubscription).toHaveBeenCalledWith(
      subscriptionId,
      {
        status: 'past_due',
        currentPeriodEnd: undefined,
      },
    );
    expect(result).toEqual(updatedRecord);
  });

  it('emits a renewal event and creates a team notification', async () => {
    const {
      service,
      subscriptionsRepository,
      teamsService,
      notificationsService,
    } = createService();
    const renewedPeriodEnd = new Date('2026-05-11T10:00:00.000Z');
    const renewedRecord: SubscriptionRecord = {
      ...subscriptionRecord,
      currentPeriodEnd: renewedPeriodEnd,
    };

    subscriptionsRepository.findLatestByTeamId.mockResolvedValueOnce(
      subscriptionRecord,
    );
    teamsService.getTeamOrThrow.mockResolvedValueOnce(teamRecord);
    subscriptionsRepository.updateSubscription.mockResolvedValueOnce(
      renewedRecord,
    );
    notificationsService.createTeamNotification.mockResolvedValueOnce({
      id: '44444444-4444-4444-8444-444444444444',
      title: 'Subscription renewed',
      message: 'renewed',
    });

    await expect(
      service.emitLifecycleEventInternal({
        teamId,
        eventType: 'renewed',
        provider: 'stripe',
        providerSubscriptionId: 'sub_123',
        currentPeriodEnd: renewedPeriodEnd,
        paymentReference: 'pay_123',
      }),
    ).resolves.toEqual({
      subscription: renewedRecord,
      notificationId: '44444444-4444-4444-8444-444444444444',
      title: 'Subscription renewed',
      message: 'renewed',
    });

    expect(subscriptionsRepository.updateSubscription).toHaveBeenCalledWith(
      subscriptionId,
      {
        status: 'active',
        currentPeriodEnd: renewedPeriodEnd,
      },
    );
    const [notificationInput] = notificationsService.createTeamNotification.mock
      .calls[0] as [
      {
        teamId: string;
        userId: string;
        title: string;
        metadata: Record<string, unknown>;
      },
    ];

    expect(notificationInput.teamId).toBe(teamId);
    expect(notificationInput.userId).toBe(actorUserId);
    expect(notificationInput.title).toBe('Subscription renewed');
    expect(notificationInput.metadata).toMatchObject({
      subscriptionId,
      provider: 'stripe',
      providerSubscriptionId: 'sub_123',
      paymentReference: 'pay_123',
      lifecycleEvent: 'renewed',
      currentPeriodEnd: renewedPeriodEnd.toISOString(),
    });
  });
});
