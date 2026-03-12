jest.mock('../src/lib/auth', () => ({
  auth: {
    handler: jest.fn(),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { App } from 'supertest/types';
import { DatabaseService } from './../src/db/database.service';
import { SCRAPE_QUEUE } from './../src/lib/queues';
import { AppModule } from './../src/app.module';
import type {
  SystemHealthReport,
  SystemLivenessReport,
} from './../src/system.service';

describe('SystemController (e2e)', () => {
  let app: INestApplication<App>;
  const originalEnv = process.env;

  const createDatabaseMock = () => {
    const execute = jest.fn();
    const select = jest.fn();

    return {
      db: {
        execute,
        select,
      },
      execute,
      select,
    };
  };

  const createQueueMock = () => {
    const ping = jest.fn();
    const close = jest.fn().mockResolvedValue(undefined);

    return {
      queue: {
        client: Promise.resolve({ ping }),
        close,
      },
      ping,
      close,
    };
  };

  const mockSelectResult = (
    select: jest.Mock,
    result: Array<{ id: string }>,
  ) => {
    select.mockImplementationOnce(() => ({
      from: () => ({
        limit: () => Promise.resolve(result),
      }),
    }));
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.BETTER_AUTH_SECRET = 'test-secret';
    process.env.PORT = '3000';

    const databaseMock = createDatabaseMock();
    const queueMock = createQueueMock();

    databaseMock.execute.mockResolvedValueOnce(undefined);
    mockSelectResult(databaseMock.select, [
      { id: '11111111-1111-1111-1111-111111111111' },
    ]);
    mockSelectResult(databaseMock.select, [
      { id: '22222222-2222-2222-2222-222222222222' },
    ]);
    queueMock.ping.mockResolvedValueOnce('PONG');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(databaseMock)
      .overrideProvider(SCRAPE_QUEUE)
      .useValue(queueMock.queue)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('/api/health/live (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health/live')
      .expect(200)
      .expect((response: Response) => {
        const body = response.body as SystemLivenessReport;

        expect(body.status).toBe('ok');
        expect(body.service).toBe('backend');
        expect(body.timestamp).toBeDefined();
      });
  });

  it('/api/health/ready (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health/ready')
      .expect(200)
      .expect((response: Response) => {
        const body = response.body as SystemHealthReport;

        expect(body.status).toBeDefined();
        expect(body.timestamp).toBeDefined();
        expect(body.modules).toBeDefined();
        expect(body.modules.api.status).toBe('ok');
        expect(body.modules.database.status).toBeDefined();
        expect(body.modules.auth.status).toBeDefined();
        expect(body.modules.scrapeQueue.status).toBeDefined();
        expect(body.modules.teams.status).toBeDefined();
        expect(body.modules.subscriptions.status).toBeDefined();
      });
  });
});
