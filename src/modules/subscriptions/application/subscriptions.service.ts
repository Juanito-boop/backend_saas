import { Inject, Injectable } from '@nestjs/common';

import { parseSchema } from '../../../common/zod/parse';
import {
  ConflictError,
  NotFoundError,
} from '../../../common/errors/application-error';
import { NotificationsService } from '../../notifications/notifications.service';
import { assertOwnerRole } from '../../teams/domain/team-policies';
import {
  TEAM_MEMBERSHIP_READER,
  type TeamMembershipReader,
} from '../../teams/application/team-membership-reader';
import { TeamsService } from '../../teams/teams.service';
import {
  SUBSCRIPTIONS_REPOSITORY,
  type SubscriptionsRepository,
} from './subscriptions.repository';
import type {
  CreateSubscriptionBody,
  SubscriptionRecord,
  SubscriptionLifecycleEventBody,
  SubscriptionLifecycleEventResult,
  UpdateSubscriptionStatusBody,
} from '../domain/subscription.schemas';
import {
  subscriptionLifecycleEventResultSchema,
  subscriptionRecordSchema,
} from '../domain/subscription.schemas';

export type CreateSubscriptionInput = {
  teamId: string;
} & CreateSubscriptionBody;

export type UpdateSubscriptionStatusInput = {
  teamId: string;
} & UpdateSubscriptionStatusBody;

