import 'dotenv/config';

import { toNodeHandler } from 'better-call/node';
import type { INestApplication } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import type { Express, RequestHandler } from 'express';

import { AppModule } from './app.module';
import { auth } from './lib/auth';

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

function getAllowedCorsOrigins() {
  const configuredOrigins =
    process.env.CORS_ORIGINS ??
    process.env.FRONTEND_URL ??
    'http://localhost:4321';

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function getExpressServer(app: INestApplication): Express {
  return app.getHttpAdapter().getInstance() as unknown as Express;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = new Set(getAllowedCorsOrigins());
  const corsOptions: CorsOptions = {
    origin(origin: string | undefined, callback: CorsOriginCallback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  };

  app.enableCors(corsOptions);

  const authHandler = toNodeHandler(auth.handler) as unknown as RequestHandler;
  const server = getExpressServer(app);

  server.all('/api/auth', authHandler);
  server.all('/api/auth/*authPath', authHandler);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
