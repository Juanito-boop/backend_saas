import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { DatabaseService } from '../../db/database.service';
import { subscriptions } from '../../db/schema';
import { TeamsService } from '../teams/teams.service';

export type CreateSubscriptionInput = {
  teamId: string;
  provider: string;
  providerSubscriptionId?: string;
  status: string;
  currentPeriodEnd?: Date;
};

export type UpdateSubscriptionStatusInput = {
  teamId: string;
  status: string;
  currentPeriodEnd?: Date;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly teamsService: TeamsService,
  ) { }

  async createSubscription(actorUserId: string, input: CreateSubscriptionInput) {
    await this.assertOwner(actorUserId, input.teamId);

    const existingSubscription = await this.findSubscriptionByTeamId(input.teamId);

    if (existingSubscription) {
      throw new BadRequestException('A subscription already exists for this team');
    }

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

    return subscription;
  }

  async getSubscription(actorUserId: string, teamId: string) {
    await this.assertOwner(actorUserId, teamId);

    const subscription = await this.findSubscriptionByTeamId(teamId);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async updateSubscriptionStatus(actorUserId: string, input: UpdateSubscriptionStatusInput) {
    await this.assertOwner(actorUserId, input.teamId);

    const subscription = await this.findSubscriptionByTeamId(input.teamId);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const [updatedSubscription] = await this.databaseService.db
      .update(subscriptions)
      .set({
        status: input.status,
        currentPeriodEnd: input.currentPeriodEnd,
      })
      .where(eq(subscriptions.id, subscription.id))
      .returning();

    return updatedSubscription;
  }

  private async assertOwner(actorUserId: string, teamId: string) {
    const membership = await this.teamsService.getMembershipOrThrow(teamId, actorUserId);

    if (membership.role !== 'owner') {
      throw new ForbiddenException('Only team owner can manage subscription');
    }
  }

  private async findSubscriptionByTeamId(teamId: string) {
    const [subscription] = await this.databaseService.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.teamId, teamId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    return subscription;
  }
}