export type EmitSubscriptionLifecycleEventInput = {
  teamId: string;
} & SubscriptionLifecycleEventBody;

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(SUBSCRIPTIONS_REPOSITORY)
    private readonly subscriptionsRepository: SubscriptionsRepository,
    @Inject(TEAM_MEMBERSHIP_READER)
    private readonly teamMembershipReader: TeamMembershipReader,
    private readonly teamsService: TeamsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createSubscription(
    actorUserId: string,
    input: CreateSubscriptionInput,
  ): Promise<SubscriptionRecord> {
    await this.assertOwner(actorUserId, input.teamId);

    const existingSubscription =
      await this.subscriptionsRepository.findLatestByTeamId(input.teamId);

    if (existingSubscription) {
      throw new ConflictError('A subscription already exists for this team');
    }

    const subscription =
      await this.subscriptionsRepository.createSubscription(input);
    return parseSchema(
      subscriptionRecordSchema,
      subscription,
      'SubscriptionsService.createSubscription',
    );
  }

  async getSubscription(
    actorUserId: string,
    teamId: string,
  ): Promise<SubscriptionRecord> {
    await this.assertOwner(actorUserId, teamId);

    const subscription =
      await this.subscriptionsRepository.findLatestByTeamId(teamId);

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    return parseSchema(
      subscriptionRecordSchema,
      subscription,
      'SubscriptionsService.getSubscription',
    );
  }

  async updateSubscriptionStatus(
    actorUserId: string,
    input: UpdateSubscriptionStatusInput,
  ): Promise<SubscriptionRecord> {
    await this.assertOwner(actorUserId, input.teamId);

    const subscription = await this.subscriptionsRepository.findLatestByTeamId(
      input.teamId,
    );

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const updatedSubscription =
      await this.subscriptionsRepository.updateSubscription(subscription.id, {
        status: input.status,
        currentPeriodEnd: input.currentPeriodEnd,
      });

    return parseSchema(
      subscriptionRecordSchema,
      updatedSubscription,
      'SubscriptionsService.updateSubscriptionStatus',
    );
  }

  async emitLifecycleEvent(
    actorUserId: string,
    input: EmitSubscriptionLifecycleEventInput,
  ): Promise<SubscriptionLifecycleEventResult> {
    await this.assertOwner(actorUserId, input.teamId);
    return this.emitLifecycleEventInternal(input);
  }

  async emitLifecycleEventInternal(
    input: EmitSubscriptionLifecycleEventInput,
  ): Promise<SubscriptionLifecycleEventResult> {
    const subscription = await this.subscriptionsRepository.findLatestByTeamId(
      input.teamId,
    );

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const team = await this.teamsService.getTeamOrThrow(input.teamId);
    const nextStatus = this.resolveNextStatus(input, subscription.status);
    const nextPeriodEnd =
      input.currentPeriodEnd ?? subscription.currentPeriodEnd ?? undefined;

    const updatedSubscription =
      await this.subscriptionsRepository.updateSubscription(subscription.id, {
        status: nextStatus,
        currentPeriodEnd: nextPeriodEnd,
      });

    const content = this.buildNotificationContent(updatedSubscription, input);
    const notification = await this.notificationsService.createTeamNotification(
      {
        teamId: input.teamId,
        userId: team.ownerId,
        title: content.title,
        message: content.message,
        metadata: {
          subscriptionId: updatedSubscription.id,
          provider: input.provider ?? updatedSubscription.provider,
          providerSubscriptionId:
            input.providerSubscriptionId ??
            updatedSubscription.providerSubscriptionId,
          invoiceId: input.invoiceId,
          invoiceUrl: input.invoiceUrl,
          paymentReference: input.paymentReference,
          amount: input.amount,
          currency: input.currency,
          currentPeriodEnd:
            updatedSubscription.currentPeriodEnd?.toISOString() ?? null,
          lifecycleEvent: input.eventType,
          ...input.metadata,
        },
      },
    );

    return parseSchema(
      subscriptionLifecycleEventResultSchema,
      {
        subscription: updatedSubscription,
        notificationId: notification.id,
        title: notification.title,
        message: notification.message,
      },
      'SubscriptionsService.emitLifecycleEvent',
    );
  }

  private resolveNextStatus(
    input: EmitSubscriptionLifecycleEventInput,
    currentStatus: string,
  ) {
    if (input.status) {
      return input.status;
    }

    if (input.eventType === 'renewed') {
      return 'active';
    }

    if (input.eventType === 'expired') {
      return 'expired';
    }

    return currentStatus;
  }

  private buildNotificationContent(
    subscription: SubscriptionRecord,
    input: EmitSubscriptionLifecycleEventInput,
  ) {
    const formattedDate = subscription.currentPeriodEnd
      ? new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'UTC',
        }).format(subscription.currentPeriodEnd)
      : null;

    const providerLabel = input.provider ?? subscription.provider;
    const invoiceLabel = input.invoiceId
      ? ` Invoice ${input.invoiceId} is attached in metadata.`
      : '';
    const invoiceUrlLabel = input.invoiceUrl
      ? ' The invoice URL is included in the notification metadata.'
      : '';
    const paymentReferenceLabel = input.paymentReference
      ? ` Payment reference: ${input.paymentReference}.`
      : '';

    if (input.eventType === 'renewed') {
      return {
        title: 'Subscription renewed',
        message: formattedDate
          ? `The team subscription was renewed successfully through ${providerLabel} and is now active until ${formattedDate} UTC.${paymentReferenceLabel}${invoiceLabel}${invoiceUrlLabel}`
          : `The team subscription was renewed successfully through ${providerLabel}.${paymentReferenceLabel}${invoiceLabel}${invoiceUrlLabel}`,
      };
    }

    if (input.eventType === 'expired') {
      return {
        title: 'Subscription expired',
        message: formattedDate
          ? `The team subscription expired at ${formattedDate} UTC. Renew it to restore paid access.`
          : 'The team subscription expired. Renew it to restore paid access.',
      };
    }

    return {
      title: 'Subscription expiring soon',
      message: formattedDate
        ? `The team subscription will expire on ${formattedDate} UTC. Renew it to avoid service interruption.`
        : 'The team subscription is close to expiring. Renew it to avoid service interruption.',
    };
  }

  private async assertOwner(actorUserId: string, teamId: string) {
    const membership = await this.teamMembershipReader.getMembershipOrThrow(
      teamId,
      actorUserId,
    );
    assertOwnerRole(membership);
  }
}
