import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DatabaseService } from './db/database.service';
import { subscriptions, teams } from './db/schema';
import { auth } from './lib/auth';
import { SCRAPE_QUEUE, SCRAPE_QUEUE_NAME, type ScrapeQueue } from './lib/queues';

type HealthModuleStatus = 'ok' | 'error';

type HealthModuleReport = {
  status: HealthModuleStatus;
  latencyMs?: number;
  details?: Record<string, unknown>;
  error?: string;
};

export type SystemLivenessReport = {
  status: 'ok';
  timestamp: string;
  service: 'backend';
};

export type SystemHealthReport = {
  status: 'ok' | 'degraded';
  timestamp: string;
  modules: {
    api: HealthModuleReport;
    database: HealthModuleReport;
    auth: HealthModuleReport;
    scrapeQueue: HealthModuleReport;
    teams: HealthModuleReport;
    subscriptions: HealthModuleReport;
  };
};

@Injectable()
export class SystemService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(SCRAPE_QUEUE) private readonly scrapeQueue: ScrapeQueue,
  ) { }

  getLiveness(): SystemLivenessReport {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'backend',
    };
  }

  async getReadiness(): Promise<SystemHealthReport> {
    const database = await this.checkModule(async () => {
      await this.databaseService.db.execute(sql`select 1`);

      return {
        driver: 'postgres',
      };
    });

    const scrapeQueue = await this.checkModule(async () => {
      const client = await this.scrapeQueue.client;
      const pingResponse = await client.ping();

      return {
        queueName: SCRAPE_QUEUE_NAME,
        redis: pingResponse,
      };
    });

    const auth = this.getAuthHealth(database.status === 'ok');
    const teamsModule = await this.checkModule(async () => {
      const [teamSample] = await this.databaseService.db
        .select({ id: teams.id })
        .from(teams)
        .limit(1);

      return {
        table: 'teams',
        query: 'select id from teams limit 1',
        reachable: true,
        sampleId: teamSample?.id ?? null,
      };
    });
    const subscriptionsModule = await this.checkModule(async () => {
      const [subscriptionSample] = await this.databaseService.db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .limit(1);

      return {
        table: 'subscriptions',
        query: 'select id from subscriptions limit 1',
        reachable: true,
        sampleId: subscriptionSample?.id ?? null,
      };
    });

    const report: SystemHealthReport = {
      status: database.status === 'ok'
        && auth.status === 'ok'
        && scrapeQueue.status === 'ok'
        && teamsModule.status === 'ok'
        && subscriptionsModule.status === 'ok'
        ? 'ok'
        : 'degraded',
      timestamp: new Date().toISOString(),
      modules: {
        api: {
          status: 'ok',
          details: {
            service: 'backend',
          },
        },
        database,
        auth,
        scrapeQueue,
        teams: teamsModule,
        subscriptions: subscriptionsModule,
      },
    };

    return report;
  }

  private async checkModule(
    check: () => Promise<Record<string, unknown>>,
  ): Promise<HealthModuleReport> {
    const startedAt = Date.now();

    try {
      const details = await check();

      return {
        status: 'ok',
        latencyMs: Date.now() - startedAt,
        details,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      return {
        status: 'error',
        latencyMs: Date.now() - startedAt,
        error: message,
      };
    }
  }

  private getAuthHealth(databaseAvailable: boolean): HealthModuleReport {
    const baseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? '3000'}`;

    try {
      const parsedBaseURL = new URL(baseURL);
      const secretConfigured = Boolean(process.env.BETTER_AUTH_SECRET);
      const authHandlerReady = typeof auth.handler === 'function';

      if (!secretConfigured) {
        return {
          status: 'error',
          error: 'BETTER_AUTH_SECRET is not configured',
          details: {
            baseURL: parsedBaseURL.origin,
            databaseAvailable,
          },
        };
      }

      if (!databaseAvailable) {
        return {
          status: 'error',
          error: 'Auth depends on database connectivity',
          details: {
            baseURL: parsedBaseURL.origin,
            authHandlerReady,
          },
        };
      }

      return {
        status: 'ok',
        details: {
          baseURL: parsedBaseURL.origin,
          authHandlerReady,
          emailAndPasswordEnabled: true,
        },
      };
    } catch {
      return {
        status: 'error',
        error: 'BETTER_AUTH_URL is invalid',
      };
    }
  }
}