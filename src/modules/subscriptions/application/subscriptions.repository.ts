import type { SubscriptionRecord } from '../domain/subscription.types';

export const SUBSCRIPTIONS_REPOSITORY = Symbol('SUBSCRIPTIONS_REPOSITORY');

export type CreateSubscriptionRecordInput = {
  teamId: string;
  provider: string;
  providerSubscriptionId?: string;
  status: string;
  currentPeriodEnd?: Date;
};

export type UpdateSubscriptionRecordInput = {
  status: string;
  currentPeriodEnd?: Date;
};

export interface SubscriptionsRepository {
  createSubscription(input: CreateSubscriptionRecordInput): Promise<SubscriptionRecord>;
  findLatestByTeamId(teamId: string): Promise<SubscriptionRecord | null>;
  updateSubscription(
    subscriptionId: string,
    input: UpdateSubscriptionRecordInput,
  ): Promise<SubscriptionRecord>;
}