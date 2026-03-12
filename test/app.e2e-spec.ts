import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import type {
  SystemHealthReport,
  SystemLivenessReport,
} from './../src/system.service';

describe('SystemController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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
