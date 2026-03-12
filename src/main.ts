import 'dotenv/config';

import { toNodeHandler } from 'better-call/node';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { auth } from './lib/auth';

function getAllowedCorsOrigins() {
  const configuredOrigins = process.env.CORS_ORIGINS
    ?? process.env.FRONTEND_URL
    ?? 'http://localhost:4321';

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = new Set(getAllowedCorsOrigins());

  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });

  const authHandler = toNodeHandler(auth.handler);
  const server = app.getHttpAdapter().getInstance();

  server.all('/api/auth', authHandler);
  server.all('/api/auth/*authPath', authHandler);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
