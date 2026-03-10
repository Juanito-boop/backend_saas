import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { toNodeHandler } from 'better-call/node';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { auth } from './lib/auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const authHandler = toNodeHandler(auth.handler);
  const server = app.getHttpAdapter().getInstance();

  server.all('/api/auth', authHandler);
  server.all('/api/auth/*authPath', authHandler);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
