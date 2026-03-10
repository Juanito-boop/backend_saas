import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

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
      .expect((response) => {
        expect(response.body.status).toBe('ok');
        expect(response.body.service).toBe('backend');
        expect(response.body.timestamp).toBeDefined();
      });
  });

  it('/api/health/ready (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health/ready')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.modules).toBeDefined();
        expect(response.body.modules.api.status).toBe('ok');
        expect(response.body.modules.database.status).toBeDefined();
        expect(response.body.modules.auth.status).toBeDefined();
        expect(response.body.modules.scrapeQueue.status).toBeDefined();
        expect(response.body.modules.teams.status).toBeDefined();
        expect(response.body.modules.subscriptions.status).toBeDefined();
      });
  });
});
