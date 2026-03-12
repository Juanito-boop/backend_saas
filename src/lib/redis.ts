import 'dotenv/config';

import type { ConnectionOptions } from 'bullmq';

function getRedisUrl() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL is not defined');
  }

  return redisUrl;
}

export function getBullMqConnection(): ConnectionOptions {
  const redisUrl = getRedisUrl();
  const parsedRedisUrl = new URL(redisUrl);

  return {
    host: parsedRedisUrl.hostname,
    port: parsedRedisUrl.port ? Number(parsedRedisUrl.port) : 6379,
    username: parsedRedisUrl.username || undefined,
    password: parsedRedisUrl.password || undefined,
    db:
      parsedRedisUrl.pathname.length > 1
        ? Number(parsedRedisUrl.pathname.slice(1))
        : undefined,
    tls: parsedRedisUrl.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
