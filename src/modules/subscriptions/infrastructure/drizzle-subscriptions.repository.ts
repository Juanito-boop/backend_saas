import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { parseOptionalSchema, parseSchema } from '../../../common/zod/parse';
import { DatabaseService } from '../../../db/database.service';
import { subscriptions } from '../../../db/schema';
import type { SubscriptionsRepository } from '../application/subscriptions.repository';
import type { SubscriptionRecord } from '../domain/subscription.types';
import { subscriptionRecordSchema } from '../domain/subscription.schemas';

@Injectable()
export class DrizzleSubscriptionsRepository implements SubscriptionsRepository {
  constructor(private readonly databaseService: DatabaseService) { }

  async createSubscription(input: {
    teamId: string;
    provider: string;
    providerSubscriptionId?: string;
    status: string;
    currentPeriodEnd?: Date;
  }): Promise<SubscriptionRecord> {
    const [subscription] = await this.databaseService.db
      .insert(subscriptions)
      .values({
        teamId: input.teamId,
        provider: input.provider,
        providerSubscriptionId: input.providerSubscriptionId,
        status: input.status,
        currentPeriodEnd: input.currentPeriodEnd,
      })
      .returning();

    return parseSchema(subscriptionRecordSchema, subscription, 'DrizzleSubscriptionsRepository.createSubscription');
  }

  async findLatestByTeamId(teamId: string): Promise<SubscriptionRecord | null> {
    const [subscription] = await this.databaseService.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.teamId, teamId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    return parseOptionalSchema(subscriptionRecordSchema, subscription, 'DrizzleSubscriptionsRepository.findLatestByTeamId');
  }

  async updateSubscription(
    subscriptionId: string,
    input: {
      status: string;
      currentPeriodEnd?: Date;
    },
  ): Promise<SubscriptionRecord> {
    const [subscription] = await this.databaseService.db
      .update(subscriptions)
      .set({
        status: input.status,
        currentPeriodEnd: input.currentPeriodEnd,
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    return parseSchema(subscriptionRecordSchema, subscription, 'DrizzleSubscriptionsRepository.updateSubscription');
  }
}