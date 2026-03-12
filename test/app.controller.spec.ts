import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { SystemController } from 'src/system.controller';
import { SystemService } from 'src/system.service';

describe('SystemController', () => {
  let systemController: SystemController;
  const systemServiceMock = {
    getLiveness: jest.fn(),
    getHealth: jest.fn(),
    getReadiness: jest.fn(),
    scheduleScrape: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SystemController],
      providers: [
        {
          provide: SystemService,
          useValue: systemServiceMock,
        },
      ],
    }).compile();

    systemController = app.get<SystemController>(SystemController);
    jest.clearAllMocks();
  });

  describe('liveness', () => {
    it('should return the liveness report', () => {
      const report = {
        status: 'ok' as const,
        timestamp: '2026-03-10T00:00:00.000Z',
        service: 'backend' as const,
      };

      systemServiceMock.getLiveness.mockReturnValue(report);

      expect(systemController.getLiveness()).toEqual(report);
    });
  });

  describe('readiness', () => {
    it('should return the readiness report and set status 200 when healthy', async () => {
      const status = jest.fn();
      const response = {
        status,
      } as unknown as Response;

      const report = {
        status: 'ok' as const,
        timestamp: '2026-03-10T00:00:00.000Z',
        modules: {
          api: { status: 'ok' as const },
          database: { status: 'ok' as const },
          auth: { status: 'ok' as const },
          scrapeQueue: { status: 'ok' as const },
          teams: { status: 'ok' as const },
          subscriptions: { status: 'ok' as const },
        },
      };

      systemServiceMock.getReadiness.mockResolvedValue(report);

      await expect(systemController.getReadiness(response)).resolves.toEqual(
        report,
      );
      expect(status).toHaveBeenCalledWith(200);
    });
  });
});
