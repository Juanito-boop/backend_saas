jest.mock('./lib/auth', () => ({
  auth: {
    handler: jest.fn(),
  },
}));

import { SCRAPE_QUEUE_NAME } from './lib/queues';
import { SystemService } from './system.service';

describe('SystemService', () => {
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

    return {
      queue: {
        client: Promise.resolve({ ping }),
      },
      ping,
    };
  };

  const mockSelectResult = (
    select: jest.Mock,
    result: Array<{ id: string }>,
  ) => {
    select.mockImplementationOnce(() => ({
      from: () => ({
        limit: async () => result,
      }),
    }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.BETTER_AUTH_URL;
    process.env.BETTER_AUTH_SECRET = 'test-secret';
    process.env.PORT = '3000';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns an ok liveness report with backend service metadata', () => {
    const databaseMock = createDatabaseMock();
    const queueMock = createQueueMock();
    const service = new SystemService(
      databaseMock as never,
      queueMock.queue as never,
    );

    const report = service.getLiveness();

    expect(report.status).toBe('ok');
    expect(report.service).toBe('backend');
    expect(() => new Date(report.timestamp)).not.toThrow();
  });

  it('returns an ok readiness report when all dependencies are reachable', async () => {
    const databaseMock = createDatabaseMock();
    const queueMock = createQueueMock();
    const service = new SystemService(
      databaseMock as never,
      queueMock.queue as never,
    );

    databaseMock.execute.mockResolvedValueOnce(undefined);
    mockSelectResult(databaseMock.select, [
      { id: '11111111-1111-1111-1111-111111111111' },
    ]);
    mockSelectResult(databaseMock.select, [
      { id: '22222222-2222-2222-2222-222222222222' },
    ]);
    queueMock.ping.mockResolvedValueOnce('PONG');

    const report = await service.getReadiness();

    expect(report.status).toBe('ok');
    expect(report.modules.database).toMatchObject({
      status: 'ok',
      details: { driver: 'postgres' },
    });
    expect(report.modules.scrapeQueue).toMatchObject({
      status: 'ok',
      details: { queueName: SCRAPE_QUEUE_NAME, redis: 'PONG' },
    });
    expect(report.modules.auth).toMatchObject({
      status: 'ok',
      details: {
        baseURL: 'http://localhost:3000',
        authHandlerReady: true,
        emailAndPasswordEnabled: true,
      },
    });
    expect(report.modules.teams).toMatchObject({
      status: 'ok',
      details: {
        table: 'teams',
        query: 'select id from teams limit 1',
        reachable: true,
        sampleId: '11111111-1111-1111-1111-111111111111',
      },
    });
    expect(report.modules.subscriptions).toMatchObject({
      status: 'ok',
      details: {
        table: 'subscriptions',
        query: 'select id from subscriptions limit 1',
        reachable: true,
        sampleId: '22222222-2222-2222-2222-222222222222',
      },
    });
  });

  it('degrades readiness when infrastructure checks fail and auth depends on the database', async () => {
    const databaseMock = createDatabaseMock();
    const queueMock = createQueueMock();
    const service = new SystemService(
      databaseMock as never,
      queueMock.queue as never,
    );

    databaseMock.execute.mockRejectedValueOnce(new Error('database down'));
    mockSelectResult(databaseMock.select, []);
    mockSelectResult(databaseMock.select, []);
    queueMock.ping.mockRejectedValueOnce(new Error('redis unavailable'));

    const report = await service.getReadiness();

    expect(report.status).toBe('degraded');
    expect(report.modules.database).toMatchObject({
      status: 'error',
      error: 'database down',
    });
    expect(report.modules.scrapeQueue).toMatchObject({
      status: 'error',
      error: 'redis unavailable',
    });
    expect(report.modules.auth).toMatchObject({
      status: 'error',
      error: 'Auth depends on database connectivity',
      details: {
        baseURL: 'http://localhost:3000',
        authHandlerReady: true,
      },
    });
  });

  it('reports an invalid auth URL without crashing the readiness check', async () => {
    const databaseMock = createDatabaseMock();
    const queueMock = createQueueMock();
    const service = new SystemService(
      databaseMock as never,
      queueMock.queue as never,
    );

    process.env.BETTER_AUTH_URL = 'not-a-valid-url';
    databaseMock.execute.mockResolvedValueOnce(undefined);
    mockSelectResult(databaseMock.select, []);
    mockSelectResult(databaseMock.select, []);
    queueMock.ping.mockResolvedValueOnce('PONG');

    const report = await service.getReadiness();

    expect(report.status).toBe('degraded');
    expect(report.modules.auth).toEqual({
      status: 'error',
      error: 'BETTER_AUTH_URL is invalid',
    });
  });
});